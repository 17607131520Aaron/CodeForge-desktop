import React, { useMemo } from "react";

import { useNavigate } from "react-router-dom";

import {
  AppstoreOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  BugOutlined,
  FileTextOutlined,
  SettingOutlined,
  TeamOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Statistic, Typography } from "antd";
import ReactECharts from "echarts-for-react";

const { Title, Text } = Typography;

interface IQuickAction {
  bgColor: string;
  color: string;
  description: string;
  icon: React.ReactNode;
  key: string;
  path: string;
  title: string;
}

const quickActions: IQuickAction[] = [
  {
    bgColor: "#e6f7ff",
    color: "#1890ff",
    description: "查看系统数据统计和分析",
    icon: <BarChartOutlined />,
    key: "dashboard",
    path: "/dashboard/overview",
    title: "数据概览",
  },
  {
    bgColor: "#f6ffed",
    color: "#52c41a",
    description: "管理文档和分类",
    icon: <FileTextOutlined />,
    key: "documents",
    path: "/documents/list",
    title: "文档管理",
  },
  {
    bgColor: "#f9f0ff",
    color: "#722ed1",
    description: "成员、角色和部门管理",
    icon: <TeamOutlined />,
    key: "team",
    path: "/team/members",
    title: "团队管理",
  },
  {
    bgColor: "#fff7e6",
    color: "#fa8c16",
    description: "生成和管理条码",
    icon: <AppstoreOutlined />,
    key: "barcode",
    path: "/barcode/manage",
    title: "条码生成",
  },
  {
    bgColor: "#e6fffb",
    color: "#13c2c2",
    description: "系统配置和管理",
    icon: <SettingOutlined />,
    key: "settings",
    path: "/settings/basic",
    title: "系统设置",
  },
  {
    bgColor: "#fff0f6",
    color: "#eb2f96",
    description: "服务通APP调试工具",
    icon: <BugOutlined />,
    key: "debug",
    path: "/smartserviceappDebug/debuglogs",
    title: "调试工具",
  },
];

// Mock数据
const mockStats = {
  barcodeGrowth: 23.1,
  documentGrowth: 12.5,
  memberGrowth: 8.3,
  systemUptime: 127,
  todayBarcodes: 1248,
  totalDocuments: 8562,
  totalTeamMembers: 156,
};

// 最近30天的数据趋势
const last30DaysData = [
  { 访问: 820, name: "1", 条码: 125, 文档: 320 },
  { 访问: 880, name: "2", 条码: 132, 文档: 342 },
  { 访问: 910, name: "3", 条码: 128, 文档: 365 },
  { 访问: 950, name: "4", 条码: 141, 文档: 378 },
  { 访问: 920, name: "5", 条码: 135, 文档: 362 },
  { 访问: 860, name: "6", 条码: 122, 文档: 348 },
  { 访问: 890, name: "7", 条码: 138, 文档: 376 },
  { 访问: 1020, name: "8", 条码: 152, 文档: 395 },
  { 访问: 1080, name: "9", 条码: 168, 文档: 412 },
  { 访问: 1050, name: "10", 条码: 145, 文档: 388 },
  { 访问: 1120, name: "11", 条码: 175, 文档: 425 },
  { 访问: 1150, name: "12", 条码: 182, 文档: 438 },
  { 访问: 1180, name: "13", 条码: 195, 文档: 452 },
  { 访问: 1200, name: "14", 条码: 188, 文档: 445 },
  { 访问: 1160, name: "15", 条码: 178, 文档: 432 },
  { 访问: 1220, name: "16", 条码: 205, 文档: 468 },
  { 访问: 1250, name: "17", 条码: 218, 文档: 485 },
  { 访问: 1280, name: "18", 条码: 225, 文档: 498 },
  { 访问: 1320, name: "19", 条码: 238, 文档: 512 },
  { 访问: 1350, name: "20", 条码: 245, 文档: 528 },
  { 访问: 1380, name: "21", 条码: 252, 文档: 542 },
  { 访问: 1420, name: "2天", 条码: 268, 文档: 558 },
  { 访问: 1450, name: "23", 条码: 275, 文档: 572 },
  { 访问: 1480, name: "24", 条码: 282, 文档: 588 },
  { 访问: 1520, name: "25", 条码: 295, 文档: 605 },
  { 访问: 1550, name: "26", 条码: 308, 文档: 622 },
  { 访问: 1580, name: "27", 条码: 315, 文档: 638 },
  { 访问: 1620, name: "28", 条码: 328, 文档: 655 },
  { 访问: 1650, name: "29", 条码: 335, 文档: 672 },
  { 访问: 1680, name: "30", 条码: 348, 文档: 688 },
];

