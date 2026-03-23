import type { ManagerOptions, Socket, SocketOptions } from "socket.io-client";

export type SocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"
  | "auth_failed";

export interface SocketErrorContext {
  code?: string | undefined;
  cause?: unknown | undefined;
  recoverable: boolean;
  timestamp: number;
}

export class SocketClientError extends Error {
  code: string | undefined;
  recoverable: boolean;
  timestamp: number;
  cause: unknown | undefined;

  constructor(message: string, context: SocketErrorContext) {
    super(message);
    this.name = "SocketClientError";
    this.code = context.code;
    this.cause = context.cause;
    this.recoverable = context.recoverable;
    this.timestamp = context.timestamp;
  }
}

export interface AckSuccess<T> {
  success: true;
  data: T;
}

export interface AckFailure {
  success: false;
  error: string;
  code?: string;
}

export type AckResult<T> = AckSuccess<T> | AckFailure;

export interface RetryPolicy {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: number;
}

export interface RequestOptions {
  timeout?: number;
  retry?: number;
  retryPolicy?: RetryPolicy;
  signal?: AbortSignal;
}

export interface SocketMetricsSnapshot {
  activeSubscribers: number;
  ackTimeouts: number;
  emittedEvents: number;
  reconnectAttempts: number;
  successfulAcks: number;
}

export type SocketEventMap = Record<string, unknown[]>;

export interface SocketRequestDefinition<Payload extends unknown[] = unknown[], Response = unknown> {
  payload: Payload;
  response: Response;
}

export type SocketRequestMap = Record<string, SocketRequestDefinition>;

export interface SocketClientConfig {
  url: string;
  namespace?: string;
  path?: string;
  autoConnect?: boolean;
  shared?: boolean;
  scopeKey?: string;
  auth?: Record<string, unknown> | (() => Record<string, unknown>);
  query?: Record<string, string>;
  extraHeaders?: Record<string, string>;
  timeout?: number;
  transports?: ManagerOptions["transports"];
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  randomizationFactor?: number;
  ackTimeout?: number;
  requestRetry?: number;
  debug?: boolean;
  authErrorCodes?: string[];
  onStatusChange?: (status: SocketStatus) => void;
  onError?: (error: SocketClientError) => void;
  onMetrics?: (metrics: SocketMetricsSnapshot) => void;
}

export interface ManagedSocketRecord {
  cacheKey: string;
  configFingerprint: string;
  refCount: number;
  socket: Socket;
}

export type SocketIoConfig = Partial<ManagerOptions & SocketOptions>;

export interface UseSocketReturn<
  ServerEvents extends SocketEventMap = SocketEventMap,
  ClientEvents extends SocketEventMap = SocketEventMap,
> {
  socket: Socket | null;
  status: SocketStatus;
  isConnected: boolean;
  isConnecting: boolean;
  error: SocketClientError | null;
  metrics: SocketMetricsSnapshot;
  connect: () => Promise<void>;
  release: () => void;
  forceDisconnect: () => void;
  subscribe: <E extends keyof ServerEvents & string>(
    event: E,
    handler: (...args: ServerEvents[E]) => void,
  ) => () => void;
  unsubscribe: <E extends keyof ServerEvents & string>(event: E, handler?: (...args: ServerEvents[E]) => void) => void;
  emit: <E extends keyof ClientEvents & string>(event: E, ...args: ClientEvents[E]) => void;
  request: <Response = unknown, E extends keyof ClientEvents & string = keyof ClientEvents & string>(
    event: E,
    args?: ClientEvents[E],
    options?: RequestOptions,
  ) => Promise<AckResult<Response>>;
  updateAuth: (auth: Record<string, unknown> | (() => Record<string, unknown>)) => void;
}

export interface UseSocketStatusReturn {
  status: SocketStatus;
  isConnected: boolean;
  isConnecting: boolean;
  error: SocketClientError | null;
  metrics: SocketMetricsSnapshot;
}

export interface UseSocketSubscriptionOptions {
  enabled?: boolean;
}

export interface UseSocketRequestReturn<
  RequestMap extends SocketRequestMap,
  Event extends keyof RequestMap & string,
> {
  error: AckFailure | null;
  execute: (
    ...args: [...payload: RequestMap[Event]["payload"], options?: RequestOptions]
  ) => Promise<AckResult<RequestMap[Event]["response"]>>;
  isLoading: boolean;
  reset: () => void;
}
