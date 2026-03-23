import { useEffect, useRef, useState } from "react";

import { acquireManagedWebSocket, releaseManagedWebSocket } from "./manager";

import type {
  UseWebSocketReturn,
  WebSocketClientConfig,
  WebSocketClientError,
  WebSocketEventMap,
  WebSocketMetricsSnapshot,
  WebSocketStatus,
} from "./types";

const DEFAULT_METRICS: WebSocketMetricsSnapshot = {
  activeSubscribers: 0,
  ackTimeouts: 0,
  emittedEvents: 0,
  reconnectAttempts: 0,
  successfulAcks: 0,
};

export function useWebSocket<
  ServerEvents extends WebSocketEventMap = WebSocketEventMap,
  ClientEvents extends WebSocketEventMap = WebSocketEventMap,
>(config: WebSocketClientConfig): UseWebSocketReturn<ServerEvents, ClientEvents> {
  const recordRef = useRef<ReturnType<typeof acquireManagedWebSocket> | null>(null);
  if (!recordRef.current) {
    recordRef.current = acquireManagedWebSocket(config);
  }

  const record = recordRef.current;
  const client = record.client;
  const [status, setStatus] = useState<WebSocketStatus>(client.getStatus());
  const [error, setError] = useState<WebSocketClientError | null>(client.getError());
  const [metrics, setMetrics] = useState<WebSocketMetricsSnapshot>(client.getMetrics() ?? DEFAULT_METRICS);
  const [socket, setSocket] = useState(client.getSocket());

  useEffect(() => {
    const offStatus = client.onStatusChange((nextStatus) => {
      setStatus(nextStatus);
      setSocket(client.getSocket());
    });
    const offError = client.onError(setError);
    const offMetrics = client.onMetrics(setMetrics);

    return () => {
      offStatus();
      offError();
      offMetrics();
      releaseManagedWebSocket(record.cacheKey);
    };
  }, [client, record.cacheKey]);

  const request: UseWebSocketReturn<ServerEvents, ClientEvents>["request"] = (event, args, options) =>
    client.request(event, (args ?? []) as unknown[], options) ??
    Promise.resolve({ error: "WebSocket client unavailable", success: false });

  return {
    connect: () => client.connect(),
    emit: (event, ...args) => client.emit(event, ...args),
    error,
    forceDisconnect: () => client.forceDisconnect(),
    isConnected: status === "connected",
    isConnecting: status === "connecting" || status === "reconnecting",
    metrics,
    release: () => releaseManagedWebSocket(record.cacheKey),
    request,
    socket,
    status,
    subscribe: (event, handler) =>
      client.subscribe(event, handler as (...args: unknown[]) => void) ?? (() => undefined),
    unsubscribe: (event, handler) => client.unsubscribe(event, handler as ((...args: unknown[]) => void) | undefined),
  };
}
