import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_MAX_LOGS } from "@/pages/DebugLogs/constants";
import type { DebugLogItem } from "@/pages/DebugLogs/types";

type DebugLogsState = {
  levelFilter: string;
  logs: DebugLogItem[];
  searchText: string;
  appendLog: (log: DebugLogItem) => void;
  appendLogs: (logs: DebugLogItem[]) => void;
  clearLogs: () => void;
  reset: () => void;
  setLevelFilter: (levelFilter: string) => void;
  setSearchText: (searchText: string) => void;
};

const initialState = {
  levelFilter: "log",
  logs: [] as DebugLogItem[],
  searchText: "",
};

export const useDebugLogsStore = create<DebugLogsState>()(
  persist(
    (set) => ({
      ...initialState,
      appendLog: (log) => {
        set((state) => {
          const nextLogs = [...state.logs, log];

          return {
            logs: nextLogs.length <= DEFAULT_MAX_LOGS ? nextLogs : nextLogs.slice(nextLogs.length - DEFAULT_MAX_LOGS),
          };
        });
      },
      appendLogs: (logs) => {
        if (logs.length === 0) {
          return;
        }

        set((state) => {
          const nextLogs = [...state.logs, ...logs];

          return {
            logs: nextLogs.length <= DEFAULT_MAX_LOGS ? nextLogs : nextLogs.slice(nextLogs.length - DEFAULT_MAX_LOGS),
          };
        });
      },
      clearLogs: () => {
        set({ logs: [] });
      },
      reset: () => {
        set(initialState);
      },
      setLevelFilter: (levelFilter) => {
        set({ levelFilter });
      },
      setSearchText: (searchText) => {
        set({ searchText });
      },
    }),
    {
      name: "debug-logs-store",
      partialize: (state) => ({
        levelFilter: state.levelFilter,
        searchText: state.searchText,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const clearDebugLogsPersistedState = () => {
  useDebugLogsStore.getState().reset();
  useDebugLogsStore.persist.clearStorage();
};
