import { WebSocketClientError as WebSocketClientErrorClass } from "./types";
import {
  computeRetryDelay,
  createDeferred,
  defaultCreateRequestMessage,
  defaultParseMessage,
  defaultResolveEvent,
  defaultResolveRequest,
  defaultSerializeMessage,
  normalizeError,
  wait,
} from "./utils";

import type {
  AckResult,
  RequestOptions,
  WebSocketClientConfig,
  WebSocketClientError,
  WebSocketMetricsSnapshot,
  WebSocketStatus,
} from "./types";

type Unsubscribe = () => void;
type StatusListener = (status: WebSocketStatus) => void;
type ErrorListener = (error: WebSocketClientError | null) => void;
type MetricsListener = (metrics: WebSocketMetricsSnapshot) => void;

interface PendingRequest {
  abortHandler: (() => void) | null;
  event: string;
  requestId: string;
  resolve: (result: AckResult<unknown>) => void;
  timer: number;
}

const DEFAULT_METRICS: WebSocketMetricsSnapshot = {
  activeSubscribers: 0,
  ackTimeouts: 0,
  emittedEvents: 0,
  reconnectAttempts: 0,
  successfulAcks: 0,
};

export class RealtimeWebSocketClient {
  private readonly config: WebSocketClientConfig;

  private socket: WebSocket | null = null;

  private readonly statusListeners = new Set<StatusListener>();

  private readonly errorListeners = new Set<ErrorListener>();

  private readonly metricsListeners = new Set<MetricsListener>();

  private readonly subscriptions = new Map<string, Set<(...args: unknown[]) => void>>();

  private readonly pendingRequests = new Map<string, PendingRequest>();

  private status: WebSocketStatus = "idle";

  private error: WebSocketClientError | null = null;

  private released = false;

  private connectPromise: Promise<void> | null = null;

  private reconnectTimer: number | null = null;

  private reconnectAttempt = 0;

  private manuallyDisconnected = false;

  private metrics: WebSocketMetricsSnapshot = { ...DEFAULT_METRICS };

  constructor(config: WebSocketClientConfig) {
    this.config = { shared: true, ...config };

    if (this.config.autoConnect !== false) {
      void this.connect();
    }
  }

  getSocket(): WebSocket | null {
    return this.released ? null : this.socket;
  }

  getStatus(): WebSocketStatus {
    if (this.released) {
      return "disconnected";
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      return "connected";
    }

    return this.status;
  }

  getError(): WebSocketClientError | null {
    return this.error;
  }

  getMetrics(): WebSocketMetricsSnapshot {
    return this.metrics;
  }

