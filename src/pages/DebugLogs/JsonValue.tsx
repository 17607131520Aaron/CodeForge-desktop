// 递归渲染 JSON 值的组件（类似 Chrome DevTools）
import React, { useState } from "react";

import { DownOutlined, RightOutlined } from "@ant-design/icons";

const JsonValue: React.FC<{
  level?: number;
  parentKey?: string;
  value: unknown;
}> = ({ level = 0, parentKey: _parentKey, value }) => {
  // 根节点默认折叠，子节点展开 2 层，整体效果更接近 Chrome 控制台
  const [isExpanded, setIsExpanded] = useState(level > 0 && level < 3);

  const indent = level * 16;

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

    const preview = value.length === 1 ? "1 item" : `${value.length} items`;

    return (
      <span>
        <span
          className="json-toggle"
          style={{ cursor: "pointer", userSelect: "none", marginRight: 4 }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
        </span>
        <span className="json-bracket">[</span>
        {isExpanded ? (
          <>
            <div style={{ marginLeft: indent + 16 }}>
              {value.map((item, index) => (
                <div key={index} className="json-line">
                  <JsonValue level={level + 1} value={item} />
                  {index < value.length - 1 && <span className="json-comma">,</span>}
                </div>
              ))}
            </div>
            <div style={{ marginLeft: indent }}>
              <span className="json-bracket">]</span>
            </div>
          </>
        ) : (
          <span className="json-preview">{preview}</span>
        )}
        {!isExpanded && <span className="json-bracket">]</span>}
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

    const preview = entries.length === 1 ? "1 property" : `${entries.length} properties`;

    return (
      <span>
        <span
          className="json-toggle"
          style={{ cursor: "pointer", userSelect: "none", marginRight: 4 }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
        </span>
        <span className="json-brace">{`{`}</span>
        {isExpanded ? (
          <>
            <div style={{ marginLeft: indent + 16 }}>
              {entries.map(([key, val], index) => (
                <div key={key} className="json-line">
                  <span className="json-key">"{key}"</span>
                  <span className="json-colon">: </span>
                  <JsonValue level={level + 1} parentKey={key} value={val} />
                  {index < entries.length - 1 && <span className="json-comma">,</span>}
                </div>
              ))}
            </div>
            <div style={{ marginLeft: indent }}>
              <span className="json-brace">{`}`}</span>
            </div>
          </>
        ) : (
          <span className="json-preview">{preview}</span>
        )}
        {!isExpanded && <span className="json-brace">{`}`}</span>}
      </span>
    );
  }

  return <span>{String(value)}</span>;
};

export default JsonValue;
