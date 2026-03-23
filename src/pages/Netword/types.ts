/**
 * 网络请求数据类型定义
 */

export interface INetworkRequest {
  /** 请求唯一 ID */
  id: string;
  /** 请求方法 */
  method: string;
  /** 请求 URL */
  url: string;
  /** 请求头 */
  headers: Record<string, string>;
  /** 请求参数（GET 为 query，POST 等为 body） */
  data?: unknown;
  /** 响应状态码 */
  status?: number | undefined;
  /** 响应头 */
  responseHeaders?: Record<string, string> | undefined;
  /** 响应体 */
  responseData?: unknown;
  /** 请求开始时间 */
  startTime: number;
  /** 请求结束时间 */
  endTime?: number | undefined;
  /** 请求耗时（毫秒） */
  duration?: number | undefined;
  /** 请求大小（字节） */
  requestSize?: number | undefined;
  /** 响应大小（字节） */
  responseSize?: number | undefined;
  /** 请求类型（xhr, fetch, etc.） */
  type?: string | undefined;
  /** 错误信息 */
  error?: string | undefined;
  /** 是否已完成 */
  completed: boolean;
  /** 基础 URL */
  baseURL?: string | undefined;
  /** 原始 URL（相对路径） */
  originalUrl?: string | undefined;
  /** GET 请求的 query 参数 */
  params?: unknown;
  /** POST/PUT 等请求的 body */
  body?: unknown;
}

export interface INetworkRequestMessage {
  type: "network-request";
  data: {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    data?: unknown;
    startTime: number;
    type?: string;
    baseURL?: string;
    originalUrl?: string;
    params?: unknown;
    body?: unknown;
  };
}

export interface INetworkResponseMessage {
  type: "network-response";
  data: {
    id: string;
    status: number;
    headers: Record<string, string>;
    data?: unknown;
    endTime: number;
    size?: number;
  };
}

export interface INetworkErrorMessage {
  type: "network-error";
  data: {
    id: string;
    error: string;
    endTime: number;
  };
}

export type INetworkMessage = INetworkRequestMessage | INetworkResponseMessage | INetworkErrorMessage;
