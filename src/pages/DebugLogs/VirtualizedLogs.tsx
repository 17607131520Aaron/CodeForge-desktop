import React, { useEffect, useMemo, useRef } from "react";

import { AutoSizer, CellMeasurer, CellMeasurerCache, List, type ListRowProps, type ScrollParams } from "react-virtualized";

import CollapsibleJson from "./CollapsibleJson";
import { getLogLevelColor } from "./constants";

import type { DebugLogItem } from "./types";

type VirtualizedLogsProps = {
  logs: DebugLogItem[];
};

const OVERSCAN_ROW_COUNT = 20;

const VirtualizedLogs: React.FC<VirtualizedLogsProps> = ({ logs }) => {
  const listRef = useRef<List | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const cache = useMemo(
    () =>
      new CellMeasurerCache({
        defaultHeight: 36,
        fixedWidth: true,
        minHeight: 28,
      }),
    [],
  );

  useEffect(() => {
    cache.clearAll();
    listRef.current?.recomputeRowHeights();
  }, [cache, logs]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current || logs.length === 0) {
      return;
    }

    listRef.current?.scrollToRow(logs.length - 1);
  }, [logs.length]);

  const handleScroll = ({ clientHeight, scrollHeight, scrollTop }: ScrollParams) => {
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    shouldStickToBottomRef.current = distanceToBottom < 32;
  };

  const rowRenderer = ({ index, key, parent, style }: ListRowProps) => {
    const log = logs[index];
    if (!log) {
      return null;
    }

    return (
      <CellMeasurer cache={cache} columnIndex={0} key={key} parent={parent} rowIndex={index}>
        {({ measure, registerChild }) => (
          <div
            ref={registerChild}
            className="rn-debug-logs-item"
            data-level={log.level === "unknown" ? undefined : log.level}
            style={style}
          >
            <span className="rn-debug-logs-level" style={{ color: getLogLevelColor(log.level) }}>
              [{log.level.toUpperCase()}]
            </span>
            <span className="rn-debug-logs-message">
              <span style={{ color: "#858585", marginRight: 8 }}>{new Date(log.timestamp).toLocaleTimeString()} -</span>
              <CollapsibleJson message={log.message} onContentResize={measure} />
            </span>
          </div>
        )}
      </CellMeasurer>
    );
  };

  return (
    <div className="rn-debug-logs-container">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            deferredMeasurementCache={cache}
            height={height}
            overscanRowCount={OVERSCAN_ROW_COUNT}
            rowCount={logs.length}
            rowHeight={cache.rowHeight}
            rowRenderer={rowRenderer}
            width={width}
            onScroll={handleScroll}
          />
        )}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedLogs;
