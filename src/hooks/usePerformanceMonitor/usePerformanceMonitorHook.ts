import { savePerformanceMetric } from "@/utils/indexedDBStorage";

interface IPerformanceData {
  dnsTime: number;
  tcpTime: number;
  requestTime: number;
  domParseTime: number;
  domContentLoadedTime: number;
  loadTime: number;
  totalTime: number;
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
}

export interface IPagePerformanceReport extends IPerformanceData {
  url: string;
  timestamp: number;
  pageId?: string;
}

type PagePerformanceReporter = (payload: IPagePerformanceReport) => void | Promise<void>;

let pagePerformanceReporter: PagePerformanceReporter | null = null;

export const setPagePerformanceReporter = (reporter: PagePerformanceReporter): void => {
  pagePerformanceReporter = reporter;
};

/**
 * Hook: 获取页面性能指标
 * 使用Performance API获取页面加载性能数据
 */
export const usePerformanceMonitor = (): {
  getPerformanceMetrics: () => IPerformanceData | null;
  logPagePerformance: (pageId?: string) => void;
} => {
  const getPerformanceMetrics = (): IPerformanceData | null => {
    if (typeof window === "undefined" || !window.performance) {
      return null;
    }

    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

    if (!navigation) {
      return null;
    }

    const metrics: IPerformanceData = {
      // DNS查询时间
      dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
      // TCP连接时间
      tcpTime: navigation.connectEnd - navigation.connectStart,
      // 请求响应时间
      requestTime: navigation.responseEnd - navigation.requestStart,
      // DOM解析时间
      domParseTime: navigation.domInteractive - navigation.responseEnd,
      // DOMContentLoaded时间
      domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      // 页面加载时间
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      // 总时间
      totalTime: navigation.loadEventEnd - navigation.fetchStart,
      // 首次内容绘制 (FCP)
      fcp: 0,
      // 最大内容绘制 (LCP)
      lcp: 0,
      // 首次输入延迟 (FID)
      fid: 0,
      // 累积布局偏移 (CLS)
      cls: 0,
    };

    // 获取Web Vitals指标
    const paintEntries = performance.getEntriesByType("paint");
    paintEntries.forEach((entry) => {
      if (entry.name === "first-contentful-paint") {
        metrics.fcp = entry.startTime;
      }
    });

    // 获取LCP
    const lcpEntries = performance.getEntriesByName("largest-contentful-paint");
    if (lcpEntries.length > 0) {
      const lcpEntry = lcpEntries[lcpEntries.length - 1] as PerformanceEntry;
      metrics.lcp = lcpEntry.startTime;
    }

    return metrics;
  };

  const logPagePerformance = (pageId?: string): void => {
    const metrics = getPerformanceMetrics();
    if (!metrics) {
      console.warn("无法获取性能指标");
      return;
    }

    const style =
      "background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 10px 15px; border-radius: 6px; font-weight: bold; font-size: 14px;";
    const resetStyle = "background: transparent; color: inherit;";

    console.log(`%c📊 页面性能指标`, style);
    console.log(`%cDNS查询时间:`, resetStyle, `${metrics.dnsTime.toFixed(2)}ms`);
    console.log(`%cTCP连接时间:`, resetStyle, `${metrics.tcpTime.toFixed(2)}ms`);
    console.log(`%c请求响应时间:`, resetStyle, `${metrics.requestTime.toFixed(2)}ms`);
    console.log(`%cDOM解析时间:`, resetStyle, `${metrics.domParseTime.toFixed(2)}ms`);
    console.log(`%cDOMContentLoaded时间:`, resetStyle, `${metrics.domContentLoadedTime.toFixed(2)}ms`);
    console.log(`%c页面加载时间:`, resetStyle, `${metrics.loadTime.toFixed(2)}ms`);
    console.log(`%c总加载时间:`, resetStyle, `${metrics.totalTime.toFixed(2)}ms`);
    if (metrics.fcp > 0) {
      console.log(`%c首次内容绘制 (FCP):`, resetStyle, `${metrics.fcp.toFixed(2)}ms`, metrics.fcp < 1800 ? "✅" : "⚠️");
    }
    if (metrics.lcp > 0) {
      console.log(`%c最大内容绘制 (LCP):`, resetStyle, `${metrics.lcp.toFixed(2)}ms`, metrics.lcp < 2500 ? "✅" : "⚠️");
    }
    const payload: IPagePerformanceReport = {
      ...metrics,
      url: typeof window !== "undefined" && window.location ? window.location.href : "",
      timestamp: Date.now(),
      ...(pageId !== undefined ? { pageId } : {}),
    };

    try {
      if (pagePerformanceReporter) {
        void pagePerformanceReporter(payload);
      }
    } catch (error) {
      console.warn("页面性能指标上报失败（已忽略）：", error);
    }

    // 始终写入 IndexedDB，作为本地缓存，超过 1000 条由存储层自动清理
    void savePerformanceMetric(payload);
  };

  return {
    getPerformanceMetrics,
    logPagePerformance,
  };
};

export default usePerformanceMonitor;
