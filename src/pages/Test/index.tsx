import React, { useMemo, useState } from "react";

import { BugOutlined, ClearOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Divider, Input, Row, Segmented, Space, Switch, Tabs, Tag, Typography } from "antd";

type LogItem = {
  ts: number;
  type: "info" | "event" | "error";
  message: string;
};

const { Paragraph, Text, Title } = Typography;

function formatTs(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

const TestPage: React.FC = () => {
  const [caseKey, setCaseKey] = useState<"antd-input" | "placeholder">("antd-input");
  const [value, setValue] = useState<string>("");
  const [disabled, setDisabled] = useState<boolean>(false);
  const [showExtra, setShowExtra] = useState<boolean>(true);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const pushLog = (type: LogItem["type"], message: string): void => {
    setLogs((prev) => [{ ts: Date.now(), type, message }, ...prev].slice(0, 200));
  };

  const header = useMemo(() => {
    return (
      <Space align="center" size={10} wrap>
        <BugOutlined />
        <Title level={4} style={{ margin: 0 }}>
          Test / 组件测试台
        </Title>
        <Tag color="blue">/test</Tag>
      </Space>
    );
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 16 } }} title={header}>
        <Alert
          message="这个页面用于单独挂载组件做功能验证"
          description={
            <div>
              <Paragraph style={{ marginBottom: 0 }}>
                你可以把要测试的组件挂到下面的「挂载自定义组件」标签页里，配合左侧控件调 props、观察事件日志。
              </Paragraph>
            </div>
          }
          showIcon
          type="info"
        />

        <Divider />

        <Row gutter={[12, 12]}>
          <Col lg={8} md={10} sm={24} xs={24}>
            <Card
              size="small"
              style={{ borderRadius: 12 }}
              title={
                <Space size={8}>
                  <PlayCircleOutlined />
                  <Text strong>控制台</Text>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }} size={10}>
                <div>
                  <Text type="secondary">测试用例</Text>
                  <div style={{ marginTop: 6 }}>
                    <Segmented
                      block
                      options={[
                        { label: "示例：Input", value: "antd-input" },
                        { label: "挂载自定义组件", value: "placeholder" },
                      ]}
                      value={caseKey}
                      onChange={(v) => setCaseKey(v as typeof caseKey)}
                    />
                  </div>
                </div>

                <Divider style={{ margin: "8px 0" }} />

                <div>
                  <Text type="secondary">Props / 状态</Text>
                  <Space direction="vertical" style={{ width: "100%", marginTop: 6 }} size={10}>
                    <div>
                      <Text>disabled</Text>
                      <div style={{ marginTop: 6 }}>
                        <Switch checked={disabled} onChange={(checked) => setDisabled(checked)} />
                      </div>
                    </div>

                    <div>
                      <Text>showExtra</Text>
                      <div style={{ marginTop: 6 }}>
                        <Switch checked={showExtra} onChange={(checked) => setShowExtra(checked)} />
                      </div>
                    </div>

                    <div>
                      <Text>value</Text>
                      <div style={{ marginTop: 6 }}>
                        <Input
                          allowClear
                          placeholder="用于示例组件的受控 value"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                        />
                      </div>
                    </div>
                  </Space>
                </div>

                <Divider style={{ margin: "8px 0" }} />

                <Space wrap>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={() => {
                      setLogs([]);
                      pushLog("info", "已清空日志");
                    }}
                  >
                    清空日志
                  </Button>
                  <Button
                    onClick={() => {
                      setValue("");
                      setDisabled(false);
                      setShowExtra(true);
                      pushLog("info", "已重置状态");
                    }}
                  >
                    重置状态
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>

          <Col lg={16} md={14} sm={24} xs={24}>
            <Card size="small" style={{ borderRadius: 12 }} title={<Text strong>预览区</Text>}>
              <Tabs
                items={[
                  {
                    key: "preview",
                    label: "组件预览",
                    children: (
                      <div style={{ display: "grid", gap: 12 }}>
                        {caseKey === "antd-input" ? (
                          <Card size="small" style={{ borderRadius: 12 }} title="示例：受控 Input + 事件日志">
                            <Space direction="vertical" style={{ width: "100%" }}>
                              <Input
                                disabled={disabled}
                                placeholder="在这里输入，右侧会记录事件"
                                value={value}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setValue(next);
                                  pushLog("event", `onChange(value="${next}")`);
                                }}
                                onFocus={() => pushLog("event", "onFocus()")}
                                onBlur={() => pushLog("event", "onBlur()")}
                                onPressEnter={() => pushLog("event", "onPressEnter()")}
                              />
                              {showExtra && (
                                <Alert
                                  showIcon
                                  type="success"
                                  message="你可以用这个结构快速替换成要测试的组件"
                                  description={
                                    <Text type="secondary">
                                      把这里的 Input 换成你的组件，然后用左侧开关/输入框控制 props。
                                    </Text>
                                  }
                                />
                              )}
                            </Space>
                          </Card>
                        ) : (
                          <Card size="small" style={{ borderRadius: 12 }} title="挂载自定义组件（把你的组件放这里）">
                            <Alert
                              showIcon
                              type="warning"
                              message="请在此处引入并渲染你要测试的组件"
                              description={
                                <div>
                                  <Paragraph style={{ marginBottom: 8 }}>
                                    例如在本文件顶部加入：<Text code>import MyWidget from "@/components/MyWidget"</Text>
                                  </Paragraph>
                                  <Paragraph style={{ marginBottom: 0 }}>
                                    然后在这里渲染：<Text code>{`<MyWidget disabled={disabled} value={value} />`}</Text>
                                  </Paragraph>
                                </div>
                              }
                            />
                          </Card>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "logs",
                    label: `事件日志 (${logs.length})`,
                    children: (
                      <div style={{ maxHeight: 420, overflow: "auto", display: "grid", gap: 8 }}>
                        {logs.length === 0 ? (
                          <Text type="secondary">暂无日志。对组件进行操作后，这里会显示事件记录。</Text>
                        ) : (
                          logs.map((l) => (
                            <div
                              key={`${l.ts}-${l.message}`}
                              style={{
                                border: "1px solid #f0f0f0",
                                borderRadius: 10,
                                padding: "8px 10px",
                                background: "#fff",
                              }}
                            >
                              <Space size={10} wrap>
                                <Tag color={l.type === "error" ? "red" : l.type === "event" ? "green" : "default"}>
                                  {l.type}
                                </Tag>
                                <Text type="secondary">{formatTs(l.ts)}</Text>
                                <Text>{l.message}</Text>
                              </Space>
                            </div>
                          ))
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TestPage;

