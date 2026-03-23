import { useEffect, useRef } from "react";

import type { UseWebSocketReturn, UseWebSocketSubscriptionOptions, WebSocketEventMap } from "./types";

export function useWebSocketSubscription<
  ServerEvents extends WebSocketEventMap = WebSocketEventMap,
  ClientEvents extends WebSocketEventMap = WebSocketEventMap,
  Event extends keyof ServerEvents & string = keyof ServerEvents & string,
>(
  socketApi: Pick<UseWebSocketReturn<ServerEvents, ClientEvents>, "subscribe">,
  event: Event,
  handler: (...args: ServerEvents[Event]) => void,
  options?: UseWebSocketSubscriptionOptions,
): void {
  const handlerRef = useRef(handler);

  handlerRef.current = handler;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = socketApi.subscribe(event, ((...args: ServerEvents[Event]) => handlerRef.current(...args)) as (
      ...args: ServerEvents[Event]
    ) => void);

    return () => {
      unsubscribe();
    };
  }, [event, options?.enabled, socketApi]);
}
