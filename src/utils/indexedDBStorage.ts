/**
 * 基于 Dexie 的 IndexedDB 工具，用于存储项目相关信息
 */
import Dexie from "dexie";

import type { Table } from "dexie";

const DB_NAME = "storeverse-app";
const STORE_NAME = "project_info";
const PERF_STORE_NAME = "performance_metrics";
const ERROR_LOG_STORE_NAME = "error_logs";

export interface IProjectInfoRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface IPerformanceMetricRecord {
  id?: number;
  createdAt: number;
  payload: unknown;
}

export interface IErrorLogRecord {
  id?: number;
  createdAt: number;
  payload: unknown;
}

class ProjectInfoDB extends Dexie {
  public projectInfo!: Table<IProjectInfoRecord, string>;
  public performanceMetrics!: Table<IPerformanceMetricRecord, number>;
  public errorLogs!: Table<IErrorLogRecord, number>;

  constructor() {
    super(DB_NAME);
    // 版本 1：仅项目配置
    this.version(1).stores({
      [STORE_NAME]: "&key",
    });
    // 版本 2：增加性能指标表
    this.version(2).stores({
      [STORE_NAME]: "&key",
      [PERF_STORE_NAME]: "++id,createdAt",
    });
    // 版本 3：增加错误日志表
    this.version(3).stores({
      [STORE_NAME]: "&key",
      [PERF_STORE_NAME]: "++id,createdAt",
      [ERROR_LOG_STORE_NAME]: "++id,createdAt",
    });

    this.projectInfo = this.table(STORE_NAME);
    this.performanceMetrics = this.table(PERF_STORE_NAME);
    this.errorLogs = this.table(ERROR_LOG_STORE_NAME);
  }
}

const db = new ProjectInfoDB();

export const saveProjectInfo = async (key: string, value: unknown): Promise<void> => {
  try {
    const record: IProjectInfoRecord = { key, value, updatedAt: Date.now() };
    await db.projectInfo.put(record);
  } catch (error) {
    console.warn("保存项目信息到 IndexedDB 失败（已忽略）：", error);
  }
};

export const getProjectInfo = async <T = unknown>(key: string): Promise<T | null> => {
  try {
    const result = await db.projectInfo.get(key);
    return (result?.value as T) ?? null;
  } catch (error) {
    console.warn("读取 IndexedDB 项目信息失败（已忽略）：", error);
    return null;
  }
};

export const getAllProjectInfo = async (): Promise<IProjectInfoRecord[]> => {
  try {
    return await db.projectInfo.toArray();
  } catch (error) {
    console.warn("读取全部 IndexedDB 项目信息失败（已忽略）：", error);
    return [];
  }
};

export const deleteProjectInfo = async (key: string): Promise<void> => {
  try {
    await db.projectInfo.delete(key);
  } catch (error) {
    console.warn("删除 IndexedDB 项目信息失败（已忽略）：", error);
  }
};

export const clearProjectInfo = async (): Promise<void> => {
  try {
    await db.projectInfo.clear();
  } catch (error) {
    console.warn("清空 IndexedDB 项目信息失败（已忽略）：", error);
  }
};

// 性能指标相关

export const savePerformanceMetric = async (payload: unknown): Promise<void> => {
  try {
    const count = await db.performanceMetrics.count();
    if (count >= 1000) {
      await db.performanceMetrics.clear();
    }
    const record: IPerformanceMetricRecord = {
      createdAt: Date.now(),
      payload,
    };
    await db.performanceMetrics.add(record);
  } catch (error) {
    console.warn("保存性能指标到 IndexedDB 失败（已忽略）：", error);
  }
};

export const clearPerformanceMetrics = async (): Promise<void> => {
  try {
    await db.performanceMetrics.clear();
  } catch (error) {
    console.warn("清空性能指标失败（已忽略）：", error);
  }
};

// 错误日志相关

export const saveErrorLog = async (payload: unknown): Promise<void> => {
  try {
    const count = await db.errorLogs.count();
    // 限制最多保存 1000 条错误日志，超过后清空旧数据
    if (count >= 1000) {
      await db.errorLogs.clear();
    }
    const record: IErrorLogRecord = {
      createdAt: Date.now(),
      payload,
    };
    await db.errorLogs.add(record);
  } catch (error) {
    console.warn("保存错误日志到 IndexedDB 失败（已忽略）：", error);
  }
};

export const getErrorLogs = async (limit?: number): Promise<IErrorLogRecord[]> => {
  try {
    if (limit) {
      return await db.errorLogs.orderBy("createdAt").reverse().limit(limit).toArray();
    }
    return await db.errorLogs.orderBy("createdAt").reverse().toArray();
  } catch (error) {
    console.warn("读取错误日志失败（已忽略）：", error);
    return [];
  }
};

export const clearErrorLogs = async (): Promise<void> => {
  try {
    await db.errorLogs.clear();
  } catch (error) {
    console.warn("清空错误日志失败（已忽略）：", error);
  }
};

export const getErrorLogsCount = async (): Promise<number> => {
  try {
    return await db.errorLogs.count();
  } catch (error) {
    console.warn("获取错误日志数量失败（已忽略）：", error);
    return 0;
  }
};
