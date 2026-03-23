import { formatDuration, formatSize, getMethodColor, getStatusColor } from "./constants";

import type { INetworkRequest } from "./types";
import type { ColumnsType } from "antd/es/table";

const useColumns = (): ColumnsType<INetworkRequest> => {
  return [
    {
      title: "名称",
      dataIndex: "url",
      key: "url",
      width: 180,
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
  ].map((item) => ({
    ...item,
    ellipsis: item.key === "url" ? false : { showTitle: true },
  }));
};

export default useColumns;
