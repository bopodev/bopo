import {
  RealtimeMessageSchema,
  type RealtimeChannel,
  type RealtimeMessage
} from "bopodev-contracts";
import { getRealtimeUrl } from "@/lib/api";

export function subscribeToRealtime(options: {
  companyId: string;
  channels: RealtimeChannel[];
  reconnectDelayMs?: number;
  onMessage: (message: RealtimeMessage) => void;
}) {
  const reconnectBaseDelayMs = options.reconnectDelayMs ?? 2_000;
  const reconnectMaxDelayMs = 30_000;
  let active = true;
  let socket: WebSocket | null = null;
  let retryTimer: number | null = null;
  let reconnectAttempt = 0;

  const connect = () => {
    socket = new WebSocket(getRealtimeUrl(options.companyId, options.channels));
    socket.addEventListener("open", () => {
      reconnectAttempt = 0;
    });

    socket.addEventListener("message", (event) => {
      const parsed = RealtimeMessageSchema.safeParse(parseMessage(event.data));
      if (parsed.success) {
        options.onMessage(parsed.data);
      }
    });

    socket.addEventListener("close", () => {
      if (!active) {
        return;
      }
      reconnectAttempt += 1;
      const exponentialDelay = Math.min(reconnectMaxDelayMs, reconnectBaseDelayMs * 2 ** (reconnectAttempt - 1));
      const jitteredDelay = Math.round(exponentialDelay * (0.85 + Math.random() * 0.3));
      retryTimer = window.setTimeout(connect, jitteredDelay);
    });
  };

  connect();

  return () => {
    active = false;
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
    }
    socket?.close();
  };
}

function parseMessage(value: string | ArrayBufferLike | Blob | ArrayBufferView) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return null;
}
