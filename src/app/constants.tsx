import {
  ApiOutlined,
  BugOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  UserOutlined,
  BarChartOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";

import type { MenuProps } from "antd";
// 菜单项配置 - 支持一级和二级菜单
export const menuItems: NonNullable<MenuProps["items"]> = [
  {
    key: "/",
    icon: <HomeOutlined />,
    label: "首页",
  },
  {
    key: "barcode",
    icon: <BarChartOutlined />,
    label: "条码管理",
    children: [
      {
        key: "/barcode/manage",
        icon: <BarChartOutlined />,
        label: "条码生成",
      },
    ],
  },
  {
    key: "rndebug",
    icon: <BugOutlined />,
    label: "react native调试工具",
    children: [
      {
        key: "/debuglogs",
        icon: <UnorderedListOutlined />,
        label: "js-log日志",
      },
      {
        key: "/network",
        icon: <ApiOutlined />,
        label: "network网络",
      },
    ],
  },
  {
    key: "devtools",
    icon: <ExperimentOutlined />,
    label: "开发与测试",
    children: [
      {
        key: "/test",
        icon: <ExperimentOutlined />,
        label: "组件测试台",
      },
    ],
  },
];

// 用户下拉菜单
export const userMenuItems: NonNullable<MenuProps["items"]> = [
  {
    key: "profile",
    icon: <UserOutlined />,
    label: "个人中心",
  },
  {
    key: "settings",
    icon: <SettingOutlined />,
    label: "账户设置",
  },
  {
    type: "divider",
  },
  {
    key: "logout",
    icon: <LogoutOutlined />,
    label: "退出登录",
    danger: true,
  },
];
