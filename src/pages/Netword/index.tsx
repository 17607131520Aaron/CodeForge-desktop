import React, { useEffect, useRef, useState } from "react";

import {
  ClearOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { Badge, Button, Card, Input, Select, Space, Spin, Tooltip, Typography, Table } from "antd";

import useColumns from "./useColumns";
import useNetworkMonitor from "./useNetworkMonitor";

import type { INetworkRequest } from "./types";

import "./index.scss";

const { Text } = Typography;
const { Search } = Input;

const Netword: React.FC = () => {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollY, setTableScrollY] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<INetworkRequest | null>(null);

  const {
    filteredRequests,
    handleClearRequests,
    handleClose,
    handleConnectClick,
    isConnected,
    isConnecting,
    isRecording,
    methodFilter,
    searchText,
    handleMethodFilterChange,
    handleSearchTextChange,
    handleStatusFilterChange,
    statusFilter,
    toggleRecording,
  } = useNetworkMonitor();

  const columns = useColumns();
  const handleClear = () => {
    handleClearRequests();
    setSelectedRequest(null);
  };

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) {
      return undefined;
    }

    const updateTableScrollY = () => {
      const tableHeader = container.querySelector(".ant-table-thead") as HTMLElement | null;
      const headerHeight = tableHeader?.offsetHeight ?? 40;
      const nextHeight = container.clientHeight - headerHeight - 2;

      setTableScrollY(nextHeight > 0 ? nextHeight : 0);
    };

    const frameId = window.requestAnimationFrame(() => {
      updateTableScrollY();
    });

    const observer = new ResizeObserver(() => {
      updateTableScrollY();
    });

    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [filteredRequests.length]);

  return (
    <div className="network-monitor">
      <Card className="network-toolbar">
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

            <Tooltip title={isRecording ? "暂停记录" : "继续记录"}>
              <Button
                disabled={!isConnected}
                icon={isRecording ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={toggleRecording}
              >
                {isRecording ? "暂停" : "继续"}
              </Button>
            </Tooltip>

            <Tooltip title="清除所有请求">
              <Button icon={<ClearOutlined />} onClick={handleClear}>
                清除
              </Button>
            </Tooltip>
          </Space>

          <Space style={{ marginLeft: "auto" }}>
            <Select
              options={[
                { label: "全部", value: "all" },
                { label: "GET", value: "GET" },
                { label: "POST", value: "POST" },
                { label: "PUT", value: "PUT" },
                { label: "DELETE", value: "DELETE" },
                { label: "PATCH", value: "PATCH" },
              ]}
              placeholder="方法"
              style={{ width: 100 }}
              value={methodFilter}
              onChange={handleMethodFilterChange}
            />
            <Select
              options={[
                { label: "全部", value: "all" },
                { label: "成功", value: "success" },
                { label: "错误", value: "error" },
              ]}
              placeholder="状态"
              style={{ width: 100 }}
              value={statusFilter}
              onChange={handleStatusFilterChange}
            />
            <Search
              allowClear
              placeholder="过滤请求..."
              style={{ width: 300 }}
              value={searchText}
              onChange={handleSearchTextChange}
            />
          </Space>
        </Space>
      </Card>
      <div className="network-content">
        <div className="network-list">
          <Card className="network-list-card">
            {!isConnected ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <Text type="secondary">请先连接到网络监控服务器</Text>
              </div>
            ) : (
              <div ref={tableContainerRef} className="network-table-container">
                <Table
                  columns={columns}
                  bordered
                  dataSource={filteredRequests}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  tableLayout="fixed"
                  virtual
                  {...(tableScrollY > 0 ? { scroll: { y: tableScrollY } } : {})}
                  locale={{ emptyText: "暂无接口数据" }}
                  onRow={(record) => ({
                    onClick: () => {
                      setSelectedRequest(record);
                    },
                    style: {
                      cursor: "pointer",
                      background: selectedRequest?.id === record.id ? "#e6f7ff" : undefined,
                    },
                  })}
                />
              </div>
            )}
          </Card>
        </div>
        <div className="network-details-panel">
          <Card className="network-details-card">
            {!selectedRequest ? (
              <div style={{ padding: 24, color: "#8c8c8c" }}>请选择左侧接口查看详情</div>
            ) : (
              <div style={{ height: "100%", overflow: "auto" }}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>
                    {selectedRequest.method} {selectedRequest.status ?? "-"}
                  </Text>
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ wordBreak: "break-all" }}>
                      {selectedRequest.url}
                    </Text>
                  </div>
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {JSON.stringify(selectedRequest, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Netword;
