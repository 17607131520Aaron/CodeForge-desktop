/**
 * WebSocket 日志服务器
 * 用于接收 React Native 应用发送的日志，并转发给连接的 web 客户端
 * 支持原生 WebSocket 协议
 */

import { createServer, type IncomingMessage, type Server as HttpServer } from "http";

import { WebSocketServer, WebSocket, type RawData } from "ws";

const MAX_PENDING_BROADCASTS = 2000;
const MAX_FLUSH_BATCH_SIZE = 200;
const MAX_SOCKET_BUFFERED_BYTES = 2 * 1024 * 1024;
const envNumber = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Disable the "sanitizeLargePayload" truncation behavior.
// WARNING: Extremely large messages can impact memory / UI responsiveness.
// Since you requested "no truncation", we force-disable sanitization truncation.
const disableTruncation = true;

// If payloads are truncated here, the frontend cannot recover original content.
// Increase defaults to reduce user-visible truncation during network monitoring.
const MAX_INCOMING_MESSAGE_BYTES = envNumber("LOG_SERVER_MAX_INCOMING_MESSAGE_BYTES", 1024 * 1024); // 1MB
const JS_LOG_REPEAT_SUMMARY_DELAY_MS = 250;
const JS_LOG_QUEUE_HIGH_WATERMARK = 0.5;
const JS_LOG_QUEUE_CRITICAL_WATERMARK = 0.75;
const JS_LOG_QUEUE_EMERGENCY_WATERMARK = 0.9;
const MAX_STRING_FIELD_LENGTH = envNumber("LOG_SERVER_MAX_STRING_FIELD_LENGTH", 64 * 1024); // 64KB
const MAX_ARRAY_ITEMS = envNumber("LOG_SERVER_MAX_ARRAY_ITEMS", 250);
const MAX_OBJECT_KEYS = envNumber("LOG_SERVER_MAX_OBJECT_KEYS", 250);
const MAX_SANITIZE_DEPTH = envNumber("LOG_SERVER_MAX_SANITIZE_DEPTH", 10);

interface IQueuedBroadcast {
  excludeSender: boolean;
  message: string;
  sender: WebSocket | null;
}

interface IRepeatLogState {
  baseMessage: string;
  count: number;
  level: string;
  sender: WebSocket | null;
  signature: string;
  timer: NodeJS.Timeout | null;
}

/**
 * 客户端信息接口
 */
interface IClientInfo {
  id: string;
  ip: string;
}

/**
 * WebSocket 日志服务器类
 */
export class LogWebSocketServer {
  private wss: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private readonly clients = new Map<WebSocket, IClientInfo>();
  private readonly pendingBroadcasts: IQueuedBroadcast[] = [];
  private clientIdCounter = 0;
  private flushHandle: NodeJS.Immediate | null = null;
  private port: number = 8082;
  private path: string = "/logs";
  private isRunning: boolean = false;
  private droppedBroadcastCount = 0;
  private droppedJsLogCount = 0;
  private jsLogSampleCounter = 0;
  private repeatedJsLogState: IRepeatLogState | null = null;

  /**
   * 获取当前连接数
   */
  public getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * 获取服务器是否正在运行
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 启动 WebSocket 服务器
   * @param port 监听端口，默认 8082
   * @param path WebSocket 路径，默认 '/logs'
   */
  public start(port: number = 8082, path: string = "/logs"): void {
    if (this.isRunning) {
      console.warn("[Log Server] WebSocket 服务器已在运行");
      return;
    }

    this.port = port;
    this.path = path;

    try {
      console.log(
        `[Log Server] truncation=${disableTruncation ? "disabled" : "enabled"}, maxIncomingBytes=${MAX_INCOMING_MESSAGE_BYTES}, maxStringBytes=${MAX_STRING_FIELD_LENGTH}`,
      );
      // 创建 HTTP 服务器用于 WebSocket 升级
      this.httpServer = createServer();

      // 创建 WebSocket 服务器
      this.wss = new WebSocketServer({
        server: this.httpServer,
        path: this.path,
      });

      // 处理 WebSocket 连接
      this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
        this.handleConnection(ws, request);
      });

