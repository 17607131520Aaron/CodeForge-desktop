import { useMemo } from "react";

import type { SocketEventMap, UseSocketReturn, UseSocketStatusReturn } from "./types";

export function useSocketStatus<
  ServerEvents extends SocketEventMap = SocketEventMap,
  ClientEvents extends SocketEventMap = SocketEventMap,
>(socketApi: Pick<UseSocketReturn<ServerEvents, ClientEvents>, "error" | "isConnected" | "isConnecting" | "metrics" | "status">): UseSocketStatusReturn {
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
