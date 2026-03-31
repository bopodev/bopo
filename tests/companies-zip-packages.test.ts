import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { finished } from "node:stream/promises";
import { strToU8, zipSync } from "fflate";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import { pipeCompanyExportZip } from "../apps/api/src/services/company-file-archive-service";
import type { BopoDb } from "../packages/db/src/client";
import {
  bootstrapDatabase,
  createAgent,
  createCompany,
  createGoal,
  createProject,
  getCompanyAgent,
  listAgents,
  listGoals
} from "../packages/db/src/index";

const boardHeaders = (companyId: string) => ({
  "x-company-id": companyId,
  "x-actor-type": "board",
  "x-actor-id": "local",
  "x-actor-companies": "",
  "x-actor-permissions": ""
});

function zipWithBopoYaml(yaml: string): Buffer {
  const files: Record<string, Uint8Array> = {
    ".bopo.yaml": strToU8(yaml)
  };
  return Buffer.from(zipSync(files));
}

async function exportCompanyZipBuffer(db: BopoDb, srcCompanyId: string): Promise<Buffer> {
  const stream = await pipeCompanyExportZip(db, srcCompanyId, { paths: null, includeAgentMemory: false });
  const chunks: Buffer[] = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.from(chunk));
      cb();
    }
  });
  stream.pipe(sink);
  await finished(sink);
  return Buffer.concat(chunks);
}

