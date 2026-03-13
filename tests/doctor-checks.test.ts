import { describe, expect, it } from "vitest";
import { runDoctorChecks } from "../packages/cli/src/lib/checks";

describe("doctor checks", () => {
  it("includes both codex and opencode runtime checks", { timeout: 15_000 }, async () => {
    const checks = await runDoctorChecks();
    const labels = checks.map((check) => check.label);
    expect(labels).toContain("Codex runtime");
    expect(labels).toContain("OpenCode runtime");
  });
});
