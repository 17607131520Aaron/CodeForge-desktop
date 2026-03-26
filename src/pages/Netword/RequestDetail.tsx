import React, { useMemo } from "react";

import { CopyOutlined } from "@ant-design/icons";
import { Button, Descriptions, Empty, Space, Table, Tabs, Tag, Typography, message } from "antd";

import LazyJsonPanel from "./LazyJsonPanel";
import { buildCurlCommand, extractQueryParamsFromUrl, normalizeJsonLikeValue } from "./utils";

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

const isMeaningfulPayload = (value: unknown) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" && trimmed !== "{}" && trimmed !== "[]";
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
};

const getRequestPayload = (request: INetworkRequest) => {
  const method = request.method.toUpperCase();
  const normalizedParams = normalizeJsonLikeValue(request.params);
  const normalizedBody = normalizeJsonLikeValue(request.body);
  const normalizedData = normalizeJsonLikeValue(request.data);
  const urlQueryParams = extractQueryParamsFromUrl(request.url);

  if (method === "GET") {
    if (isMeaningfulPayload(normalizedParams)) {
      return normalizedParams;
    }

    if (isMeaningfulPayload(urlQueryParams)) {
      return urlQueryParams;
    }

    return isMeaningfulPayload(normalizedData) ? normalizedData : normalizedBody;
  }

  if (isMeaningfulPayload(normalizedBody)) {
    return normalizedBody;
  }

  if (isMeaningfulPayload(normalizedData)) {
    return normalizedData;
  }

  if (isMeaningfulPayload(normalizedParams)) {
    return normalizedParams;
  }

  return urlQueryParams;
};

const formatTime = (timestamp?: number) => {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleString();
};

const RequestDetail: React.FC<RequestDetailProps> = ({ request }) => {
  const requestPayload = useMemo(() => (request ? getRequestPayload(request) : undefined), [request]);
  const responsePayload = useMemo(
    () => (request ? normalizeJsonLikeValue(request.responseData) : undefined),
    [request],
  );
  const curlCommand = useMemo(() => (request ? buildCurlCommand(request) : ""), [request]);
  const headerDataSource = useMemo(
    () =>
      Object.entries(request?.headers ?? {}).map(([key, value]) => ({
        key,
        headerName: key,
        headerValue: value,
      })),
    [request],
  );
  const responseHeaderDataSource = useMemo(
    () =>
      Object.entries(request?.responseHeaders ?? {}).map(([key, value]) => ({
        key,
        headerName: key,
        headerValue: value,
      })),
    [request],
  );
  const headerColumns = useMemo(
    () => [
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
    ],
    [],
  );

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      message.success("复制成功");
    } catch (error) {
      console.error("[Network] Failed to copy curl command:", error);
      message.error("复制失败");
    }
  };

  if (!request) {
    return (
      <div className="network-details-empty">
        <Empty description="请选择左侧接口查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

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
              {/* <Text type={request.error ? "danger" : undefined}>{request.error || "-"}</Text> */}
              <Text {...(request.error ? { type: "danger" } : {})}>{request.error || "-"}</Text>
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
          {headerDataSource.length > 0 || responseHeaderDataSource.length > 0 ? (
            <div className="network-header-sections">
              <div className="network-header-section">
                <Text strong>请求头</Text>
                {headerDataSource.length > 0 ? (
                  <Table
                    bordered
                    className="network-headers-table"
                    columns={headerColumns}
                    dataSource={headerDataSource}
                    pagination={false}
                    rowKey="key"
                    size="small"
                  />
                ) : (
                  <Empty description="暂无请求头" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
              <div className="network-header-section">
                <Text strong>响应头</Text>
                {responseHeaderDataSource.length > 0 ? (
                  <Table
                    bordered
                    className="network-headers-table"
                    columns={headerColumns}
                    dataSource={responseHeaderDataSource}
                    pagination={false}
                    rowKey="key"
                    size="small"
                  />
                ) : (
                  <Empty description="暂无响应头" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
            </div>
          ) : (
            <Empty description="暂无头信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ),
    },
    {
      key: "payload",
      label: "请求载荷",
      children: (
        <div className="network-tab-scroll-area network-json-panel">
          <LazyJsonPanel
            copyLabel="复制请求参数"
            emptyFallback={<Empty description="暂无请求载荷" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            value={requestPayload}
            truncated={request.requestTruncated}
          />
        </div>
      ),
    },
    {
      key: "response",
      label: "响应",
      children: (
        <div className="network-tab-scroll-area network-json-panel">
          {request.responseData !== undefined ? (
            <LazyJsonPanel copyLabel="复制响应数据" value={responsePayload} truncated={request.responseTruncated} />
          ) : request.error ? (
            <>
              {request.errorTruncated && (
                <Text style={{ color: "#faad14", marginBottom: 8 }}>
                  注意：服务器已对错误内容做截断，展示可能不完整。
                </Text>
              )}
              <pre className="network-code-block">{request.error}</pre>
            </>
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
