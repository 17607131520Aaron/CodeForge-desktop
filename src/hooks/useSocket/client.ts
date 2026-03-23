import { acquireManagedSocket, forceDestroyManagedSocket, releaseManagedSocket } from "./manager";
import { SocketClientError as SocketClientErrorClass } from "./types";
import { computeRetryDelay, createDeferred, normalizeError, resolveAuth, wait } from "./utils";

import type {
  AckFailure,
  AckResult,
  RequestOptions,
  SocketClientConfig,
  SocketClientError,
  SocketMetricsSnapshot,
  SocketStatus,
} from "./types";
import type { Socket } from "socket.io-client";

type Unsubscribe = () => void;
type StatusListener = (status: SocketStatus) => void;
type ErrorListener = (error: SocketClientError | null) => void;
type MetricsListener = (metrics: SocketMetricsSnapshot) => void;

const DEFAULT_METRICS: SocketMetricsSnapshot = {
  activeSubscribers: 0,
  ackTimeouts: 0,
  emittedEvents: 0,
  reconnectAttempts: 0,
  successfulAcks: 0,
};

export class RealtimeSocketClient {
  private readonly config: SocketClientConfig;

  private readonly configKey: string;

  private readonly socket: Socket;

  private readonly statusListeners = new Set<StatusListener>();

  private readonly errorListeners = new Set<ErrorListener>();

  private readonly metricsListeners = new Set<MetricsListener>();

  private readonly subscriptions = new Map<string, Set<(...args: unknown[]) => void>>();

  private readonly ownedListenerOffs: Unsubscribe[] = [];

  private status: SocketStatus = "idle";

  private error: SocketClientError | null = null;

  private released = false;

  private connectPromise: Promise<void> | null = null;

  private metrics: SocketMetricsSnapshot = { ...DEFAULT_METRICS };

  constructor(config: SocketClientConfig) {
    this.config = { shared: true, ...config };
    const record = acquireManagedSocket(this.config);
    this.configKey = record.cacheKey;
    this.socket = record.socket;
    this.bindCoreListeners();

    if (this.config.autoConnect !== false) {
      void this.connect();
    }
  }

  getSocket(): Socket | null {
    return this.released ? null : this.socket;
  }

  getStatus(): SocketStatus {
    if (this.released) {
      return "disconnected";
    }

    if (this.socket.connected) {
      return "connected";
    }

    return this.status;
  }

  getError(): SocketClientError | null {
    return this.error;
  }

  getMetrics(): SocketMetricsSnapshot {
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
      throw new Error("Socket client has been released");
    }

    if (this.socket.connected) {
      this.updateStatus("connected");
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.updateStatus(this.status === "reconnecting" ? "reconnecting" : "connecting");

    const deferred = createDeferred<void>();
    const cleanupConnect = this.attachConnectPromise(deferred.resolve, deferred.reject);
    this.connectPromise = deferred.promise.finally(() => {
      cleanupConnect();
      this.connectPromise = null;
    });

    const auth = resolveAuth(this.config.auth);
    if (auth) {
      this.socket.auth = auth;
    }
    this.socket.connect();

    return this.connectPromise;
  }

  release(): void {
    if (this.released) {
      return;
    }

    this.cleanupOwnedListeners();
    this.released = true;
    releaseManagedSocket(this.configKey);
    this.updateStatus("disconnected");
  }