describe("companies zip packages, starters, preview", { timeout: 30_000 }, () => {
  let db: BopoDb;
  let app: ReturnType<typeof createApp>;
  let tempDir: string;
  let companyId: string;
  let client: { close?: () => Promise<void> };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bopodev-zip-pkg-"));
    const boot = await bootstrapDatabase(join(tempDir, "test.db"));
    db = boot.db;
    client = boot.client as { close?: () => Promise<void> };
    app = createApp({ db });
    const company = await createCompany(db, { name: "Zip Pkg Co", mission: "Tests." });
    companyId = company.id;
  }, 30_000);

  afterEach(async () => {
    await client?.close?.();
    await rm(tempDir, { recursive: true, force: true });
  }, 30_000);

  it("returns 410 for legacy JSON company export", async () => {
    const res = await request(app).get(`/companies/${companyId}/export`).set(boardHeaders(companyId));
    expect(res.status).toBe(410);
    expect(String(res.body.error ?? "")).toMatch(/zip/i);
  });

  it("lists starter packs for board", async () => {
    const res = await request(app).get("/companies/starter-packs").set(boardHeaders(companyId));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const packs = res.body.data.starterPacks as { id: string }[];
    expect(Array.isArray(packs)).toBe(true);
    expect(packs.some((p) => p.id === "founder-startup-basic")).toBe(true);
    expect(packs.some((p) => p.id === "marketing-content-engine")).toBe(true);
    expect(packs.some((p) => p.id === "product-delivery-trio")).toBe(true);
    expect(packs.some((p) => p.id === "revenue-gtm-b2b")).toBe(true);
    expect(packs.some((p) => p.id === "devrel-growth")).toBe(true);
    expect(packs.some((p) => p.id === "customer-support-excellence")).toBe(true);
  });

  it("creates company from founder starter template with multiple agents", async () => {
    const res = await request(app)
      .post("/companies")
      .set(boardHeaders(companyId))
      .send({
        name: "From Starter Inc",
        mission: "Seeded from pack.",
        providerType: "shell",
        runtimeModel: "",
        starterPackId: "founder-startup-basic"
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const newId = res.body.data.id as string;
    const agents = await listAgents(db, newId);
    expect(agents.length).toBeGreaterThanOrEqual(3);
    const ceo = agents.find((a) => (a.roleKey ?? "").toLowerCase() === "ceo");
    expect(ceo).toBeTruthy();
    expect(ceo?.providerType).toBe("shell");
    const goals = await listGoals(db, newId);
    expect(goals.length).toBeGreaterThanOrEqual(1);
  });

  it("creates company from product-delivery-trio zip starter with agents goals and ceo bootstrap", async () => {
    const res = await request(app)
      .post("/companies")
      .set(boardHeaders(companyId))
      .send({
        name: "Zip Trio Co",
        mission: "Seeded from zip pack.",
        providerType: "shell",
        runtimeModel: "",
        starterPackId: "product-delivery-trio"
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const newId = res.body.data.id as string;
    const agents = await listAgents(db, newId);
    expect(agents.length).toBe(3);
    const goals = await listGoals(db, newId);
    expect(goals.length).toBe(3);
    const ceo = agents.find((a) => (a.roleKey ?? "").toLowerCase() === "ceo");
    expect(ceo?.bootstrapPrompt ?? "").toContain("product-led");
  });

  it("creates company from marketing starter template with marketing org", async () => {
    const res = await request(app)
      .post("/companies")
      .set(boardHeaders(companyId))
      .send({
        name: "Acme Marketing",
        mission: "Reach builders.",
        providerType: "shell",
        runtimeModel: "",
        starterPackId: "marketing-content-engine"
      });
    expect(res.status).toBe(200);
    const newId = res.body.data.id as string;
    const agents = await listAgents(db, newId);
    expect(agents.length).toBeGreaterThanOrEqual(4);
    const cmo = agents.find((a) => (a.roleKey ?? "").toLowerCase() === "cmo");
    expect(cmo).toBeTruthy();
    expect(cmo?.providerType).toBe("shell");
  });

  it("import preview returns ok summary for valid minimal zip", async () => {
    const yaml = `schema: bopo/company-export/v1
company:
  name: Preview Co
  mission: null
projects:
  ops:
    name: Operations
    description: null
agents:
  ceo:
    name: CEO
    role: CEO
    roleKey: ceo
    title: CEO
    capabilities: Lead
    providerType: shell
    heartbeatCron: "*/5 * * * *"
`;
    const buf = zipWithBopoYaml(yaml);
    const res = await request(app)
      .post("/companies/import/files/preview")
      .set(boardHeaders(companyId))
      .attach("archive", buf, "p.zip");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const d = res.body.data;
    expect(d.ok).toBe(true);
    expect(d.companyName).toBe("Preview Co");
    expect(d.counts.projects).toBe(1);
    expect(d.counts.agents).toBe(1);
    expect(d.hasCeo).toBe(true);
  });

  it("import seeds agent bootstrapPrompt and monthlyBudgetUsd from manifest", async () => {
    const yaml = `schema: bopo/company-export/v1
company:
  name: Bootstrap Import Co
  mission: null
projects:
  ops:
    name: Operations
    description: null
agents:
  ceo:
    name: CEO
    role: CEO
    roleKey: ceo
    title: CEO
    capabilities: Lead
    providerType: shell
    heartbeatCron: "*/5 * * * *"
    bootstrapPrompt: "Standing instructions from zip."
    monthlyBudgetUsd: 250
`;
    const buf = zipWithBopoYaml(yaml);
    const res = await request(app)
      .post("/companies/import/files")
      .set(boardHeaders(companyId))
      .attach("archive", buf, "boot.zip");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const newCompanyId = res.body.data.companyId as string;
    const agents = await listAgents(db, newCompanyId);
    const ceo = agents.find((a) => (a.roleKey ?? "").toLowerCase() === "ceo");
    expect(ceo).toBeTruthy();
    const row = await getCompanyAgent(db, newCompanyId, ceo!.id);
    expect(row?.bootstrapPrompt).toBe("Standing instructions from zip.");
    expect(String(row?.monthlyBudgetUsd ?? "")).toMatch(/^250/);
  });

  it("import preview returns ok false for invalid manifest", async () => {
    const buf = zipWithBopoYaml(`schema: bopo/wrong/v1
company:
  name: X
projects: {}
agents: {}
`);
    const res = await request(app)
      .post("/companies/import/files/preview")
      .set(boardHeaders(companyId))
      .attach("archive", buf, "bad.zip");
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(false);
    expect((res.body.data.errors as string[]).length).toBeGreaterThan(0);
  });

  it("round-trips goals via export zip and import", async () => {
    const src = await createCompany(db, { name: "Goals Source", mission: null });
    const project = await createProject(db, { companyId: src.id, name: "Alpha", description: "D" });
    expect(project).toBeTruthy();
    const parent = await createGoal(db, {
      companyId: src.id,
      level: "company",
      title: "Company North Star Unique",
      description: "parent"
    });
    await createGoal(db, {
      companyId: src.id,
      level: "project",
      projectId: project!.id,
      parentGoalId: parent.id,
      title: "Milestone Child Unique",
      description: "child"
    });

    const zipBuffer = await exportCompanyZipBuffer(db, src.id);

    const imp = await request(app)
      .post("/companies/import/files")
      .set(boardHeaders(companyId))
      .attach("archive", zipBuffer, "export.zip");
    expect(imp.status).toBe(200);
    const newCompanyId = imp.body.data.companyId as string;

    const importedGoals = await listGoals(db, newCompanyId);
    expect(importedGoals).toHaveLength(2);
    const child = importedGoals.find((g) => g.title === "Milestone Child Unique");
    const par = importedGoals.find((g) => g.title === "Company North Star Unique");
    expect(child).toBeTruthy();
    expect(par).toBeTruthy();
    expect(child?.parentGoalId).toBe(par?.id);
    expect(child?.level).toBe("project");
  });

  it("round-trips agent bootstrapPrompt and monthlyBudgetUsd via export zip and import", async () => {
    const src = await createCompany(db, { name: "Bootstrap RT Co", mission: null });
    await createAgent(db, {
      companyId: src.id,
      role: "CEO",
      roleKey: "ceo",
      name: "Bootstrap CEO",
      providerType: "shell",
      heartbeatCron: "*/5 * * * *",
      monthlyBudgetUsd: "99.0000",
      bootstrapPrompt: "Unique export bootstrap line xyz."
    });

    const zipBuffer = await exportCompanyZipBuffer(db, src.id);

    const imp = await request(app)
      .post("/companies/import/files")
      .set(boardHeaders(companyId))
      .attach("archive", zipBuffer, "rt.zip");
    expect(imp.status).toBe(200);
    const newCompanyId = imp.body.data.companyId as string;
    const agents = await listAgents(db, newCompanyId);
    const ceo = agents.find((a) => (a.roleKey ?? "").toLowerCase() === "ceo");
    expect(ceo).toBeTruthy();
    const row = await getCompanyAgent(db, newCompanyId, ceo!.id);
    expect(row?.bootstrapPrompt).toBe("Unique export bootstrap line xyz.");
    expect(Number(row?.monthlyBudgetUsd)).toBeCloseTo(99, 2);
  });
});
