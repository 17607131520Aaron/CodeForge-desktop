import React, { useMemo } from "react";

import { CopyOutlined } from "@ant-design/icons";
import { Button, Space, Typography, message } from "antd";

import JsonValue from "../DebugLogs/JsonValue";

import { normalizeJsonLikeValue, stringifyDisplayValue } from "./utils";

const { Text } = Typography;

const DEFAULT_EXPANDED_DEPTH = 6;

type LazyJsonPanelProps = {
  copyLabel: string;
  emptyFallback?: React.ReactNode;
  value: unknown;
  truncated?: boolean;
};

const LazyJsonPanel: React.FC<LazyJsonPanelProps> = ({ copyLabel, emptyFallback, value, truncated }) => {
  const normalizedValue = useMemo(() => normalizeJsonLikeValue(value), [value]);

  const serializedPreview = useMemo(() => {
    if (value === undefined) {
      return null;
    }

    return stringifyDisplayValue(value);
  }, [value]);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(serializedPreview ?? "");
      message.success("复制成功");
    } catch (error) {
      console.error("[Network] Failed to copy content:", error);
      message.error("复制失败");
    }
  };

  if (value === undefined) {
    return <>{emptyFallback}</>;
  }

  return (
    <>
      <Space className="network-tab-actions">
        <Button icon={<CopyOutlined />} size="small" onClick={handleCopyContent}>
          {copyLabel}
        </Button>
      </Space>
      {truncated && (
        <Text style={{ color: "#faad14" }}>
          注意：服务器已对内容做截断，展示内容可能不完整。
        </Text>
      )}
      <div className="chrome-like-json">
        <JsonValue defaultExpandedDepth={DEFAULT_EXPANDED_DEPTH} value={normalizedValue} />
      </div>
    </>
  );
};

export default LazyJsonPanel;