  onStatusChange(listener: StatusListener): Unsubscribe {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  onError(listener: ErrorListener): Unsubscribe {
    this.errorListeners.add(listener);
    listener(this.error);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  onMetrics(listener: MetricsListener): Unsubscribe {
    this.metricsListeners.add(listener);
    listener(this.metrics);
    return () => {
      this.metricsListeners.delete(listener);
    };
  }

  async connect(): Promise<void> {
    if (this.released) {
      throw new Error("WebSocket client has been released");
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.updateStatus("connected");
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING && this.connectPromise) {
      return this.connectPromise;
    }

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.manuallyDisconnected = false;
    this.updateStatus(this.status === "reconnecting" ? "reconnecting" : "connecting");

    const deferred = createDeferred<void>();
    const socket = new WebSocket(this.config.url, this.config.protocols);
    this.socket = socket;

    const handleOpen = () => {
      cleanup();
      deferred.resolve();
    };

    const handleError = (event: Event) => {
      cleanup();
      const normalized = normalizeError(event, "WebSocket connection failed");
      const clientError = new WebSocketClientErrorClass(normalized.message, normalized);
      deferred.reject(clientError);
    };

    const handleClose = () => {
      cleanup();
      deferred.reject(new Error("WebSocket connection closed before opening"));
    };

    const cleanup = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
    };

    socket.addEventListener("open", handleOpen, { once: true });
    socket.addEventListener("error", handleError, { once: true });
    socket.addEventListener("close", handleClose, { once: true });

    this.bindSocketListeners(socket);

    this.connectPromise = deferred.promise.finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  destroy(): void {
    if (this.released) {
      return;
    }

    this.released = true;
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.failPendingRequests("WebSocket client released");
    this.cleanupSocket();
    this.metrics = { ...DEFAULT_METRICS };
    this.publishMetrics();
    this.updateStatus("disconnected");
  }

  forceDisconnect(): void {
    if (this.released) {
      return;
    }

    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.failPendingRequests("WebSocket disconnected");
    this.cleanupSocket();
    this.updateStatus("disconnected");
  }

  subscribe(event: string, handler: (...args: unknown[]) => void): Unsubscribe {
    if (this.released) {
      return () => undefined;
    }

    const wrappedHandler = (...args: unknown[]) => {
      try {
        handler(...args);
      } catch (error) {
      this.publishError(
          new WebSocketClientErrorClass("WebSocket event handler failed", {
            cause: error,
            recoverable: true,
            timestamp: Date.now(),
          }),
        );
      }
    };

    const bucket = this.subscriptions.get(event) ?? new Set<(...args: unknown[]) => void>();
    bucket.add(wrappedHandler);
    this.subscriptions.set(event, bucket);
    this.metrics = { ...this.metrics, activeSubscribers: this.metrics.activeSubscribers + 1 };
    this.publishMetrics();

    return () => {
      const currentBucket = this.subscriptions.get(event);
      if (!currentBucket || !currentBucket.has(wrappedHandler)) {
        return;
      }

      currentBucket.delete(wrappedHandler);
      if (currentBucket.size === 0) {
        this.subscriptions.delete(event);
      }
      this.metrics = { ...this.metrics, activeSubscribers: Math.max(0, this.metrics.activeSubscribers - 1) };
      this.publishMetrics();
    };
  }

  unsubscribe(event: string, handler?: (...args: unknown[]) => void): void {
    if (!handler) {
      const bucket = this.subscriptions.get(event);
      if (!bucket) {
        return;
      }

      this.metrics = { ...this.metrics, activeSubscribers: Math.max(0, this.metrics.activeSubscribers - bucket.size) };
      this.subscriptions.delete(event);
      this.publishMetrics();
      return;
    }

    const bucket = this.subscriptions.get(event);
    if (!bucket) {
      return;
    }

    bucket.delete(handler);
    this.metrics = { ...this.metrics, activeSubscribers: Math.max(0, this.metrics.activeSubscribers - 1) };
    this.publishMetrics();
    if (bucket.size === 0) {
      this.subscriptions.delete(event);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error(`Cannot emit "${event}" while WebSocket is disconnected`);
    }

    const serializer = this.config.serializeMessage ?? defaultSerializeMessage;
    this.socket.send(serializer(event, args));
    this.metrics = { ...this.metrics, emittedEvents: this.metrics.emittedEvents + 1 };
    this.publishMetrics();
  }

  async request<Response = unknown>(
    event: string,
    args: unknown[] = [],
    options?: RequestOptions,
  ): Promise<AckResult<Response>> {
    const retries = options?.retry ?? this.config.requestRetry ?? 0;
    let attempt = 0;

    while (attempt <= retries) {
      attempt += 1;
      const result = await this.requestOnce<Response>(event, args, options);
      if (result.success || attempt > retries) {
        return result;
      }

      await wait(computeRetryDelay(options?.retryPolicy, attempt));
    }

    return { error: "Unexpected request retry state", success: false };
  }

  private bindSocketListeners(socket: WebSocket): void {
    socket.addEventListener("open", () => {
      if (this.socket !== socket || this.released) {
        return;
      }

      this.error = null;
      this.reconnectAttempt = 0;
      this.updateStatus("connected");
    });

    socket.addEventListener("message", (event) => {
      if (this.socket !== socket || this.released) {
        return;
      }

      const parser = this.config.parseMessage ?? defaultParseMessage;
      const parsed = parser(event);
      this.resolvePendingRequest(parsed);

      const resolver = this.config.resolveEvent ?? defaultResolveEvent;
      const resolvedEvent = resolver({ event, parsed });
      if (!resolvedEvent) {
        this.publishEvent("message", parsed);
        return;
      }

      this.publishEvent(resolvedEvent.event, ...resolvedEvent.args);
      if (resolvedEvent.event !== "message") {
        this.publishEvent("message", parsed);
      }
    });

    socket.addEventListener("error", (event) => {
      if (this.socket !== socket || this.released) {
        return;
      }

      const normalized = normalizeError(event, "WebSocket runtime error");
      const clientError = new WebSocketClientErrorClass(normalized.message, normalized);
      this.publishError(clientError);
      if (this.status !== "connected") {
        this.updateStatus("error");
      }
    });

    socket.addEventListener("close", () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;

      if (this.released || this.manuallyDisconnected) {
        this.updateStatus("disconnected");
        return;
      }

      this.failPendingRequests("WebSocket connection closed");

      if (this.config.reconnection === false) {
        this.updateStatus("disconnected");
        return;
      }

      const maxAttempts = this.config.reconnectionAttempts ?? Infinity;
      if (this.reconnectAttempt >= maxAttempts) {
        this.updateStatus("disconnected");
        return;
      }

      this.reconnectAttempt += 1;
      this.metrics = { ...this.metrics, reconnectAttempts: this.reconnectAttempt };
      this.publishMetrics();
      this.updateStatus("reconnecting");

      const delay = computeRetryDelay(
        {
          baseDelayMs: this.config.reconnectionDelay ?? 1000,
          jitter: this.config.randomizationFactor ?? 0.5,
          maxDelayMs: this.config.reconnectionDelayMax ?? 30000,
        },
        this.reconnectAttempt,
      );

      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        void this.connect().catch(() => undefined);
      }, delay);
    });
  }

  private async requestOnce<Response>(
    event: string,
    args: unknown[],
    options?: RequestOptions,
  ): Promise<AckResult<Response>> {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      try {
        await this.connect();
      } catch (error) {
        const normalized = normalizeError(error, `Unable to connect before "${event}"`);
        return normalized.code
          ? { code: normalized.code, error: normalized.message, success: false }
          : { error: normalized.message, success: false };
      }
    }

    const activeSocket = this.socket;
    if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
      return { error: `Unable to open WebSocket before "${event}"`, success: false };
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const timeout = options?.timeout ?? this.config.ackTimeout ?? 10000;
    const requestFactory = this.config.createRequestMessage ?? defaultCreateRequestMessage;

    return new Promise<AckResult<Response>>((resolve) => {
      const finalize = (result: AckResult<Response>) => {
        const pending = this.pendingRequests.get(requestId);
        if (!pending) {
          return;
        }

        window.clearTimeout(pending.timer);
        pending.abortHandler?.();
        this.pendingRequests.delete(requestId);

        if (result.success) {
          this.metrics = { ...this.metrics, successfulAcks: this.metrics.successfulAcks + 1 };
          this.publishMetrics();
        }

        resolve(result);
      };

      const timer = window.setTimeout(() => {
        this.metrics = { ...this.metrics, ackTimeouts: this.metrics.ackTimeouts + 1 };
        this.publishMetrics();
        finalize({ error: `Ack timeout after ${timeout}ms`, success: false });
      }, timeout);

      const abortHandler = () => {
        finalize({ error: "Request aborted", success: false });
      };

      options?.signal?.addEventListener("abort", abortHandler, { once: true });

      this.pendingRequests.set(requestId, {
        abortHandler: () => options?.signal?.removeEventListener("abort", abortHandler),
        event,
        requestId,
        resolve: (result) => finalize(result as AckResult<Response>),
        timer,
      });

      activeSocket.send(requestFactory(event, args, requestId));
      this.metrics = { ...this.metrics, emittedEvents: this.metrics.emittedEvents + 1 };
      this.publishMetrics();
    });
  }

  private resolvePendingRequest(payload: unknown): void {
    const resolver = this.config.resolveRequest ?? defaultResolveRequest;
    for (const pending of this.pendingRequests.values()) {
      const resolved = resolver({
        event: pending.event,
        payload,
        requestId: pending.requestId,
      });

      if (resolved) {
        pending.resolve(resolved);
        return;
      }
    }
  }

  private failPendingRequests(message: string): void {
    for (const pending of this.pendingRequests.values()) {
      window.clearTimeout(pending.timer);
      pending.abortHandler?.();
      pending.resolve({ error: message, success: false });
    }
    this.pendingRequests.clear();
  }

  private publishEvent(event: string, ...args: unknown[]): void {
    const bucket = this.subscriptions.get(event);
    if (!bucket) {
      return;
    }

    bucket.forEach((handler) => handler(...args));
  }

  private cleanupSocket(): void {
    const activeSocket = this.socket;
    this.socket = null;
    if (!activeSocket) {
      return;
    }

    if (activeSocket.readyState === WebSocket.OPEN || activeSocket.readyState === WebSocket.CONNECTING) {
      activeSocket.close();
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) {
      return;
    }

    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private updateStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
    this.config.onStatusChange?.(status);
  }

  private publishError(error: WebSocketClientError): void {
    this.error = error;
    this.errorListeners.forEach((listener) => listener(error));
    this.config.onError?.(error);
  }

  private publishMetrics(): void {
    this.metricsListeners.forEach((listener) => listener(this.metrics));
    this.config.onMetrics?.(this.metrics);
  }
}
