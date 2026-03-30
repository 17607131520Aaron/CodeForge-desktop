import React, { useState } from "react";

import { BugOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Input, Row, Space, Tag, Typography, message } from "antd";

import JsonPreviewPro from "@/components/JsonPreviewPro";

const { Text, Title } = Typography;
const { TextArea } = Input;

const SAMPLE_JSON = `{
  "name": "JSON Viewer Pro Demo",
  "meta": {
    "version": "1.0.0",
    "enabled": true,
    "tags": ["viewer", "debug", "chrome-style"]
  },
  "users": [
    { "id": 1, "nickname": "alice", "active": true },
    { "id": 2, "nickname": "bob", "active": false }
  ],
  "stats": {
    "requests": 12904,
    "latencyMs": 43.6,
    "errorRate": 0.012
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

