import { RealtimeWebSocketClient } from "./client";
import { buildCacheKey, isSameConfig } from "./utils";

import type { ManagedWebSocketRecord, WebSocketClientConfig } from "./types";

const webSocketRegistry = new Map<string, ManagedWebSocketRecord>();

export function acquireManagedWebSocket(config: WebSocketClientConfig): ManagedWebSocketRecord {
  const cacheKey = buildCacheKey(config);
  const existing = webSocketRegistry.get(cacheKey);

  if (existing) {
    if (!isSameConfig(existing.config, config)) {
      throw new Error(
        `[websocket] Shared connection conflict for key "${cacheKey}". Shared WebSockets require identical configuration.`,
      );
    }

    existing.refCount += 1;
    return existing;
  }

  const record: ManagedWebSocketRecord = {
    cacheKey,
    client: new RealtimeWebSocketClient(config),
    config,
    refCount: 1,
  };

  webSocketRegistry.set(cacheKey, record);
  return record;
}

export function releaseManagedWebSocket(cacheKey: string): void {
  const record = webSocketRegistry.get(cacheKey);
  if (!record) {
    return;
  }

  record.refCount -= 1;
  if (record.refCount > 0) {
    return;
  }

  record.client.destroy();
  webSocketRegistry.delete(cacheKey);
}

export function forceDestroyManagedWebSocket(cacheKey: string): void {
  const record = webSocketRegistry.get(cacheKey);
  if (!record) {
    return;
  }

  record.client.destroy();
  webSocketRegistry.delete(cacheKey);
}
