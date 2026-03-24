import WebSocket from "ws";
import type { AdapterEnvironmentResult, AgentRuntimeConfig } from "../../../../agent-sdk/src/types";

export async function testEnvironment(runtime?: AgentRuntimeConfig): Promise<AdapterEnvironmentResult> {
  const testedAt = new Date().toISOString();
  const url =
    runtime?.command?.trim() ||
    runtime?.env?.OPENCLAW_GATEWAY_URL?.trim() ||
    "";

  if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
    return {
      providerType: "openclaw_gateway",
      status: "warn",
      testedAt,
      checks: [
        {
          code: "openclaw_gateway_url_missing",
          level: "warn",
          message: "Set runtime command or OPENCLAW_GATEWAY_URL to a ws:// or wss:// gateway URL.",
          hint: "See https://docs.openclaw.ai/gateway"
        }
      ]
    };
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url, { handshakeTimeout: 5000 });
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch {
          /* noop */
        }
        reject(new Error("WebSocket handshake timed out"));
      }, 6000);
      ws.once("open", () => {
        clearTimeout(timer);
        try {
          ws.close();
        } catch {
          /* noop */
        }
        resolve();
      });
      ws.once("error", (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
    return {
      providerType: "openclaw_gateway",
      status: "pass",
      testedAt,
      checks: [
        {
          code: "openclaw_gateway_ws_reachable",
          level: "info",
          message: "WebSocket handshake succeeded (auth and device identity are validated on first heartbeat)."
        }
      ]
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      providerType: "openclaw_gateway",
      status: "fail",
      testedAt,
      checks: [
        {
          code: "openclaw_gateway_ws_failed",
          level: "error",
          message: `Could not open WebSocket to ${url}: ${message}`,
          hint: "Confirm the gateway is running and the URL matches `openclaw gateway status`."
        }
      ]
    };
  }
}