      // 启动 HTTP 服务器
      // 监听所有网络接口 (0.0.0.0)，以便接受来自模拟器和真机的连接
      this.httpServer.listen(this.port, "0.0.0.0", () => {
        this.isRunning = true;
        console.log(`[Log Server] WebSocket 服务器已启动: ws://0.0.0.0:${this.port}${this.path}`);
        console.log(`[Log Server] 监听所有网络接口，可通过以下地址访问:`);
        console.log(`  - ws://localhost:${this.port}${this.path} (本机)`);
        console.log(`  - ws://10.0.2.2:${this.port}${this.path} (Android 模拟器)`);
        console.log(`  - ws://<本机IP>:${this.port}${this.path} (真机/其他设备)`);
      });

      // 处理服务器错误
      this.httpServer.on("error", (error: NodeJS.ErrnoException) => {
        const errorMessage = error.message;
        const errorCode = error.code;
        console.error(`[Log Server] HTTP 服务器错误: ${errorMessage} (code: ${errorCode})`);

        // 如果是端口被占用，给出明确提示
        if (errorCode === "EADDRINUSE") {
          console.error(`[Log Server] 端口 ${port} 已被占用，请检查是否有其他服务在使用该端口`);
        }
      });

      this.wss.on("error", (error: Error) => {
        console.error(`[Log Server] WebSocket 服务器错误: ${error.message}`);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[Log Server] 启动 WebSocket 服务器失败: ${errorMessage}`, errorStack);
      this.isRunning = false;
    }
  }

  /**
   * 停止 WebSocket 服务器
   */
  public stop(): void {
    if (this.flushHandle) {
      clearImmediate(this.flushHandle);
      this.flushHandle = null;
    }

    this.flushRepeatedJsLogSummary();

    if (this.wss) {
      this.wss.close(() => {
        console.log("[Log Server] WebSocket 服务器已关闭");
      });
      this.wss = null;
    }

    if (this.httpServer) {
      this.httpServer.close(() => {
        console.log("[Log Server] HTTP 服务器已关闭");
      });
      this.httpServer = null;
    }

    this.clients.clear();
    this.pendingBroadcasts.length = 0;
    this.isRunning = false;
  }

  /**
   * 处理客户端连接
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientId = `client-${++this.clientIdCounter}`;
    const forwardedFor = request.headers["x-forwarded-for"];
    const realIp = request.headers["x-real-ip"];
    const remoteAddress = request.socket?.remoteAddress;

    const clientIp =
      (typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : undefined) ||
      (typeof realIp === "string" ? realIp : undefined) ||
      remoteAddress ||
      "unknown";

    this.clients.set(ws, { id: clientId, ip: String(clientIp) });

    console.log(`[Log Server] 客户端连接: ${clientId}，IP: ${clientIp}，当前连接数: ${this.clients.size}`);

    // 发送欢迎消息
    this.sendWelcomeMessage(ws, String(clientIp));

    // 处理消息
    ws.on("message", (data: RawData) => {
      this.handleMessage(ws, data);
    });

    // 处理关闭
    ws.on("close", () => {
      this.handleDisconnect(ws);
    });

    // 处理错误
    ws.on("error", (error) => {
      const clientInfo = this.clients.get(ws);
      console.error(`[Log Server] 客户端 ${clientInfo?.id || "unknown"} 错误:`, error);
    });
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(sender: WebSocket, data: RawData): void {
    try {
      const rawMessage = this.normalizeRawData(data);
      const parsedData = JSON.parse(rawMessage);
      const messageStr = this.normalizeMessageForForwarding(parsedData, rawMessage);

      // 根据消息类型处理
      if (parsedData.type === "js-log") {
        this.handleJsLogMessage(sender, parsedData, messageStr);
      } else if (parsedData.type === "network-request") {
        this.flushRepeatedJsLogSummary();
        // 广播给所有客户端（包括发送者，因为前端需要显示）
        this.enqueueBroadcast(messageStr);
      } else if (parsedData.type === "network-response") {
        this.flushRepeatedJsLogSummary();
        // 广播给所有客户端
        this.enqueueBroadcast(messageStr);
      } else if (parsedData.type === "network-error") {
        this.flushRepeatedJsLogSummary();
        // 广播给所有客户端
        this.enqueueBroadcast(messageStr);
      } else {
        this.flushRepeatedJsLogSummary();
        // 其他类型的消息，也广播给所有客户端

        this.enqueueBroadcast(messageStr);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Log Server] 解析消息失败: ${errorMessage}`);
    }
  }

  private handleJsLogMessage(sender: WebSocket, parsedData: unknown, messageStr: string): void {
    // Always forward every js-log message, even if repeated.
    // (No sampling, no "repeat summary" aggregation.)
    this.enqueueBroadcast(messageStr, sender, true);
  }

  /**
   * 处理客户端断开
   */
  private handleDisconnect(ws: WebSocket): void {
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      this.clients.delete(ws);
      console.log(`[Log Server] 客户端断开: ${clientInfo.id}，IP: ${clientInfo.ip}，当前连接数: ${this.clients.size}`);
    }
  }

  /**
   * 发送欢迎消息
   */
  private sendWelcomeMessage(ws: WebSocket, clientIp: string): void {
    try {
      const message = JSON.stringify({
        type: "system",
        message: `已连接到日志服务器 (客户端IP: ${clientIp})`,
        timestamp: new Date().toISOString(),
        clientIp,
      });

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch (error) {
      console.error("[Log Server] 发送欢迎消息失败:", error);
    }
  }

  /**
   * 广播消息给所有客户端（除了发送者）
   */
  private enqueueBroadcast(message: string, sender: WebSocket | null = null, excludeSender: boolean = false): void {
    if (this.pendingBroadcasts.length >= MAX_PENDING_BROADCASTS) {
      this.pendingBroadcasts.shift();
      this.droppedBroadcastCount += 1;

      if (this.droppedBroadcastCount === 1 || this.droppedBroadcastCount % 100 === 0) {
        console.warn(
          `[Log Server] 广播队列已满，已丢弃 ${this.droppedBroadcastCount} 条旧消息，当前队列长度: ${this.pendingBroadcasts.length}`,
        );
      }
    }

    this.pendingBroadcasts.push({ excludeSender, message, sender });
    this.scheduleFlush();
  }

  private shouldSampleJsLog(level: string): boolean {
    if (level === "warn" || level === "error") {
      return false;
    }

    const queueUsage = this.pendingBroadcasts.length / MAX_PENDING_BROADCASTS;
    let sampleRate = 1;

    if (queueUsage >= JS_LOG_QUEUE_EMERGENCY_WATERMARK) {
      sampleRate = 10;
    } else if (queueUsage >= JS_LOG_QUEUE_CRITICAL_WATERMARK) {
      sampleRate = 5;
    } else if (queueUsage >= JS_LOG_QUEUE_HIGH_WATERMARK) {
      sampleRate = 2;
    }

    if (sampleRate === 1) {
      return false;
    }

    this.jsLogSampleCounter = (this.jsLogSampleCounter + 1) % sampleRate;
    return this.jsLogSampleCounter !== 0;
  }

  private enqueueSampledJsLogSummary(): void {
    const droppedCount = this.droppedJsLogCount;
    if (droppedCount <= 0) {
      return;
    }

    this.droppedJsLogCount = 0;
    this.enqueueBroadcast(
      JSON.stringify({
        type: "js-log",
        level: "warn",
        message: `[Log Server] 日志洪峰中已采样丢弃 ${droppedCount} 条低优先级日志`,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  private scheduleRepeatedJsLogSummary(): void {
    if (!this.repeatedJsLogState) {
      return;
    }

    if (this.repeatedJsLogState.timer) {
      clearTimeout(this.repeatedJsLogState.timer);
    }

    this.repeatedJsLogState.timer = setTimeout(() => {
      this.flushRepeatedJsLogSummary();
    }, JS_LOG_REPEAT_SUMMARY_DELAY_MS);
  }

  private flushRepeatedJsLogSummary(): void {
    if (!this.repeatedJsLogState) {
      return;
    }

    if (this.repeatedJsLogState.timer) {
      clearTimeout(this.repeatedJsLogState.timer);
      this.repeatedJsLogState.timer = null;
    }

    if (this.repeatedJsLogState.count > 0) {
      this.enqueueBroadcast(
        JSON.stringify({
          type: "js-log",
          level: this.repeatedJsLogState.level,
          message: `${this.repeatedJsLogState.baseMessage}\n[Log Server] 上一条日志重复 ${this.repeatedJsLogState.count} 次`,
          timestamp: new Date().toISOString(),
        }),
        this.repeatedJsLogState.sender,
        true,
      );
    }

    this.repeatedJsLogState = null;
  }

  private normalizeJsLogLevel(level: unknown): string {
    const normalizedLevel = String(level || "log").toLowerCase();

    if (["log", "info", "warn", "error", "debug"].includes(normalizedLevel)) {
      return normalizedLevel;
    }

    return "log";
  }

  private normalizeJsLogMessageText(message: unknown): string {
    if (typeof message === "string") {
      return message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  /**
   * 安排异步 flush，避免日志洪峰长时间占用主进程事件循环
   */
  private scheduleFlush(): void {
    if (this.flushHandle) {
      return;
    }

    this.flushHandle = setImmediate(() => {
      this.flushHandle = null;
      this.flushBroadcastQueue();
    });
  }

  /**
   * 分批 flush 广播队列，控制单次事件循环工作量
   */
  private flushBroadcastQueue(): void {
    const queuedMessages = this.pendingBroadcasts.splice(0, MAX_FLUSH_BATCH_SIZE);
    if (queuedMessages.length === 0) {
      return;
    }

    try {
      for (const queuedMessage of queuedMessages) {
        this.clients.forEach((_clientInfo, ws) => {
          if (queuedMessage.excludeSender && queuedMessage.sender === ws) {
            return;
          }

          this.sendToClient(ws, queuedMessage.message);
        });
      }
    } catch (error) {
      console.error("[Log Server] 广播消息失败:", error);
    }

    if (this.pendingBroadcasts.length > 0) {
      this.scheduleFlush();
    }
  }

  private sendToClient(ws: WebSocket, message: string): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (ws.bufferedAmount > MAX_SOCKET_BUFFERED_BYTES) {
      const clientInfo = this.clients.get(ws);
      this.clients.delete(ws);
      console.warn(
        `[Log Server] 客户端 ${clientInfo?.id || "unknown"} 发送缓冲超过 ${MAX_SOCKET_BUFFERED_BYTES} bytes，已断开慢连接`,
      );
      ws.terminate();
      return;
    }

    try {
      ws.send(message, (error) => {
        if (error) {
          console.error("[Log Server] 广播消息失败:", error);
        }
      });
    } catch (error) {
      console.error("[Log Server] 广播消息失败:", error);
    }
  }

  private normalizeRawData(data: RawData): string {
    if (typeof data === "string") {
      return data;
    }

    if (Buffer.isBuffer(data)) {
      return data.toString("utf-8");
    }

    if (Array.isArray(data)) {
      return Buffer.concat(data).toString("utf-8");
    }

    return Buffer.from(data).toString("utf-8");
  }

  private normalizeMessageForForwarding(parsedData: unknown, rawMessage: string): string {
    const incomingMessageSize = Buffer.byteLength(rawMessage, "utf-8");
    if (disableTruncation) {
      // Keep the original payload to avoid any truncation.
      // Note: this may increase memory usage and make the UI heavy for huge responses.
      if (rawMessage.includes("[truncated")) {
        console.warn(
          `[Log Server] incoming message already contains "[truncated]" marker (upstream truncation suspected). size=${incomingMessageSize} bytes`,
        );
      }
      return rawMessage;
    }

    if (incomingMessageSize <= MAX_INCOMING_MESSAGE_BYTES) {
      return rawMessage;
    }

    const normalizedPayload = this.sanitizeLargePayload(parsedData);
    const normalizedMessage = JSON.stringify(normalizedPayload);

    console.warn(
      `[Log Server] 收到超大消息，已截断后转发。原始大小: ${incomingMessageSize} bytes，截断后大小: ${Buffer.byteLength(normalizedMessage, "utf-8")} bytes`,
    );

    return normalizedMessage;
  }

  private sanitizeLargePayload(payload: unknown): unknown {
    if (!payload || typeof payload !== "object") {
      return this.sanitizeValue(payload);
    }

    const typedPayload = payload as {
      type?: unknown;
      level?: unknown;
      message?: unknown;
      timestamp?: unknown;
      data?: unknown;
    };

    switch (typedPayload.type) {
      case "js-log":
        return {
          context: this.sanitizeValue((typedPayload as { context?: unknown }).context, 1),
          level: this.sanitizeValue(typedPayload.level),
          message: this.sanitizeString(typedPayload.message),
          timestamp: this.sanitizeValue(typedPayload.timestamp),
          truncated: true,
          type: "js-log",
        };
      case "network-request": {
        const data = (typedPayload as { data?: Record<string, unknown> }).data || {};
        return {
          data: {
            baseURL: this.sanitizeString(data.baseURL),
            body: this.sanitizeValue(data.body, 1),
            headers: this.sanitizeValue(data.headers, 1),
            id: this.sanitizeString(data.id),
            method: this.sanitizeString(data.method),
            originalUrl: this.sanitizeString(data.originalUrl),
            params: this.sanitizeValue(data.params, 1),
            startTime: this.sanitizeValue(data.startTime),
            truncated: true,
            type: this.sanitizeString(data.type),
            url: this.sanitizeString(data.url),
          },
          type: "network-request",
        };
      }
      case "network-response": {
        const data = (typedPayload as { data?: Record<string, unknown> }).data || {};
        return {
          data: {
            data: this.sanitizeValue(data.data, 1),
            endTime: this.sanitizeValue(data.endTime),
            headers: this.sanitizeValue(data.headers, 1),
            id: this.sanitizeString(data.id),
            size: this.sanitizeValue(data.size),
            status: this.sanitizeValue(data.status),
            statusText: this.sanitizeString(data.statusText),
            truncated: true,
          },
          type: "network-response",
        };
      }
      case "network-error": {
        const data = (typedPayload as { data?: Record<string, unknown> }).data || {};
        return {
          data: {
            endTime: this.sanitizeValue(data.endTime),
            error: this.sanitizeString(data.error),
            id: this.sanitizeString(data.id),
            truncated: true,
          },
          type: "network-error",
        };
      }
      default:
        return this.sanitizeValue(payload);
    }
  }

  private sanitizeValue(value: unknown, depth: number = 0): unknown {
    if (depth >= MAX_SANITIZE_DEPTH) {
      return "[Truncated: depth limit]";
    }

    if (typeof value === "string") {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.slice(0, MAX_ARRAY_ITEMS).map((item) => this.sanitizeValue(item, depth + 1));
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
    const sanitizedObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of entries) {
      sanitizedObject[key] = this.sanitizeValue(nestedValue, depth + 1);
    }

    if (Object.keys(value).length > MAX_OBJECT_KEYS) {
      sanitizedObject.__truncatedKeys = true;
    }

    return sanitizedObject;
  }

  private sanitizeString(value: unknown): string | unknown {
    if (typeof value !== "string") {
      return value;
    }

    if (value.length <= MAX_STRING_FIELD_LENGTH) {
      return value;
    }

    return `${value.slice(0, MAX_STRING_FIELD_LENGTH)}… [truncated ${value.length - MAX_STRING_FIELD_LENGTH} chars]`;
  }
}

// 导出单例实例
let logServerInstance: LogWebSocketServer | null = null;

/**
 * 获取日志服务器实例（单例模式）
 */
export function getLogServer(): LogWebSocketServer {
  if (!logServerInstance) {
    logServerInstance = new LogWebSocketServer();
  }
  return logServerInstance;
}

/**
 * 启动日志 WebSocket 服务器
 * @param port 监听端口，默认 8082
 * @param path WebSocket 路径，默认 '/logs'
 */
export function startLogServer(port: number = 8082, path: string = "/logs"): void {
  const server = getLogServer();
  server.start(port, path);
}

/**
 * 停止日志 WebSocket 服务器
 */
export function stopLogServer(): void {
  if (logServerInstance) {
    logServerInstance.stop();
  }
}
