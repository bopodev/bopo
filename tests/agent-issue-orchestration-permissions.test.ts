import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import type { BopoDb } from "../packages/db/src/client";
import {
  bootstrapDatabase,
  createAgent,
  createCompany,
  createIssue,
  createProject
} from "../packages/db/src/index";

function agentHeaders(companyId: string, agentId: string) {
  return {
    "x-company-id": companyId,
    "x-actor-type": "agent",
    "x-actor-id": agentId,
    "x-actor-companies": companyId,
    "x-actor-permissions": "issues:write"
  };
}

describe("agent issue orchestration permissions", { timeout: 30_000 }, () => {
  let db: BopoDb;
  let app: ReturnType<typeof createApp>;
  let tempDir: string;
  let companyId: string;
  let projectId: string;
  let client: { close?: () => Promise<void> };
  let agentOpen: string;
  let agentOther: string;
  let agentNoCreate: string;
  let agentNoAssign: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bopodev-agent-issue-perm-"));
    const boot = await bootstrapDatabase(join(tempDir, "test.db"));
    db = boot.db;
    client = boot.client as { close?: () => Promise<void> };
    app = createApp({ db });
    const company = await createCompany(db, { name: "Orchestration Co", mission: "Test." });
    companyId = company.id;
    const project = await createProject(db, { companyId, name: "P1" });
    if (!project) {
      throw new Error("seed project");
    }
    projectId = project.id;

    async function mk(name: string, extra: { canCreateIssues?: boolean; canAssignAgents?: boolean } = {}) {
      const a = await createAgent(db, {
        companyId,
        role: "Worker",
        name,
        providerType: "shell",
        heartbeatCron: "*/5 * * * *",
        monthlyBudgetUsd: "1.0000",
        canHireAgents: false,
        canCreateIssues: extra.canCreateIssues ?? true,
        canAssignAgents: extra.canAssignAgents ?? true,
        runtimeCommand: "echo",
        runtimeArgsJson: JSON.stringify(['{"summary":"x","tokenInput":0,"tokenOutput":0,"usdCost":0}']),
        runtimeCwd: tempDir
      });
      return a.id;
    }

    agentOpen = await mk("Open");
    agentOther = await mk("Other");
    agentNoCreate = await mk("NoCreate", { canCreateIssues: false });
    agentNoAssign = await mk("NoAssign", { canAssignAgents: false });
  });

  afterEach(async () => {
    await client?.close?.();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("denies POST /issues when agent lacks canCreateIssues", async () => {
    const res = await request(app)
      .post("/issues")
      .set(agentHeaders(companyId, agentNoCreate))
      .send({ projectId, title: "T", priority: "none" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("not allowed to create");
  });

  it("allows POST /issues with canCreateIssues and no assignee", async () => {
    const res = await request(app)
      .post("/issues")
      .set(agentHeaders(companyId, agentOpen))
      .send({ projectId, title: "T", priority: "none" });
    expect(res.status).toBe(200);
  });

  it("denies POST /issues assigning to another agent when canAssignAgents is false", async () => {
    const res = await request(app)
      .post("/issues")
      .set(agentHeaders(companyId, agentNoAssign))
      .send({ projectId, title: "T", priority: "none", assigneeAgentId: agentOther });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("not allowed to assign");
  });

  it("allows POST /issues with self as assignee without canAssignAgents", async () => {
    const res = await request(app)
      .post("/issues")
      .set(agentHeaders(companyId, agentNoAssign))
      .send({ projectId, title: "T", priority: "none", assigneeAgentId: agentNoAssign });
    expect(res.status).toBe(200);
  });

  it("allows PUT assignee to self without canAssignAgents", async () => {
    const issue = await createIssue(db, {
      companyId,
      projectId,
      title: "Handoff",
      assigneeAgentId: agentOther
    });
    const res = await request(app)
      .put(`/issues/${issue.id}`)
      .set(agentHeaders(companyId, agentNoAssign))
      .send({ assigneeAgentId: agentNoAssign });
    expect(res.status).toBe(200);
  });

  it("denies PUT unassign without canAssignAgents", async () => {
    const issue = await createIssue(db, {
      companyId,
      projectId,
      title: "Assigned",
      assigneeAgentId: agentOther
    });
    const res = await request(app)
      .put(`/issues/${issue.id}`)
      .set(agentHeaders(companyId, agentNoAssign))
      .send({ assigneeAgentId: null });
    expect(res.status).toBe(403);
  });
});
