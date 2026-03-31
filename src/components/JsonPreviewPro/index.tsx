import React, { useMemo, useState } from "react";

import { CopyOutlined, DownOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Segmented, Space, Tag, Tooltip, message } from "antd";

import "./index.scss";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type JsonPreviewProProps = {
  value: unknown;
  defaultExpandDepth?: number;
  maxHeight?: number;
  variant?: "default" | "inline";
  outerVariant?: "card" | "plain";
  showToolbar?: boolean;
  onExpandedChange?: () => void;
};

const ROOT_PATH = "$";

const isObject = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCollapsible = (value: JsonValue): boolean => Array.isArray(value) || isObject(value);

const isUrl = (str: string): boolean => /^https?:\/\//.test(str);

// Match JSONPath-ish path style used by JSON Viewer Pro:
// - valid identifier: $.a
// - otherwise: $["full name"]
const generatePath = (base: string, key: string): string => {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return `${base}.${key}`;
  }
  return `${base}[${JSON.stringify(key)}]`;
};

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const parseJsonLike = (value: unknown): { parsed: JsonValue | null; error: string | null; raw: string } => {
  if (typeof value === "string") {
    const raw = value;
    const trimmed = raw.trim();
    if (!trimmed) {return { parsed: null, error: null, raw };}
    try {
      return { parsed: JSON.parse(trimmed) as JsonValue, error: null, raw };
    } catch (error) {
      return {
        parsed: null,
        error: `JSON 解析失败: ${error instanceof Error ? error.message : "unknown error"}`,
        raw,
      };
    }
  }

  return { parsed: value as JsonValue, error: null, raw: safeStringify(value) };
};

const collectDefaultExpanded = (value: JsonValue, depth: number, path: string, set: Set<string>): void => {
  if (!isCollapsible(value)) {return;}
  if (depth <= 0) {return;}
  set.add(path);

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDefaultExpanded(item, depth - 1, `${path}[${index}]`, set));
    return;
  }

  if (isObject(value)) {
    Object.entries(value).forEach(([key, item]) => {
      collectDefaultExpanded(item, depth - 1, generatePath(path, key), set);
    });
  }
};

// Plugin behavior: auto-collapse large nodes at depth > 1 and count > 10.
const collectAutoCollapsedPaths = (value: JsonValue, level: number, path: string, set: Set<string>): void => {
  if (!isCollapsible(value)) {return;}

  const count = Array.isArray(value) ? value.length : Object.keys(value).length;
  if (level > 1 && count > 10) {
    set.add(path);
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => collectAutoCollapsedPaths(item, level + 1, `${path}[${idx}]`, set));
  } else {
    Object.entries(value).forEach(([key, item]) => {
      collectAutoCollapsedPaths(item, level + 1, generatePath(path, key), set);
    });
  }
};

const highlightText = (text: string, keyword: string): React.ReactNode => {
  if (!keyword.trim()) {return text;}
  const lower = text.toLowerCase();
  const k = keyword.toLowerCase();
  const index = lower.indexOf(k);
  if (index < 0) {return text;}

  const head = text.slice(0, index);
  const hit = text.slice(index, index + keyword.length);
  const tail = text.slice(index + keyword.length);
  return (
    <>
      {head}
      <mark>{hit}</mark>
      {tail}
    </>
  );
};

