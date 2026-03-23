/**
 * WebSocket 日志服务器
 * 用于接收 React Native 应用发送的日志，并转发给连接的 web 客户端
 * 支持原生 WebSocket 协议
 */

import { createServer, type IncomingMessage, type Server as HttpServer } from "http";

import { WebSocketServer, WebSocket } from "ws";

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
  private clientIdCounter = 0;
  private port: number = 8082;
  private path: string = "/logs";
  private isRunning: boolean = false;

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
    ws.on("message", (data: Buffer) => {
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
  private handleMessage(sender: WebSocket, data: Buffer): void {
    try {
      const messageStr = data.toString("utf-8");
      const parsedData = JSON.parse(messageStr);

      // 根据消息类型处理
      if (parsedData.type === "js-log") {
        // 广播给所有客户端（除了发送者）
        this.broadcastToOthers(sender, messageStr);
      } else if (parsedData.type === "network-request") {
        // 广播给所有客户端（包括发送者，因为前端需要显示）
        this.broadcastToAll(messageStr);
      } else if (parsedData.type === "network-response") {
        // 广播给所有客户端
        this.broadcastToAll(messageStr);
      } else if (parsedData.type === "network-error") {
        // 广播给所有客户端
        this.broadcastToAll(messageStr);
      } else {
        // 其他类型的消息，也广播给所有客户端

        this.broadcastToAll(messageStr);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Log Server] 解析消息失败: ${errorMessage}`);
    }
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
  private broadcastToOthers(sender: WebSocket, message: string): void {
    try {
      this.clients.forEach((_clientInfo, ws) => {
        if (ws !== sender && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(message);
          } catch (error) {
            console.error("[Log Server] 广播消息失败:", error);
          }
        }
      });
    } catch (error) {
      console.error("[Log Server] 广播消息失败:", error);
    }
  }

  /**
   * 广播消息给所有客户端
   */
  private broadcastToAll(message: string): void {
    try {
      this.clients.forEach((_clientInfo, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(message);
          } catch (error) {
            console.error("[Log Server] 广播消息失败:", error);
          }
        }
      });
    } catch (error) {
      console.error("[Log Server] 广播消息失败:", error);
    }
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
