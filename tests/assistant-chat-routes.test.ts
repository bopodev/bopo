import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import type { BopoDb } from "../packages/db/src/client";
import {
  bootstrapDatabase,
  createAssistantThread,
  createCompany,
  insertAssistantMessage
} from "../packages/db/src/index";

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

  it("GET /assistant/threads lists threads with last-message preview", async () => {
    const older = await createAssistantThread(db, companyId);
    const newer = await createAssistantThread(db, companyId);
    await insertAssistantMessage(db, {
      threadId: older.id,
      companyId,
      role: "user",
      body: "First thread question"
    });
    await insertAssistantMessage(db, {
      threadId: newer.id,
      companyId,
      role: "assistant",
      body: "Latest thread reply"
    });

    const res = await request(app).get("/assistant/threads").set("x-company-id", companyId);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const threads = res.body.data.threads as Array<{ id: string; preview: string | null; updatedAt: string }>;
    expect(threads.length).toBeGreaterThanOrEqual(2);
    const byId = Object.fromEntries(threads.map((t) => [t.id, t]));
    expect(byId[newer.id]?.preview).toContain("Latest thread reply");
    expect(byId[older.id]?.preview).toContain("First thread question");
    expect(threads[0]?.id).toBe(newer.id);
  });

  it("DELETE /assistant/threads/:threadId removes thread and messages", async () => {
    const thread = await createAssistantThread(db, companyId);
    await insertAssistantMessage(db, {
      threadId: thread.id,
      companyId,
      role: "user",
      body: "To be deleted"
    });

    const del = await request(app)
      .delete(`/assistant/threads/${encodeURIComponent(thread.id)}`)
      .set("x-company-id", companyId);
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const messagesRes = await request(app)
      .get(`/assistant/messages?threadId=${encodeURIComponent(thread.id)}`)
      .set("x-company-id", companyId);
    expect(messagesRes.status).toBe(404);
  });
});
