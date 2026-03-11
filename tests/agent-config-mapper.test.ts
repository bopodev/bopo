import { describe, expect, it } from "vitest";
import {
  normalizeRuntimeConfig,
  parseRuntimeConfigFromAgentRow,
  runtimeConfigToDb
} from "../apps/api/src/lib/agent-config";

describe("agent config mapper", () => {
  it("normalizes legacy runtime timeout to seconds and applies defaults", () => {
    const normalized = normalizeRuntimeConfig({
      legacy: {
        runtimeCommand: "codex",
        runtimeArgs: ["exec"],
        runtimeTimeoutMs: 120000,
        runPolicy: { allowWebSearch: true }
      },
      defaultRuntimeCwd: "/tmp/workspace"
    });
    expect(normalized.runtimeCommand).toBe("codex");
    expect(normalized.runtimeTimeoutSec).toBe(120);
    expect(normalized.runtimeCwd).toBe("/tmp/workspace");
    expect(normalized.runPolicy.allowWebSearch).toBe(true);
    expect(normalized.runPolicy.sandboxMode).toBe("workspace_write");
  });

  it("parses runtime config from normalized columns with state fallback", () => {
    const parsed = parseRuntimeConfigFromAgentRow({
      runtimeCommand: null,
      runtimeArgsJson: null,
      runtimeCwd: null,
      runtimeEnvJson: "{}",
      runtimeModel: null,
      runtimeThinkingEffort: "auto",
      bootstrapPrompt: null,
      runtimeTimeoutSec: 0,
      interruptGraceSec: 15,
      runPolicyJson: "{}",
      stateBlob: JSON.stringify({
        runtime: {
          command: "codex",
          args: ["exec", "--full-auto"],
          cwd: "/tmp/fallback",
          timeoutMs: 60000
        }
      })
    });
    expect(parsed.runtimeCommand).toBe("codex");
    expect(parsed.runtimeArgs).toEqual(["exec", "--full-auto"]);
    expect(parsed.runtimeCwd).toBe("/tmp/fallback");
    expect(parsed.runtimeTimeoutSec).toBe(60);
  });

  it("serializes normalized runtime for db persistence", () => {
    const runtime = normalizeRuntimeConfig({
      runtimeConfig: {
        runtimeCommand: "codex",
        runtimeArgs: ["exec", "--full-auto"],
        runtimeEnv: { FOO: "bar" },
        runtimeTimeoutSec: 90,
        interruptGraceSec: 20,
        runPolicy: { sandboxMode: "full_access", allowWebSearch: true }
      }
    });
    const dbColumns = runtimeConfigToDb(runtime);
    expect(dbColumns.runtimeCommand).toBe("codex");
    expect(dbColumns.runtimeArgsJson).toContain("--full-auto");
    expect(dbColumns.runtimeEnvJson).toContain("FOO");
    expect(dbColumns.runPolicyJson).toContain("full_access");
    expect(dbColumns.runtimeTimeoutSec).toBe(90);
  });

  it("preserves runtimeConfig env when legacy env is undefined", () => {
    const normalized = normalizeRuntimeConfig({
      runtimeConfig: {
        runtimeEnv: {
          OPENAI_API_KEY: "sk-test",
          TEST_VAR: "hello"
        }
      },
      legacy: {
        runtimeEnv: undefined
      }
    });

    expect(normalized.runtimeEnv.OPENAI_API_KEY).toBe("sk-test");
    expect(normalized.runtimeEnv.TEST_VAR).toBe("hello");
  });
});
