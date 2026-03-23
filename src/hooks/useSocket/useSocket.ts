import { useEffect, useRef, useState } from "react";

import { RealtimeSocketClient } from "./client";

import type {
  SocketClientConfig,
  SocketClientError,
  SocketMetricsSnapshot,
  SocketStatus,
  UseSocketReturn,
} from "./types";

const DEFAULT_METRICS: SocketMetricsSnapshot = {
  activeSubscribers: 0,
  ackTimeouts: 0,
  emittedEvents: 0,
  reconnectAttempts: 0,
  successfulAcks: 0,
};

export function useSocket<
  ServerEvents extends Record<string, unknown[]> = Record<string, unknown[]>,
  ClientEvents extends Record<string, unknown[]> = Record<string, unknown[]>,
>(config: SocketClientConfig): UseSocketReturn<ServerEvents, ClientEvents> {
  const clientRef = useRef<RealtimeSocketClient | null>(null);
  const [status, setStatus] = useState<SocketStatus>("idle");
  const [error, setError] = useState<SocketClientError | null>(null);
  const [metrics, setMetrics] = useState<SocketMetricsSnapshot>(DEFAULT_METRICS);
  const [socket, setSocket] = useState(clientRef.current?.getSocket() ?? null);

  if (!clientRef.current) {
    clientRef.current = new RealtimeSocketClient(config);
  }

  useEffect(() => {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    setSocket(client.getSocket());

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
      client.release();
      clientRef.current = null;
    };
  }, []);

  const request: UseSocketReturn<ServerEvents, ClientEvents>["request"] = (event, args, options) =>
    clientRef.current?.request(event, (args ?? []) as unknown[], options) ??
    Promise.resolve({ error: "Socket client unavailable", success: false });

  return {
    connect: () => clientRef.current?.connect() ?? Promise.resolve(),
    emit: (event, ...args) => clientRef.current?.emit(event, ...args),
    error,
    forceDisconnect: () => clientRef.current?.forceDisconnect(),
    isConnected: status === "connected",
    isConnecting: status === "connecting" || status === "reconnecting",
    metrics,
    release: () => clientRef.current?.release(),
    request,
    socket,
    status,
    subscribe: (event, handler) =>
      clientRef.current?.subscribe(event, handler as (...args: unknown[]) => void) ?? (() => undefined),
    unsubscribe: (event, handler) =>
      clientRef.current?.unsubscribe(event, handler as ((...args: unknown[]) => void) | undefined),
    updateAuth: (auth) => clientRef.current?.updateAuth(auth),
  };
}
