import React, { Profiler, useEffect, useRef, type ProfilerOnRenderCallback, type ReactNode } from "react";

import usePagePerformanceMonitor from "./usePerformanceMonitorHook";

interface IPerformanceMetrics {
  id: string;
  phase: "mount" | "update" | "nested-update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<unknown>;
}

interface IPerformanceMonitorProps {
  id: string;
  children: ReactNode;
  onRender?: ProfilerOnRenderCallback;
  enableConsoleLog?: boolean;
}

/**
 * 性能监控组件
 * 使用React.Profiler API监控组件渲染性能
 */
const PerformanceMonitor: React.FC<IPerformanceMonitorProps> = ({
  id,
  children,
  onRender,
  enableConsoleLog = true,
}) => {
  const hasLoggedRef = useRef(false);
  const hasLoggedPagePerfRef = useRef(false);

  // 页面级 Performance API 监控（DNS/TCP/FCP 等）
  const { logPagePerformance } = usePagePerformanceMonitor();

  const ProfilerWrapper = Profiler as unknown as React.FC<{
    id: string;
    onRender: ProfilerOnRenderCallback;
    children: ReactNode;
  }>;

  useEffect(() => {
    // 路由切换时允许重新记录一次
    hasLoggedRef.current = false;
    hasLoggedPagePerfRef.current = false;
  }, [id]);

  // ProfilerOnRenderCallback需要6个参数，这是React API的要求
  /* eslint-disable max-params */
  const handleRender: ProfilerOnRenderCallback = (
    profilerId: string,
    phase: "mount" | "update" | "nested-update",
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
  ) => {
    // React 18的Profiler回调可能没有interactions参数
    const metrics: IPerformanceMetrics = {
      id: profilerId,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions: new Set(),
    };

    // 调用自定义回调
    if (onRender) {
      onRender(profilerId, phase, actualDuration, baseDuration, startTime, commitTime);
    }

    // 仅输出当前页面首个 render（mount 或首次 update），避免同页多次重复
    if (enableConsoleLog && !hasLoggedRef.current && (phase === "mount" || phase === "update")) {
      const style =
        "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold; font-size: 12px;";
      const resetStyle = "background: transparent; color: inherit;";
      const phaseText = phase === "mount" ? "挂载" : "更新";

      console.log(`%c⚡ 性能监控 - ${id}`, style);
      console.log(`%c阶段:`, resetStyle, phaseText);
      console.log(`%c实际渲染时间:`, resetStyle, `${actualDuration.toFixed(2)}ms`, actualDuration > 16 ? "⚠️" : "✅");
      console.log(`%c基准渲染时间:`, resetStyle, `${baseDuration.toFixed(2)}ms`);
      console.log(`%c开始时间:`, resetStyle, `${startTime.toFixed(2)}ms`);
      console.log(`%c提交时间:`, resetStyle, `${commitTime.toFixed(2)}ms`);
      console.log(
        `%c性能评分:`,
        resetStyle,
        actualDuration < 16 ? "优秀 ✅" : actualDuration < 50 ? "良好 ⚠️" : "需要优化 ❌",
      );
      if (metrics.interactions.size > 0) {
        console.log(`%c交互数量:`, resetStyle, metrics.interactions.size);
      }

      // 如果渲染时间过长，输出警告
      if (actualDuration > 50) {
        console.warn(`⚠️ 性能警告: 组件 "${id}" 渲染时间过长 (${actualDuration.toFixed(2)}ms)，建议优化`);
      }

      // 在标签下追加一次“页面性能指标”（DNS/TCP/FCP 等），保证每个页面只调用一次
      if (!hasLoggedPagePerfRef.current) {
        hasLoggedPagePerfRef.current = true;
        logPagePerformance(id);
      }

      hasLoggedRef.current = true;
    }
  };
  /* eslint-enable max-params */

  return (
    <ProfilerWrapper id={id} onRender={handleRender}>
      {children}
    </ProfilerWrapper>
  );
};

export default PerformanceMonitor;
