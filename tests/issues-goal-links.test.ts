import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import type { BopoDb } from "../packages/db/src/client";
import { bootstrapDatabase, createCompany, createGoal, createProject } from "../packages/db/src/index";

describe("issues API goalIds", { timeout: 30_000 }, () => {
  let db: BopoDb;
  let app: ReturnType<typeof createApp>;
  let tempDir: string;
  let companyId: string;
  let client: { close?: () => Promise<void> };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bopodev-issues-goals-"));
    const boot = await bootstrapDatabase(join(tempDir, "test.db"));
    db = boot.db;
    client = boot.client as { close?: () => Promise<void> };
    app = createApp({ db });
    const company = await createCompany(db, { name: "Goals Link Co" });
    companyId = company.id;
  });

  afterEach(async () => {
    await client?.close?.();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("POST /issues returns goalIds and persists links", async () => {
    const project = await createProject(db, { companyId, name: "Proj" });
    const goal = await createGoal(db, { companyId, level: "company", title: "Ship v1" });
    const res = await request(app)
      .post("/issues")
      .set("x-company-id", companyId)
      .send({
        projectId: project.id,
        title: "Linked work",
        goalIds: [goal.id]
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.goalIds).toEqual([goal.id]);

    const list = await request(app).get("/issues").set("x-company-id", companyId);
    expect(list.status).toBe(200);
    const row = list.body.data.find((i: { id: string }) => i.id === res.body.data.id);
    expect(row?.goalIds).toEqual([goal.id]);
  });

  it("PUT /issues/:id replaces goalIds", async () => {
    const project = await createProject(db, { companyId, name: "Proj2" });
    const g1 = await createGoal(db, { companyId, level: "company", title: "G1" });
    const g2 = await createGoal(db, { companyId, level: "company", title: "G2" });
    const createRes = await request(app)
      .post("/issues")
      .set("x-company-id", companyId)
      .send({
        projectId: project.id,
        title: "Replace goals",
        goalIds: [g1.id]
      });
    expect(createRes.status).toBe(200);
    const issueId = createRes.body.data.id as string;

    const putRes = await request(app).put(`/issues/${issueId}`).set("x-company-id", companyId).send({
      goalIds: [g2.id]
    });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.goalIds).toEqual([g2.id]);
  });

  it("POST /issues rejects a goal scoped to another project", async () => {
    const p1 = await createProject(db, { companyId, name: "P1" });
    const p2 = await createProject(db, { companyId, name: "P2" });
    const otherGoal = await createGoal(db, {
      companyId,
      level: "project",
      projectId: p2.id,
      title: "Only P2"
    });
    const res = await request(app)
      .post("/issues")
      .set("x-company-id", companyId)
      .send({
        projectId: p1.id,
        title: "Wrong goal project",
        goalIds: [otherGoal.id]
      });
    expect(res.status).toBe(422);
  });
});
