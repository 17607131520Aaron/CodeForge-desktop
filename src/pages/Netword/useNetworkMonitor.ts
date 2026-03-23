import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from "react";

import { useWebSocket } from "@/hooks/useWebSocket";
import { useNetworkMonitorStore } from "@/store/networkMonitorStore";

import { DEFAULT_MAX_REQUESTS, DEFAULT_PORT } from "./constants";

import type { INetworkMessage } from "./types";

const LOG_SERVER_PATH = "/logs";
const NETWORK_BATCH_SIZE = 100;

const createLogServerUrl = () => {
  const hostname = window.location.hostname || "localhost";
  return `ws://${hostname}:${DEFAULT_PORT}${LOG_SERVER_PATH}`;
};

const isNetworkMessage = (payload: unknown): payload is INetworkMessage => {
  if (!payload || typeof payload !== "object" || !("type" in payload) || !("data" in payload)) {
    return false;
  }

  const message = payload as { type?: unknown };
  return message.type === "network-request" || message.type === "network-response" || message.type === "network-error";
};

const useNetworkMonitor = () => {
  const applyNetworkMessages = useNetworkMonitorStore((state) => state.applyNetworkMessages);
  const clearRequests = useNetworkMonitorStore((state) => state.clearRequests);
  const isRecording = useNetworkMonitorStore((state) => state.isRecording);
  const methodFilter = useNetworkMonitorStore((state) => state.methodFilter);
  const requests = useNetworkMonitorStore((state) => state.requests);
  const searchText = useNetworkMonitorStore((state) => state.searchText);
  const setIsRecording = useNetworkMonitorStore((state) => state.setIsRecording);
  const setMethodFilter = useNetworkMonitorStore((state) => state.setMethodFilter);
  const setSearchText = useNetworkMonitorStore((state) => state.setSearchText);
  const setStatusFilter = useNetworkMonitorStore((state) => state.setStatusFilter);
  const statusFilter = useNetworkMonitorStore((state) => state.statusFilter);
  const recordingRef = useRef(isRecording);
  const bufferedMessagesRef = useRef<INetworkMessage[]>([]);
  const flushFrameRef = useRef<number | null>(null);

  const socketApi = useWebSocket<{ message: [INetworkMessage] }>({
    autoConnect: true,
    reconnection: false,
    shared: false,
    url: createLogServerUrl(),
  });

  const socketApiRef = useRef(socketApi);
  socketApiRef.current = socketApi;
  const deferredRequests = useDeferredValue(requests);
  const deferredSearchText = useDeferredValue(searchText);
  const deferredMethodFilter = useDeferredValue(methodFilter);
  const deferredStatusFilter = useDeferredValue(statusFilter);

  const flushBufferedMessages = useCallback(() => {
    flushFrameRef.current = null;

    if (bufferedMessagesRef.current.length === 0) {
      return;
    }

    const nextMessages = bufferedMessagesRef.current.splice(0, NETWORK_BATCH_SIZE);
    applyNetworkMessages(nextMessages, DEFAULT_MAX_REQUESTS);

    if (bufferedMessagesRef.current.length > 0) {
      flushFrameRef.current = window.requestAnimationFrame(flushBufferedMessages);
    }
  }, [applyNetworkMessages]);

  const scheduleMessageFlush = useCallback(() => {
    if (flushFrameRef.current !== null) {
      return;
    }

    flushFrameRef.current = window.requestAnimationFrame(flushBufferedMessages);
  }, [flushBufferedMessages]);

  useEffect(() => {
    recordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    const unsubscribe = socketApiRef.current.subscribe("message", (payload) => {
      if (!recordingRef.current || !isNetworkMessage(payload)) {
        return;
      }

      bufferedMessagesRef.current.push(payload);
      scheduleMessageFlush();
    });

    return () => {
      unsubscribe();
      if (flushFrameRef.current !== null) {
        window.cancelAnimationFrame(flushFrameRef.current);
        flushFrameRef.current = null;
      }
      bufferedMessagesRef.current = [];
    };
  }, [scheduleMessageFlush]);

  const handleConnectClick = useCallback(async () => {
    if (socketApi.isConnected) {
      socketApi.forceDisconnect();
    }

    try {
      await socketApi.connect();
    } catch (error) {
      console.error("[Netword] Failed to connect log server:", error);
    }
  }, [socketApi]);

  const handleClose = useCallback(() => {
    socketApi.forceDisconnect();
  }, [socketApi]);

  const handleClearRequests = useCallback(() => {
    clearRequests();
  }, [clearRequests]);

  const toggleRecording = useCallback(() => {
    setIsRecording(!recordingRef.current);
  }, [setIsRecording]);

  const filteredRequests = useMemo(() => {
    const normalizedSearchText = deferredSearchText.trim().toLowerCase();

    return deferredRequests.filter((request) => {
      if (deferredMethodFilter !== "all" && request.method.toUpperCase() !== deferredMethodFilter) {
        return false;
      }

      if (deferredStatusFilter === "success" && (!request.status || request.status >= 400)) {
        return false;
      }

      if (deferredStatusFilter === "error" && !request.error && (!request.status || request.status < 400)) {
        return false;
      }

      if (!normalizedSearchText) {
        return true;
      }

      const searchSource = [request.method, request.url, request.originalUrl, request.baseURL, request.error]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchSource.includes(normalizedSearchText);
    });
  }, [deferredMethodFilter, deferredRequests, deferredSearchText, deferredStatusFilter]);

  const handleMethodFilterChange = (nextMethodFilter: typeof methodFilter) => {
    setMethodFilter(nextMethodFilter);
  };

  const handleStatusFilterChange = (nextStatusFilter: typeof statusFilter) => {
    setStatusFilter(nextStatusFilter);
  };

  const handleSearchTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  return {
    filteredRequests,
    handleClearRequests,
    handleClose,
    handleConnectClick,
    isConnected: socketApi.isConnected,
    isConnecting: socketApi.isConnecting,
    isRecording,
    methodFilter,
    requests,
    searchText,
    handleMethodFilterChange,
    handleSearchTextChange,
    handleStatusFilterChange,
    statusFilter,
    toggleRecording,
  };
};

export default useNetworkMonitor;
