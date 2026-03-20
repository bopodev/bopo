import { applyDatabaseMigrations, createDb } from "./client";

async function main() {
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
