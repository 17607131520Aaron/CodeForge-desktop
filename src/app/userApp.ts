import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { menuItems } from "./constants";
import { filterMenuItems, getKeysToOpen } from "./utils";
const useApp = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);

  // 初始化时计算默认展开的菜单
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const path = location.pathname || "/";
    return getKeysToOpen(path);
  });

  const filteredMenuItems = filterMenuItems(menuItems, "");
  // 菜单点击处理
  const handleMenuClick = ({ key }: { key: string }): void => {
    // 只处理叶子节点（有实际路径的菜单项）
    if (key.startsWith("/")) {
      navigate(key);
    }
  };

  // 菜单展开/收起处理
  const handleOpenChange = (keys: string[]): void => {
    setOpenKeys(keys);
  };

  const handleSearch = (value: string): void => {
    setSearchValue(value);
  };

  const handleCollapse = (collapsed: boolean): void => {
    setCollapsed(collapsed);
  };

  // 用户菜单点击处理
  const handleUserMenuClick = ({ key }: { key: string }): void => {
    if (key === "logout") {
      // 处理退出登录逻辑
      // void logout().then(() => {
      //   navigate("/login", { replace: true });
      // });
    } else if (key === "profile") {
      // 处理个人中心跳转
      navigate("/profile");
    } else if (key === "settings") {
      // 处理账户设置跳转
      navigate("/settings/basic");
    }
  };

  return {
    collapsed,
    searchValue,
    openKeys,
    filteredMenuItems,
    handleSearch,
    handleMenuClick,
    handleOpenChange,
    handleUserMenuClick,
    handleCollapse,
  };
};

export default useApp;
