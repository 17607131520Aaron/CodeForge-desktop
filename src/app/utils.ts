import { menuItems } from "./constants";

import type { IFlatMenuItem, MenuItemType } from "./types";
// 过滤菜单项（用于树形菜单）
export const filterMenuItems = (items: typeof menuItems, searchText: string): typeof menuItems => {
  if (!searchText.trim()) {
    return items;
  }

  const filtered: typeof menuItems = [];

  items?.forEach((item: MenuItemType | null | string | undefined) => {
    if (!item || typeof item === "string" || item.type === "divider") {
      return;
    }

    const label = "label" in item && item.label ? item.label.toString().toLowerCase() : "";
    const searchLower = searchText.toLowerCase();

    // 如果是一级菜单，检查自身和子菜单
    if ("children" in item && item.children) {
      const filteredChildren = item.children.filter((child: MenuItemType | null | string | undefined) => {
        if (!child || typeof child === "string" || child.type === "divider") {
          return false;
        }
        const childLabel = "label" in child && child.label ? child.label.toString().toLowerCase() : "";
        return childLabel.includes(searchLower);
      });

      // 如果父菜单标题匹配或子菜单有匹配项，则保留
      if (label.includes(searchLower) || filteredChildren.length > 0) {
        filtered.push({
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : item.children,
        });
      }
    } else {
      // 没有子菜单的项，直接检查标题
      if (label.includes(searchLower)) {
        filtered.push(item);
      }
    }
  });

  return filtered;
};

// 扁平化菜单项，用于搜索结果展示
export const flattenMenuItems = (items: typeof menuItems, searchText: string): IFlatMenuItem[] => {
  const result: IFlatMenuItem[] = [];
  const searchLower = searchText.toLowerCase();

  items?.forEach((item) => {
    if (!item || typeof item === "string" || item.type === "divider") {
      return;
    }

    const label = "label" in item && item.label ? item.label.toString() : "";
    const labelLower = label.toLowerCase();

    // 如果是一级菜单，检查自身和子菜单
    if ("children" in item && item.children) {
      // 检查子菜单
      item.children.forEach((child: MenuItemType | null | string | undefined) => {
        if (!child || typeof child === "string" || child.type === "divider") {
          return;
        }
        const childLabel = "label" in child && child.label ? child.label.toString() : "";
        const childLabelLower = childLabel.toLowerCase();

        // 如果子菜单匹配
        if (childLabelLower.includes(searchLower)) {
          result.push({
            key: child.key as string,
            label: childLabel,
            parentLabel: label,
            icon: "icon" in child ? child.icon : undefined,
          });
        }
      });

      // 如果父菜单本身也匹配，且父菜单有实际路径（可点击），才添加到结果中
      if (labelLower.includes(searchLower) && item.key && typeof item.key === "string" && item.key.startsWith("/")) {
        result.push({
          key: item.key as string,
          label,
          icon: "icon" in item ? item.icon : undefined,
        });
      }
    } else {
      // 没有子菜单的项，直接检查标题
      if (labelLower.includes(searchLower)) {
        result.push({
          key: item.key as string,
          label,
          icon: "icon" in item ? item.icon : undefined,
        });
      }
    }
  });

  return result;
};

// 计算需要展开的菜单 keys
export const getKeysToOpen = (path: string): string[] => {
  const keysToOpen: string[] = [];

  menuItems?.forEach((item: MenuItemType | null | string | undefined) => {
    if (!item || typeof item === "string") {
      return;
    }

    if ("children" in item && item.children) {
      const hasMatch = item.children.some((child: MenuItemType | null | string | undefined) => {
        if (!child || typeof child === "string") {
          return false;
        }
        return child.key === path;
      });
      if (hasMatch && item.key) {
        keysToOpen.push(item.key as string);
      }
    }
  });

  return keysToOpen;
};
