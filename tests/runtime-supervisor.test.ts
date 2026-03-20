import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, test } from "vitest";
import { assertPortAvailable, checkApiReadiness, checkWebReadiness } from "../scripts/runtime-supervisor.mjs";

describe("runtime supervisor", () => {
  const servers: Array<ReturnType<typeof createServer>> = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
          })
      )
    );
  });

  test("fails fast when the requested port is already occupied", async () => {
    const server = createServer((_req, res) => {
      res.statusCode = 200;
      res.end("ok");
    });
    servers.push(server);
    await listen(server);
    const port = (server.address() as AddressInfo).port;

    await expect(assertPortAvailable(port, "API", "start")).rejects.toThrow(`API port ${port} is already in use`);
  });

  test("accepts a healthy API health response", async () => {
    const server = createJsonServer((_req, res) => {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
    servers.push(server);
    await listen(server);
    const port = (server.address() as AddressInfo).port;

    const result = await checkApiReadiness(`http://127.0.0.1:${port}`);
    expect(result.ready).toBe(true);
  });

  test("waits for a non-error web response before reporting ready", async () => {
    const server = createJsonServer((_req, res) => {
      res.statusCode = 200;
      res.end("ready");
    });
    servers.push(server);
    await listen(server);
    const port = (server.address() as AddressInfo).port;

    const result = await checkWebReadiness(`http://127.0.0.1:${port}`);
    expect(result.ready).toBe(true);
  });
});

function createJsonServer(handler: (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => void) {
  return createServer(handler);
}

function listen(server: ReturnType<typeof createServer>) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
}
