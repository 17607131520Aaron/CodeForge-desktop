import { useMemo } from "react";

import type { UseWebSocketReturn, UseWebSocketStatusReturn, WebSocketEventMap } from "./types";

export function useWebSocketStatus<
  ServerEvents extends WebSocketEventMap = WebSocketEventMap,
  ClientEvents extends WebSocketEventMap = WebSocketEventMap,
>(
  socketApi: Pick<UseWebSocketReturn<ServerEvents, ClientEvents>, "error" | "isConnected" | "isConnecting" | "metrics" | "status">,
): UseWebSocketStatusReturn {
  return useMemo(
    () => ({
      error: socketApi.error,
      isConnected: socketApi.isConnected,
      isConnecting: socketApi.isConnecting,
      metrics: socketApi.metrics,
      status: socketApi.status,
    }),
    [socketApi.error, socketApi.isConnected, socketApi.isConnecting, socketApi.metrics, socketApi.status],
  );
}
