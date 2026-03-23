import type { SelectProps } from "antd";

/**
 * 日志级别选项
 */
export const levelOptions: SelectProps["options"] = [
  { label: "全部", value: "all" },
  { label: "日志", value: "log" },
  { label: "信息", value: "info" },
  { label: "警告", value: "warn" },
  { label: "错误", value: "error" },
  { label: "调试", value: "debug" },
];

/**
 * 默认端口（日志服务器端口）
 */
export const DEFAULT_PORT = 8082;

/**
 * 默认最大日志数量
 */
export const DEFAULT_MAX_LOGS = 1000;

/**
 * 默认重连延迟（毫秒）
 */
export const DEFAULT_RECONNECT_DELAY = 3000;

/**
 * Metro Logger 默认 WebSocket 路径
 * 如果你的 RN 版本或自定义配置不同，可以在这里统一修改
 */
export const DEFAULT_METRO_LOGGER_PATH = "/message?role=logger";

/**
 * 获取日志级别颜色
 */
export const getLogLevelColor = (level: string): string => {
  switch (level) {
    case "error":
      return "#ff4d4f";
    case "warn":
      return "#faad14";
    case "info":
      return "#1890ff";
    case "debug":
      return "#722ed1";
    default:
      return "#595959";
  }
};
