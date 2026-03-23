/**
 * 网络监控常量配置
 */

/**
 * 默认端口
 */
export const DEFAULT_PORT = 8082;

/**
 * 默认最大请求数量
 */
export const DEFAULT_MAX_REQUESTS = 1000;

/**
 * 默认重连延迟（毫秒）
 */
export const DEFAULT_RECONNECT_DELAY = 3000;

/**
 * 获取状态码颜色
 */
export const getStatusColor = (status?: number): string => {
  if (!status) {
    return "#8c8c8c";
  }
  if (status >= 200 && status < 300) {
    return "#52c41a";
  }
  if (status >= 300 && status < 400) {
    return "#1890ff";
  }
  if (status >= 400 && status < 500) {
    return "#faad14";
  }
  if (status >= 500) {
    return "#ff4d4f";
  }
  return "#8c8c8c";
};

/**
 * 获取请求方法颜色
 */
export const getMethodColor = (method: string): string => {
  const colors: Record<string, string> = {
    GET: "#61affe",
    POST: "#49cc90",
    PUT: "#fca130",
    DELETE: "#f93e3e",
    PATCH: "#50e3c2",
    HEAD: "#9012fe",
    OPTIONS: "#0d5aa7",
  };
  return colors[method.toUpperCase()] || "#8c8c8c";
};

/**
 * 格式化文件大小
 */
export const formatSize = (bytes?: number): string => {
  if (!bytes) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * 格式化时间（毫秒）
 */
export const formatDuration = (ms?: number): string => {
  if (!ms) {
    return "-";
  }
  if (ms < 1000) {
    return `${ms} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
};
