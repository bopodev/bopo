import { applyDatabaseMigrations, createDb } from "./client";

export async function bootstrapDatabase(dbPath?: string) {
  const connection = await createDb(dbPath);
  try {
    await applyDatabaseMigrations(connection.connectionString, { dataPath: connection.dataPath });
    return { db: connection.db, client: connection.client };
  } catch (error) {
    await connection.client.close().catch(() => {});
    throw error;
  }
}
