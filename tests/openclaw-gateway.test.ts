import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { resolveAdapter, runAdapterEnvironmentTest } from "../packages/agent-sdk/src/registry";
import {
  extractUsageFromSessionsList,
  extractUsageFromSessionsUsage,
  mapOpenClawModelProviderToBopoPricingType
} from "../packages/adapters/openclaw-gateway/src/server/parse";

describe("openclaw gateway parse helpers", () => {
  it("extracts usage from sessions.list row with exact key match", () => {
    const payload = {
      ts: 1,
      path: "/sessions",
      count: 2,
      defaults: {},
      sessions: [
        { key: "other:key", inputTokens: 9, outputTokens: 9, model: "x" },
        {
          key: "bopo:issue:issue-1",
          inputTokens: 100,
          outputTokens: 25,
          estimatedCostUsd: 0.004,
          model: "claude-sonnet-4",
          modelProvider: "anthropic"
        }
      ]
    };
    const parsed = extractUsageFromSessionsList(payload, "bopo:issue:issue-1");
    expect(parsed).toEqual({
      tokenInput: 100,
      tokenOutput: 25,
      cachedInputTokens: 0,
      usdCost: 0.004,
      model: "claude-sonnet-4",
      modelProvider: "anthropic",
      source: "sessions.list"
    });
  });

  it("returns null from sessions.list when key does not match", () => {
    expect(extractUsageFromSessionsList({ sessions: [{ key: "a", inputTokens: 1, outputTokens: 1 }] }, "b")).toBeNull();
  });

  it("extracts usage from sessions.usage entry", () => {
    const payload = {
      sessions: [
        {
          key: "bopo:issue:issue-1",
          model: "gpt-5",
          modelProvider: "openai",
          usage: {
            input: 10,
            output: 4,
            cacheRead: 2,
            totalCost: 0.00005
          }
        }
      ]
    };
    const parsed = extractUsageFromSessionsUsage(payload, "bopo:issue:issue-1");
    expect(parsed).toEqual({
      tokenInput: 10,
      tokenOutput: 4,
      cachedInputTokens: 2,
      usdCost: 0.00005,
      model: "gpt-5",
      modelProvider: "openai",
      source: "sessions.usage"
    });
  });

  it("maps OpenClaw modelProvider strings to Bopo pricing provider types", () => {
    expect(mapOpenClawModelProviderToBopoPricingType("Anthropic")).toBe("anthropic_api");
    expect(mapOpenClawModelProviderToBopoPricingType("openai")).toBe("openai_api");
    expect(mapOpenClawModelProviderToBopoPricingType("Google")).toBe("gemini_cli");
    expect(mapOpenClawModelProviderToBopoPricingType("custom")).toBeNull();
    expect(mapOpenClawModelProviderToBopoPricingType(null)).toBeNull();
  });
});

describe("openclaw gateway adapter", () => {
  it("environment test warns when WebSocket URL is missing", async () => {
    const result = await runAdapterEnvironmentTest("openclaw_gateway", {
      command: "",
      env: {}
    });
    expect(result.providerType).toBe("openclaw_gateway");
    expect(result.status).toBe("warn");
    expect(result.checks.some((c) => c.code === "openclaw_gateway_url_missing")).toBe(true);
  });

  it("completes execute against a minimal mock gateway and records session list usage", async () => {
    const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(wss, "listening");
    const { port } = wss.address() as AddressInfo;

    wss.on("connection", (socket) => {
      socket.on("message", (raw) => {
        let msg: { type?: string; id?: string; method?: string; params?: { runId?: string } };
        try {
          msg = JSON.parse(String(raw)) as typeof msg;
        } catch {
          return;
        }
        if (msg.type !== "req" || !msg.id || !msg.method) {
          return;
        }
        const { id, method, params } = msg;
        const send = (ok: boolean, payload: unknown) => {
          socket.send(JSON.stringify({ type: "res", id, ok, payload }));
        };

        if (method === "connect") {
          send(true, { type: "hello-ok", protocol: 3 });
          return;
        }
        if (method === "agent") {
          send(true, { runId: "mock-run-1", status: "accepted" });
          return;
        }
        if (method === "agent.wait") {
          send(true, { runId: params?.runId ?? "mock-run-1", status: "ok" });
          return;
        }
        if (method === "sessions.list") {
          send(true, {
            ts: Date.now(),
            path: "/tmp",
            count: 1,
            defaults: {},
            sessions: [
              {
                key: "bopo:issue:issue-1",
                inputTokens: 42,
                outputTokens: 8,
                estimatedCostUsd: 0.002,
                model: "claude-test-model",
                modelProvider: "anthropic"
              }
            ]
          });
          return;
        }
        send(false, undefined);
      });
    });

    try {
      const adapter = resolveAdapter("openclaw_gateway");
      const result = await adapter.execute({
        companyId: "demo-company",
        agentId: "agent-1",
        providerType: "openclaw_gateway",
        heartbeatRunId: "hb-run-1",
        company: { name: "Demo Co", mission: null },
        agent: { name: "Demo Agent", role: "Engineer", managerAgentId: null },
        workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
        state: {},
        runtime: {
          command: `ws://127.0.0.1:${port}`,
          env: {
            OPENCLAW_GATEWAY_TOKEN: "test-token",
            BOPO_OPENCLAW_DISABLE_DEVICE_AUTH: "1"
          },
          timeoutMs: 10_000
        }
      });

      expect(result.status).toBe("ok");
      expect(result.tokenInput).toBe(42);
      expect(result.tokenOutput).toBe(8);
      expect(result.usdCost).toBe(0.002);
      expect(result.usage?.cachedInputTokens).toBe(0);
      expect(result.pricingModelId).toBe("claude-test-model");
      expect(result.pricingProviderType).toBe("anthropic_api");
      expect(result.trace?.usageSource).toBe("structured");
    } finally {
      await new Promise<void>((resolve, reject) => {
        wss.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
