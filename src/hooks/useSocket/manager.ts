import { io } from "socket.io-client";

import { buildCacheKey, buildConfigFingerprint, buildSocketOptions, createSocketUrl } from "./utils";

import type { ManagedSocketRecord, SocketClientConfig } from "./types";

const socketRegistry = new Map<string, ManagedSocketRecord>();

export function acquireManagedSocket(config: SocketClientConfig): ManagedSocketRecord {
  const cacheKey = buildCacheKey(config);
  const configFingerprint = buildConfigFingerprint(config);
  const existing = socketRegistry.get(cacheKey);

  if (existing) {
    if (existing.configFingerprint !== configFingerprint) {
      throw new Error(
        `[socket] Shared connection conflict for key "${cacheKey}". Shared sockets require the same auth and transport configuration.`,
      );
    }

    existing.refCount += 1;
    return existing;
  }

  const socket = io(createSocketUrl(config), buildSocketOptions(config));
  const record: ManagedSocketRecord = {
    cacheKey,
    configFingerprint,
    refCount: 1,
    socket,
  };

  socketRegistry.set(cacheKey, record);
  return record;
}

export function releaseManagedSocket(cacheKey: string): void {
  const record = socketRegistry.get(cacheKey);
  if (!record) {
    return;
  }

  record.refCount -= 1;
  if (record.refCount > 0) {
    return;
  }

  record.socket.removeAllListeners();
  record.socket.io.removeAllListeners();
  record.socket.disconnect();
  socketRegistry.delete(cacheKey);
}

export function forceDestroyManagedSocket(cacheKey: string): void {
  const record = socketRegistry.get(cacheKey);
  if (!record) {
    return;
  }

  record.socket.removeAllListeners();
  record.socket.io.removeAllListeners();
  record.socket.disconnect();
  socketRegistry.delete(cacheKey);
}
