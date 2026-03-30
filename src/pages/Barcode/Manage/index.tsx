import React, { useMemo, useState } from "react";

import { Button, Card, Col, Form, Input, InputNumber, message, Row, Select, Space, Typography } from "antd";
import Barcode from "react-barcode";

import { CODE_TYPES } from "./constants";
import { generateCodeId, generateRandomValueByType, validateValueByType } from "./utils";

import type { CodeType, IGeneratedCode } from "./constants";
import "./index.scss";

const { Title, Text } = Typography;

const CAOLIAO_QR_CREATE_URL = "https://api.2dcode.biz/v1/create-qr-code";

type CaoliaoQrErrorCorrection = "L" | "M" | "Q" | "H";
type CaoliaoQrSettings = {
  size: string; // e.g. "400x400"
  errorCorrection: CaoliaoQrErrorCorrection;
  border: number; // quiet zone / border in QR "modules"
  version?: number; // QR version (may be ignored by API)
};

const buildCaoliaoQrSvgUrl = (value: string, settings: CaoliaoQrSettings): string => {
  const params = new URLSearchParams({
    data: value,
    size: settings.size,
    format: "svg",
    error_correction: settings.errorCorrection,
    border: String(settings.border),
    ...(typeof settings.version === "number" ? { version: String(settings.version) } : {}),
  });
  return `${CAOLIAO_QR_CREATE_URL}?${params.toString()}`;
};

