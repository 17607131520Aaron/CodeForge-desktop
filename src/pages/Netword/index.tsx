import React from "react";

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

import "./index.scss";

const { Text } = Typography;
const { Search } = Input;

const Netword: React.FC = () => {
  const {
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
              <Button icon={<ClearOutlined />} onClick={handleClearRequests}>
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
              <Table
                columns={columns}
                bordered
                dataSource={[]}
                rowKey="id"
                scroll={{ y: 600 }}
                pagination={false}
                size="small"
                onRow={(record) => ({
                  onClick: () => {
                    console.log(record, "record");
                  },
                  style: { cursor: "pointer" },
                })}
              />
            )}
          </Card>
        </div>
        <div className="network-details-panel">
          <Card className="network-details-card" />
        </div>
      </div>
    </div>
  );
};

export default Netword;
