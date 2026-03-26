import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import type { BopoDb } from "../packages/db/src/client";
import { bootstrapDatabase, createCompany } from "../packages/db/src/index";

describe("companies file export", { timeout: 30_000 }, () => {
  let db: BopoDb;
  let app: ReturnType<typeof createApp>;
  let tempDir: string;
  let companyId: string;
  let client: { close?: () => Promise<void> };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bopodev-file-export-"));
    const boot = await bootstrapDatabase(join(tempDir, "test.db"));
    db = boot.db;
    client = boot.client as { close?: () => Promise<void> };
    app = createApp({ db });
    const company = await createCompany(db, { name: "File Export Co", mission: "Zip tests." });
    companyId = company.id;
  }, 30_000);

  afterEach(async () => {
    await client?.close?.();
    await rm(tempDir, { recursive: true, force: true });
  }, 30_000);

  it("returns manifest including .bopo.yaml", async () => {
    const res = await request(app)
      .get(`/companies/${companyId}/export/files/manifest`)
      .set("x-company-id", companyId)
      .set("x-actor-type", "board")
      .set("x-actor-id", "local")
      .set("x-actor-companies", "")
      .set("x-actor-permissions", "");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const paths = (res.body.data.files as { path: string }[]).map((f) => f.path);
    expect(paths).toContain(".bopo.yaml");
    expect(paths).toContain("README.md");
    expect(paths).toContain("COMPANY.md");
  });

  it("returns a zip stream", async () => {
    const res = await request(app)
      .post(`/companies/${companyId}/export/files/zip`)
      .set("x-company-id", companyId)
      .set("x-actor-type", "board")
      .set("x-actor-id", "local")
      .set("x-actor-companies", "")
      .set("x-actor-permissions", "")
      .set("content-type", "application/json")
      .send({ includeAgentMemory: false });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/zip/);
    expect(Buffer.isBuffer(res.body) ? res.body.length : res.text.length).toBeGreaterThan(30);
  });
});
