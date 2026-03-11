import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ExecutionOutcomeSchema } from "../packages/contracts/src/index";
import {
  getAdapterMetadata,
  getAdapterModels,
  resolveAdapter,
  runAdapterEnvironmentTest
} from "../packages/agent-sdk/src/registry";

describe("adapter platform contracts", () => {
  it("exposes cursor and opencode in adapter metadata", () => {
    const metadata = getAdapterMetadata();
    expect(metadata.some((entry) => entry.providerType === "cursor")).toBe(true);
    expect(metadata.some((entry) => entry.providerType === "opencode")).toBe(true);
    expect(metadata.some((entry) => entry.providerType === "openai_api")).toBe(true);
    expect(metadata.some((entry) => entry.providerType === "anthropic_api")).toBe(true);
  });

  it("surfaces missing-key preflight checks for direct API adapters", async () => {
    const openai = await runAdapterEnvironmentTest("openai_api", {
      env: {}
    });
    expect(openai.status).toBe("fail");
    expect(openai.checks.some((check) => check.code === "api_key_missing")).toBe(true);

    const anthropic = await runAdapterEnvironmentTest("anthropic_api", {
      env: {}
    });
    expect(anthropic.status).toBe("fail");
    expect(anthropic.checks.some((check) => check.code === "api_key_missing")).toBe(true);
  });

  it("executes OpenAI direct adapter and parses structured usage", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output_text: "openai-direct-ok",
          usage: {
            input_tokens: 12,
            output_tokens: 4
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", fetchMock);
    try {
      const adapter = resolveAdapter("openai_api");
      const result = await adapter.execute({
        companyId: "demo-company",
        agentId: "agent-1",
        providerType: "openai_api",
        heartbeatRunId: "run-1",
        company: { name: "Demo Co", mission: null },
        agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
        workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
        state: {},
        runtime: {
          env: { OPENAI_API_KEY: "sk-test" },
          model: "gpt-5"
        }
      });
      expect(result.status).toBe("ok");
      expect(result.summary).toContain("openai-direct-ok");
      expect(result.tokenInput).toBe(12);
      expect(result.tokenOutput).toBe(4);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("retries transient direct API failures before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "rate limited" } }), {
          status: 429,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_text: "retry-ok",
            usage: { input_tokens: 2, output_tokens: 1 }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", fetchMock);
    try {
      const adapter = resolveAdapter("openai_api");
      const result = await adapter.execute({
        companyId: "demo-company",
        agentId: "agent-1",
        providerType: "openai_api",
        heartbeatRunId: "run-1",
        company: { name: "Demo Co", mission: null },
        agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
        workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
        state: {},
        runtime: {
          env: { OPENAI_API_KEY: "sk-test" },
          retryCount: 1,
          retryBackoffMs: 1
        }
      });
      expect(result.status).toBe("ok");
      expect(result.summary).toContain("retry-ok");
      expect(result.trace?.attemptCount).toBe(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("returns fallback cursor model options when discovery is unavailable", async () => {
    const models = await getAdapterModels("cursor", {
      command: process.execPath,
      args: ["-e", "process.exit(1)"]
    });
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((entry) => entry.id === "auto")).toBe(true);
  });

  it("runs codex environment test with actionable status", async () => {
    const result = await runAdapterEnvironmentTest("codex", {
      command: process.execPath,
      args: [
        "-e",
        "console.log('{\"summary\":\"hello\",\"tokenInput\":1,\"tokenOutput\":1,\"usdCost\":0.000001}')"
      ],
      cwd: process.cwd()
    });
    expect(["pass", "warn"]).toContain(result.status);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it("runs cursor environment probe with launch args aligned to execution", async () => {
    const captureDir = await mkdtemp(join(tmpdir(), "bopodev-cursor-probe-"));
    const capturePath = join(captureDir, "capture.json");
    const { command, cleanup } = await createCliShim(
      "cursor",
      [
        "const fs = require('node:fs');",
        "const argv = process.argv.slice(2);",
        "if (argv.includes('--version')) {",
        "  console.log('cursor 1.0.0');",
        "  process.exit(0);",
        "}",
        "if (process.env.CURSOR_CAPTURE_PATH) {",
        "  fs.writeFileSync(process.env.CURSOR_CAPTURE_PATH, JSON.stringify({ argv, prompt: fs.readFileSync(0, 'utf8') }), 'utf8');",
        "}",
        "console.log(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'output_text', text: 'probe-ok' }] } }));",
        "console.log(JSON.stringify({ type: 'result', subtype: 'success', session_id: 'probe-session', usage: { input_tokens: 1, output_tokens: 1 } }));"
      ].join("\n")
    );
    const result = await runAdapterEnvironmentTest("cursor", {
      command,
      cwd: process.cwd(),
      env: { CURSOR_CAPTURE_PATH: capturePath }
    });
    const capture = JSON.parse(await readFile(capturePath, "utf8")) as { argv: string[]; prompt: string };
    await cleanup();
    await rm(captureDir, { recursive: true, force: true });
    expect(result.status).toBe("pass");
    expect(capture.argv).toContain("agent");
    expect(capture.argv).toContain("--output-format");
    expect(capture.argv).toContain("stream-json");
    expect(capture.argv).toContain("--workspace");
    expect(capture.prompt).toContain("Respond with hello.");
  });

  it("emits execution outcomes that conform to schema", async () => {
    const adapter = resolveAdapter("shell");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "shell",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {}
    });
    const parsed = ExecutionOutcomeSchema.safeParse(result.outcome);
    expect(parsed.success).toBe(true);
  });

  it("returns actionable spawn error detail instead of unknown error", async () => {
    const adapter = resolveAdapter("claude_code");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "claude_code",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        command: "definitely-not-real-claude-command"
      }
    });
    expect(result.status).toBe("failed");
    expect(result.summary.toLowerCase()).toContain("spawn");
    expect(result.summary).not.toContain("unknown error");
  });

  it("fails successful runtimes that do not emit structured heartbeat output", async () => {
    const adapter = resolveAdapter("codex");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "codex",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        command: process.execPath,
        args: ["-e", ""]
      }
    });
    expect(result.status).toBe("failed");
    expect(result.summary).toContain("without structured heartbeat JSON output");
  });

  it("parses multiline JSON usage payloads from runtime output", async () => {
    const adapter = resolveAdapter("codex");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "codex",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        command: process.execPath,
        args: [
          "-e",
          "console.log(JSON.stringify({ summary: 'multiline-ok', tokenInput: 3, tokenOutput: 2, usdCost: 0.00001 }, null, 2));"
        ]
      }
    });
    expect(result.status).toBe("ok");
    expect(result.summary).toContain("multiline-ok");
  });

  it("parses claude structured output when logs surround final JSON", async () => {
    const { command, cleanup } = await createCliShim(
      "claude",
      "console.log('progress'); console.log('{\"summary\":\"claude-mixed-ok\",\"tokenInput\":4,\"tokenOutput\":6,\"usdCost\":0.0002}'); console.log('done');"
    );
    const adapter = resolveAdapter("claude_code");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "claude_code",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        command
      }
    });
    await cleanup();
    expect(result.status).toBe("ok");
    expect(result.summary).toContain("claude-mixed-ok");
  });

  it("fails claude success responses that only emit malformed JSON", async () => {
    const { command, cleanup } = await createCliShim("claude", "console.log('{\"summary\":\"broken\"')");
    const adapter = resolveAdapter("claude_code");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "claude_code",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        command
      }
    });
    await cleanup();
    expect(result.status).toBe("failed");
    expect(result.summary).toContain("without structured heartbeat output");
  });

  it("includes Claude command diagnostics when runtime override bypasses Claude CLI flags", async () => {
    const { command, cleanup } = await createCliShim("wrapper", "console.log('no-json')");
    const adapter = resolveAdapter("claude_code");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "claude_code",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        command
      }
    });
    await cleanup();
    expect(result.status).toBe("failed");
    expect(result.summary).toContain("runtimeCommand override does not look like Claude CLI");
    expect(result.summary).toContain("missing Claude structured-output args");
  });

  it("marks claude max-turns stream results as incomplete", async () => {
    const { command, cleanup } = await createCliShim(
      "claude",
      "console.log('{\"type\":\"result\",\"result\":\"Now let me create the operating files:\",\"stop_reason\":\"max_turns\",\"usage\":{\"input_tokens\":10,\"output_tokens\":5},\"total_cost_usd\":0.0001}')"
    );
    const adapter = resolveAdapter("claude_code");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "claude_code",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        command
      }
    });
    await cleanup();
    expect(result.status).toBe("failed");
    expect(result.summary).toContain("Now let me create the operating files:");
  });

  it("parses cursor stream-json output and records session details", async () => {
    const { command, cleanup } = await createCliShim(
      "cursor",
      [
        "const argv = process.argv.slice(2);",
        "if (argv.includes('--version')) {",
        "  console.log('cursor 1.0.0');",
        "  process.exit(0);",
        "}",
        "console.log('stdout' + JSON.stringify({ type: 'system', subtype: 'init', session_id: 'chat_prefixed', model: 'auto' }));",
        "console.log('stdout' + JSON.stringify({ type: 'assistant', message: { content: [{ type: 'output_text', text: 'cursor-ok' }] } }));",
        "console.log('stdout' + JSON.stringify({ type: 'result', subtype: 'success', usage: { input_tokens: 3, cached_input_tokens: 1, output_tokens: 2 }, total_cost_usd: 0.0001 }));"
      ].join("\n")
    );
    const adapter = resolveAdapter("cursor");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "cursor",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        command,
        cwd: process.cwd()
      }
    });
    await cleanup();
    expect(result.status).toBe("ok");
    expect(result.summary).toContain("cursor-ok");
    expect(result.tokenInput).toBe(4);
    expect(result.trace?.session?.currentSessionId).toBe("chat_prefixed");
    expect(result.nextState?.cursorSession?.sessionId).toBe("chat_prefixed");
  });

  it("skips cursor resume when saved session cwd does not match", async () => {
    const captureDir = await mkdtemp(join(tmpdir(), "bopodev-cursor-resume-skip-"));
    const capturePath = join(captureDir, "capture.json");
    const { command, cleanup } = await createCliShim(
      "cursor",
      [
        "const fs = require('node:fs');",
        "const argv = process.argv.slice(2);",
        "if (argv.includes('--version')) {",
        "  console.log('cursor 1.0.0');",
        "  process.exit(0);",
        "}",
        "if (process.env.CURSOR_CAPTURE_PATH) {",
        "  fs.writeFileSync(process.env.CURSOR_CAPTURE_PATH, JSON.stringify({ argv }), 'utf8');",
        "}",
        "console.log(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'output_text', text: 'fresh-session' }] } }));",
        "console.log(JSON.stringify({ type: 'result', subtype: 'success', session_id: 'fresh-session-id', usage: { input_tokens: 1, output_tokens: 1 } }));"
      ].join("\n")
    );
    const adapter = resolveAdapter("cursor");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "cursor",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {
        sessionId: "stale-session",
        cursorSession: {
          sessionId: "stale-session",
          cwd: "/tmp/other-workspace"
        }
      },
      runtime: {
        command,
        cwd: process.cwd(),
        env: { CURSOR_CAPTURE_PATH: capturePath }
      }
    });
    const capture = JSON.parse(await readFile(capturePath, "utf8")) as { argv: string[] };
    await cleanup();
    await rm(captureDir, { recursive: true, force: true });
    expect(result.status).toBe("ok");
    expect(capture.argv).not.toContain("--resume");
    expect(result.trace?.session?.resumeSkippedReason).toBe("cwd_mismatch");
    expect(result.nextState?.cursorSession?.sessionId).toBe("fresh-session-id");
  });

  it("clears stale cursor session after unknown-session retry without a fresh session id", async () => {
    const { command, cleanup } = await createCliShim(
      "cursor",
      [
        "const argv = process.argv.slice(2);",
        "if (argv.includes('--version')) {",
        "  console.log('cursor 1.0.0');",
        "  process.exit(0);",
        "}",
        "const resumeIndex = argv.indexOf('--resume');",
        "if (resumeIndex >= 0) {",
        "  process.stderr.write(`unknown session id ${argv[resumeIndex + 1]}`);",
        "  process.exit(1);",
        "}",
        "console.log(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'output_text', text: 'fresh-run-no-session' }] } }));",
        "console.log(JSON.stringify({ type: 'result', subtype: 'success', usage: { input_tokens: 2, output_tokens: 1 } }));"
      ].join("\n")
    );
    const adapter = resolveAdapter("cursor");
    const result = await adapter.execute({
      companyId: "demo-company",
      agentId: "agent-1",
      providerType: "cursor",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: null },
      agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {
        sessionId: "stale-session",
        cursorSession: {
          sessionId: "stale-session",
          cwd: process.cwd()
        }
      },
      runtime: {
        command,
        cwd: process.cwd()
      }
    });
    await cleanup();
    expect(result.status).toBe("ok");
    expect(result.trace?.session?.resumeAttempted).toBe(true);
    expect(result.trace?.session?.clearedStaleSession).toBe(true);
    expect(result.nextState?.sessionId).toBeUndefined();
    expect(result.nextState?.cursorSession).toBeUndefined();
  });
});

async function createCliShim(binaryName: string, scriptBody: string) {
  const tempDir = await mkdtemp(join(tmpdir(), "bopodev-adapter-shim-"));
  const command = join(tempDir, binaryName);
  const script = `#!/usr/bin/env node\n${scriptBody}\n`;
  await writeFile(command, script, "utf8");
  await chmod(command, 0o755);
  return {
    command,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true });
    }
  };
}
