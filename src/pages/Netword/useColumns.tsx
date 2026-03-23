import { Button, message } from "antd";

import { formatDuration, formatSize, getMethodColor, getStatusColor } from "./constants";

import type { INetworkRequest } from "./types";
import type { ColumnsType } from "antd/es/table";

const useColumns = (): ColumnsType<INetworkRequest> => {
  const escapeShellValue = (value: string) => value.replace(/'/g, `'\"'\"'`);
  const handleCopy = async (payload: INetworkRequest) => {
    const stringifyValue = (value: unknown) => {
      if (value === null) {
        return "";
      }

      return typeof value === "string" ? value : JSON.stringify(value);
    };

    const headerSegments = Object.entries(payload.headers ?? {}).map(
      ([key, value]) => `-H '${escapeShellValue(`${key}: ${value}`)}'`,
    );

    const requestBody = stringifyValue(payload.body ?? payload.data);
    const dataSegment = requestBody ? [`--data-raw '${escapeShellValue(requestBody)}'`] : [];

    const curlCommand = [
      "curl",
      `-X ${payload.method.toUpperCase()}`,
      ...headerSegments,
      ...dataSegment,
      `'${escapeShellValue(payload.url)}'`,
    ].join(" ");

    try {
      await navigator.clipboard.writeText(curlCommand);
      message.success(`${payload.url} 复制成功`);
    } catch (error) {
      console.error("[Network] Failed to copy curl command:", error);
      message.error(`${payload.url} 复制失败`);
    }
  };
  const handleDetail = (payload: INetworkRequest) => {
    console.log(payload);
  };

  return [
    {
      title: "名称",
      dataIndex: "url",
      key: "url",
      render: (url: string, record: INetworkRequest) => (
        <div title={url} style={{ display: "flex", alignItems: "center", minWidth: 0, gap: 8 }}>
          <span
            style={{
              backgroundColor: getMethodColor(record.method),
              borderRadius: 4,
              color: "#fff",
              display: "inline-block",
              fontSize: 12,
              padding: "0 6px",
              textAlign: "center",
              minWidth: 48,
              flex: "0 0 auto",
            }}
          >
            {record.method}
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            {url}
          </span>
        </div>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status?: number) => <span style={{ color: getStatusColor(status) }}>{status ?? "-"}</span>,
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type?: string) => type || "-",
    },
    {
      title: "大小",
      dataIndex: "responseSize",
      key: "size",
      width: 120,
      render: (responseSize?: number) => formatSize(responseSize),
    },
    {
      title: "时间",
      dataIndex: "duration",
      key: "time",
      width: 140,
      render: (duration?: number) => formatDuration(duration),
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      width: 180,
      render: (_: unknown, record: INetworkRequest) => {
        return (
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
            <Button key="detail" type="link" onClick={() => handleDetail(record)}>
              查看
            </Button>
            <Button key="copy" type="link" onClick={() => handleCopy(record)}>
              cURL
            </Button>
          </div>
        );
      },
    },
  ].map((item) => ({
    ...item,
    ellipsis: item.key === "url" ? false : { showTitle: true },
  }));
};

export default useColumns;
