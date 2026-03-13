import { bootstrapDatabase } from "bopodev-db";

async function main() {
  const dbPath = normalizeOptionalDbPath(process.env.BOPO_DB_PATH);
  const { client } = await bootstrapDatabase(dbPath);
  const maybeClose = (client as { close?: () => Promise<void> }).close;
  if (maybeClose) {
    await maybeClose.call(client);
  }
  // eslint-disable-next-line no-console
  console.log("Database initialized.");
}

void main();

function normalizeOptionalDbPath(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}