const parseSizeToPx = (size: string, fallback: number): number => {
  // Accept "400x400" or "400"
  const firstPart = size.split("x")[0]?.trim();
  const n = Number.parseInt(firstPart || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const BarcodeManage: React.FC = () => {
  const [form] = Form.useForm();
  const [codes, setCodes] = useState<IGeneratedCode[]>([]);

  const lastType = Form.useWatch<CodeType>("type", form) || "QRCODE";
  const qrErrorCorrection =
    Form.useWatch<CaoliaoQrErrorCorrection>("qrErrorCorrection", form) ?? ("H" satisfies CaoliaoQrErrorCorrection);
  const qrSize = Form.useWatch<string>("qrSize", form) ?? "120x120";
  const qrBorder = Form.useWatch<number>("qrBorder", form) ?? 2;
  const qrVersion = Form.useWatch<number>("qrVersion", form);
  const qrSizePx = useMemo(() => parseSizeToPx(qrSize, 120), [qrSize]);

  const hasData = useMemo(() => codes.length > 0, [codes]);

  const qrVersionOptions = useMemo(() => {
    // QR version => matrix size: 21 + (v - 1) * 4
    const max = 10; // UI intentionally limited; can extend later
    return Array.from({ length: max }).map((_, idx) => {
      const v = idx + 1;
      const dim = 21 + (v - 1) * 4;
      return { label: `${v} (${dim}*${dim})`, value: v };
    });
  }, []);

  const handleGenerate = (): void => {
    form
      .validateFields(["type", "count"])
      .then((values) => {
        const { type, count } = values as { type: CodeType; count: number };

        if (count <= 0) {
          message.warning("生成数量必须大于 0");
          return;
        }

        if (count > 100) {
          message.warning("一次最多生成 100 个条码，请适当减少数量");
          return;
        }

        const list: IGeneratedCode[] = Array.from({ length: count }).map(() => ({
          id: generateCodeId(),
          type,
          value: generateRandomValueByType(type as CodeType),
        }));

        setCodes(list);
        message.success(`已生成 ${count} 个条码`);
      })
      .catch(() => {
        // ignore
      });
  };

  const handleGenerateFromValue = (): void => {
    form
      .validateFields(["type", "customValue"])
      .then((values) => {
        const { type, customValue } = values as {
          type: CodeType;
          customValue: string;
        };

        const lines: string[] = (customValue || "")
          .split(/\r?\n/)
          .map((v) => v.trim())
          .filter((v): v is string => !!v);

        if (lines.length === 0) {
          // 避免输入无效时仍保留旧的渲染结果
          setCodes([]);
          message.warning("请输入需要生成条码的内容");
          return;
        }

        if (lines.length > 100) {
          // 避免输入无效时仍保留旧的渲染结果
          setCodes([]);
          message.warning("一次最多根据 100 行内容生成条码，请适当减少行数");
          return;
        }

        // 每行一个内容，完全按照输入生成，不再使用“生成数量”
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] as string;
          const err = validateValueByType(type, line);
          if (err) {
            // 避免某一行校验失败时仍保留旧的渲染结果
            setCodes([]);
            message.error(`第 ${i + 1} 行：${err}`);
            return;
          }
        }

        const list: IGeneratedCode[] = lines.map((v) => ({
          id: generateCodeId(),
          type,
          value: v,
        }));

        setCodes(list);
        message.success(`已根据内容生成 ${lines.length} 个条码`);
      })
      .catch(() => {
        // 表单校验失败时也清理旧结果，避免误以为已生成
        setCodes([]);
      });
  };

  const handleClear = (): void => {
    setCodes([]);
  };

  const handleCopyAll = async (): Promise<void> => {
    if (!hasData) {
      message.info("当前没有需要导出的条码数据");
      return;
    }

    const text = codes.map((item) => `${item.type}: ${item.value}`).join("\n");

    try {
      await navigator.clipboard.writeText(text);
      message.success("已将条码内容复制到剪贴板");
    } catch {
      message.error("复制失败，请手动选择并复制内容");
    }
  };

  return (
    <div className="barcode-manage-page">
      <Title level={3}>条码管理</Title>
      <Text type="secondary">通过选择条码类型与数量，一键随机生成多个条码，可用于测试或打印前预览。</Text>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 16,
          flex: 1,
          minHeight: 0,
          alignItems: "stretch",
        }}
      >
        <div style={{ width: 420, flexShrink: 0 }}>
          <Card
            size="small"
            style={{ height: "100%", borderRadius: 8 }}
            styles={{ body: { paddingBottom: 12, paddingTop: 16 } }}
            title="条码生成"
          >
            <Form
              form={form}
              initialValues={{
                type: "QRCODE" as CodeType,
                count: 10,
                customValue: "",
                qrErrorCorrection: "H" as CaoliaoQrErrorCorrection,
                qrSize: "120x120",
                qrBorder: 2,
                qrVersion: 1,
              }}
              layout="vertical"
            >
              <Form.Item label="条码类型" name="type" rules={[{ required: true, message: "请选择条码类型" }]}>
                <Select options={CODE_TYPES} placeholder="请选择条码类型" style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item label="生成数量" name="count" rules={[{ required: true, message: "请输入生成数量" }]}>
                <InputNumber max={100} min={1} placeholder="数量" style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item>
                <Space wrap>
                  <Button type="primary" onClick={handleGenerate}>
                    随机生成
                  </Button>
                  <Button disabled={!hasData} onClick={handleClear}>
                    清空结果
                  </Button>
                  <Button disabled={!hasData} onClick={handleCopyAll}>
                    导出文本（复制全部）
                  </Button>
                </Space>
              </Form.Item>

              <Form.Item
                label="指定内容"
                name="customValue"
                rules={[{ required: true, message: "请输入需要生成条码的内容" }]}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <Input.TextArea
                    allowClear
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    placeholder="在此输入字符串；支持多行输入，每行一个内容，换行可批量生成条码"
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12 }} type="secondary">
                      单行+数量：可按同一内容生成多个；多行：每行一个内容，忽略数量。
                    </Text>
                    <Button type="primary" onClick={handleGenerateFromValue}>
                      根据内容生成
                    </Button>
                  </div>
                </div>
              </Form.Item>

              {lastType === "QRCODE" ? (
                <>
                  <Form.Item label="容错率" name="qrErrorCorrection">
                    <Select
                      options={[
                        { label: "L（7%）", value: "L" },
                        { label: "M（15%）", value: "M" },
                        { label: "Q（25%）", value: "Q" },
                        { label: "H（30%）", value: "H" },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label="尺寸" name="qrSize">
                    <Select
                      options={[
                        { label: "120x120px", value: "120x120" },
                        { label: "256x256px", value: "256x256" },
                        { label: "300x300px", value: "300x300" },
                        { label: "400x400px", value: "400x400" },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label="码版" name="qrVersion">
                    <Select options={qrVersionOptions} />
                  </Form.Item>

                  <Form.Item label="码边距" name="qrBorder">
                    <Select
                      options={[0, 1, 2, 3, 4, 5].map((v) => ({
                        label: `${v}（${v} 个色块）`,
                        value: v,
                      }))}
                    />
                  </Form.Item>
                </>
              ) : null}
            </Form>
          </Card>
        </div>

        <Card
          className="barcode-manage-result-card-container"
          size="small"
          style={{
            borderRadius: 8,
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
          styles={{
            body: {
              paddingTop: 16,
              display: "flex",
              flexDirection: "column",
              // 关键：让内容区本身参与 flex 布局并启用内部滚动
              flex: 1,
              overflowY: "auto",
            },
          }}
          title={
            <Space size={12}>
              <span>生成结果</span>
              <Text type="secondary">当前类型：{CODE_TYPES.find((i) => i.value === lastType)?.label ?? lastType}</Text>
            </Space>
          }
        >
          {hasData ? (
            <>
              <Row gutter={[16, 16]}>
                {codes.map((item) => (
                  <Col key={item.id} lg={6} md={8} sm={12} xl={6} xs={24}>
                    <Card
                      size="small"
                      style={{ borderRadius: 8 }}
                      styles={{ body: { padding: "12px 8px 8px" } }}
                      variant="outlined"
                    >
                      {item.type === "QRCODE" ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "12px",
                            backgroundColor: "#ffffff",
                            borderRadius: 4,
                          }}
                        >
                          <img
                            src={buildCaoliaoQrSvgUrl(item.value, {
                              size: qrSize,
                              errorCorrection: qrErrorCorrection,
                              border: qrBorder,
                              version: qrVersion,
                            })}
                            alt="二维码"
                            width={qrSizePx}
                            height={qrSizePx}
                            loading="lazy"
                            style={{ display: "block" }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "12px 8px",
                            backgroundColor: "#ffffff",
                            borderRadius: 4,
                            minHeight: 100,
                          }}
                        >
                          <Barcode
                            displayValue
                            background="#ffffff"
                            fontSize={16}
                            format={item.type}
                            height={90}
                            lineColor="#000000"
                            margin={12}
                            textAlign="center"
                            textMargin={6}
                            textPosition="bottom"
                            value={item.value}
                            width={3}
                          />
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: 4,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <Text style={{ fontSize: 12 }} type="secondary">
                          类型：{item.type}
                        </Text>
                        <Text ellipsis style={{ fontSize: 12 }}>
                          内容：{item.value}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Text style={{ marginTop: 16, display: "block", fontSize: 12 }} type="secondary">
                提示：条码内容为随机生成，仅供测试或演示使用，如需正式使用请根据业务规则生成。
              </Text>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "#9ca3af",
              }}
            >
              <Text>暂无条码，请先在左侧配置并点击「随机生成」或「根据内容生成」。</Text>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BarcodeManage;
