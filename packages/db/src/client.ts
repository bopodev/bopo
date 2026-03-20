import { existsSync, readFileSync, rmSync } from "node:fs";
import { mkdir, open, readFile, rm, writeFile, type FileHandle } from "node:fs/promises";
import { createServer } from "node:net";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgresModule from "embedded-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dbSchema from "./schema";
import { resolveDefaultDbPath } from "./default-paths";

export type BopoDb = PostgresJsDatabase<typeof dbSchema>;
export type BopoDatabaseClient = {
  close: () => Promise<void>;
};

const defaultDbPath = resolveDefaultDbPath();
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const DEFAULT_DB_NAME = "bopodev";
const DEFAULT_DB_USER = "bopodev";
const DEFAULT_DB_PASSWORD = "bopodev";
const DEFAULT_DB_PORT = Number(process.env.BOPO_DB_PORT ?? "55432");
const EMBEDDED_DB_START_TIMEOUT_MS = Number(process.env.BOPO_DB_START_TIMEOUT_MS ?? "15000");
const LOCAL_DB_STATE_VERSION = 1;
type EmbeddedPostgresInstance = {
  initialise(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
};

type EmbeddedPostgresCtor = new (options: {
  databaseDir: string;
  user: string;
  password: string;
  port: number;
  persistent: boolean;
  initdbFlags?: string[];
  onLog?: (message: unknown) => void;
  onError?: (message: unknown) => void;
}) => EmbeddedPostgresInstance;

type DatabaseTarget = {
  connectionString: string;
  dataPath: string | null;
  stop: () => Promise<void>;
  source: "external-postgres" | "embedded-postgres";
};

type LocalDbPhase = "initializing" | "starting" | "migrating" | "running" | "stopping" | "stopped" | "failed";

type LocalDbState = {
  version: number;
  source: "embedded-postgres";
  phase: LocalDbPhase;
  pid: number;
  port: number;
  dataPath: string;
  updatedAt: string;
  expectedMigrationCount: number;
  lastError: string | null;
};

type LocalDbLock = {
  path: string;
  handle: FileHandle;
};

type MigrationVersion = {
  count: number;
  latestTag: string | null;
};

const EmbeddedPostgres = EmbeddedPostgresModule as unknown as EmbeddedPostgresCtor;
const EXPECTED_MIGRATION_VERSION = readExpectedMigrationVersion();

export async function createDb(dbPath = defaultDbPath) {
  const target = await ensureDatabaseTarget(dbPath);
  const sqlClient = postgres(target.connectionString, {
    onnotice: () => {}
  });
  const db = drizzle(sqlClient, { schema: dbSchema });
  let closed = false;
  const client: BopoDatabaseClient = {
    close: async () => {
      if (closed) {
        return;
      }
      closed = true;
      try {
        await sqlClient.end();
      } finally {
        await target.stop();
      }
    }
  };
  return {
    db,
    client,
    connectionString: target.connectionString,
    dataPath: target.dataPath,
    source: target.source
  };
}

export async function applyDatabaseMigrations(connectionString: string, options?: { dataPath?: string | null }) {
  const statePath = options?.dataPath ? resolveLocalDbStatePath(options.dataPath) : null;
  if (statePath) {
    await updateLocalDbState(statePath, {
      phase: "migrating",
      expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
      lastError: null
    });
  }
  const sqlClient = postgres(connectionString, {
    max: 1,
    onnotice: () => {}
  });
  try {
    const migrationDb = drizzle({ client: sqlClient });
    await migrate(migrationDb, { migrationsFolder: MIGRATIONS_FOLDER });
    await verifyDatabaseSchema(connectionString);
    if (statePath) {
      await updateLocalDbState(statePath, {
        phase: "running",
        expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
        lastError: null
      });
    }
  } catch (error) {
    if (statePath) {
      await updateLocalDbState(statePath, {
        phase: "failed",
        expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
        lastError: error instanceof Error ? error.message : String(error)
      }).catch(() => {});
    }
    throw error;
  } finally {
    await sqlClient.end();
  }
}

export function getExpectedDatabaseSchemaVersion() {
  return EXPECTED_MIGRATION_VERSION;
}

export async function verifyDatabaseSchema(connectionString: string) {
  const appliedCount = await readAppliedMigrationCount(connectionString);
  if (appliedCount !== EXPECTED_MIGRATION_VERSION.count) {
    const suffix = EXPECTED_MIGRATION_VERSION.latestTag ? ` (${EXPECTED_MIGRATION_VERSION.latestTag})` : "";
    throw new Error(
      `Database schema version mismatch: expected ${EXPECTED_MIGRATION_VERSION.count}${suffix} migrations, ` +
        `but found ${appliedCount}. Run 'pnpm db:migrate' or 'pnpm upgrade:local' before starting this release.`
    );
  }
  return {
    appliedCount,
    expectedCount: EXPECTED_MIGRATION_VERSION.count,
    latestTag: EXPECTED_MIGRATION_VERSION.latestTag
  };
}

export async function readAppliedMigrationCount(connectionString: string) {
  const sqlClient = postgres(connectionString, {
    max: 1,
    onnotice: () => {}
  });
  try {
    const rows = await sqlClient<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM drizzle."__drizzle_migrations"
    `;
    return Number(rows[0]?.count ?? "0");
  } catch (error) {
    const message = String(error).toLowerCase();
    if (message.includes("__drizzle_migrations") || message.includes("schema \"drizzle\"")) {
      return 0;
    }
    throw error;
  } finally {
    await sqlClient.end();
  }
}

export async function ensureDatabaseTarget(dbPath: string = defaultDbPath): Promise<DatabaseTarget> {
  const externalUrl = normalizeOptionalEnvValue(process.env.DATABASE_URL);
  if (externalUrl) {
    return {
      connectionString: externalUrl,
      dataPath: null,
      stop: async () => {},
      source: "external-postgres"
    };
  }
  return ensureEmbeddedPostgresTarget(resolve(dbPath));
}

async function ensureEmbeddedPostgresTarget(dataPath: string): Promise<DatabaseTarget> {
  await mkdir(dataPath, { recursive: true });
  const lock = await acquireLocalDbLock(dataPath, EMBEDDED_DB_START_TIMEOUT_MS);
  const statePath = resolveLocalDbStatePath(dataPath);
  await writeLocalDbState(statePath, {
    version: LOCAL_DB_STATE_VERSION,
    source: "embedded-postgres",
    phase: "initializing",
    pid: process.pid,
    port: DEFAULT_DB_PORT,
    dataPath,
    updatedAt: new Date().toISOString(),
    expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
    lastError: null
  });

  const postmasterPidFile = resolve(dataPath, "postmaster.pid");
  try {
    const runningPid = readRunningPostmasterPid(postmasterPidFile);
    if (runningPid) {
      await waitForPostmasterExit(postmasterPidFile, EMBEDDED_DB_START_TIMEOUT_MS);
      const activePid = readRunningPostmasterPid(postmasterPidFile);
      if (activePid) {
        throw new Error(
          `Embedded Postgres data path '${dataPath}' is still in use by pid ${activePid}. Stop the other process or wait for it to exit.`
        );
      }
    }
    if (existsSync(postmasterPidFile)) {
      rmSync(postmasterPidFile, { force: true });
    }
    if (await isPortInUse(DEFAULT_DB_PORT)) {
      throw new Error(
        `Embedded Postgres port ${DEFAULT_DB_PORT} is already in use. Stop the process using that port or set BOPO_DB_PORT before retrying.`
      );
    }

    const instance = new EmbeddedPostgres({
      databaseDir: dataPath,
      user: DEFAULT_DB_USER,
      password: DEFAULT_DB_PASSWORD,
      port: DEFAULT_DB_PORT,
      persistent: true,
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
      onLog: () => {},
      onError: () => {}
    });

    if (!existsSync(resolve(dataPath, "PG_VERSION"))) {
      await instance.initialise();
    }

    await updateLocalDbState(statePath, {
      phase: "starting",
      expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
      lastError: null
    });
    await instance.start();

    try {
      await ensurePostgresDatabase(connectionStringFor(DEFAULT_DB_PORT, "postgres"), DEFAULT_DB_NAME);
    } catch (error) {
      await instance.stop().catch(() => {});
      throw error;
    }

    await updateLocalDbState(statePath, {
      phase: "running",
      expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
      lastError: null
    });

    let stopped = false;
    return {
      connectionString: connectionStringFor(DEFAULT_DB_PORT, DEFAULT_DB_NAME),
      dataPath,
      source: "embedded-postgres",
      stop: async () => {
        if (stopped) {
          return;
        }
        stopped = true;
        await updateLocalDbState(statePath, {
          phase: "stopping",
          expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
          lastError: null
        }).catch(() => {});
        try {
          await instance.stop();
          await updateLocalDbState(statePath, {
            phase: "stopped",
            expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
            lastError: null
          }).catch(() => {});
        } finally {
          await releaseLocalDbLock(lock);
        }
      }
    };
  } catch (error) {
    await updateLocalDbState(statePath, {
      phase: "failed",
      expectedMigrationCount: EXPECTED_MIGRATION_VERSION.count,
      lastError: error instanceof Error ? error.message : String(error)
    }).catch(() => {});
    await releaseLocalDbLock(lock).catch(() => {});
    throw error;
  }
}

async function ensurePostgresDatabase(adminConnectionString: string, databaseName: string) {
  const sqlClient = postgres(adminConnectionString, {
    max: 1,
    onnotice: () => {}
  });
  try {
    const rows = await sqlClient<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_database
        WHERE datname = ${databaseName}
      ) AS exists
    `;
    if (!rows[0]?.exists) {
      await sqlClient.unsafe(`CREATE DATABASE "${databaseName.replaceAll("\"", "\"\"")}"`);
    }
  } finally {
    await sqlClient.end();
  }
}

function readRunningPostmasterPid(postmasterPidFile: string): number | null {
  if (!existsSync(postmasterPidFile)) {
    return null;
  }
  try {
    const pid = Number(readFileSync(postmasterPidFile, "utf8").split("\n")[0]?.trim());
    if (!Number.isInteger(pid) || pid <= 0) {
      return null;
    }
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

async function waitForPostmasterExit(postmasterPidFile: string, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!readRunningPostmasterPid(postmasterPidFile)) {
      return;
    }
    await sleep(200);
  }
}

function isPortInUse(port: number) {
  return new Promise<boolean>((resolvePromise) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolvePromise(true));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolvePromise(false));
    });
  });
}

