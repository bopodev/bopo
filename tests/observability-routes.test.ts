import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import { runHeartbeatForAgent } from "../apps/api/src/services/heartbeat-service";
import type { BopoDb } from "../packages/db/src/client";
import {
  appendHeartbeatRunMessages,
  appendCost,
  bootstrapDatabase,
  createAgent,
  createCompany,
  createIssue,
  createProject,
  heartbeatRuns,
  listCostEntries,
  listHeartbeatRuns
} from "../packages/db/src/index";

describe("observability routes", { timeout: 30_000 }, () => {
  let db: BopoDb;
  let app: ReturnType<typeof createApp>;
  let tempDir: string;
  let companyId: string;
  let client: { close?: () => Promise<void> };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bopodev-observability-test-"));
    const boot = await bootstrapDatabase(join(tempDir, "test.db"));
    db = boot.db;
    client = boot.client as { close?: () => Promise<void> };
    app = createApp({ db });
    const company = await createCompany(db, { name: "Observability Co", mission: "Observe everything." });
    companyId = company.id;
  });

  afterEach(async () => {
    await client.close?.();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns costs and heartbeats including derived run outcome", async () => {
    const project = await createProject(db, {
      companyId,
      name: "Observability Project",
      workspaceLocalPath: tempDir
    });
    const agent = await createAgent(db, {
      companyId,
      role: "Worker",
      name: "Observer",
      providerType: "shell",
      heartbeatCron: "* * * * *",
      monthlyBudgetUsd: "25.0000",
      canHireAgents: false,
      runtimeCommand: "echo",
      runtimeArgsJson: '["{\\"summary\\":\\"observability-run\\",\\"tokenInput\\":8,\\"tokenOutput\\":3,\\"usdCost\\":0.1234}"]',
      runtimeCwd: tempDir
    });
    await createIssue(db, {
      companyId,
      projectId: project.id,
      title: "Observe heartbeat cost recording",
      assigneeAgentId: agent.id
    });

    const runId = await runHeartbeatForAgent(db, companyId, agent.id, {
      trigger: "manual"
    });
    expect(runId).toBeTruthy();
    await appendCost(db, {
      companyId,
      providerType: "shell",
      tokenInput: 8,
      tokenOutput: 3,
      usdCost: "0.1234",
      projectId: project.id,
      agentId: agent.id
    });

    const costsBeforeRoute = await listCostEntries(db, companyId);
    const runsBeforeRoute = await listHeartbeatRuns(db, companyId);
    expect(costsBeforeRoute.length).toBeGreaterThan(0);
    expect(runsBeforeRoute.length).toBeGreaterThan(0);

    const costsResponse = await request(app).get("/observability/costs").set("x-company-id", companyId);
    expect(costsResponse.status).toBe(200);
    expect(Array.isArray(costsResponse.body.data)).toBe(true);
    expect(costsResponse.body.data.some((row: { usdCost: number }) => row.usdCost > 0)).toBe(true);

    const heartbeatsResponse = await request(app).get("/observability/heartbeats").set("x-company-id", companyId);
    expect(heartbeatsResponse.status).toBe(200);
    expect(Array.isArray(heartbeatsResponse.body.data)).toBe(true);
    const runRow = heartbeatsResponse.body.data.find((row: { id: string }) => row.id === runId);
    expect(runRow).toBeTruthy();
    expect(runRow.outcome).not.toBe(null);
    expect(typeof runRow.outcome).toBe("object");
    expect(runRow.runType).toBe("work");

    const runDetailResponse = await request(app)
      .get(`/observability/heartbeats/${encodeURIComponent(runId!)}`)
      .set("x-company-id", companyId);
    expect(runDetailResponse.status).toBe(200);
    expect(runDetailResponse.body.data.run.id).toBe(runId);
    expect(runDetailResponse.body.data.details).toBeTruthy();
    expect(runDetailResponse.body.data.transcript).toBeTruthy();

    const runMessagesResponse = await request(app)
      .get(`/observability/heartbeats/${encodeURIComponent(runId!)}/messages?limit=25`)
      .set("x-company-id", companyId);
    expect(runMessagesResponse.status).toBe(200);
    expect(runMessagesResponse.body.data.runId).toBe(runId);
    expect(Array.isArray(runMessagesResponse.body.data.items)).toBe(true);
    if (runMessagesResponse.body.data.items.length > 0) {
      expect(typeof runMessagesResponse.body.data.items[0].sequence).toBe("number");
    }

    await appendHeartbeatRunMessages(db, {
      companyId,
      runId: runId!,
      messages: [
        {
          sequence: 10_000,
          kind: "system",
          text: "OpenAI Codex vX banner",
          signalLevel: "noise",
          groupKey: "system",
          source: "stderr"
        },
        {
          sequence: 10_001,
          kind: "tool_call",
          label: "ReadFile",
          text: "ReadFile src/main.ts",
          signalLevel: "high",
          groupKey: "tool:readfile",
          source: "stdout"
        }
      ]
    });

    const signalOnlyResponse = await request(app)
      .get(`/observability/heartbeats/${encodeURIComponent(runId!)}/messages?signalOnly=true&limit=500`)
      .set("x-company-id", companyId);
    expect(signalOnlyResponse.status).toBe(200);
    expect(
      signalOnlyResponse.body.data.items.every((item: { signalLevel?: string }) => item.signalLevel !== "noise")
    ).toBe(true);

    const kindFilteredResponse = await request(app)
      .get(`/observability/heartbeats/${encodeURIComponent(runId!)}/messages?signalOnly=false&kinds=tool_call&limit=500`)
      .set("x-company-id", companyId);
    expect(kindFilteredResponse.status).toBe(200);
    expect(kindFilteredResponse.body.data.items.length).toBeGreaterThan(0);
    expect(kindFilteredResponse.body.data.items.every((item: { kind: string }) => item.kind === "tool_call")).toBe(
      true
    );
    expect(
      kindFilteredResponse.body.data.items.some(
        (item: { groupKey?: string | null; source?: string }) => item.groupKey && item.source
      )
    ).toBe(true);

    const memoryListResponse = await request(app)
      .get(`/observability/memory?agentId=${encodeURIComponent(agent.id)}`)
      .set("x-company-id", companyId);
    expect(memoryListResponse.status).toBe(200);
    expect(Array.isArray(memoryListResponse.body.data.items)).toBe(true);
    expect(memoryListResponse.body.data.items.length).toBeGreaterThan(0);
    const dailyNoteEntry = memoryListResponse.body.data.items.find((item: { relativePath: string }) =>
      item.relativePath.includes("memory/")
    );
    expect(dailyNoteEntry).toBeTruthy();
    if (!dailyNoteEntry) {
      throw new Error("Expected a daily memory note entry.");
    }

    const memoryFileResponse = await request(app)
      .get(
        `/observability/memory/${encodeURIComponent(agent.id)}/file?path=${encodeURIComponent(dailyNoteEntry.relativePath)}`
      )
      .set("x-company-id", companyId);
    expect(memoryFileResponse.status).toBe(200);
    expect(typeof memoryFileResponse.body.data.content).toBe("string");
    expect(memoryFileResponse.body.data.content).toContain(runId);
  });

  it("classifies no-assigned-work runs with a structured runType", async () => {
    const agent = await createAgent(db, {
      companyId,
      role: "Worker",
      name: "No Work Agent",
      providerType: "shell",
      heartbeatCron: "* * * * *",
      monthlyBudgetUsd: "25.0000",
      canHireAgents: false,
      runtimeCommand: "echo",
      runtimeArgsJson: '["{\\"summary\\":\\"no-op\\",\\"tokenInput\\":0,\\"tokenOutput\\":0,\\"usdCost\\":0}"]',
      runtimeCwd: tempDir
    });

    const runId = await runHeartbeatForAgent(db, companyId, agent.id, { trigger: "manual" });
    expect(runId).toBeTruthy();

    const heartbeatsResponse = await request(app).get("/observability/heartbeats").set("x-company-id", companyId);
    expect(heartbeatsResponse.status).toBe(200);
    const runRow = heartbeatsResponse.body.data.find((row: { id: string }) => row.id === runId);
    expect(runRow).toBeTruthy();
    expect(runRow.runType).toBe("no_assigned_work");
  });

  it("classifies adapter-prefixed no-assigned-work messages as no_assigned_work", async () => {
    const project = await createProject(db, {
      companyId,
      name: "Message Classification",
      workspaceLocalPath: tempDir
    });
    const agent = await createAgent(db, {
      companyId,
      role: "Worker",
      name: "Codex Message Agent",
      providerType: "shell",
      heartbeatCron: "* * * * *",
      monthlyBudgetUsd: "25.0000",
      canHireAgents: false,
      runtimeCommand: "echo",
      runtimeArgsJson: '["{\\"summary\\":\\"work-run\\",\\"tokenInput\\":1,\\"tokenOutput\\":1,\\"usdCost\\":0.0001}"]',
      runtimeCwd: tempDir
    });
    await createIssue(db, {
      companyId,
      projectId: project.id,
      title: "Generate a normal completed run",
      assigneeAgentId: agent.id
    });

    const runId = await runHeartbeatForAgent(db, companyId, agent.id, { trigger: "manual" });
    expect(runId).toBeTruthy();

    await db
      .update(heartbeatRuns)
      .set({ message: "Codex adapter: No assigned work found." });

    const heartbeatsResponse = await request(app).get("/observability/heartbeats").set("x-company-id", companyId);
    expect(heartbeatsResponse.status).toBe(200);
    const runRow = heartbeatsResponse.body.data.find((row: { id: string }) => row.id === runId);
    expect(runRow).toBeTruthy();
    expect(runRow.runType).toBe("no_assigned_work");
  });

  it("preserves nextCursor when filters reduce returned items", async () => {
    const project = await createProject(db, {
      companyId,
      name: "Cursor Correctness",
      workspaceLocalPath: tempDir
    });
    const agent = await createAgent(db, {
      companyId,
      role: "Worker",
      name: "Cursor Tester",
      providerType: "shell",
      heartbeatCron: "* * * * *",
      monthlyBudgetUsd: "25.0000",
      canHireAgents: false,
      runtimeCommand: "echo",
      runtimeArgsJson: '["{\\"summary\\":\\"cursor-run\\",\\"tokenInput\\":1,\\"tokenOutput\\":1,\\"usdCost\\":0.0001}"]',
      runtimeCwd: tempDir
    });
    await createIssue(db, {
      companyId,
      projectId: project.id,
      title: "Generate run for cursor coverage",
      assigneeAgentId: agent.id
    });
    const runId = await runHeartbeatForAgent(db, companyId, agent.id, { trigger: "manual" });
    expect(runId).toBeTruthy();

    await appendHeartbeatRunMessages(db, {
      companyId,
      runId: runId!,
      messages: Array.from({ length: 16 }, (_value, index) => ({
        sequence: 20_000 + index,
        kind: "system",
        text: `noise-${index}`,
        signalLevel: "noise" as const,
        groupKey: "system",
        source: "stderr" as const
      }))
    });

    const response = await request(app)
      .get(`/observability/heartbeats/${encodeURIComponent(runId!)}/messages?signalOnly=true&limit=10`)
      .set("x-company-id", companyId);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.items.length).toBeLessThan(10);
    expect(response.body.data.nextCursor).not.toBeNull();
  });
});
