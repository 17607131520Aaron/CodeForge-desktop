import React from "react";

import { CopyOutlined } from "@ant-design/icons";
import { Button, Descriptions, Empty, Space, Table, Tabs, Tag, Typography, message } from "antd";

import JsonValue from "../DebugLogs/JsonValue";

import { buildCurlCommand } from "./utils";

import type { INetworkRequest } from "./types";
import type { TabsProps } from "antd";

const { Paragraph, Text } = Typography;

type RequestDetailProps = {
  request: INetworkRequest | null;
};

const getStatusTagColor = (status?: number) => {
  if (!status) {
    return "default";
  }

  if (status >= 200 && status < 300) {
    return "success";
  }

  if (status >= 400) {
    return "error";
  }

  return "processing";
};

const getRequestPayload = (request: INetworkRequest) => request.body ?? request.data ?? request.params;

const formatTime = (timestamp?: number) => {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleString();
};

const RequestDetail: React.FC<RequestDetailProps> = ({ request }) => {
  if (!request) {
    return (
      <div className="network-details-empty">
        <Empty description="请选择左侧接口查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const curlCommand = buildCurlCommand(request);
  const requestPayload = getRequestPayload(request);
  const headerDataSource = Object.entries(request.headers ?? {}).map(([key, value]) => ({
    key,
    headerName: key,
    headerValue: value,
  }));

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      message.success("复制成功");
    } catch (error) {
      console.error("[Network] Failed to copy curl command:", error);
      message.error("复制失败");
    }
  };

  const tabItems: TabsProps["items"] = [
    {
      key: "overview",
      label: "基本信息",
      children: (
        <div className="network-tab-scroll-area">
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="请求方法">
              <Tag color="blue">{request.method}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="请求地址">
              <Paragraph className="network-url-text" copyable={{ text: request.url }} style={{ marginBottom: 0 }}>
                {request.url}
              </Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="状态码">
              <Tag color={getStatusTagColor(request.status)}>{request.status ?? "-"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="请求类型">{request.type || "-"}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{formatTime(request.startTime)}</Descriptions.Item>
            <Descriptions.Item label="结束时间">{formatTime(request.endTime)}</Descriptions.Item>
            <Descriptions.Item label="耗时">
              {request.duration !== null && request.duration !== undefined ? `${request.duration} ms` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="请求大小">
              {request.requestSize !== null && request.requestSize !== undefined ? `${request.requestSize} B` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="响应大小">
              {request.responseSize !== null && request.responseSize !== undefined ? `${request.responseSize} B` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="基础地址">{request.baseURL || "-"}</Descriptions.Item>
            <Descriptions.Item label="原始地址">{request.originalUrl || "-"}</Descriptions.Item>
            <Descriptions.Item label="错误信息">
              <Text type={request.error ? "danger" : undefined}>{request.error || "-"}</Text>
            </Descriptions.Item>
          </Descriptions>
        </div>
      ),
    },
    {
      key: "headers",
      label: "请求头",
      children: (
        <div className="network-tab-scroll-area">
          {headerDataSource.length > 0 ? (
            <Table
              bordered
              className="network-headers-table"
              columns={[
                {
                  dataIndex: "headerName",
                  key: "headerName",
                  title: "请求头",
                  width: 180,
                  render: (value: string) => <Text code>{value}</Text>,
                },
                {
                  dataIndex: "headerValue",
                  key: "headerValue",
                  title: "值",
                  render: (value: string) => <div className="network-header-value-cell">{value}</div>,
                },
              ]}
              dataSource={headerDataSource}
              pagination={false}
              rowKey="key"
              size="small"
            />
          ) : (
            <Empty description="暂无请求头" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ),
    },
    {
      key: "payload",
      label: "请求载荷",
      children: (
        <div className="network-tab-scroll-area network-json-panel">
          {requestPayload !== undefined ? (
            <div className="chrome-like-json">
              <JsonValue defaultExpandedDepth={3} value={requestPayload} />
            </div>
          ) : (
            <Empty description="暂无请求载荷" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ),
    },
    {
      key: "response",
      label: "响应",
      children: (
        <div className="network-tab-scroll-area network-json-panel">
          {request.responseData !== undefined ? (
            <div className="chrome-like-json">
              <JsonValue defaultExpandedDepth={3} value={request.responseData} />
            </div>
          ) : request.error ? (
            <pre className="network-code-block">{request.error}</pre>
          ) : (
            <Empty description="暂无响应内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ),
    },
    {
      key: "curl",
      label: "cURL",
      children: (
        <div className="network-tab-scroll-area">
          <Space className="network-tab-actions">
            <Button icon={<CopyOutlined />} size="small" onClick={handleCopyCurl}>
              复制 cURL
            </Button>
          </Space>
          <pre className="network-code-block">{curlCommand}</pre>
        </div>
      ),
    },
  ];

  return (
    <div className="network-details-content">
      <div className="network-details-header">
        <Space size={8} wrap>
          <Tag color="blue">{request.method}</Tag>
          <Tag color={getStatusTagColor(request.status)}>{request.status ?? "-"}</Tag>
        </Space>
        <Paragraph className="network-url-text" ellipsis={{ rows: 2, tooltip: request.url }} style={{ marginBottom: 0 }}>
          {request.url}
        </Paragraph>
      </div>
      <div className="network-details-body">
        <Tabs className="network-details-tabs" items={tabItems} />
      </div>
    </div>
  );
};

export default RequestDetail;
