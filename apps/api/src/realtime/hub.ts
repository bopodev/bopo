import type { Server } from "node:http";
import {
  RealtimeChannelSchema,
  type RealtimeChannel,
  type RealtimeMessage
} from "bopodev-contracts";
import { WebSocket, WebSocketServer } from "ws";
import { verifyActorToken } from "../security/actor-token";
import { isAuthenticatedMode, resolveDeploymentMode } from "../security/deployment-mode";

type RealtimeEventMessage = Extract<RealtimeMessage, { kind: "event" }>;
type RealtimeBootstrapLoader = (companyId: string) => Promise<RealtimeEventMessage>;

export interface RealtimeHub {
  publish(message: RealtimeEventMessage): void;
  close(): Promise<void>;
}

export function attachRealtimeHub(
  server: Server,
  options: {
    bootstrapLoaders?: Partial<Record<RealtimeChannel, RealtimeBootstrapLoader>>;
  } = {}
): RealtimeHub {
  const socketsByCompanyAndChannel = new Map<string, Set<WebSocket>>();
  const wss = new WebSocketServer({ server, path: "/realtime" });

  wss.on("connection", async (socket, request) => {
    const subscription = getSubscription(request.url);
    if (!subscription || !canSubscribeToCompany(request.url, request.headers, subscription.companyId)) {
      socket.close(1008, "Invalid realtime subscription");
      return;
    }

    for (const channel of subscription.channels) {
      addSocket(subscription.companyId, channel, socket);
    }

    socket.on("close", () => {
      for (const channel of subscription.channels) {
        removeSocket(subscription.companyId, channel, socket);
      }
    });

    send(socket, {
      kind: "subscribed",
      companyId: subscription.companyId,
      channels: subscription.channels
    });

    try {
      for (const channel of subscription.channels) {
        const loader = options.bootstrapLoaders?.[channel];
        if (!loader) {
          continue;
        }
        send(socket, await loader(subscription.companyId));
      }
    } catch {
      socket.close(1011, "Failed to load realtime bootstrap");
    }
  });

  return {
    publish(message) {
      const key = buildSubscriptionKey(message.companyId, message.channel);
      const sockets = socketsByCompanyAndChannel.get(key);
      if (!sockets || sockets.size === 0) {
        return;
      }

      const payload = JSON.stringify(message);
      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        }
      }
    },
    close() {
      return new Promise<void>((resolve, reject) => {
        wss.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };

  function addSocket(companyId: string, channel: RealtimeChannel, socket: WebSocket) {
    const key = buildSubscriptionKey(companyId, channel);
    const sockets = socketsByCompanyAndChannel.get(key) ?? new Set<WebSocket>();
    sockets.add(socket);
    socketsByCompanyAndChannel.set(key, sockets);
  }

  function removeSocket(companyId: string, channel: RealtimeChannel, socket: WebSocket) {
    const key = buildSubscriptionKey(companyId, channel);
    const sockets = socketsByCompanyAndChannel.get(key);
    if (!sockets) {
      return;
    }
    sockets.delete(socket);
    if (sockets.size === 0) {
      socketsByCompanyAndChannel.delete(key);
    }
  }
}

function getSubscription(requestUrl: string | undefined) {
  if (!requestUrl) {
    return null;
  }

  const url = new URL(requestUrl, "http://localhost");
  const companyId = url.searchParams.get("companyId")?.trim();
  const requestedChannels = url.searchParams.get("channels")?.trim();
  const channelValues = requestedChannels ? requestedChannels.split(",").map((channel) => channel.trim()).filter(Boolean) : ["governance"];
  const channels = channelValues.flatMap((channel) => {
    const parsed = RealtimeChannelSchema.safeParse(channel);
    return parsed.success ? [parsed.data] : [];
  });

  if (!companyId || channels.length === 0) {
    return null;
  }

  return {
    companyId,
    channels: Array.from(new Set(channels))
  };
}

function canSubscribeToCompany(
  requestUrl: string | undefined,
  headers: Record<string, string | string[] | undefined>,
  companyId: string
) {
  const deploymentMode = resolveDeploymentMode();
  const tokenSecret = process.env.BOPO_AUTH_TOKEN_SECRET?.trim() || "";
  const tokenIdentity = tokenSecret ? verifyActorToken(readRealtimeToken(requestUrl, headers), tokenSecret) : null;
  if (tokenIdentity) {
    if (tokenIdentity.type === "board") {
      return true;
    }
    return tokenIdentity.companyIds?.includes(companyId) ?? false;
  }
  const actorType = readHeader(headers, "x-actor-type")?.toLowerCase();
  const actorCompanies = parseCommaList(readHeader(headers, "x-actor-companies"));
  const hasActorHeaders = Boolean(actorType || actorCompanies.length > 0);
  const allowLocalBoardFallback =
    deploymentMode === "local" && process.env.NODE_ENV !== "production" && process.env.BOPO_ALLOW_LOCAL_BOARD_FALLBACK !== "0";
  const trustActorHeaders = deploymentMode === "local" || process.env.BOPO_TRUST_ACTOR_HEADERS === "1";
  if (isAuthenticatedMode(deploymentMode) && !hasActorHeaders) {
    return false;
  }
  if (isAuthenticatedMode(deploymentMode) && hasActorHeaders && !trustActorHeaders) {
    return false;
  }

  if (!hasActorHeaders) {
    return allowLocalBoardFallback;
  }
  if (actorType === "board") {
    return true;
  }
  return actorCompanies.includes(companyId);
}

function readRealtimeToken(requestUrl: string | undefined, headers: Record<string, string | string[] | undefined>) {
  const fromProtocol = readRealtimeTokenFromSubprotocolHeader(readHeader(headers, "sec-websocket-protocol"));
  if (fromProtocol) {
    return fromProtocol;
  }
  if (!requestUrl) {
    return null;
  }
  const url = new URL(requestUrl, "http://localhost");
  const token = url.searchParams.get("authToken")?.trim();
  return token && token.length > 0 ? token : null;
}

function readRealtimeTokenFromSubprotocolHeader(value: string | undefined) {
  if (!value) {
    return null;
  }
  const protocolEntries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  for (const protocol of protocolEntries) {
    if (!protocol.startsWith("bopo-token.")) {
      continue;
    }
    const encodedToken = protocol.slice("bopo-token.".length);
    if (!encodedToken) {
      continue;
    }
    try {
      const decoded = decodeURIComponent(encodedToken).trim();
      if (decoded) {
        return decoded;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function readHeader(headers: Record<string, string | string[] | undefined>, name: string) {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseCommaList(value: string | undefined) {
  if (!value) {
    return [] as string[];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildSubscriptionKey(companyId: string, channel: RealtimeChannel) {
  return `${companyId}:${channel}`;
}

function send(socket: WebSocket, message: RealtimeMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}
