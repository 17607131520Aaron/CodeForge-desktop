import type {
  AckResult,
  ResolvedWebSocketEvent,
  RetryPolicy,
  WebSocketClientConfig,
  WebSocketMessageContext,
  WebSocketRequestContext,
} from "./types";

export const defaultRetryPolicy: Required<RetryPolicy> = {
  attempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: 0.2,
};

export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`).join(",")}}`;
}

export function buildCacheKey(config: WebSocketClientConfig): string {
  return stableSerialize({
    protocols: Array.isArray(config.protocols) ? [...config.protocols] : config.protocols,
    scopeKey: config.scopeKey ?? "default",
    shared: config.shared ?? true,
    url: config.url,
  });
}

export function isSameConfig(left: WebSocketClientConfig, right: WebSocketClientConfig): boolean {
  return (
    left.url === right.url &&
    stableSerialize(left.protocols) === stableSerialize(right.protocols) &&
    left.scopeKey === right.scopeKey &&
    (left.shared ?? true) === (right.shared ?? true) &&
    left.timeout === right.timeout &&
    left.reconnection === right.reconnection &&
    left.reconnectionAttempts === right.reconnectionAttempts &&
    left.reconnectionDelay === right.reconnectionDelay &&
    left.reconnectionDelayMax === right.reconnectionDelayMax &&
    left.randomizationFactor === right.randomizationFactor &&
    left.ackTimeout === right.ackTimeout &&
    left.requestRetry === right.requestRetry &&
    left.parseMessage === right.parseMessage &&
    left.resolveEvent === right.resolveEvent &&
    left.serializeMessage === right.serializeMessage &&
    left.createRequestMessage === right.createRequestMessage &&
    left.resolveRequest === right.resolveRequest
  );
}

export function createDeferred<T>(): {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function computeRetryDelay(policy: RetryPolicy | undefined, attempt: number): number {
  const merged = { ...defaultRetryPolicy, ...policy };
  const exponential = Math.min(merged.baseDelayMs * 2 ** Math.max(attempt - 1, 0), merged.maxDelayMs);
  const jitterSpan = exponential * merged.jitter;
  const randomOffset = (Math.random() * 2 - 1) * jitterSpan;
  return Math.max(0, Math.round(exponential + randomOffset));
}

export function normalizeError(error: unknown, defaultMessage: string) {
  const payload = error as { code?: string; message?: string };

  return {
    code: payload?.code,
    cause: error,
    message: payload?.message ?? defaultMessage,
    recoverable: true,
    timestamp: Date.now(),
  };
}

export function defaultParseMessage(event: MessageEvent): unknown {
  if (typeof event.data !== "string") {
    return event.data;
  }

  try {
    return JSON.parse(event.data);
  } catch {
    return event.data;
  }
}

export function defaultResolveEvent(context: WebSocketMessageContext): ResolvedWebSocketEvent | null {
  const { parsed } = context;

  if (typeof parsed === "object" && parsed !== null) {
    const payload = parsed as { data?: unknown; type?: unknown };
    if (typeof payload.type === "string") {
      const args = Array.isArray(payload.data)
        ? payload.data
        : payload.data === undefined
          ? [parsed]
          : [payload.data];
      return { args, event: payload.type };
    }
  }

  return { args: [parsed], event: "message" };
}

export function defaultSerializeMessage(event: string, args: unknown[]): string {
  return JSON.stringify({
    data: args.length <= 1 ? args[0] : args,
    type: event,
  });
}

export function defaultCreateRequestMessage(event: string, args: unknown[], requestId: string): string {
  return JSON.stringify({
    data: args.length <= 1 ? args[0] : args,
    requestId,
    type: event,
  });
}

export function defaultResolveRequest(context: WebSocketRequestContext): AckResult<unknown> | null {
  const { payload, requestId } = context;
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const record = payload as { code?: string; data?: unknown; error?: string; id?: string; requestId?: string; success?: boolean };
  const responseId = record.requestId ?? record.id;
  if (responseId !== requestId) {
    return null;
  }

  if (record.success === false || typeof record.error === "string") {
    if (record.code) {
      return {
        code: record.code,
        error: record.error ?? "WebSocket request failed",
        success: false,
      };
    }

    return {
      error: record.error ?? "WebSocket request failed",
      success: false,
    };
  }

  return {
    data: "data" in record ? record.data : payload,
    success: true,
  };
}
