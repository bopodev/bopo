import { bootstrapDatabase } from "bopodev-db";

async function main() {
  const { client } = await bootstrapDatabase(process.env.BOPO_DB_PATH);
  const maybeClose = (client as { close?: () => Promise<void> }).close;
  if (maybeClose) {
    await maybeClose.call(client);
  }
  // eslint-disable-next-line no-console
  console.log("Database initialized.");
}

void main();
