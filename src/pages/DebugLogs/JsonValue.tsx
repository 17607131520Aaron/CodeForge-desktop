// 递归渲染 JSON 值的组件（类似 Chrome DevTools）
// 为了满足“永远显示全”，数组/对象不再折叠，始终以展开态渲染。
import React, { useEffect } from "react";

const JsonValue: React.FC<{
  defaultExpandedDepth?: number;
  level?: number;
  onExpandedChange?: () => void;
  parentKey?: string;
  value: unknown;
}> = ({ level = 0, onExpandedChange, parentKey: _parentKey, value }) => {
  const indent = level * 16;

  // 给虚拟列表测量留一个机会：value 变化/重渲染后通知一次高度更新。
  useEffect(() => {
    onExpandedChange?.();
  }, [onExpandedChange, value]);

  // 字符串
  if (typeof value === "string") {
    return <span className="json-string">"{value}"</span>;
  }

  // 数字
  if (typeof value === "number") {
    return <span className="json-number">{value}</span>;
  }

  // 布尔值
  if (typeof value === "boolean") {
    return <span className="json-boolean">{value ? "true" : "false"}</span>;
  }

  // null
  if (value === null) {
    return <span className="json-null">null</span>;
  }

  // undefined
  if (value === undefined) {
    return <span className="json-undefined">undefined</span>;
  }

  // 数组
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span>
          <span className="json-bracket">[</span>
          <span className="json-bracket">]</span>
        </span>
      );
    }

    return (
      <span>
        <span className="json-bracket">[</span>
        <div style={{ marginLeft: indent + 16 }}>
          {value.map((item, index) => (
            <div key={index} className="json-line">
              <JsonValue level={level + 1} value={item} onExpandedChange={onExpandedChange} />
              {index < value.length - 1 && <span className="json-comma">,</span>}
            </div>
          ))}
        </div>
        <div style={{ marginLeft: indent }}>
          <span className="json-bracket">]</span>
        </div>
      </span>
    );
  }

  // 对象
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return (
        <span>
          <span className="json-brace">{`{`}</span>
          <span className="json-brace">{`}`}</span>
        </span>
      );
    }

    return (
      <span>
        <span className="json-brace">{`{`}</span>
        <div style={{ marginLeft: indent + 16 }}>
          {entries.map(([key, val], index) => (
            <div key={key} className="json-line">
              <span className="json-key">"{key}"</span>
              <span className="json-colon">: </span>
              <JsonValue level={level + 1} onExpandedChange={onExpandedChange} parentKey={key} value={val} />
              {index < entries.length - 1 && <span className="json-comma">,</span>}
            </div>
          ))}
        </div>
        <div style={{ marginLeft: indent }}>
          <span className="json-brace">{`}`}</span>
        </div>
      </span>
    );
  }

  return <span>{String(value)}</span>;
};

export default JsonValue;
