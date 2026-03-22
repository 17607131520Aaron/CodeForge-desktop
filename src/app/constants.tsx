import {
  ApiOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from "@ant-design/icons";

import type { MenuProps } from "antd";
// 菜单项配置 - 支持一级和二级菜单
export const menuItems: NonNullable<MenuProps["items"]> = [
  {
    key: "/",
    icon: <HomeOutlined />,
    label: "首页",
  },
  // {
  //   key: "barcode",
  //   icon: <BarChartOutlined />,
  //   label: "条码管理",
  //   children: [
  //     {
  //       key: "/barcode/manage",
  //       icon: <BarChartOutlined />,
  //       label: "条码生成",
  //     },
  //   ],
  // },
  {
    key: "/debuglogs",
    icon: <UnorderedListOutlined />,
    label: "日志",
  },
  {
    key: "/network",
    icon: <ApiOutlined />,
    label: "网络",
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
