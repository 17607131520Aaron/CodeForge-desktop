import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { INetworkMessage, INetworkRequest } from "@/pages/Netword/types";

export type MethodFilter = "all" | "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type StatusFilter = "all" | "success" | "error";

type NetworkMonitorState = {
  isRecording: boolean;
  methodFilter: MethodFilter;
  requests: INetworkRequest[];
  searchText: string;
  statusFilter: StatusFilter;
  applyNetworkMessage: (message: INetworkMessage, maxRequests: number) => void;
  clearRequests: () => void;
  reset: () => void;
  setIsRecording: (isRecording: boolean) => void;
  setMethodFilter: (methodFilter: MethodFilter) => void;
  setSearchText: (searchText: string) => void;
  setStatusFilter: (statusFilter: StatusFilter) => void;
};

const initialState = {
  isRecording: true,
  methodFilter: "all" as MethodFilter,
  requests: [] as INetworkRequest[],
  searchText: "",
  statusFilter: "all" as StatusFilter,
};

export const useNetworkMonitorStore = create<NetworkMonitorState>()(
  persist(
    (set) => ({
      ...initialState,
      applyNetworkMessage: (message, maxRequests) => {
        set((state) => {
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

            const withoutCurrent = state.requests.filter((request) => request.id !== nextRequest.id);
            return {
              requests: [nextRequest, ...withoutCurrent].slice(0, maxRequests),
            };
          }

          return {
            requests: state.requests.map((request) => {
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
            }),
          };
        });
      },
      clearRequests: () => {
        set({ requests: [] });
      },
      reset: () => {
        set(initialState);
      },
      setIsRecording: (isRecording) => {
        set({ isRecording });
      },
      setMethodFilter: (methodFilter) => {
        set({ methodFilter });
      },
      setSearchText: (searchText) => {
        set({ searchText });
      },
      setStatusFilter: (statusFilter) => {
        set({ statusFilter });
      },
    }),
    {
      name: "network-monitor-store",
      partialize: (state) => ({
        isRecording: state.isRecording,
        methodFilter: state.methodFilter,
        requests: state.requests,
        searchText: state.searchText,
        statusFilter: state.statusFilter,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const clearNetworkMonitorPersistedState = () => {
  useNetworkMonitorStore.getState().reset();
  useNetworkMonitorStore.persist.clearStorage();
};