const JsonNode: React.FC<{
  depth: number;
  expanded: Set<string>;
  keyword: string;
  copiedId: string | null;
  onToggle: (path: string) => void;
  onNodeCopy: (id: string, text: string) => void;
  path: string;
  propKey?: string | number;
  value: JsonValue;
}> = ({ depth, expanded, keyword, copiedId, onToggle, onNodeCopy, path, propKey, value }) => {
  const collapsible = isCollapsible(value);
  const isExpanded = expanded.has(path);

  const indentStyle = { paddingLeft: `${depth * 16}px` };

  if (!collapsible) {
    const valueClass =
      typeof value === "string"
        ? "jvp-value-string"
        : typeof value === "number"
          ? "jvp-value-number"
          : typeof value === "boolean"
            ? "jvp-value-boolean"
            : "jvp-value-null";

    const copyId = `value:${path}`;
    return (
      <div className="jvp-row jvp-primitive" style={indentStyle}>
        <span className="jvp-toggle-placeholder" />
        {propKey !== undefined && <span className="jvp-key">{highlightText(JSON.stringify(propKey), keyword)}: </span>}
        <span className={valueClass}>
          {typeof value === "string" && isUrl(value) ? (
            <a className="jvp-link" href={value} target="_blank" rel="noopener noreferrer">
              {highlightText(JSON.stringify(value), keyword)}
            </a>
          ) : (
            highlightText(typeof value === "string" ? JSON.stringify(value) : String(value), keyword)
          )}
        </span>
        <button
          className="jvp-copy-path"
          title={`Copy: ${path}`}
          onClick={(e) => {
            e.stopPropagation();
            onNodeCopy(copyId, typeof value === "string" ? value : JSON.stringify(value));
          }}
        >
          {copiedId === copyId ? "✓" : "\u2398"}
        </button>
      </div>
    );
  }

  const summary = Array.isArray(value) ? `Array(${value.length})` : `Object(${isObject(value) ? Object.keys(value).length : 0})`;
  const bracketOpen = Array.isArray(value) ? "[" : "{";
  const bracketClose = Array.isArray(value) ? "]" : "}";

  return (
    <>
      <div className="jvp-row jvp-collapsible" style={indentStyle}>
        <button className="jvp-toggle-btn" onClick={() => onToggle(path)}>
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </button>
        {propKey !== undefined && <span className="jvp-key">{highlightText(JSON.stringify(propKey), keyword)}: </span>}
        <span className="jvp-bracket">{bracketOpen}</span>
        {!isExpanded && <span className="jvp-summary">{summary}</span>}
        {/*
          Plugin behavior: each collapsible node should offer "copy path".
          This is hidden by default and becomes visible on hover via CSS.
        */}
        <button
          className="jvp-copy-path"
          title={`Copy path: ${path}`}
          onClick={(e) => {
            e.stopPropagation();
            onNodeCopy(`path:${path}`, path);
          }}
        >
          {copiedId === `path:${path}` ? "✓" : "\u2398"}
        </button>
        <span className="jvp-bracket">{!isExpanded ? bracketClose : ""}</span>
      </div>

      {isExpanded &&
        (Array.isArray(value)
          ? value.map((item, idx) => (
              <JsonNode
                key={`${path}[${idx}]`}
                depth={depth + 1}
                expanded={expanded}
                keyword={keyword}
                copiedId={copiedId}
                onToggle={onToggle}
                onNodeCopy={onNodeCopy}
                path={`${path}[${idx}]`}
                propKey={idx}
                value={item}
              />
            ))
          : isObject(value)
            ? Object.entries(value).map(([k, item]) => (
                <JsonNode
                  key={generatePath(path, k)}
                  depth={depth + 1}
                  expanded={expanded}
                  keyword={keyword}
                  copiedId={copiedId}
                  onToggle={onToggle}
                  onNodeCopy={onNodeCopy}
                  path={generatePath(path, k)}
                  propKey={k}
                  value={item}
                />
              ))
            : null)}

      {isExpanded && (
        <div className="jvp-row" style={indentStyle}>
          <span className="jvp-toggle-placeholder" />
          <span className="jvp-bracket">{bracketClose}</span>
        </div>
      )}
    </>
  );
};