// 文档分类数据（优化配色）
const documentCategoryData = [
  { color: "#1890ff", gradient: ["#1890ff", "#096dd9"], name: "技术文档", value: 2850 },
  { color: "#52c41a", gradient: ["#52c41a", "#389e0d"], name: "业务文档", value: 2420 },
  { color: "#fa8c16", gradient: ["#fa8c16", "#d46b08"], name: "设计文档", value: 1880 },
  { color: "#722ed1", gradient: ["#722ed1", "#531dab"], name: "产品文档", value: 1250 },
  { color: "#eb2f96", gradient: ["#eb2f96", "#c41d7f"], name: "运营文档", value: 980 },
  { color: "#13c2c2", gradient: ["#13c2c2", "#08979c"], name: "其他文档", value: 182 },
];

// 部门成员分布数据
const departmentData = [
  { name: "研发部", 成员: 48 },
  { name: "产品部", 成员: 32 },
  { name: "设计部", 成员: 24 },
  { name: "运营部", 成员: 28 },
  { name: "市场部", 成员: 18 },
  { name: "人事部", 成员: 12 },
  { name: "财务部", 成员: 10 },
  { name: "行政部", 成员: 8 },
];

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleQuickActionClick = (path: string): void => {
    navigate(path);
  };

  // 计算文档总数
  const totalDocumentValue = useMemo(() => {
    return documentCategoryData.reduce((sum, item) => sum + item.value, 0);
  }, []);

  return (
    <div style={{ padding: 12 }}>
      {/* 欢迎横幅 */}
      <Card
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          borderRadius: 12,
          marginBottom: 24,
        }}
        styles={{ body: { padding: "40px 32px" } }}
      >
        <div style={{ color: "#fff" }}>
          <Title
            level={2}
            style={{
              color: "#fff",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            欢迎使用管理系统
          </Title>
          <Text style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 16 }}>
            这里是您的系统首页，您可以快速访问各个功能模块
          </Text>
        </div>
      </Card>

      {/* 数据统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col lg={6} md={12} sm={24} xl={6} xs={24}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              precision={0}
              prefix={<ArrowUpOutlined style={{ fontSize: 16 }} />}
              suffix="个"
              title="文档总数"
              value={mockStats.totalDocuments}
              styles={{ content: { color: "#1890ff", fontSize: 28, fontWeight: 600 } }}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12 }} type="secondary">
                较上月增长 {mockStats.documentGrowth}%
              </Text>
            </div>
          </Card>
        </Col>
        <Col lg={6} md={12} sm={24} xl={6} xs={24}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              precision={0}
              prefix={<ArrowUpOutlined style={{ fontSize: 16 }} />}
              suffix="人"
              title="团队成员"
              value={mockStats.totalTeamMembers}
              styles={{ content: { color: "#52c41a", fontSize: 28, fontWeight: 600 } }}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12 }} type="secondary">
                较上月增长 {mockStats.memberGrowth}%
              </Text>
            </div>
          </Card>
        </Col>
        <Col lg={6} md={12} sm={24} xl={6} xs={24}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              precision={0}
              prefix={<ArrowUpOutlined style={{ fontSize: 16 }} />}
              suffix="个"
              title="今日生成条码"
              value={mockStats.todayBarcodes}
              styles={{ content: { color: "#fa8c16", fontSize: 28, fontWeight: 600 } }}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12 }} type="secondary">
                较昨日增长 {mockStats.barcodeGrowth}%
              </Text>
            </div>
          </Card>
        </Col>
        <Col lg={6} md={12} sm={24} xl={6} xs={24}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              precision={0}
              suffix="天"
              title="系统运行时长"
              value={mockStats.systemUptime}
              styles={{ content: { color: "#722ed1", fontSize: 28, fontWeight: 600 } }}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12 }} type="secondary">
                系统运行稳定
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 数据趋势图 - 使用面积图+折线图组合 */}
        <Col lg={16} md={24} sm={24} xl={16} xs={24}>
          <Card
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" }}
            styles={{ body: { padding: "24px" } }}
            title={
              <Title level={5} style={{ color: "#1f2937", fontWeight: 600, margin: 0 }}>
                最近30天数据趋势
              </Title>
            }
          >
            <ReactECharts
              option={{
                animation: true,
                animationDuration: 1000,
                animationEasing: "cubicOut",
                tooltip: {
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderColor: "#e8e8e8",
                  borderWidth: 1,
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  padding: [12, 16],
                  textStyle: { color: "#1f2937", fontSize: 14 },
                  trigger: "axis",
                  axisPointer: {
                    type: "cross",
                    label: { backgroundColor: "#6a7985" },
                  },
                },
                legend: {
                  data: ["访问", "条码", "文档"],
                  textStyle: { color: "#595959", fontSize: 12 },
                  top: 10,
                  itemGap: 20,
                },
                grid: {
                  left: "3%",
                  right: "4%",
                  bottom: "15%",
                  top: "15%",
                  containLabel: true,
                },
                xAxis: {
                  data: last30DaysData.map((item) => item.name),
                  type: "category",
                  boundaryGap: false,
                  axisLine: { lineStyle: { color: "#e8e8e8" } },
                  axisLabel: { color: "#8c8c8c", fontSize: 11, rotate: 45, interval: 0 },
                  axisTick: { show: false },
                },
                yAxis: {
                  type: "value",
                  axisLine: { lineStyle: { color: "#e8e8e8" } },
                  axisLabel: { color: "#8c8c8c", fontSize: 12 },
                  splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
                },
                series: [
                  {
                    name: "访问",
                    type: "line",
                    smooth: true,
                    data: last30DaysData.map((item) => item.访问),
                    areaStyle: {
                      color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: "rgba(250, 140, 22, 0.4)" },
                          { offset: 1, color: "rgba(250, 140, 22, 0)" },
                        ],
                      },
                    },
                    itemStyle: { color: "#fa8c16" },
                    lineStyle: { color: "#fa8c16", width: 3 },
                    symbol: "circle",
                    symbolSize: 6,
                    emphasis: {
                      focus: "series",
                      itemStyle: { borderColor: "#fff", borderWidth: 2 },
                    },
                  },
                  {
                    name: "条码",
                    type: "line",
                    smooth: true,
                    data: last30DaysData.map((item) => item.条码),
                    areaStyle: {
                      color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: "rgba(82, 196, 26, 0.4)" },
                          { offset: 1, color: "rgba(82, 196, 26, 0)" },
                        ],
                      },
                    },
                    itemStyle: { color: "#52c41a" },
                    lineStyle: { color: "#52c41a", width: 3 },
                    symbol: "circle",
                    symbolSize: 6,
                    emphasis: {
                      focus: "series",
                      itemStyle: { borderColor: "#fff", borderWidth: 2 },
                    },
                  },
                  {
                    name: "文档",
                    type: "line",
                    smooth: true,
                    data: last30DaysData.map((item) => item.文档),
                    areaStyle: {
                      color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: "rgba(24, 144, 255, 0.4)" },
                          { offset: 1, color: "rgba(24, 144, 255, 0)" },
                        ],
                      },
                    },
                    itemStyle: { color: "#1890ff" },
                    lineStyle: { color: "#1890ff", width: 3 },
                    symbol: "circle",
                    symbolSize: 6,
                    emphasis: {
                      focus: "series",
                      itemStyle: { borderColor: "#fff", borderWidth: 2 },
                    },
                  },
                ],
              }}
              opts={{ renderer: "svg" }}
              style={{ height: "400px", width: "100%" }}
            />
          </Card>
        </Col>

        {/* 文档分类饼图 - 优化样式 */}
        <Col lg={8} md={24} sm={24} xl={8} xs={24}>
          <Card
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" }}
            styles={{ body: { padding: "24px" } }}
            title={
              <Title level={5} style={{ color: "#1f2937", fontWeight: 600, margin: 0 }}>
                文档分类分布
              </Title>
            }
          >
            <ReactECharts
              option={{
                animation: true,
                animationDuration: 1000,
                animationEasing: "cubicOut",
                tooltip: {
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderColor: "#e8e8e8",
                  borderWidth: 1,
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  padding: [12, 16],
                  textStyle: { color: "#1f2937", fontSize: 14 },
                  formatter: "{b}: {c} 个 ({d}%)",
                },
                series: [
                  {
                    name: "文档分类",
                    type: "pie",
                    radius: ["40%", "70%"],
                    center: ["50%", "50%"],
                    avoidLabelOverlap: true,
                    itemStyle: {
                      borderRadius: 4,
                      borderColor: "#fff",
                      borderWidth: 2,
                    },
                    label: {
                      show: true,
                      formatter: (params: { name: string; percent?: number }) => {
                        if (params.percent && params.percent < 5) {
                          return "";
                        }
                        return `${params.name}\n${params.percent ? params.percent.toFixed(0) : 0}%`;
                      },
                      fontSize: 12,
                      color: "#595959",
                    },
                    labelLine: {
                      show: false,
                    },
                    emphasis: {
                      label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: "bold",
                      },
                      itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: "rgba(0, 0, 0, 0.3)",
                      },
                    },
                    data: documentCategoryData.map((item) => ({
                      name: item.name,
                      value: item.value,
                      itemStyle: {
                        color: {
                          type: "linear",
                          x: 0,
                          y: 0,
                          x2: 1,
                          y2: 1,
                          colorStops: [
                            { offset: 0, color: item.gradient[0] },
                            { offset: 1, color: item.gradient[1] },
                          ],
                        },
                      },
                    })),
                    animationType: "scale",
                    animationEasing: "elasticOut",
                    animationDelay: (idx: number) => idx * 100,
                  },
                ],
              }}
              opts={{ renderer: "svg" }}
              style={{ height: "240px", width: "100%" }}
            />
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Statistic
                suffix="个"
                title="文档总数"
                value={totalDocumentValue}
                styles={{ content: { color: "#1f2937", fontSize: 20, fontWeight: 600 } }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 部门成员分布柱状图 - 优化样式 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" }}
            styles={{ body: { padding: "24px" } }}
            title={
              <Title level={5} style={{ color: "#1f2937", fontWeight: 600, margin: 0 }}>
                部门成员分布
              </Title>
            }
          >
            <ReactECharts
              option={{
                animation: true,
                animationDuration: 1000,
                animationEasing: "cubicOut",
                tooltip: {
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderColor: "#e8e8e8",
                  borderWidth: 1,
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  padding: [12, 16],
                  textStyle: { color: "#1f2937", fontSize: 14 },
                  formatter: (params: { name: string; value: number }) => {
                    return `${params.name}<br/>成员数: ${params.value} 人`;
                  },
                  trigger: "axis",
                  axisPointer: {
                    type: "shadow",
                  },
                },
                grid: {
                  left: "3%",
                  right: "4%",
                  bottom: "3%",
                  top: "5%",
                  containLabel: true,
                },
                xAxis: {
                  data: departmentData.map((item) => item.name),
                  type: "category",
                  axisLine: { lineStyle: { color: "#e8e8e8" } },
                  axisLabel: { color: "#8c8c8c", fontSize: 12 },
                  axisTick: { show: false },
                },
                yAxis: {
                  type: "value",
                  axisLine: { lineStyle: { color: "#e8e8e8" } },
                  axisLabel: { color: "#8c8c8c", fontSize: 12 },
                  splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
                },
                series: [
                  {
                    name: "成员数",
                    type: "bar",
                    data: departmentData.map((item) => item.成员),
                    barWidth: "60%",
                    itemStyle: {
                      color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: "#722ed1" },
                          { offset: 1, color: "#9254de" },
                        ],
                      },
                      borderRadius: [8, 8, 0, 0],
                    },
                    emphasis: {
                      itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: "rgba(114, 46, 209, 0.5)",
                      },
                    },
                    label: {
                      show: true,
                      position: "top",
                      color: "#722ed1",
                      fontSize: 12,
                      fontWeight: 600,
                    },
                    animationDelay: (idx: number) => idx * 100,
                  },
                ],
              }}
              opts={{ renderer: "svg" }}
              style={{ height: "400px", width: "100%" }}
            />
          </Card>
        </Col>
      </Row>

      <div>
        <Title level={4} style={{ color: "#1f2937", fontWeight: 600, marginBottom: 16 }}>
          快捷入口
        </Title>
        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col key={action.key} lg={8} md={12} sm={24} xl={8} xs={24}>
              <Card
                hoverable
                style={{
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                styles={{
                  body: { padding: "24px" },
                }}
                onClick={() => handleQuickActionClick(action.path)}
              >
                <div style={{ alignItems: "flex-start", display: "flex", gap: 16 }}>
                  <div
                    style={{
                      alignItems: "center",
                      backgroundColor: action.bgColor,
                      borderRadius: 12,
                      color: action.color,
                      display: "flex",
                      fontSize: 24,
                      height: 48,
                      justifyContent: "center",
                      width: 48,
                      flexShrink: 0,
                    }}
                  >
                    {action.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Title
                      level={5}
                      style={{
                        alignItems: "center",
                        color: "#1f2937",
                        display: "flex",
                        fontWeight: 600,
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span>{action.title}</span>
                      <RightOutlined style={{ color: "#bfbfbf", fontSize: 14 }} />
                    </Title>
                    <Text style={{ fontSize: 14 }} type="secondary">
                      {action.description}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default Home;