function connectionStringFor(port: number, databaseName: string) {
  return `postgres://${DEFAULT_DB_USER}:${DEFAULT_DB_PASSWORD}@127.0.0.1:${port}/${databaseName}`;
}

function normalizeOptionalEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

async function acquireLocalDbLock(dataPath: string, timeoutMs: number): Promise<LocalDbLock> {
  const lockPath = resolveLocalDbLockPath(dataPath);
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(
        JSON.stringify(
          {
            pid: process.pid,
            acquiredAt: new Date().toISOString(),
            dataPath
          },
          null,
          2
        ),
        "utf8"
      );
      return {
        path: lockPath,
        handle
      };
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
      const owner = await readLockOwner(lockPath);
      if (!owner || !isPidAlive(owner.pid)) {
        await rm(lockPath, { force: true }).catch(() => {});
        continue;
      }
      await sleep(200);
    }
  }
  const owner = await readLockOwner(lockPath);
  if (owner?.pid) {
    throw new Error(
      `Timed out waiting for embedded Postgres lock at '${lockPath}'. Another process (pid ${owner.pid}) is starting or stopping the local database.`
    );
  }
  throw new Error(`Timed out waiting for embedded Postgres lock at '${lockPath}'.`);
}

async function releaseLocalDbLock(lock: LocalDbLock) {
  await lock.handle.close().catch(() => {});
  await rm(lock.path, { force: true }).catch(() => {});
}

