import { storeErrorLog } from "./errorLogStorage";

type ReportSender = (payload: INormalizedPayload) => Promise<void> | void;

export type ClientIssueType = "runtime-error" | "unhandled-rejection" | "react-render" | "interaction-error";

export interface IClientIssuePayload {
  type: ClientIssueType;
  message: string;
  stack?: string;
  componentStack?: string;
  scope?: string;
  actionName?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  extra?: Record<string, unknown>;
}

export interface INormalizedPayload extends IClientIssuePayload {
  url: string;
  userAgent: string;
  timestamp: number;
}

let hasInitGlobalListener = false;
let currentReportSender: ReportSender = async (normalized) => {
  // 先存储到 IndexedDB
  await storeErrorLog(normalized);

  // 控制台输出（开发环境）
  console.log(normalized, "normalized上报错误");

  // 后期可以替换为实际的 HTTP 上报
  // await fetch("/mock-api/client-error-report", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify(normalized),
  // });
};

const buildPayload = (payload: IClientIssuePayload): INormalizedPayload => {
  const url = typeof window !== "undefined" && window.location ? window.location.href : "N/A";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "N/A";

  return {
    ...payload,
    url,
    userAgent,
    timestamp: Date.now(),
  };
};

const safeStringify = (value: unknown): string => {
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const isPromiseLike = (value: unknown): value is Promise<unknown> =>
  !!value && typeof (value as Promise<unknown>).then === "function";

export const setClientIssueReporter = (sender: ReportSender): void => {
  currentReportSender = sender;
};

export const reportClientIssue = async (payload: IClientIssuePayload): Promise<void> => {
  const normalized = buildPayload(payload);

  try {
    await currentReportSender(normalized);
  } catch (error) {
    // 仅在控制台提示，避免影响业务流程
    console.warn("客户端错误上报失败(已忽略)：", error);
  }
};

/**
 * 初始化全局错误监听（脚本错误 & Promise 未捕获异常）
 * 只应调用一次，可通过返回的函数移除监听
 */
export const initGlobalClientErrorReporting = (): (() => void) | undefined => {
  if (typeof window === "undefined" || hasInitGlobalListener) {
    return undefined;
  }
  hasInitGlobalListener = true;

  const handleRuntimeError = (event: ErrorEvent): void => {
    reportClientIssue({
      type: "runtime-error",
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      extra: {
        error: safeStringify(event.error),
      },
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const reason = (event as PromiseRejectionEvent).reason;
    reportClientIssue({
      type: "unhandled-rejection",
      message: reason?.message || safeStringify(reason) || "Unhandled rejection",
      stack: reason?.stack,
      extra: {
        reason: safeStringify(reason),
      },
    });
  };

  window.addEventListener("error", handleRuntimeError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleRuntimeError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    hasInitGlobalListener = false;
  };
};

/**
 * 包装交互/业务逻辑，自动捕获并上报异常
 * 用法：onClick={withClientErrorGuard("按钮名称", handler)}
 */
export const withClientErrorGuard = <T extends (...args: unknown[]) => unknown>(actionName: string, fn: T): T =>
  ((...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args) as ReturnType<T>;
      if (isPromiseLike(result)) {
        return result.catch((error: unknown) => {
          const err = error as Error;
          reportClientIssue({
            type: "interaction-error",
            actionName,
            message: err?.message || safeStringify(error),
            ...(err?.stack !== undefined ? { stack: err.stack } : {}),
          });
          throw error;
        }) as ReturnType<T>;
      }
      return result;
    } catch (error) {
      const err = error as Error;
      reportClientIssue({
        type: "interaction-error",
        actionName,
        message: err?.message || safeStringify(error),
        ...(err?.stack !== undefined ? { stack: err.stack } : {}),
      });
      throw error;
    }
  }) as T;
