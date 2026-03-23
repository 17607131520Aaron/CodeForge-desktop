import React, { useMemo, useState } from "react";

import { CopyOutlined } from "@ant-design/icons";
import { Button, Space, Typography, message } from "antd";

import JsonValue from "../DebugLogs/JsonValue";

const { Text } = Typography;

const LARGE_JSON_STRING_THRESHOLD = 16 * 1024;
const PREVIEW_STRING_LENGTH = 2048;
const DEFAULT_COLLAPSED_DEPTH = 1;
const DEFAULT_EXPANDED_DEPTH = 2;

type LazyJsonPanelProps = {
  copyLabel: string;
  emptyFallback?: React.ReactNode;
  value: unknown;
};

const stringifyCopyValue = (value: unknown) => {
  if (value === undefined) {
    return "";
  }

  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
};

const truncateText = (value: string) => {
  if (value.length <= PREVIEW_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, PREVIEW_STRING_LENGTH)}\n... [truncated ${value.length - PREVIEW_STRING_LENGTH} chars]`;
};

const LazyJsonPanel: React.FC<LazyJsonPanelProps> = ({ copyLabel, emptyFallback, value }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const serializedPreview = useMemo(() => {
    if (value === undefined) {
      return null;
    }

    return stringifyCopyValue(value);
  }, [value]);

  const isLargePayload = (serializedPreview?.length ?? 0) > LARGE_JSON_STRING_THRESHOLD;
  const previewText = serializedPreview ? truncateText(serializedPreview) : "";

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
        {isLargePayload && (
          <Button size="small" onClick={() => setIsExpanded((current) => !current)}>
            {isExpanded ? "收起大对象" : "展开大对象"}
          </Button>
        )}
        <Button icon={<CopyOutlined />} size="small" onClick={handleCopyContent}>
          {copyLabel}
        </Button>
      </Space>
      {isLargePayload && !isExpanded ? (
        <div className="network-large-json-preview">
          <Text type="secondary">内容较大，默认展示预览以避免阻塞渲染。</Text>
          <pre className="network-code-block network-code-block-compact">{previewText}</pre>
        </div>
      ) : (
        <div className="chrome-like-json">
          <JsonValue
            defaultExpandedDepth={isLargePayload ? DEFAULT_COLLAPSED_DEPTH : DEFAULT_EXPANDED_DEPTH}
            value={value}
          />
        </div>
      )}
    </>
  );
};

export default LazyJsonPanel;
