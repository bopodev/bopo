import { applyDatabaseMigrations, createDb } from "./client";
import { resolveDefaultDbPath } from "./default-paths";
import { loadMigrateEnv } from "./load-migrate-env";

async function main() {
  loadMigrateEnv();
  logMigrationTarget();
  const dbPath = normalizeOptionalDbPath(process.env.BOPO_DB_PATH);
  const connection = await createDb(dbPath);
  try {
    await applyDatabaseMigrations(connection.connectionString, { dataPath: connection.dataPath });
    // eslint-disable-next-line no-console
    console.log("Database migrated and verified.");
  } finally {
    await connection.client.close();
  }
}

void main();

function normalizeOptionalDbPath(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function logMigrationTarget() {
  const external = process.env.DATABASE_URL?.trim();
  if (external) {
    // eslint-disable-next-line no-console
    console.log("[bopodev-db] Migrating database from DATABASE_URL (same sources as API: .env.local, .env at repo root).");
    return;
  }
  const configured = process.env.BOPO_DB_PATH?.trim();
  const dataPath = configured && configured.length > 0 ? configured : resolveDefaultDbPath();
  // eslint-disable-next-line no-console
  console.log(`[bopodev-db] Migrating embedded Postgres at ${dataPath} (set DATABASE_URL to use an external Postgres).`);
}
