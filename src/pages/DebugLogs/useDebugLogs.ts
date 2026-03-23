import { useCallback, useEffect, useRef, useState, useMemo } from "react";

import { DEFAULT_MAX_LOGS, DEFAULT_PORT } from "./constants";

import type { DebugLogItem, JsLogMessagePayload, IJsLogItem, IMetroLogMessage, LogLevel } from "./types";

const LOG_SERVER_PATH = "/logs";
const LOG_SERVER_URL = `ws://localhost:${DEFAULT_PORT}${LOG_SERVER_PATH}`;
const JS_LOG_MESSAGE_TYPES = new Set(["js-log"]);

const normalizeLogLevel = (level?: string): string => {
  const normalizedLevel = String(level || "log").toLowerCase();

  if (["log", "info", "warn", "error", "debug"].includes(normalizedLevel)) {
    return normalizedLevel;
  }

  return "log";
};

const useDebugLogs = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<DebugLogItem[]>([]);
  const [levelFilter, setLevelFilter] = useState("log");
  const [searchText, setSearchText] = useState("");

  const parseMetroMessage = useCallback((data: unknown): IJsLogItem => {
    let level: IJsLogItem["level"] = "unknown";
    let message = "";
    let raw: unknown = data;

    try {
      // 处理字符串格式的数据
      if (typeof data === "string") {
        raw = data;

        // 尝试检查是否是包含日志级别的字符串格式（Metro bundler常见格式）
        // 格式可能是: "LOG\n{json数据}\n额外文本" 或 "LOG {json数据}"
        const trimmed = data.trim();
        const upperTrimmed = trimmed.toUpperCase();

        // 检查字符串开头是否是日志级别标记（支持多行格式）
        const levelMatch = upperTrimmed.match(/^(LOG|INFO|WARN|ERROR|DEBUG|TRACE)(\s|\n|$)/);
        if (levelMatch && levelMatch[1] && levelMatch[0]) {
          const matchedLevel = levelMatch[1].toLowerCase();
          if (["log", "info", "warn", "error", "debug"].includes(matchedLevel)) {
            level = matchedLevel as LogLevel;
            // 移除级别标记，提取实际消息
            const matchLength = levelMatch[0].length;
            const remainingContent = trimmed.substring(matchLength).trim();

            // 如果剩余内容以 { 或 [ 开头，尝试解析为JSON
            if (remainingContent.startsWith("{") || remainingContent.startsWith("[")) {
              try {
                const parsed = JSON.parse(remainingContent);
                raw = { level, data: parsed, original: data };
                message = JSON.stringify(parsed, null, 2);
              } catch {
                // JSON解析失败，使用原始文本
                message = remainingContent;
              }
            } else {
              message = remainingContent || "(无消息内容)";
            }
          } else {
            level = "unknown";
            message = trimmed;
          }
        } else {
          // 尝试解析为JSON
          try {
            const parsed = JSON.parse(data);
            raw = parsed;

            // 如果是对象，按照对象格式处理
            if (parsed && typeof parsed === "object") {
              const metroData = parsed as IMetroLogMessage;

              // 检查是否是自定义日志消息（type: 'js-log'）
              if (metroData.type === "js-log" && typeof metroData.level === "string") {
                const metroLevel = metroData.level.toLowerCase();
                if (["log", "info", "warn", "error", "debug"].includes(metroLevel)) {
                  level = metroLevel as LogLevel;
                }
                // 提取消息内容
                if (typeof metroData.message === "string") {
                  message = metroData.message;
                  const context = (metroData as { context?: unknown })["context"];
                  if (context) {
                    message += `\n${JSON.stringify(context, null, 2)}`;
                  }
                } else {
                  message = JSON.stringify(metroData, null, 2);
                }
              }
              // 检查是否是 Metro bundler 控制消息
              else if ("method" in metroData || "version" in metroData) {
                level = "debug"; // 控制消息使用 debug 级别
                message = `[Metro控制消息] ${metroData.method || "未知"}: ${JSON.stringify(parsed, null, 2)}`;
              }
              // 标准日志格式
              else if (typeof metroData.level === "string") {
                const metroLevel = metroData.level.toLowerCase();
                if (["log", "info", "warn", "error", "debug"].includes(metroLevel)) {
                  level = metroLevel as LogLevel;
                }
              }

              // 如果还没有设置 message，继续处理
              if (!message && Array.isArray(metroData.data)) {
                message = (metroData.data as unknown[])
                  .map((item: unknown) => {
                    if (typeof item === "string") {
                      return item;
                    }
                    try {
                      return JSON.stringify(item, null, 2);
                    } catch {
                      return String(item);
                    }
                  })
                  .join("\n");
              } else if (metroData.message !== null && metroData.message !== undefined) {
                message =
                  typeof metroData.message === "string"
                    ? metroData.message
                    : JSON.stringify(metroData.message, null, 2);
              } else {
                message = JSON.stringify(metroData, null, 2);
              }
            } else {
              message = String(parsed);
            }
          } catch {
            // JSON解析失败，作为普通字符串处理
            message = trimmed;
            level = "log"; // 默认为log级别
          }
        }
      } else if (data && typeof data === "object") {
        // 已经是对象（可能已经被useWebSocket的parseJSON解析过了）
        raw = data;
        const metroData = data as IMetroLogMessage;

        if (typeof metroData.level === "string") {
          level = metroData.level.toLowerCase() as LogLevel;
        }

        if (Array.isArray(metroData.data)) {
          message = (metroData.data as unknown[])
            .map((item: unknown) => {
              if (typeof item === "string") {
                return item;
              }
              try {
                return JSON.stringify(item, null, 2);
              } catch {
                return String(item);
              }
            })
            .join("\n");
        } else if (metroData.message !== null && metroData.message !== undefined) {
          message =
            typeof metroData.message === "string" ? metroData.message : JSON.stringify(metroData.message, null, 2);
        } else {
          // 尝试从对象中提取有用信息
          const metroDataRecord = metroData as Record<string, unknown>;
          const { level: _, data: __, message: ___ } = metroDataRecord;
          const rest: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(metroDataRecord)) {
            if (key !== "level" && key !== "data" && key !== "message") {
              rest[key] = value;
            }
          }
          if (Object.keys(rest).length > 0) {
            message = JSON.stringify(rest, null, 2);
          } else {
            message = JSON.stringify(metroData, null, 2);
          }
        }
      } else {
        message = String(data);
        level = "log"; // 默认为log级别
      }
    } catch {
      // 所有解析都失败，使用原始数据
      message = String(data);
      raw = data;
    }

    // 如果消息为空，使用原始数据的字符串表示
    if (!message || message.trim() === "") {
      try {
        message = JSON.stringify(raw, null, 2);
      } catch {
        message = String(raw);
      }
    }

    return {
      id: `${new Date().getTime()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().getTime(),
      level,
      message,
      raw,
    };
  }, []);

  const cleanupSocket = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    socketRef.current = null;

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  }, []);

  const connect = useCallback(() => {
    cleanupSocket();

    setIsConnecting(true);
    setIsConnected(false);

    const socket = new WebSocket(LOG_SERVER_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[DebugLogs] Connected to log server:", LOG_SERVER_URL);
      setIsConnecting(false);
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const parsedMessage = JSON.parse(String(event.data)) as JsLogMessagePayload;

        if (!JS_LOG_MESSAGE_TYPES.has(parsedMessage?.type)) {
          return;
        }

        const nextLog: DebugLogItem = {
          context: parsedMessage.context,
          id: `${parsedMessage.timestamp || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          level: normalizeLogLevel(parsedMessage.level),
          // message: parsedMessage.message || "",
          message: parseMetroMessage(parsedMessage.message).message,
          timestamp: parsedMessage.timestamp || new Date().toISOString(),
        };

        setLogs((currentLogs) => {
          const nextLogs = [...currentLogs, nextLog];
          if (nextLogs.length <= DEFAULT_MAX_LOGS) {
            return nextLogs;
          }
          return nextLogs.slice(nextLogs.length - DEFAULT_MAX_LOGS);
        });

        console.log("[DebugLogs] Received JS log message:", parsedMessage);
      } catch {
        console.log("[DebugLogs] Ignored non-JSON message:", event.data);
      }
    };

    socket.onerror = (event) => {
      console.error("[DebugLogs] WebSocket error:", event);
      setIsConnecting(false);
      setIsConnected(false);
    };

    socket.onclose = () => {
      console.log("[DebugLogs] Disconnected from log server");
      setIsConnecting(false);
      setIsConnected(false);
      socketRef.current = null;
    };
  }, [cleanupSocket]);

  const handleConnectClick = useCallback(() => {
    connect();
  }, [connect]);

  const handleClose = useCallback(() => {
    cleanupSocket();
    setIsConnecting(false);
    setIsConnected(false);
    console.log("[DebugLogs] Connection closed manually");
  }, [cleanupSocket]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
    // eslint-disable-next-line no-console
    console.clear();
    console.log("[DebugLogs] Console logs cleared");
  }, []);

  // const filteredLogs = logs.filter((log) => {
  //   const matchesLevel = levelFilter === "all" || log.level === levelFilter;
  //   const matchesSearch = !searchText.trim() || buildSearchText(log).includes(searchText.trim().toLowerCase());

  //   return matchesLevel && matchesSearch;
  // });

  useEffect(() => {
    connect();

    return () => {
      cleanupSocket();
    };
  }, [cleanupSocket, connect]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) {
        return false;
      }
      if (searchText.trim()) {
        return log.message.toLowerCase().includes(searchText.toLowerCase());
      }
      return true;
    });
  }, [logs, levelFilter, searchText]);

  return {
    filteredLogs,
    handleClearLogs,
    handleClose,
    handleConnectClick,
    isConnected,
    isConnecting,
    levelFilter,
    searchText,
    setLevelFilter,
    setSearchText,
  };
};

export default useDebugLogs;
