import { bootstrapDatabase, resolveDefaultDbPath } from "bopodev-db";

export function isProbablyDatabaseStartupError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error.cause : undefined;
  const causeMessage = cause instanceof Error ? cause.message : String(cause ?? "");
  return (
    message.includes("database") ||
    message.includes("postgres") ||
    message.includes("migration") ||
    causeMessage.includes("postgres") ||
    causeMessage.includes("connection")
  );
}

export type BootstrappedDb = Awaited<ReturnType<typeof bootstrapDatabase>>;

export async function bootstrapDatabaseWithStartupLogging(dbPath: string | undefined): Promise<BootstrappedDb> {
  const usingExternalDatabase = Boolean(process.env.DATABASE_URL?.trim());
  const effectiveDbPath = dbPath ?? resolveDefaultDbPath();
  try {
    return await bootstrapDatabase(dbPath);
  } catch (error) {
    if (isProbablyDatabaseStartupError(error)) {
      // eslint-disable-next-line no-console
      console.error("[startup] Database bootstrap failed before the API could start.");
      if (usingExternalDatabase) {
        // eslint-disable-next-line no-console
        console.error("[startup] Check DATABASE_URL connectivity, permissions, and migration state.");
      } else {
        // eslint-disable-next-line no-console
        console.error(`[startup] Embedded Postgres data path: ${effectiveDbPath}`);
        // eslint-disable-next-line no-console
        console.error(
          "[startup] Recovery: stop all API/node processes using this DB, back up the path above, delete the directory if it is corrupted, then restart. Or set BOPO_DB_PATH to a fresh path."
        );
      }
    }
    throw error;
  }
}
