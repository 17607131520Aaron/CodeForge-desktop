export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface IJsLogItem {
  id: string;
  timestamp: number;
  level: LogLevel | "unknown";
  message: string;
  raw: unknown;
}

export interface IMetroLogMessage {
  level?: string;
  data?: unknown[];
  message?: unknown;
  type?: string; // 消息类型，如 'js-log', 'reload' 等
  method?: string; // Metro bundler 控制方法
  version?: number; // Metro bundler 版本
  params?: unknown; // Metro bundler 参数
  [key: string]: unknown;
}
