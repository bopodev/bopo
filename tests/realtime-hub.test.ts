import { createServer } from "node:http";
import { WebSocket } from "ws";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RealtimeMessage } from "../packages/contracts/src";
import { attachRealtimeHub, type RealtimeHub } from "../apps/api/src/realtime/hub";
import { issueActorToken } from "../apps/api/src/security/actor-token";

describe("realtime hub", () => {
  let server: ReturnType<typeof createServer>;
  let hub: RealtimeHub;
  let baseWsUrl: string;

  beforeEach(async () => {
    server = createServer((_req, res) => {
      res.statusCode = 200;
      res.end("ok");
    });
    hub = attachRealtimeHub(server, {
      bootstrapLoaders: {
        governance: async (companyId) => ({
          kind: "event",
          companyId,
          channel: "governance",
          event: { type: "approvals.snapshot", approvals: [] }
        }),
        "heartbeat-runs": async (companyId) => ({
          kind: "event",
          companyId,
          channel: "heartbeat-runs",
          event: {
            type: "runs.snapshot",
            runs: [],
            transcripts: []
          }
        })
      }
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected server to bind to an ephemeral port.");
    }
    baseWsUrl = `ws://127.0.0.1:${address.port}/realtime`;
  });

  afterEach(async () => {
    await hub.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("sends subscribed and bootstrap events for valid governance subscriptions", async () => {
    const socket = new WebSocket(`${baseWsUrl}?companyId=demo-company&channels=governance`);
    const messages: RealtimeMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for bootstrap messages.")), 2_000);
      socket.on("message", (raw) => {
        const parsed = JSON.parse(String(raw)) as RealtimeMessage;
        messages.push(parsed);
        if (messages.length >= 2) {
          clearTimeout(timer);
          resolve();
        }
      });
      socket.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    expect(messages[0]).toMatchObject({
      kind: "subscribed",
      companyId: "demo-company",
      channels: ["governance"]
    });
    expect(messages[1]).toMatchObject({
      kind: "event",
      companyId: "demo-company",
      channel: "governance",
      event: { type: "approvals.snapshot" }
    });
    socket.close();
  });

  it("broadcasts events only to subscribers in the matching company + channel", async () => {
    const governanceSocket = new WebSocket(`${baseWsUrl}?companyId=demo-company&channels=governance`);
    const otherCompanySocket = new WebSocket(`${baseWsUrl}?companyId=other-company&channels=governance`);

    await Promise.all([
      waitForSubscribed(governanceSocket),
      waitForSubscribed(otherCompanySocket)
    ]);

    const receivedByPrimary: RealtimeMessage[] = [];
    governanceSocket.on("message", (raw) => {
      receivedByPrimary.push(JSON.parse(String(raw)) as RealtimeMessage);
    });
    const receivedByOther: RealtimeMessage[] = [];
    otherCompanySocket.on("message", (raw) => {
      receivedByOther.push(JSON.parse(String(raw)) as RealtimeMessage);
    });

    hub.publish({
      kind: "event",
      companyId: "demo-company",
      channel: "governance",
      event: { type: "approvals.snapshot", approvals: [] }
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedByPrimary.some((message) => message.kind === "event" && message.companyId === "demo-company")).toBe(true);
    expect(receivedByOther.some((message) => message.kind === "event" && message.companyId === "demo-company")).toBe(false);

    governanceSocket.close();
    otherCompanySocket.close();
  });

  it("supports heartbeat-runs channel subscriptions and publishes matching events", async () => {
    const socket = new WebSocket(`${baseWsUrl}?companyId=demo-company&channels=heartbeat-runs`);
    const bootstrap = await waitForHeartbeatBootstrap(socket);
    expect(bootstrap.kind).toBe("event");
    if (bootstrap.kind === "event" && bootstrap.channel === "heartbeat-runs") {
      expect(bootstrap.event.type).toBe("runs.snapshot");
    }

    const received: RealtimeMessage[] = [];
    socket.on("message", (raw) => {
      received.push(JSON.parse(String(raw)) as RealtimeMessage);
    });

    hub.publish({
      kind: "event",
      companyId: "demo-company",
      channel: "heartbeat-runs",
      event: {
        type: "run.status.updated",
        runId: "run-1",
        status: "started",
        message: "Heartbeat started."
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(
      received.some(
        (message) =>
          message.kind === "event" &&
          message.channel === "heartbeat-runs" &&
          message.event.type === "run.status.updated" &&
          message.event.runId === "run-1"
      )
    ).toBe(true);
    socket.close();
  });

  it("closes invalid subscriptions with a policy violation", async () => {
    const socket = new WebSocket(`${baseWsUrl}?channels=governance`);
    const closeInfo = await new Promise<{ code: number; reason: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for invalid subscription close.")), 2_000);
      socket.on("close", (code, reason) => {
        clearTimeout(timer);
        resolve({ code, reason: String(reason) });
      });
      socket.on("error", () => {
        // Invalid subscription can immediately close before a stable open.
      });
    });

    expect(closeInfo.code).toBe(1008);
    expect(closeInfo.reason).toContain("Invalid realtime subscription");
  });

  it("rejects subscriptions when actor company scope does not include requested company", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousFallback = process.env.BOPO_ALLOW_LOCAL_BOARD_FALLBACK;
    process.env.NODE_ENV = "production";
    process.env.BOPO_ALLOW_LOCAL_BOARD_FALLBACK = "0";
    try {
      const socket = new WebSocket(`${baseWsUrl}?companyId=demo-company&channels=heartbeat-runs`, {
        headers: {
          "x-actor-type": "member",
          "x-actor-companies": "other-company"
        }
      });
      const closeInfo = await new Promise<{ code: number; reason: string }>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timed out waiting for scoped subscription close.")), 2_000);
        socket.on("close", (code, reason) => {
          clearTimeout(timer);
          resolve({ code, reason: String(reason) });
        });
        socket.on("error", () => {
          // Socket may close before stable open; this is expected for rejected upgrades.
        });
      });
      expect(closeInfo.code).toBe(1008);
      expect(closeInfo.reason).toContain("Invalid realtime subscription");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (previousFallback === undefined) {
        delete process.env.BOPO_ALLOW_LOCAL_BOARD_FALLBACK;
      } else {
        process.env.BOPO_ALLOW_LOCAL_BOARD_FALLBACK = previousFallback;
      }
    }
  });

  it("accepts token-authenticated websocket subscriptions in authenticated mode", async () => {
    const previousMode = process.env.BOPO_DEPLOYMENT_MODE;
    const previousSecret = process.env.BOPO_AUTH_TOKEN_SECRET;
    process.env.BOPO_DEPLOYMENT_MODE = "authenticated_private";
    process.env.BOPO_AUTH_TOKEN_SECRET = "realtime-test-secret";
    try {
      const token = issueActorToken(
        {
          actorType: "member",
          actorId: "member-realtime",
          actorCompanies: ["demo-company"],
          actorPermissions: ["heartbeats:run"]
        },
        process.env.BOPO_AUTH_TOKEN_SECRET
      );
      const socket = new WebSocket(`${baseWsUrl}?companyId=demo-company&channels=governance&authToken=${encodeURIComponent(token)}`);
      const subscribed = await new Promise<boolean>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timed out waiting for token-auth subscribed event.")), 2_000);
        socket.on("message", (raw) => {
          const parsed = JSON.parse(String(raw)) as RealtimeMessage;
          if (parsed.kind === "subscribed") {
            clearTimeout(timer);
            resolve(true);
          }
        });
        socket.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
      expect(subscribed).toBe(true);
      socket.close();
    } finally {
      if (previousMode === undefined) {
        delete process.env.BOPO_DEPLOYMENT_MODE;
      } else {
        process.env.BOPO_DEPLOYMENT_MODE = previousMode;
      }
      if (previousSecret === undefined) {
        delete process.env.BOPO_AUTH_TOKEN_SECRET;
      } else {
        process.env.BOPO_AUTH_TOKEN_SECRET = previousSecret;
      }
    }
  });
});

async function waitForSubscribed(socket: WebSocket) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for subscribed message.")), 2_000);
    socket.on("message", (raw) => {
      const parsed = JSON.parse(String(raw)) as RealtimeMessage;
      if (parsed.kind === "subscribed") {
        clearTimeout(timer);
        resolve();
      }
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function waitForHeartbeatBootstrap(socket: WebSocket) {
  return new Promise<RealtimeMessage>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for heartbeat bootstrap message.")), 2_000);
    socket.on("message", (raw) => {
      const parsed = JSON.parse(String(raw)) as RealtimeMessage;
      if (parsed.kind === "event" && parsed.channel === "heartbeat-runs") {
        clearTimeout(timer);
        resolve(parsed);
      }
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
