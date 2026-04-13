import { appendAuditEvent, listAuditEvents, listHeartbeatRuns } from "bopodev-db";
import type { BopoDb } from "bopodev-db";
import { isOrgLearningEnabled } from "../lib/roadmap-feature-flags";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function runOrgLearningSweep(db: BopoDb, companyId: string) {
  if (!isOrgLearningEnabled()) {
    return;
  }
  const auditRows = await listAuditEvents(db, companyId, 500);
  const lastPublished = auditRows.find((row) => row.eventType === "org_learning.weekly_summary_published");
  if (lastPublished && Date.now() - lastPublished.createdAt.getTime() < ONE_WEEK_MS) {
    return;
  }
  const runs = await listHeartbeatRuns(db, companyId, 500);
  const since = Date.now() - ONE_WEEK_MS;
  const weekRuns = runs.filter((run) => run.startedAt.getTime() >= since);
  const failedRuns = weekRuns.filter((run) => run.status === "failed").length;
  const skippedRuns = weekRuns.filter((run) => run.status === "skipped").length;
  const completedRuns = weekRuns.filter((run) => run.status === "completed").length;
  await appendAuditEvent(db, {
    companyId,
    actorType: "system",
    eventType: "org_learning.weekly_summary_published",
    entityType: "company",
    entityId: companyId,
    payload: {
      windowDays: 7,
      completedRuns,
      failedRuns,
      skippedRuns,
      recommendation:
        failedRuns >= 6
          ? "Run a cross-team postmortem routine and promote successful mitigations to verified memory."
          : "Continue monitoring run quality and promote high-confidence learnings weekly."
    }
  });
}
