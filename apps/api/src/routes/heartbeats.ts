import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { agents, heartbeatRuns } from "bopodev-db";
import type { AppContext } from "../context";
import { sendError, sendOk } from "../http";
import { requireCompanyScope } from "../middleware/company-scope";
import { requirePermission } from "../middleware/request-actor";
import { runHeartbeatForAgent, runHeartbeatSweep, stopHeartbeatRun } from "../services/heartbeat-service";

const runAgentSchema = z.object({
  agentId: z.string().min(1)
});
const runIdParamsSchema = z.object({
  runId: z.string().min(1)
});

export function createHeartbeatRouter(ctx: AppContext) {
  const router = Router();
  router.use(requireCompanyScope);

  router.post("/run-agent", async (req, res) => {
    requirePermission("heartbeats:run")(req, res, () => {});
    if (res.headersSent) {
      return;
    }
    const parsed = runAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }
    const [agent] = await ctx.db
      .select({ id: agents.id, status: agents.status })
      .from(agents)
      .where(and(eq(agents.companyId, req.companyId!), eq(agents.id, parsed.data.agentId)))
      .limit(1);
    if (!agent) {
      return sendError(res, "Agent not found.", 404);
    }
    if (agent.status === "paused" || agent.status === "terminated") {
      return sendError(res, `Agent is not invokable in status '${agent.status}'.`, 409);
    }

    const runId = await runHeartbeatForAgent(ctx.db, req.companyId!, parsed.data.agentId, {
      requestId: req.requestId,
      trigger: "manual",
      realtimeHub: ctx.realtimeHub
    });
    if (!runId) {
      return sendError(res, "Heartbeat could not be started for this agent.", 409);
    }
    const [runRow] = await ctx.db
      .select({ id: heartbeatRuns.id, status: heartbeatRuns.status, message: heartbeatRuns.message })
      .from(heartbeatRuns)
      .where(and(eq(heartbeatRuns.companyId, req.companyId!), eq(heartbeatRuns.id, runId)))
      .limit(1);
    const invokeStatus =
      runRow?.status === "skipped" && String(runRow.message ?? "").includes("already in progress")
        ? "skipped_overlap"
        : runRow?.status === "skipped"
          ? "skipped"
          : "started";
    return sendOk(res, {
      runId,
      requestId: req.requestId,
      status: invokeStatus,
      message: runRow?.message ?? null
    });
  });

  router.post("/:runId/stop", async (req, res) => {
    requirePermission("heartbeats:run")(req, res, () => {});
    if (res.headersSent) {
      return;
    }
    const parsed = runIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }
    const stopResult = await stopHeartbeatRun(ctx.db, req.companyId!, parsed.data.runId, {
      requestId: req.requestId,
      trigger: "manual",
      actorId: req.actor?.id ?? undefined,
      realtimeHub: ctx.realtimeHub
    });
    if (!stopResult.ok) {
      if (stopResult.reason === "not_found") {
        return sendError(res, "Heartbeat run not found.", 404);
      }
      return sendError(res, `Heartbeat run is not stoppable in status '${stopResult.status}'.`, 409);
    }
    return sendOk(res, {
      runId: stopResult.runId,
      requestId: req.requestId,
      status: "stop_requested"
    });
  });

  async function rerunFromHistory(input: {
    mode: "resume" | "redo";
    runId: string;
    companyId: string;
    requestId?: string;
  }) {
    const [run] = await ctx.db
      .select({
        id: heartbeatRuns.id,
        status: heartbeatRuns.status,
        agentId: heartbeatRuns.agentId
      })
      .from(heartbeatRuns)
      .where(and(eq(heartbeatRuns.companyId, input.companyId), eq(heartbeatRuns.id, input.runId)))
      .limit(1);
    if (!run) {
      return { ok: false as const, statusCode: 404, message: "Heartbeat run not found." };
    }
    if (run.status === "started") {
      return { ok: false as const, statusCode: 409, message: "Run is still in progress and cannot be replayed yet." };
    }
    const [agent] = await ctx.db
      .select({ id: agents.id, status: agents.status })
      .from(agents)
      .where(and(eq(agents.companyId, input.companyId), eq(agents.id, run.agentId)))
      .limit(1);
    if (!agent) {
      return { ok: false as const, statusCode: 404, message: "Agent not found." };
    }
    if (agent.status === "paused" || agent.status === "terminated") {
      return { ok: false as const, statusCode: 409, message: `Agent is not invokable in status '${agent.status}'.` };
    }
    const nextRunId = await runHeartbeatForAgent(ctx.db, input.companyId, run.agentId, {
      requestId: input.requestId,
      trigger: "manual",
      realtimeHub: ctx.realtimeHub,
      mode: input.mode,
      sourceRunId: run.id
    });
    if (!nextRunId) {
      return { ok: false as const, statusCode: 409, message: "Heartbeat could not be started for this agent." };
    }
    const [runRow] = await ctx.db
      .select({ id: heartbeatRuns.id, status: heartbeatRuns.status, message: heartbeatRuns.message })
      .from(heartbeatRuns)
      .where(and(eq(heartbeatRuns.companyId, input.companyId), eq(heartbeatRuns.id, nextRunId)))
      .limit(1);
    const invokeStatus =
      runRow?.status === "skipped" && String(runRow.message ?? "").includes("already in progress")
        ? "skipped_overlap"
        : runRow?.status === "skipped"
          ? "skipped"
          : "started";
    return {
      ok: true as const,
      runId: nextRunId,
      status: invokeStatus,
      message: runRow?.message ?? null
    };
  }

  router.post("/:runId/resume", async (req, res) => {
    requirePermission("heartbeats:run")(req, res, () => {});
    if (res.headersSent) {
      return;
    }
    const parsed = runIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }
    const result = await rerunFromHistory({
      mode: "resume",
      runId: parsed.data.runId,
      companyId: req.companyId!,
      requestId: req.requestId
    });
    if (!result.ok) {
      return sendError(res, result.message, result.statusCode);
    }
    return sendOk(res, {
      runId: result.runId,
      requestId: req.requestId,
      status: result.status,
      message: result.message
    });
  });

  router.post("/:runId/redo", async (req, res) => {
    requirePermission("heartbeats:run")(req, res, () => {});
    if (res.headersSent) {
      return;
    }
    const parsed = runIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(res, parsed.error.message, 422);
    }
    const result = await rerunFromHistory({
      mode: "redo",
      runId: parsed.data.runId,
      companyId: req.companyId!,
      requestId: req.requestId
    });
    if (!result.ok) {
      return sendError(res, result.message, result.statusCode);
    }
    return sendOk(res, {
      runId: result.runId,
      requestId: req.requestId,
      status: result.status,
      message: result.message
    });
  });

  router.post("/sweep", async (req, res) => {
    requirePermission("heartbeats:sweep")(req, res, () => {});
    if (res.headersSent) {
      return;
    }
    const runIds = await runHeartbeatSweep(ctx.db, req.companyId!, {
      requestId: req.requestId,
      realtimeHub: ctx.realtimeHub
    });
    return sendOk(res, { runIds, requestId: req.requestId });
  });

  return router;
}
