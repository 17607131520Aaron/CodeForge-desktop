import type React from "react";

import type { MenuProps } from "antd";

// ==================== 菜单相关类型 ====================

/**
 * 扁平化菜单项类型，用于搜索结果展示
 */
export interface IFlatMenuItem {
  key: string;
  label: string;
  parentLabel?: string;
  icon?: React.ReactNode;
}

/**
 * MenuItem 类型别名
 */
export type MenuItemType = NonNullable<MenuProps["items"]>[number];

// ==================== Tabs 相关类型 ====================

/**
 * 标签项类型
 */
export interface ITabItem {
  key: string;
  label: string;
  path: string;
  closable?: boolean;
}

/**
 * Tabs Context 类型
 */
export interface ITabsContextType {
  tabs: ITabItem[];
  activeKey: string;
  refreshKey: string;
  refreshingKey: string | null;
  isTabSwitching: boolean;
  addTab: (path: string) => void;
  removeTab: (key: string) => void;
  setActiveTab: (key: string) => void;
  closeOtherTabs: (key: string) => void;
  closeAllTabs: () => void;
  refreshTab: (key: string) => void;
  setRefreshingKey: (key: string | null) => void;
  setIsTabSwitching: (value: boolean) => void;
}

// ==================== useApp Hook 相关类型 ====================

/**
 * useApp Hook 返回值类型
 */
export interface IUseAppReturn {
  // 状态
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  openKeys: string[];
  selectedKeys: string[];
  flatSearchResults: IFlatMenuItem[];
  filteredMenuItems: NonNullable<MenuProps["items"]>;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshKey: string;
  // 事件处理
  handleMenuClick: ({ key }: { key: string }) => void;
  handleOpenChange: (keys: string[]) => void;
  handleUserMenuClick: ({ key }: { key: string }) => void;
}