  forceDisconnect(): void {
    this.cleanupOwnedListeners();
    this.released = true;
    forceDestroyManagedSocket(this.configKey);
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
          new SocketClientErrorClass("Socket event handler failed", {
            code: undefined,
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
    this.socket.on(event, wrappedHandler);
    this.metrics = { ...this.metrics, activeSubscribers: this.metrics.activeSubscribers + 1 };
    this.publishMetrics();

    return () => {
      const currentBucket = this.subscriptions.get(event);
      if (!currentBucket || !currentBucket.has(wrappedHandler)) {
        return;
      }

      currentBucket.delete(wrappedHandler);
      this.socket.off(event, wrappedHandler);
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

      bucket.forEach((registeredHandler) => {
        this.socket.off(event, registeredHandler);
      });
      this.metrics = { ...this.metrics, activeSubscribers: Math.max(0, this.metrics.activeSubscribers - bucket.size) };
      this.subscriptions.delete(event);
      this.publishMetrics();
      return;
    }

    this.socket.off(event, handler);
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.socket.connected) {
      throw new Error(`Cannot emit "${event}" while socket is disconnected`);
    }

    this.socket.emit(event, ...args);
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

  updateAuth(auth: Record<string, unknown> | (() => Record<string, unknown>)): void {
    this.config.auth = auth;
    const resolvedAuth = resolveAuth(auth);
    if (resolvedAuth) {
      this.socket.auth = resolvedAuth;
    }

    if (this.socket.connected) {
      this.socket.disconnect();
      void this.connect();
    }
  }

  private bindCoreListeners(): void {
    const onConnect = () => {
      this.error = null;
      this.updateStatus("connected");
    };

    const onDisconnect = (reason: string) => {
      if (this.released) {
        return;
      }

      this.updateStatus(reason === "io client disconnect" ? "disconnected" : "reconnecting");
    };

    const onConnectError = (error: unknown) => {
      const normalized = normalizeError(error, "Socket connection failed", this.config.authErrorCodes);
      const clientError = new SocketClientErrorClass(normalized.message, normalized);
      this.publishError(clientError);
      this.updateStatus(normalized.recoverable ? "error" : "auth_failed");
    };

    const onReconnectAttempt = (attempt: number) => {
      this.metrics = { ...this.metrics, reconnectAttempts: attempt };
      this.publishMetrics();
      this.updateStatus("reconnecting");
    };

    this.socket.on("connect", onConnect);
    this.socket.on("disconnect", onDisconnect);
    this.socket.on("connect_error", onConnectError);
    this.socket.io.on("reconnect_attempt", onReconnectAttempt);

    this.ownedListenerOffs.push(() => this.socket.off("connect", onConnect));
    this.ownedListenerOffs.push(() => this.socket.off("disconnect", onDisconnect));
    this.ownedListenerOffs.push(() => this.socket.off("connect_error", onConnectError));
    this.ownedListenerOffs.push(() => this.socket.io.off("reconnect_attempt", onReconnectAttempt));
  }

  private attachConnectPromise(resolve: () => void, reject: (reason?: unknown) => void): Unsubscribe {
    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const handleError = (error: unknown) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      this.socket.off("connect", handleConnect);
      this.socket.off("connect_error", handleError);
    };

    this.socket.once("connect", handleConnect);
    this.socket.once("connect_error", handleError);
    return cleanup;
  }

  private async requestOnce<Response>(
    event: string,
    args: unknown[],
    options?: RequestOptions,
  ): Promise<AckResult<Response>> {
    if (!this.socket.connected) {
      try {
        await this.connect();
      } catch (error) {
        const normalized = normalizeError(error, `Unable to connect before "${event}"`, this.config.authErrorCodes);
        return normalized.code
          ? { code: normalized.code, error: normalized.message, success: false }
          : { error: normalized.message, success: false };
      }
    }

    const timeout = options?.timeout ?? this.config.ackTimeout ?? 10000;

    return new Promise<AckResult<Response>>((resolve) => {
      let completed = false;
      const timer = window.setTimeout(() => {
        if (completed) {
          return;
        }

        completed = true;
        this.metrics = { ...this.metrics, ackTimeouts: this.metrics.ackTimeouts + 1 };
        this.publishMetrics();
        resolve({ error: `Ack timeout after ${timeout}ms`, success: false });
      }, timeout);

      const finalize = (result: AckResult<Response>) => {
        if (completed) {
          return;
        }

        completed = true;
        window.clearTimeout(timer);
        resolve(result);
      };

      const abortHandler = () => {
        finalize({ error: "Request aborted", success: false });
      };

      options?.signal?.addEventListener("abort", abortHandler, { once: true });

      this.socket.emit(event, ...args, (response: Response | AckFailure) => {
        options?.signal?.removeEventListener("abort", abortHandler);

        if (typeof response === "object" && response !== null && "success" in response && response.success === false) {
          finalize(response as AckFailure);
          return;
        }

        this.metrics = { ...this.metrics, successfulAcks: this.metrics.successfulAcks + 1 };
        this.publishMetrics();
        finalize({ data: response as Response, success: true });
      });

      this.metrics = { ...this.metrics, emittedEvents: this.metrics.emittedEvents + 1 };
      this.publishMetrics();
    });
  }

  private cleanupOwnedListeners(): void {
    while (this.ownedListenerOffs.length > 0) {
      const off = this.ownedListenerOffs.pop();
      off?.();
    }

    this.subscriptions.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket.off(event, handler);
      });
    });
    this.subscriptions.clear();
    this.metrics = { ...DEFAULT_METRICS };
    this.publishMetrics();
  }

  private updateStatus(status: SocketStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
    this.config.onStatusChange?.(status);
  }

  private publishError(error: SocketClientError): void {
    this.error = error;
    this.errorListeners.forEach((listener) => listener(error));
    this.config.onError?.(error);
  }

  private publishMetrics(): void {
    this.metricsListeners.forEach((listener) => listener(this.metrics));
    this.config.onMetrics?.(this.metrics);
  }
}
