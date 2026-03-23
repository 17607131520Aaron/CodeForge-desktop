import { useCallback, useMemo } from "react";

import { Button, message } from "antd";

import { formatDuration, formatSize, getMethodColor, getStatusColor } from "./constants";
import { buildCurlCommand } from "./utils";

import type { INetworkRequest } from "./types";
import type { ColumnsType } from "antd/es/table";

type UseColumnsOptions = {
  onDetail?: (payload: INetworkRequest) => void;
};

const useColumns = ({ onDetail }: UseColumnsOptions = {}): ColumnsType<INetworkRequest> => {
  const handleCopy = useCallback(async (payload: INetworkRequest) => {
    try {
      await navigator.clipboard.writeText(buildCurlCommand(payload));
      message.success("复制成功");
    } catch (error) {
      console.error("[Network] Failed to copy curl command:", error);
      message.error("复制失败");
    }
  }, []);
  const handleDetail = useCallback((payload: INetworkRequest) => {
    onDetail?.(payload);
  }, [onDetail]);

  return useMemo(
    () =>
      [
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
      })),
    [handleCopy, handleDetail],
  );
};

export default useColumns;
