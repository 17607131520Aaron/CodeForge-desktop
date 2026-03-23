import type { RetryPolicy, SocketClientConfig, SocketIoConfig } from "./types";

const DEFAULT_AUTH_ERROR_CODES = ["401", "403", "AUTH_FAILED", "TOKEN_EXPIRED"];

export const defaultRetryPolicy: Required<RetryPolicy> = {
  attempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: 0.2,
};

export function resolveAuth(auth: SocketClientConfig["auth"]): Record<string, unknown> | undefined {
  if (!auth) {
    return undefined;
  }

  return typeof auth === "function" ? auth() : auth;
}

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

export function buildCacheKey(config: SocketClientConfig): string {
  return stableSerialize({
    extraHeaders: config.extraHeaders,
    namespace: config.namespace ?? "",
    path: config.path ?? "",
    query: config.query,
    scopeKey: config.scopeKey ?? "default",
    shared: config.shared ?? true,
    transports: config.transports,
    url: config.url,
  });
}

export function buildConfigFingerprint(config: SocketClientConfig): string {
  return stableSerialize({
    ackTimeout: config.ackTimeout,
    auth: resolveAuth(config.auth),
    extraHeaders: config.extraHeaders,
    namespace: config.namespace ?? "",
    path: config.path ?? "",
    query: config.query,
    randomizationFactor: config.randomizationFactor,
    reconnection: config.reconnection,
    reconnectionAttempts: config.reconnectionAttempts,
    reconnectionDelay: config.reconnectionDelay,
    reconnectionDelayMax: config.reconnectionDelayMax,
    timeout: config.timeout,
    transports: config.transports,
    url: config.url,
  });
}

export function createSocketUrl(config: SocketClientConfig): string {
  const namespace = config.namespace?.trim();
  if (!namespace || namespace === "/") {
    return config.url;
  }

  return `${config.url.replace(/\/$/, "")}/${namespace.replace(/^\//, "")}`;
}

export function buildSocketOptions(config: SocketClientConfig): SocketIoConfig {
  const options: SocketIoConfig = {
    autoConnect: false,
    randomizationFactor: config.randomizationFactor ?? 0.5,
    reconnection: config.reconnection ?? true,
    reconnectionAttempts: config.reconnectionAttempts ?? Infinity,
    reconnectionDelay: config.reconnectionDelay ?? 1000,
    reconnectionDelayMax: config.reconnectionDelayMax ?? 30000,
    timeout: config.timeout ?? 20000,
  };

  const auth = resolveAuth(config.auth);
  if (auth) {
    options.auth = auth;
  }
  if (config.extraHeaders) {
    options.extraHeaders = config.extraHeaders;
  }
  if (config.path) {
    options.path = config.path;
  }
  if (config.query) {
    options.query = config.query;
  }
  if (config.transports) {
    options.transports = config.transports;
  }

  return options;
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

export function normalizeError(error: unknown, defaultMessage: string, authErrorCodes?: string[]) {
  const authCodes = authErrorCodes ?? DEFAULT_AUTH_ERROR_CODES;
  const payload = (error ?? {}) as { data?: { code?: string; message?: string }; message?: string };
  const code = payload.data?.code;
  const message = payload.data?.message ?? payload.message ?? defaultMessage;
  const recoverable = !(code && authCodes.includes(code));

  return {
    code,
    message,
    recoverable,
    timestamp: Date.now(),
  };
}
