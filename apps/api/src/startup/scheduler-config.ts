import { sql } from "bopodev-db";
import type { BootstrappedDb } from "./database";

export async function resolveSchedulerCompanyId(
  db: BootstrappedDb["db"],
  configuredCompanyId: string | null
) {
  if (configuredCompanyId) {
    const configured = await db.execute(sql`
      SELECT id
      FROM companies
      WHERE id = ${configuredCompanyId}
      LIMIT 1
    `);
    if (configured.length > 0) {
      return configuredCompanyId;
    }
    // eslint-disable-next-line no-console
    console.warn(`[startup] BOPO_DEFAULT_COMPANY_ID='${configuredCompanyId}' was not found; using first available company.`);
  }

  const fallback = await db.execute(sql`
    SELECT id
    FROM companies
    ORDER BY created_at ASC
    LIMIT 1
  `);
  const id = fallback[0]?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function shouldStartScheduler() {
  const rawRole = (process.env.BOPO_SCHEDULER_ROLE ?? "auto").trim().toLowerCase();
  if (rawRole === "off" || rawRole === "follower") {
    return false;
  }
  if (rawRole === "leader" || rawRole === "auto") {
    return true;
  }
  throw new Error(`Invalid BOPO_SCHEDULER_ROLE '${rawRole}'. Expected one of: auto, leader, follower, off.`);
}
