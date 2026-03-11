import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as dbSchema from "./schema";
import { resolveDefaultDbPath } from "./default-paths";

export type BopoDb = ReturnType<typeof drizzle<typeof dbSchema>>;

const defaultDbPath = resolveDefaultDbPath();

export async function createDb(dbPath = defaultDbPath) {
  await mkdir(dirname(dbPath), { recursive: true });
  const client = new PGlite(dbPath);
  const db = drizzle({ client, schema: dbSchema });
  return { db, client };
}
