import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWebSocket } from "@/hooks/useWebSocket";

import { DEFAULT_MAX_REQUESTS, DEFAULT_PORT } from "./constants";

import type { INetworkMessage, INetworkRequest } from "./types";

type MethodFilter = "all" | "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type StatusFilter = "all" | "success" | "error";

const LOG_SERVER_PATH = "/logs";

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
  const [isRecording, setIsRecording] = useState(true);
  const [requests, setRequests] = useState<INetworkRequest[]>([]);
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchText, setSearchText] = useState("");
  const recordingRef = useRef(isRecording);

  const socketApi = useWebSocket<{ message: [INetworkMessage] }>({
    autoConnect: true,
    reconnection: false,
    shared: false,
    url: createLogServerUrl(),
  });

  const socketApiRef = useRef(socketApi);
  socketApiRef.current = socketApi;

  useEffect(() => {
    recordingRef.current = isRecording;
  }, [isRecording]);

  const applyNetworkMessage = useCallback((message: INetworkMessage) => {
    setRequests((currentRequests) => {
      if (message.type === "network-request") {
        const nextRequest: INetworkRequest = {
          baseURL: message.data.baseURL,
          body: message.data.body,
          completed: false,
          data: message.data.data,
          headers: message.data.headers,
          id: message.data.id,
          method: message.data.method,
          originalUrl: message.data.originalUrl,
          params: message.data.params,
          startTime: message.data.startTime,
          type: message.data.type,
          url: message.data.url,
        };

        const withoutCurrent = currentRequests.filter((request) => request.id !== nextRequest.id);
        return [nextRequest, ...withoutCurrent].slice(0, DEFAULT_MAX_REQUESTS);
      }

      return currentRequests.map((request) => {
        if (request.id !== message.data.id) {
          return request;
        }

        if (message.type === "network-response") {
          return {
            ...request,
            completed: true,
            duration: message.data.endTime - request.startTime,
            endTime: message.data.endTime,
            responseData: message.data.data,
            responseHeaders: message.data.headers,
            responseSize: message.data.size,
            status: message.data.status,
          };
        }

        return {
          ...request,
          completed: true,
          duration: message.data.endTime - request.startTime,
          endTime: message.data.endTime,
          error: message.data.error,
        };
      });
    });
  }, []);

  useEffect(() => {
    const unsubscribe = socketApiRef.current.subscribe("message", (payload) => {
      if (!recordingRef.current || !isNetworkMessage(payload)) {
        return;
      }

      applyNetworkMessage(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [applyNetworkMessage]);

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
    setRequests([]);
  }, []);

  const toggleRecording = useCallback(() => {
    setIsRecording((current) => !current);
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearchText = searchText.trim().toLowerCase();

    return requests.filter((request) => {
      if (methodFilter !== "all" && request.method.toUpperCase() !== methodFilter) {
        return false;
      }

      if (statusFilter === "success" && (!request.status || request.status >= 400)) {
        return false;
      }

      if (statusFilter === "error" && !request.error && (!request.status || request.status < 400)) {
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
  }, [methodFilter, requests, searchText, statusFilter]);

  const handleMethodFilterChange = (nextMethodFilter: MethodFilter) => {
    setMethodFilter(nextMethodFilter);
  };

  const handleStatusFilterChange = (nextStatusFilter: StatusFilter) => {
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
