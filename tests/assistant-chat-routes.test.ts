import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import type { BopoDb } from "../packages/db/src/client";
import { bootstrapDatabase, createCompany } from "../packages/db/src/index";

describe("assistant chat routes (no LLM)", { timeout: 30_000 }, () => {
  let db: BopoDb;
  let app: ReturnType<typeof createApp>;
  let tempDir: string;
  let companyId: string;
  let client: { close?: () => Promise<void> };
  const previousInstanceRoot = process.env.BOPO_INSTANCE_ROOT;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bopodev-assistant-routes-"));
    process.env.BOPO_INSTANCE_ROOT = join(tempDir, "instances");
    process.env.NODE_ENV = "development";
    const boot = await bootstrapDatabase(join(tempDir, "test.db"));
    db = boot.db;
    client = boot.client as { close?: () => Promise<void> };
    app = createApp({ db });
    const company = await createCompany(db, { name: "Assistant Routes Co", mission: "Route tests." });
    companyId = company.id;
  });

  afterEach(async () => {
    process.env.BOPO_INSTANCE_ROOT = previousInstanceRoot;
    process.env.NODE_ENV = previousNodeEnv;
    await client?.close?.();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("POST /assistant/threads and GET /assistant/messages?threadId=… round-trip", async () => {
    const threadRes = await request(app).post("/assistant/threads").set("x-company-id", companyId);
    expect(threadRes.status).toBe(200);
    expect(threadRes.body.ok).toBe(true);
    const threadId = threadRes.body.data.threadId as string;
    expect(threadId.length).toBeGreaterThan(0);

    const listRes = await request(app)
      .get(`/assistant/messages?threadId=${encodeURIComponent(threadId)}`)
      .set("x-company-id", companyId);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.threadId).toBe(threadId);
    expect(Array.isArray(listRes.body.data.messages)).toBe(true);
    expect(listRes.body.data.messages).toHaveLength(0);
  });

  it("GET /assistant/brains returns a non-empty catalog", async () => {
    const res = await request(app).get("/assistant/brains").set("x-company-id", companyId);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.brains)).toBe(true);
    expect(res.body.data.brains.length).toBeGreaterThan(0);
  });
});
