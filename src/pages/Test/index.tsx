import React, { useState } from "react";

import { BugOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Input, Row, Space, Tag, Typography, message } from "antd";

import JsonPreviewPro from "@/components/JsonPreviewPro";

const { Text, Title } = Typography;
const { TextArea } = Input;

// 覆盖尽可能多的 JSON 类型和边界情况（字符串/数字/布尔/null/数组/对象/空对象/空数组/URL/Unicode/特殊 key）
const SAMPLE_JSON = `{
  "name": "JSON Viewer Pro Demo",
  "version": 1,
  "enabled": true,
  "count": 0,
  "nullValue": null,
  "emptyObj": {},
  "emptyArr": [],
  "simpleString": "hello",
  "multilineString": "line1\\nline2",
  "longString": "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "url": "https://example.com/path/to/resource?query=abc#hash",
  "emoji": "I love \\u2764\\uFE0F",
  "unicode": "\\u4F60\\u597D", 

  "meta": {
    "build": "2026-03-30",
    "enabled": false,
    "tags": ["viewer", "debug", "tree", "search", "copy"],
    "nested": {
      "a.b": 123,
      "full name": "Aaron",
      "0key": "starts with number",
      "foo-bar": "dash key",
      "_private": "underscore key",
      "$ref": "dollar key"
    }
  },

  "users": [
    { "id": 1, "nickname": "alice", "active": true, "role": null },
    { "id": 2, "nickname": "bob", "active": false, "role": "admin" },
    { "id": 3, "nickname": "charlie", "active": true, "role": "viewer" }
  ],

  "mixedArray": [
    "str",
    42,
    false,
    null,
    { "deep key": { "x.y": [1, 2, 3], "empty": {} } }
  ],

  "bigArray": [
    1,2,3,4,5,6,7,8,9,10,
    11,12,13,14,15,16,17,18,19,20,
    21,22,23,24,25,26,27,28,29,30,
    31,32,33,34,35,36,37,38,39,40
  ],

  "stats": {
    "requests": 12904,
    "latencyMs": 43.6,
    "errorRate": 0.012,
    "smallNumbers": [0, 0.001, -2]
  }
}`;

const TestPage: React.FC = () => {
  const [source, setSource] = useState<string>(SAMPLE_JSON);

  const handleFormat = (): void => {
    try {
      const parsed = JSON.parse(source);
      setSource(JSON.stringify(parsed, null, 2));
      message.success("格式化成功");
    } catch {
      message.error("当前内容不是合法 JSON，无法格式化");
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <Card
        style={{ borderRadius: 12 }}
        title={
          <Space align="center" size={10}>
            <BugOutlined />
            <Title level={4} style={{ margin: 0 }}>
              JSON 预览组件测试页
            </Title>
            <Tag color="blue">/test</Tag>
          </Space>
        }
      >
        <Alert
          showIcon
          type="info"
          message="已重写为全新 JSON 预览组件演示页"
          description="支持树形折叠、搜索高亮、展开/收起全部、复制 JSON、Raw/Tree 切换。"
        />

        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          <Col lg={10} md={24} sm={24} xs={24}>
            <Card size="small" title={<Text strong>输入 JSON</Text>} style={{ borderRadius: 12 }}>
              <Space style={{ marginBottom: 10 }} wrap>
                <Button onClick={() => setSource(SAMPLE_JSON)}>填充示例</Button>
                <Button onClick={handleFormat}>格式化</Button>
                <Button onClick={() => setSource("")}>清空</Button>
              </Space>
              <TextArea
                autoSize={{ minRows: 20, maxRows: 26 }}
                placeholder="粘贴 JSON 字符串"
                spellCheck={false}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </Card>
          </Col>

          <Col lg={14} md={24} sm={24} xs={24}>
            <Card size="small" title={<Text strong>预览效果</Text>} style={{ borderRadius: 12 }}>
              <JsonPreviewPro defaultExpandDepth={2} value={source} />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TestPage;

