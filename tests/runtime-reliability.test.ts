import { describe, expect, it } from "vitest";
import { checkRuntimeCommandHealth, executePromptRuntime } from "../packages/agent-sdk/src/runtime";

describe("runtime reliability", () => {
  it("classifies non-zero exits correctly", async () => {
    const run = await executePromptRuntime(process.execPath, "payload", {
      args: ["-e", "process.exit(3)"]
    });
    expect(run.ok).toBe(false);
    expect(run.failureType).toBe("nonzero_exit");
    expect(run.code).toBe(3);
  });

  it("does not retry non-transient spawn errors", async () => {
    const run = await executePromptRuntime("definitely-not-a-real-command-bopodev", "payload", {
      retryCount: 2,
      retryBackoffMs: 10
    });
    expect(run.ok).toBe(false);
    expect(run.failureType).toBe("spawn_error");
    expect(run.attemptCount).toBe(1);
  });

  it("reports command health for existing runtimes", async () => {
    const health = await checkRuntimeCommandHealth(process.execPath, { timeoutMs: 2_000 });
    expect(health.available).toBe(true);
    expect(health.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
