import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import type { BopoDb } from "../packages/db/src/client";
import { bootstrapDatabase, createAgent, createCompany, listAgents } from "../packages/db/src/index";

describe("agent lifecycle routes", { timeout: 30_000 }, () => {
  let db: BopoDb;
  let app: ReturnType<typeof createApp>;
  let tempDir: string;
  let companyId: string;
  let client: { close?: () => Promise<void> };
  let agentId: string;
  const originalInstanceRoot = process.env.BOPO_INSTANCE_ROOT;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bopodev-agent-lifecycle-test-"));
    process.env.BOPO_INSTANCE_ROOT = join(tempDir, "instances");
    process.env.NODE_ENV = "development";
    const boot = await bootstrapDatabase(join(tempDir, "test.db"));
    db = boot.db;
    client = boot.client as { close?: () => Promise<void> };
    app = createApp({ db });
    const company = await createCompany(db, { name: "Lifecycle Co", mission: "Agent lifecycle tests." });
    companyId = company.id;
    const runtimeCwd = join(tempDir, "instances", "workspaces", companyId, "agents", "lifecycle");
    await mkdir(runtimeCwd, { recursive: true });
    const agent = await createAgent(db, {
      companyId,
      role: "Engineer",
      name: "Lifecycle Agent",
      providerType: "shell",
      heartbeatCron: "* * * * *",
      monthlyBudgetUsd: "10.0000",
      canHireAgents: false,
      runtimeCommand: "echo",
      runtimeArgs: ['{"summary":"noop","tokenInput":0,"tokenOutput":0,"usdCost":0}'],
      runtimeCwd
    });
    agentId = agent.id;
  });

  afterEach(async () => {
    process.env.BOPO_INSTANCE_ROOT = originalInstanceRoot;
    process.env.NODE_ENV = originalNodeEnv;
    await client?.close?.();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("supports pause and resume with agents:lifecycle permission", async () => {
    const forbidden = await request(app)
      .post(`/agents/${agentId}/pause`)
      .set("x-company-id", companyId)
      .set("x-actor-type", "member")
      .set("x-actor-id", "member-no-lifecycle")
      .set("x-actor-companies", companyId)
      .send({});
    expect(forbidden.status).toBe(403);

    const pauseResponse = await request(app)
      .post(`/agents/${agentId}/pause`)
      .set("x-company-id", companyId)
      .set("x-actor-type", "member")
      .set("x-actor-id", "member-lifecycle")
      .set("x-actor-companies", companyId)
      .set("x-actor-permissions", "agents:lifecycle")
      .send({});
    expect(pauseResponse.status).toBe(200);
    expect(pauseResponse.body.data.status).toBe("paused");

    const resumeResponse = await request(app)
      .post(`/agents/${agentId}/resume`)
      .set("x-company-id", companyId)
      .set("x-actor-type", "member")
      .set("x-actor-id", "member-lifecycle")
      .set("x-actor-companies", companyId)
      .set("x-actor-permissions", "agents:lifecycle")
      .send({});
    expect(resumeResponse.status).toBe(200);
    expect(resumeResponse.body.data.status).toBe("idle");
  });

  it("requires board role for terminate and delete", async () => {
    const terminateForbidden = await request(app)
      .post(`/agents/${agentId}/terminate`)
      .set("x-company-id", companyId)
      .set("x-actor-type", "member")
      .set("x-actor-id", "member-lifecycle")
      .set("x-actor-companies", companyId)
      .set("x-actor-permissions", "agents:lifecycle")
      .send({});
    expect(terminateForbidden.status).toBe(403);

    const terminateAllowed = await request(app).post(`/agents/${agentId}/terminate`).set("x-company-id", companyId).send({});
    expect(terminateAllowed.status).toBe(200);
    expect(terminateAllowed.body.data.status).toBe("terminated");

    const deleteAllowed = await request(app).delete(`/agents/${agentId}`).set("x-company-id", companyId);
    expect(deleteAllowed.status).toBe(200);
    expect(deleteAllowed.body.data.deleted).toBe(true);

    const agents = await listAgents(db, companyId);
    expect(agents.some((agent) => agent.id === agentId)).toBe(false);
  });

  it("persists capabilities on update and returns them from list", async () => {
    const putResponse = await request(app)
      .put(`/agents/${agentId}`)
      .set("x-company-id", companyId)
      .send({ capabilities: "Designs APIs and reviews pull requests." });
    expect(putResponse.status).toBe(200);
    expect(putResponse.body.data.capabilities).toBe("Designs APIs and reviews pull requests.");

    const listResponse = await request(app).get("/agents").set("x-company-id", companyId);
    expect(listResponse.status).toBe(200);
    const agents = listResponse.body.data as Array<{ id: string; capabilities?: string | null }>;
    const listed = agents.find((a) => a.id === agentId);
    expect(listed?.capabilities).toBe("Designs APIs and reviews pull requests.");
  });

  it("returns not found for missing agent lifecycle actions", async () => {
    const missingResume = await request(app)
      .post("/agents/missing-id/resume")
      .set("x-company-id", companyId)
      .set("x-actor-type", "member")
      .set("x-actor-id", "member-lifecycle")
      .set("x-actor-companies", companyId)
      .set("x-actor-permissions", "agents:lifecycle")
      .send({});
    expect(missingResume.status).toBe(404);

    const missingDelete = await request(app).delete("/agents/missing-id").set("x-company-id", companyId);
    expect(missingDelete.status).toBe(404);
  });
});
