// JSON 折叠查看组件（类似 Chrome DevTools），支持一条日志里“对象 + 追加文本”的形式
import React, { useState } from "react";

import JsonPreviewPro from "@/components/JsonPreviewPro";

const CollapsibleJson: React.FC<{ message: string; onContentResize?: () => void }> = ({ message, onContentResize }) => {
  type Segment = { type: "text"; text: string } | { type: "json"; parsed: unknown; raw: string };

  const [segments, setSegments] = useState<Segment[] | null>(null);

  React.useEffect(() => {
    const trimmed = message.trim();

    // 空字符串直接渲染
    if (!trimmed) {
      setSegments([{ type: "text", text: "" }]);
      return;
    }

    // 优先处理这种格式：`<json><空格或换行><其它内容>`
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      // 贪婪匹配：从第一个 {/[ 一直找到最后一个 }/]
      const greedyMatch = trimmed.match(/^(\{[\s\S]*\}|\[[\s\S]*\])(.*)$/);
      if (greedyMatch) {
        const jsonPart = greedyMatch[1];
        const restPart = greedyMatch[2];
        if (!jsonPart) {
          return;
        }
        try {
          const parsed: unknown = JSON.parse(jsonPart);
          const segs: Segment[] = [{ type: "json", parsed, raw: jsonPart }];
          if (restPart && restPart.trim()) {
            segs.push({ type: "text", text: restPart });
          }
          setSegments(segs);
          return;
        } catch {
          // 如果整体 JSON 解析失败，退回通用逻辑
        }
      }
    }

    // 通用逻辑：在整条 message 中查找第一个 JSON 片段
    const firstBraceIndex = message.search(/(\{|\[)/);
    if (firstBraceIndex === -1) {
      setSegments([{ type: "text", text: message }]);
      return;
    }

    const before = message.slice(0, firstBraceIndex);
    const after = message.slice(firstBraceIndex);

    // 贪婪匹配 JSON 片段
    const jsonMatch = after.match(/^(\{[\s\S]*\}|\[[\s\S]*\])(.*)$/);
    if (jsonMatch) {
      const jsonPart = jsonMatch[1];
      const restPart = jsonMatch[2];
      if (!jsonPart) {
        // Extremely defensive: the RegExp matched, but TS still treats captures as possibly undefined.
        // Fall back to plain-text handling below.
        setSegments([{ type: "text", text: message }]);
        return;
      }
      try {
        const parsed: unknown = JSON.parse(jsonPart);
        const segs: Segment[] = [];
        if (before) {
          segs.push({ type: "text", text: before });
        }
        segs.push({ type: "json", parsed, raw: jsonPart });
        if (restPart && restPart.trim()) {
          segs.push({ type: "text", text: restPart });
        }
        setSegments(segs);
        return;
      } catch {
        // 解析失败，当普通文本处理
      }
    }

    // 找不到合法 JSON，就当作普通文本
    setSegments([{ type: "text", text: message }]);
  }, [message]);

  React.useEffect(() => {
    onContentResize?.();
  }, [onContentResize, segments]);

  if (!segments) {
    return <span>{message}</span>;
  }

  // 只有一个 JSON 片段，且整条就是它：直接用 JSON 折叠视图（接近 DevTools）
  const onlySegment = segments.length === 1 ? segments[0] : undefined;
  if (onlySegment && onlySegment.type === "json" && message.trim() === onlySegment.raw.trim()) {
    return (
      <div className="chrome-like-json">
        <JsonPreviewPro
          variant="inline"
          outerVariant="plain"
          showToolbar={false}
          defaultExpandDepth={2}
          value={onlySegment.parsed}
          onExpandedChange={onContentResize}
        />
      </div>
    );
  }

  // 多段：文本 + JSON + 文本，保证 JSON 和后缀文本在同一行渲染
  return (
    <span>
      {segments.map((seg, index) =>
        seg.type === "text" ? (
          <span key={index}>{seg.text}</span>
        ) : (
          <div key={index} className="chrome-like-json" style={{ marginLeft: 4 }}>
            <JsonPreviewPro
              variant="inline"
              outerVariant="plain"
              showToolbar={false}
              defaultExpandDepth={2}
              value={seg.parsed}
              onExpandedChange={onContentResize}
            />
          </div>
        ),
      )}
    </span>
  );
};

export default CollapsibleJson;
