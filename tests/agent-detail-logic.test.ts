import { describe, expect, it } from "vitest";
import { parseRuntimeFromAgentColumns, summarizeRunMessage } from "../apps/web/src/lib/agent-detail-logic";

describe("agent detail logic helpers", () => {
  it("summarizes blocked outcomes using blocker detail", () => {
    const summary = summarizeRunMessage("failed", "raw error", {
      kind: "blocked",
      blockers: [{ message: "API key is missing." }],
      actions: []
    });
    expect(summary).toBe("API key is missing.");
  });

  it("normalizes common runtime message cases", () => {
    expect(summarizeRunMessage("completed", null, null)).toBe("Completed successfully.");
    expect(summarizeRunMessage("running", "", null)).toBe("Run is currently in progress.");
    expect(summarizeRunMessage("failed", "credentials missing for provider", null)).toContain("Missing runtime credentials");
    expect(summarizeRunMessage("failed", "run timed out after 30s", null)).toBe("Run timed out before completion.");
  });

  it("parses runtime config columns when JSON is valid", () => {
    const runtime = parseRuntimeFromAgentColumns({
      runtimeCommand: "codex",
      runtimeArgsJson: '["--model","gpt-5"]',
      runtimeCwd: "/tmp/work",
      runtimeEnvJson: '{"OPENAI_API_KEY":"secret","IGNORED":3}',
      runtimeModel: "gpt-5",
      runtimeThinkingEffort: "high",
      runtimeTimeoutSec: 45,
      interruptGraceSec: 5,
      runPolicyJson: '{"sandboxMode":"full_access","allowWebSearch":true}'
    });

    expect(runtime).toMatchObject({
      command: "codex",
      args: ["--model", "gpt-5"],
      cwd: "/tmp/work",
      model: "gpt-5",
      thinkingEffort: "high",
      timeoutMs: 45_000,
      interruptGraceSec: 5,
      runPolicy: { sandboxMode: "full_access", allowWebSearch: true }
    });
    expect(runtime?.env).toEqual({ OPENAI_API_KEY: "secret" });
  });

  it("returns null when no runtime columns are present", () => {
    const runtime = parseRuntimeFromAgentColumns({});
    expect(runtime).toBe(null);
  });
});
