import { useEffect, useRef } from "react";

import type { SocketEventMap, UseSocketReturn, UseSocketSubscriptionOptions } from "./types";

export function useSocketSubscription<
  ServerEvents extends SocketEventMap = SocketEventMap,
  ClientEvents extends SocketEventMap = SocketEventMap,
  Event extends keyof ServerEvents & string = keyof ServerEvents & string,
>(
  socketApi: Pick<UseSocketReturn<ServerEvents, ClientEvents>, "subscribe">,
  event: Event,
  handler: (...args: ServerEvents[Event]) => void,
  options?: UseSocketSubscriptionOptions,
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
