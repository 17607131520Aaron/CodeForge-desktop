/**
 * 日志消息接口
 */
export interface ILogMessage {
  type: "js-log";
  level: string;
  message: string;
  timestamp: string;
  context?: unknown;
}

/**
 * 网络请求消息接口
 */
export interface INetworkRequestMessage {
  type: "network-request";
  data: {
    id?: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    timestamp?: string;
  };
}

/**
 * 网络响应消息接口
 */
export interface INetworkResponseMessage {
  type: "network-response";
  data: {
    id?: string;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: unknown;
    timestamp?: string;
  };
}

/**
 * 网络错误消息接口
 */
export interface INetworkErrorMessage {
  type: "network-error";
  data: {
    id?: string;
    error?: string;
    timestamp?: string;
  };
}
