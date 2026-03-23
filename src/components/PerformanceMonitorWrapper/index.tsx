import { useEffect } from "react";
import type { ReactNode } from "react";

import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";

interface IPerformanceMonitorWrapperProps {
  children: ReactNode;
  id?: string;
  enableConsoleLog?: boolean;
}

const PerformanceMonitorWrapper: React.FC<IPerformanceMonitorWrapperProps> = ({
  children,
  id,
  enableConsoleLog = true,
}) => {
  const { logPagePerformance } = usePerformanceMonitor();

  useEffect(() => {
    if (!enableConsoleLog) {
      return undefined;
    }

    // 页面加载完成后输出性能指标
    const logPerformance = (): void => {
      setTimeout(() => {
        logPagePerformance(id);
      }, 1000);
    };

    if (document.readyState === "complete") {
      // 延迟一下确保所有指标都已收集
      logPerformance();
      return undefined;
    }
    window.addEventListener("load", logPerformance);
    return () => {
      window.removeEventListener("load", logPerformance);
    };
  }, [enableConsoleLog, id, logPagePerformance]);

  return <>{children}</>;
};

export default PerformanceMonitorWrapper;
