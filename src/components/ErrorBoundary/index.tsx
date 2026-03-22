import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { reportClientIssue } from "@/utils/errorReporter";

interface IErrorBoundaryProps {
  children: ReactNode;
  scope?: string;
  fallback?: ReactNode;
}

interface IErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
  public override state: IErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  public static getDerivedStateFromError(error: Error): IErrorBoundaryState {
    return { hasError: true, message: String(error?.message || "未知错误") };
  }

  public override async componentDidCatch(error: Error, info: ErrorInfo): Promise<void> {
    const stack = error?.stack;
    const componentStack = info.componentStack;

    await reportClientIssue({
      type: "react-render",
      scope: this.props.scope || "App",
      message: error?.message || "组件渲染异常",
      ...(stack ? { stack } : {}),
      ...(componentStack ? { componentStack } : {}),
    });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "#1f1f1f",
            background: "#f5f5f5",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>页面出错了</div>
          <div style={{ color: "#8c8c8c" }}>{this.state.message || "请稍后重试"}</div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #1677ff",
                background: "#1677ff",
                color: "#fff",
                cursor: "pointer",
              }}
              onClick={() => window.location.reload()}
            >
              刷新页面
            </button>
            <button
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #d9d9d9",
                background: "#fff",
                color: "#595959",
                cursor: "pointer",
              }}
              onClick={this.handleRetry}
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: "" });
  };
}

export default ErrorBoundary;
