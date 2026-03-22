/**
 * 错误日志存储工具
 * 将错误日志存储到 IndexedDB，后期可以替换为其他存储方式或上报到服务器
 */
import {
  saveErrorLog,
  getErrorLogs,
  clearErrorLogs,
  getErrorLogsCount,
  type IErrorLogRecord,
} from "./indexedDBStorage";

import type { INormalizedPayload } from "./errorReporter";

/**
 * 保存错误日志到 IndexedDB
 * @param payload 错误信息载荷
 */
export const storeErrorLog = async (payload: INormalizedPayload): Promise<void> => {
  try {
    await saveErrorLog(payload);
  } catch (error) {
    // 静默失败，避免影响业务流程
    console.warn("存储错误日志失败（已忽略）：", error);
  }
};

/**
 * 获取错误日志列表
 * @param limit 限制返回数量，不传则返回全部
 * @returns 错误日志记录数组
 */
export const getStoredErrorLogs = async (limit?: number): Promise<IErrorLogRecord[]> => {
  return await getErrorLogs(limit);
};

/**
 * 清空所有错误日志
 */
export const clearStoredErrorLogs = async (): Promise<void> => {
  await clearErrorLogs();
};

/**
 * 获取错误日志数量
 * @returns 错误日志总数
 */
export const getStoredErrorLogsCount = async (): Promise<number> => {
  return await getErrorLogsCount();
};

/**
 * 导出错误日志（用于后续上报到服务器）
 * @param limit 限制导出数量，不传则导出全部
 * @returns 错误日志数组
 */
export const exportErrorLogs = async (limit?: number): Promise<INormalizedPayload[]> => {
  const logs = await getStoredErrorLogs(limit);
  return logs.map((log) => log.payload as INormalizedPayload);
};
