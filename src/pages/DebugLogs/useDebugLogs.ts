import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_PORT } from "./constants";

const LOG_SERVER_PATH = "/logs";
const LOG_SERVER_URL = `ws://localhost:${DEFAULT_PORT}${LOG_SERVER_PATH}`;

const useDebugLogs = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const levelFilter = "";

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
        const parsedMessage = JSON.parse(String(event.data));
        console.log("[DebugLogs] Received log message:", parsedMessage);
      } catch {
        console.log("[DebugLogs] Received raw message:", event.data);
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
    // eslint-disable-next-line no-console
    console.clear();
    console.log("[DebugLogs] Console logs cleared");
  }, []);

  useEffect(() => {
    connect();

    return () => {
      cleanupSocket();
    };
  }, [cleanupSocket, connect]);

  return { levelFilter, isConnecting, isConnected, handleConnectClick, handleClose, handleClearLogs };
};

export default useDebugLogs;
