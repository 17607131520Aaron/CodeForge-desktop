export type WebSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"
  | "auth_failed";

export interface WebSocketErrorContext {
  code?: string | undefined;
  cause?: unknown | undefined;
  recoverable: boolean;
  timestamp: number;
}

export class WebSocketClientError extends Error {
  code: string | undefined;
  recoverable: boolean;
  timestamp: number;
  cause: unknown | undefined;

  constructor(message: string, context: WebSocketErrorContext) {
    super(message);
    this.name = "WebSocketClientError";
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

export interface WebSocketMetricsSnapshot {
  activeSubscribers: number;
  ackTimeouts: number;
  emittedEvents: number;
  reconnectAttempts: number;
  successfulAcks: number;
}

export type WebSocketEventMap = Record<string, unknown[]>;

export interface WebSocketRequestDefinition<Payload extends unknown[] = unknown[], Response = unknown> {
  payload: Payload;
  response: Response;
}

export type WebSocketRequestMap = Record<string, WebSocketRequestDefinition>;

export interface ResolvedWebSocketEvent {
  event: string;
  args: unknown[];
}

export interface WebSocketMessageContext {
  event: MessageEvent;
  parsed: unknown;
}

export interface WebSocketRequestContext {
  event: string;
  payload: unknown;
  requestId: string;
}

export interface WebSocketClientConfig {
  url: string;
  protocols?: string | string[];
  autoConnect?: boolean;
  shared?: boolean;
  scopeKey?: string;
  timeout?: number;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  randomizationFactor?: number;
  ackTimeout?: number;
  requestRetry?: number;
  debug?: boolean;
  onStatusChange?: (status: WebSocketStatus) => void;
  onError?: (error: WebSocketClientError) => void;
  onMetrics?: (metrics: WebSocketMetricsSnapshot) => void;
  parseMessage?: (event: MessageEvent) => unknown;
  resolveEvent?: (context: WebSocketMessageContext) => ResolvedWebSocketEvent | null;
  serializeMessage?: (event: string, args: unknown[]) => string | ArrayBufferLike | Blob | ArrayBufferView;
  createRequestMessage?: (event: string, args: unknown[], requestId: string) => string | ArrayBufferLike | Blob | ArrayBufferView;
  resolveRequest?: (context: WebSocketRequestContext) => AckResult<unknown> | null;
}

export interface ManagedWebSocketRecord {
  cacheKey: string;
  refCount: number;
  client: IWebSocketClient;
  config: WebSocketClientConfig;
}

export interface UseWebSocketReturn<
  ServerEvents extends WebSocketEventMap = WebSocketEventMap,
  ClientEvents extends WebSocketEventMap = WebSocketEventMap,
> {
  socket: WebSocket | null;
  status: WebSocketStatus;
  isConnected: boolean;
  isConnecting: boolean;
  error: WebSocketClientError | null;
  metrics: WebSocketMetricsSnapshot;
  connect: () => Promise<void>;
  release: () => void;
  forceDisconnect: () => void;
  subscribe: <E extends keyof ServerEvents & string>(
    event: E,
    handler: (...args: ServerEvents[E]) => void,
  ) => () => void;
  unsubscribe: <E extends keyof ServerEvents & string>(
    event: E,
    handler?: (...args: ServerEvents[E]) => void,
  ) => void;
  emit: <E extends keyof ClientEvents & string>(event: E, ...args: ClientEvents[E]) => void;
  request: <Response = unknown, E extends keyof ClientEvents & string = keyof ClientEvents & string>(
    event: E,
    args?: ClientEvents[E],
    options?: RequestOptions,
  ) => Promise<AckResult<Response>>;
}

export interface UseWebSocketStatusReturn {
  status: WebSocketStatus;
  isConnected: boolean;
  isConnecting: boolean;
  error: WebSocketClientError | null;
  metrics: WebSocketMetricsSnapshot;
}

export interface UseWebSocketSubscriptionOptions {
  enabled?: boolean;
}

export interface UseWebSocketRequestReturn<
  RequestMap extends WebSocketRequestMap,
  Event extends keyof RequestMap & string,
> {
  error: AckFailure | null;
  execute: (
    ...args: [...payload: RequestMap[Event]["payload"], options?: RequestOptions]
  ) => Promise<AckResult<RequestMap[Event]["response"]>>;
  isLoading: boolean;
  reset: () => void;
}

export interface IWebSocketClient {
  connect(): Promise<void>;
  destroy(): void;
  emit(event: string, ...args: unknown[]): void;
  forceDisconnect(): void;
  getError(): WebSocketClientError | null;
  getMetrics(): WebSocketMetricsSnapshot;
  getSocket(): WebSocket | null;
  getStatus(): WebSocketStatus;
  onError(listener: (error: WebSocketClientError | null) => void): () => void;
  onMetrics(listener: (metrics: WebSocketMetricsSnapshot) => void): () => void;
  onStatusChange(listener: (status: WebSocketStatus) => void): () => void;
  request<Response = unknown>(event: string, args?: unknown[], options?: RequestOptions): Promise<AckResult<Response>>;
  subscribe(event: string, handler: (...args: unknown[]) => void): () => void;
  unsubscribe(event: string, handler?: (...args: unknown[]) => void): void;
}