const JsonPreviewPro: React.FC<JsonPreviewProProps> = ({
  value,
  defaultExpandDepth = 2,
  maxHeight = 520,
  variant = "default",
  outerVariant = "card",
  showToolbar,
  onExpandedChange,
}) => {
  const resolvedVariant = variant;
  const showToolbarEffective = showToolbar ?? resolvedVariant === "default";
  const outerVariantEffective = outerVariant;

  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "raw">("tree");
  const { parsed, error, raw } = useMemo(() => parseJsonLike(value), [value]);

  React.useEffect(() => {
    if (!showToolbarEffective) {
      setViewMode("tree");
    }
  }, [showToolbarEffective]);

  const defaultExpanded = useMemo(() => {
    if (parsed === null) {return new Set<string>();}
    const set = new Set<string>();
    collectDefaultExpanded(parsed, defaultExpandDepth, ROOT_PATH, set);
    const autoCollapsed = new Set<string>();
    collectAutoCollapsedPaths(parsed, 0, ROOT_PATH, autoCollapsed);
    autoCollapsed.forEach((p) => set.delete(p));
    return set;
  }, [defaultExpandDepth, parsed]);

  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded);

  React.useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const prettyText = useMemo(() => {
    if (parsed === null) {
      return "";
    }
    return safeStringify(parsed);
  }, [parsed]);

  const searchInfo = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const matchedPaths = new Set<string>();
    const ancestorsToExpand = new Set<string>();

    if (!parsed || !k) {
      return { matchedPaths, ancestorsToExpand };
    }

    const walk = (
      val: JsonValue,
      currentPath: string,
      keyValue: string | number | undefined,
      ancestors: string[],
    ): void => {
      const keyText = keyValue === undefined ? null : JSON.stringify(keyValue);
      const selfKeyMatch = keyText !== null && keyText.toLowerCase().includes(k);

      if (!isCollapsible(val)) {
        const valueText =
          typeof val === "string" ? JSON.stringify(val) : val === null ? "null" : String(val);
        const selfValueMatch = valueText.toLowerCase().includes(k);
        if (selfKeyMatch || selfValueMatch) {
          matchedPaths.add(currentPath);
          ancestors.forEach((a) => ancestorsToExpand.add(a));
        }
        return;
      }

      if (selfKeyMatch) {
        matchedPaths.add(currentPath);
        ancestors.forEach((a) => ancestorsToExpand.add(a));
      }

      if (Array.isArray(val)) {
        val.forEach((item, idx) => {
          walk(item, `${currentPath}[${idx}]`, idx, [...ancestors, currentPath]);
        });
      } else {
        Object.entries(val).forEach(([childKey, item]) => {
          const childPath = generatePath(currentPath, childKey);
          walk(item, childPath, childKey, [...ancestors, currentPath]);
        });
      }
    };

    walk(parsed, ROOT_PATH, undefined, []);

    return { matchedPaths, ancestorsToExpand };
  }, [keyword, parsed]);

  React.useEffect(() => {
    // Plugin behavior: search expands ancestors of matched nodes and doesn't auto-collapse when keyword clears.
    if (!keyword.trim()) {
      return;
    }
    if (searchInfo.ancestorsToExpand.size === 0) {
      return;
    }

    setExpanded((prev) => {
      const next = new Set(prev);
      searchInfo.ancestorsToExpand.forEach((p) => next.add(p));
      return next;
    });
  }, [keyword, searchInfo.ancestorsToExpand]);

  const triggerExpandedChange = (): void => {
    if (!onExpandedChange) {
      return;
    }
    window.requestAnimationFrame(() => {
      onExpandedChange?.();
    });
  };

  const onToggle = (path: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {next.delete(path);}
      else {next.add(path);}
      return next;
    });
    triggerExpandedChange();
  };

  const handleCopy = async (): Promise<void> => {
    try {
      const textToCopy = parsed === null ? raw : prettyText;
      await navigator.clipboard.writeText(textToCopy);
      message.success("已复制 JSON");
    } catch {
      message.error("复制失败");
    }
  };

  const onNodeCopy = async (id: string, text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedId(null), 1200);
    } catch {
      message.error("复制失败");
    }
  };

  const handleExpandAll = (): void => {
    if (!parsed) {return;}
    const all = new Set<string>();
    collectDefaultExpanded(parsed, Number.MAX_SAFE_INTEGER, ROOT_PATH, all);
    setExpanded(all);
    triggerExpandedChange();
  };

  const handleCollapseAll = (): void => {
    // Collapse all collapsible nodes (including root)
    setExpanded(new Set<string>());
    triggerExpandedChange();
  };

  if (error) {
    return (
      <div className={`json-preview-pro ${outerVariantEffective === "plain" ? "jvp-plain" : ""}`}>
        {showToolbarEffective && (
          <div className="jvp-toolbar">
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              复制原文
            </Button>
          </div>
        )}
        <pre className="jvp-error">{error}</pre>
        <pre className="jvp-raw">{raw}</pre>
      </div>
    );
  }

  if (parsed === null) {
    return (
      <div className={`json-preview-pro ${outerVariantEffective === "plain" ? "jvp-plain" : ""}`}>
        {showToolbarEffective && (
          <div className="jvp-toolbar">
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              复制
            </Button>
          </div>
        )}
        <div className="jvp-empty">暂无 JSON 内容</div>
      </div>
    );
  }

  return (
    <div className={`json-preview-pro ${outerVariantEffective === "plain" ? "jvp-plain" : ""}`}>
      {showToolbarEffective && (
        <div className="jvp-toolbar">
          <Space wrap>
            <Input
              allowClear
              placeholder="搜索 key / value"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Segmented
              options={[
                { label: "Tree", value: "tree" },
                { label: "Raw", value: "raw" },
              ]}
              value={viewMode}
              onChange={(v) => setViewMode(v as "tree" | "raw")}
            />
            <Tooltip title="展开全部节点">
              <Button onClick={handleExpandAll}>展开全部</Button>
            </Tooltip>
            <Tooltip title="收起全部节点">
              <Button onClick={handleCollapseAll}>收起全部</Button>
            </Tooltip>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              复制 JSON
            </Button>
            {keyword.trim() && (
              <Tag color="blue">
                匹配 {searchInfo.matchedPaths.size} 个节点
              </Tag>
            )}
          </Space>
        </div>
      )}

      <div className={showToolbarEffective ? "jvp-body" : "jvp-body jvp-body-inline"} style={showToolbarEffective ? { maxHeight } : undefined}>
        {showToolbarEffective && viewMode === "raw" ? (
          <pre className="jvp-raw">{safeStringify(parsed)}</pre>
        ) : (
          <JsonNode
            depth={0}
            keyword={keyword}
            onToggle={onToggle}
            copiedId={copiedId}
            onNodeCopy={onNodeCopy}
            path={ROOT_PATH}
            expanded={expanded}
            value={parsed}
          />
        )}
      </div>
    </div>
  );
};

export default JsonPreviewPro;