async function readLockOwner(lockPath: string) {
  try {
    const raw = await readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as { pid?: unknown };
    return typeof parsed.pid === "number" ? { pid: parsed.pid } : null;
  } catch {
    return null;
  }
}

async function writeLocalDbState(statePath: string, state: LocalDbState) {
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function updateLocalDbState(
  statePath: string,
  patch: Partial<Pick<LocalDbState, "phase" | "expectedMigrationCount" | "lastError">>
) {
  const current = await readLocalDbState(statePath);
  if (!current) {
    return;
  }
  await writeLocalDbState(statePath, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  });
}

async function readLocalDbState(statePath: string): Promise<LocalDbState | null> {
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw) as LocalDbState;
    return parsed?.version === LOCAL_DB_STATE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function readExpectedMigrationVersion(): MigrationVersion {
  try {
    const journalPath = fileURLToPath(new URL("./migrations/meta/_journal.json", import.meta.url));
    const raw = readFileSync(journalPath, "utf8");
    const parsed = JSON.parse(raw) as { entries?: Array<{ tag?: unknown }> };
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    const lastTag = entries.length > 0 && typeof entries[entries.length - 1]?.tag === "string"
      ? String(entries[entries.length - 1]?.tag)
      : null;
    return {
      count: entries.length,
      latestTag: lastTag
    };
  } catch {
    return {
      count: 0,
      latestTag: null
    };
  }
}

function isAlreadyExistsError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EEXIST");
}

function isPidAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function resolveLocalDbLockPath(dataPath: string) {
  return `${join(dirname(dataPath), basename(dataPath))}.lock`;
}

function resolveLocalDbStatePath(dataPath: string) {
  return `${join(dirname(dataPath), basename(dataPath))}.state.json`;
}

function sleep(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
