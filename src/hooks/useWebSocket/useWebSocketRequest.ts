import { useCallback, useState } from "react";

import type {
  AckFailure,
  AckResult,
  RequestOptions,
  UseWebSocketRequestReturn,
  UseWebSocketReturn,
  WebSocketEventMap,
  WebSocketRequestMap,
} from "./types";

function isRequestOptions(value: unknown): value is RequestOptions {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "retry" in value || "retryPolicy" in value || "signal" in value || "timeout" in value;
}

export function useWebSocketRequest<
  RequestMap extends WebSocketRequestMap,
  ServerEvents extends WebSocketEventMap = WebSocketEventMap,
  ClientEvents extends WebSocketEventMap = WebSocketEventMap,
  Event extends keyof RequestMap & keyof ClientEvents & string = keyof RequestMap & keyof ClientEvents & string,
>(
  socketApi: Pick<UseWebSocketReturn<ServerEvents, ClientEvents>, "request">,
  event: Event,
): UseWebSocketRequestReturn<RequestMap, Event> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AckFailure | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  const execute = useCallback(
    async (...args: [...payload: RequestMap[Event]["payload"], options?: RequestOptions]): Promise<AckResult<RequestMap[Event]["response"]>> => {
      const lastArg = args[args.length - 1];
      const options = isRequestOptions(lastArg) ? lastArg : undefined;
      const payload = (options ? args.slice(0, -1) : args) as RequestMap[Event]["payload"];

      setIsLoading(true);
      setError(null);

      try {
        const result = await socketApi.request<RequestMap[Event]["response"], Event>(event, payload as ClientEvents[Event], options);
        if (!result.success) {
          setError(result);
        }
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [event, socketApi],
  );

  return {
    error,
    execute,
    isLoading,
    reset,
  };
}
