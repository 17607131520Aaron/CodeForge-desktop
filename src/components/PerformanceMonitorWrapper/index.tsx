import { useEffect } from "react";
import type { ReactNode } from "react";

import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";

const PerformanceMonitorWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { logPagePerformance } = usePerformanceMonitor();

  useEffect(() => {
    // 页面加载完成后输出性能指标
    const logPerformance = (): void => {
      setTimeout(() => {
        logPagePerformance();
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
  }, [logPagePerformance]);

  return <>{children}</>;
};

export default PerformanceMonitorWrapper;
