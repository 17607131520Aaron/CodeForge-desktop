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
};

type MatchSet = Set<string>;

const ROOT_PATH = "$";

const isObject = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCollapsible = (value: JsonValue): boolean => Array.isArray(value) || isObject(value);

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
    Object.entries(value).forEach(([key, item]) => collectDefaultExpanded(item, depth - 1, `${path}.${key}`, set));
  }
};

const collectSearchMatches = (value: JsonValue, path: string, keyword: string, matches: MatchSet): boolean => {
  const k = keyword.toLowerCase();
  let selfMatch = false;

  if (typeof value === "string") {selfMatch = value.toLowerCase().includes(k);}
  else if (typeof value === "number" || typeof value === "boolean" || value === null) {
    selfMatch = String(value).toLowerCase().includes(k);
  }

  if (selfMatch) {
    matches.add(path);
    return true;
  }

  if (Array.isArray(value)) {
    let childMatch = false;
    value.forEach((item, index) => {
      const p = `${path}[${index}]`;
      if (collectSearchMatches(item, p, keyword, matches)) {
        childMatch = true;
      }
    });
    if (childMatch) {matches.add(path);}
    return childMatch;
  }

  if (isObject(value)) {
    let childMatch = false;
    Object.entries(value).forEach(([key, item]) => {
      const p = `${path}.${key}`;
      const keyMatch = key.toLowerCase().includes(k);
      const valueMatch = collectSearchMatches(item, p, keyword, matches);
      if (keyMatch || valueMatch) {
        childMatch = true;
        matches.add(p);
      }
    });
    if (childMatch) {matches.add(path);}
    return childMatch;
  }

  return false;
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
  matches: MatchSet;
  onToggle: (path: string) => void;
  path: string;
  propKey?: string;
  value: JsonValue;
}> = ({ depth, expanded, keyword, matches, onToggle, path, propKey, value }) => {
  const collapsible = isCollapsible(value);
  const isExpanded = expanded.has(path);
  const showBySearch = keyword.trim() ? matches.has(path) : true;

  if (!showBySearch) {return null;}

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

    return (
      <div className="jvp-row" style={indentStyle}>
        <span className="jvp-toggle-placeholder" />
        {typeof propKey === "string" && <span className="jvp-key">{highlightText(`"${propKey}"`, keyword)}: </span>}
        <span className={valueClass}>
          {typeof value === "string" ? `"${highlightText(value, keyword)}"` : highlightText(String(value), keyword)}
        </span>
      </div>
    );
  }

  const summary = Array.isArray(value) ? `Array(${value.length})` : `Object(${isObject(value) ? Object.keys(value).length : 0})`;
  const bracketOpen = Array.isArray(value) ? "[" : "{";
  const bracketClose = Array.isArray(value) ? "]" : "}";

  return (
    <>
      <div className="jvp-row" style={indentStyle}>
        <button className="jvp-toggle-btn" onClick={() => onToggle(path)}>
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </button>
        {typeof propKey === "string" && <span className="jvp-key">{highlightText(`"${propKey}"`, keyword)}: </span>}
        <span className="jvp-bracket">{bracketOpen}</span>
        {!isExpanded && <span className="jvp-summary">{summary}</span>}
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
                matches={matches}
                onToggle={onToggle}
                path={`${path}[${idx}]`}
                value={item}
              />
            ))
          : isObject(value)
            ? Object.entries(value).map(([k, item]) => (
                <JsonNode
                  key={`${path}.${k}`}
                  depth={depth + 1}
                  expanded={expanded}
                  keyword={keyword}
                  matches={matches}
                  onToggle={onToggle}
                  path={`${path}.${k}`}
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

const JsonPreviewPro: React.FC<JsonPreviewProProps> = ({ value, defaultExpandDepth = 2, maxHeight = 520 }) => {
  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "raw">("tree");
  const { parsed, error, raw } = useMemo(() => parseJsonLike(value), [value]);

  const defaultExpanded = useMemo(() => {
    if (parsed === null) {return new Set<string>();}
    const set = new Set<string>();
    collectDefaultExpanded(parsed, defaultExpandDepth, ROOT_PATH, set);
    return set;
  }, [defaultExpandDepth, parsed]);

  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded);

  React.useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const matches = useMemo(() => {
    const set: MatchSet = new Set<string>();
    if (!parsed || !keyword.trim()) {return set;}
    collectSearchMatches(parsed, ROOT_PATH, keyword, set);
    return set;
  }, [keyword, parsed]);

  const effectiveExpanded = useMemo(() => {
    if (!keyword.trim()) {return expanded;}
    const merged = new Set<string>(expanded);
    matches.forEach((p) => {
      let current = p;
      while (current.includes(".")) {
        current = current.substring(0, current.lastIndexOf("."));
        merged.add(current);
      }
      while (current.includes("[")) {
        current = current.substring(0, current.lastIndexOf("["));
        merged.add(current);
      }
      merged.add(ROOT_PATH);
    });
    return merged;
  }, [expanded, keyword, matches]);

  const onToggle = (path: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {next.delete(path);}
      else {next.add(path);}
      return next;
    });
  };

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(raw);
      message.success("已复制 JSON");
    } catch {
      message.error("复制失败");
    }
  };

  const handleExpandAll = (): void => {
    if (!parsed) {return;}
    const all = new Set<string>();
    collectDefaultExpanded(parsed, Number.MAX_SAFE_INTEGER, ROOT_PATH, all);
    setExpanded(all);
  };

  const handleCollapseAll = (): void => {
    setExpanded(new Set<string>([ROOT_PATH]));
  };

  if (error) {
    return (
      <div className="json-preview-pro">
        <div className="jvp-toolbar">
          <Button icon={<CopyOutlined />} onClick={handleCopy}>
            复制原文
          </Button>
        </div>
        <pre className="jvp-error">{error}</pre>
        <pre className="jvp-raw">{raw}</pre>
      </div>
    );
  }

  if (parsed === null) {
    return (
      <div className="json-preview-pro">
        <div className="jvp-toolbar">
          <Button icon={<CopyOutlined />} onClick={handleCopy}>
            复制
          </Button>
        </div>
        <div className="jvp-empty">暂无 JSON 内容</div>
      </div>
    );
  }

  return (
    <div className="json-preview-pro">
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
          {keyword.trim() && <Tag color="blue">匹配 {Math.max(0, matches.size - 1)} 个节点</Tag>}
        </Space>
      </div>

      <div className="jvp-body" style={{ maxHeight }}>
        {viewMode === "raw" ? (
          <pre className="jvp-raw">{safeStringify(parsed)}</pre>
        ) : (
          <JsonNode
            depth={0}
            expanded={effectiveExpanded}
            keyword={keyword}
            matches={matches}
            onToggle={onToggle}
            path={ROOT_PATH}
            value={parsed}
          />
        )}
      </div>
    </div>
  );
};

export default JsonPreviewPro;

