import React, { useRef, useEffect } from "react";

import { ClearOutlined, DisconnectOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import { Badge, Button, Card, Input, Select, Space, Spin, Tooltip, Typography } from "antd";

import { levelOptions, DEFAULT_PORT, getLogLevelColor } from "./constants";
import useDebugLogs from "./useDebugLogs";

import "./index.scss";

const { Text } = Typography;
const { Search } = Input;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filteredLogs: any = [];

const DebugLogs: React.FC = () => {
  const logsContainerRef = useRef<HTMLDivElement | null>(null);
  const { isConnecting, isConnected, handleConnectClick, handleClose, handleClearLogs } = useDebugLogs();

  // 当日志变化时，自动滚动到底部（类似 Chrome 控制台）
  useEffect(() => {
    const el = logsContainerRef.current;
    if (!el) {
      return;
    }
    // 使用 requestAnimationFrame，等 DOM 更新完成后再滚动
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  return (
    <div className="rn-debug-logs">
      <Card className="toolbar">
        <Space wrap size="middle" style={{ width: "100%" }}>
          <Space>
            <Text strong>连接状态：</Text>
            {isConnecting ? (
              <Space>
                <Spin size="small" />
                <Text type="secondary">连接中...</Text>
              </Space>
            ) : (
              <Badge status={isConnected ? "success" : "error"} text={isConnected ? "已连接" : "未连接"} />
            )}
          </Space>

          <Space>
            <Tooltip title="连接">
              <Button icon={<ReloadOutlined />} loading={isConnecting} type="primary" onClick={handleConnectClick}>
                {isConnected ? "重连" : "连接"}
              </Button>
            </Tooltip>

            <Tooltip title="关闭连接">
              <Button danger disabled={!isConnected && !isConnecting} icon={<StopOutlined />} onClick={handleClose}>
                关闭
              </Button>
            </Tooltip>

            <Tooltip title="清除日志">
              <Button icon={<ClearOutlined />} onClick={handleClearLogs}>
                清除
              </Button>
            </Tooltip>
          </Space>

          <Space style={{ marginLeft: "auto" }}>
            <Select
              options={levelOptions || []}
              placeholder="日志级别"
              style={{ width: "100px" }}
              value={"all"}
              // onChange={(value: string) => setLevelFilter(value)}
            />
            <Search
              allowClear
              placeholder="搜索日志..."
              style={{ width: 400 }}
              // value={searchText}
              // onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            />
          </Space>
        </Space>
      </Card>
      <Card className="content">
        <div ref={logsContainerRef} className="rn-debug-logs-container">
          {filteredLogs.length === 0 ? (
            <div className="rn-debug-logs-empty">
              <DisconnectOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
              <Text type="secondary">
                {isConnected ? "已连接，等待日志输出..." : "未连接，请点击连接按钮连接到 Metro bundler"}
              </Text>
              <Text style={{ fontSize: "12px", marginTop: 8 }} type="secondary">
                默认端口: {DEFAULT_PORT} (日志服务器)
              </Text>
              {isConnected && (
                <div style={{ marginTop: 16, padding: 12, background: "#fff3cd", borderRadius: 4, maxWidth: 600 }}>
                  <Text strong style={{ fontSize: "12px", color: "#856404" }}>
                    提示：
                  </Text>
                  <Text style={{ fontSize: "12px", color: "#856404", display: "block", marginTop: 4 }}>
                    React Native 的 console.log 默认不会自动通过 Metro bundler 的 logger WebSocket 发送。
                    <br />
                    如需捕获 JS 日志，请在 React Native 应用中添加日志拦截器来转发 console.log 输出。
                    <br />
                    可参考 storeverserepo-app/src/utils/devWsLogger.ts 的实现方式。
                  </Text>
                </div>
              )}
            </div>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filteredLogs.map((log: any) => (
              <div
                key={log.id}
                className="rn-debug-logs-item"
                data-level={log.level === "unknown" ? undefined : log.level}
              >
                <span className="rn-debug-logs-level" style={{ color: getLogLevelColor(log.level) }}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="rn-debug-logs-message">
                  <span style={{ color: "#858585", marginRight: 8 }}>
                    {new Date(log.timestamp).toLocaleTimeString()} -
                  </span>
                  {/* <CollapsibleJson message={log.message} /> */}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default DebugLogs;
