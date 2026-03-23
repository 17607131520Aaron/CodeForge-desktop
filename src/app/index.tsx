import React from "react";

import { Outlet } from "react-router-dom";

import { AppstoreOutlined, SearchOutlined } from "@ant-design/icons";
import { Input, Layout, List, Menu } from "antd";

import useApp from "./userApp";

import type { IFlatMenuItem } from "./types";

import "./index.scss";
const { Sider, Content } = Layout;

const App: React.FC = () => {
  const {
    openKeys,
    collapsed,
    searchValue,
    flatSearchResults,
    selectedKeys,
    filteredMenuItems,
    handleMenuClick,
    handleOpenChange,
    handleSearch,
    handleCollapse,
  } = useApp();

  //判断是否显示菜单列表
  const showMenuList = Boolean(searchValue.trim()) && !collapsed;

  return (
    <Layout className="comprehension-home">
      <Sider
        className="comprehension-menu"
        collapsible
        breakpoint="md"
        collapsed={collapsed}
        collapsedWidth={80}
        trigger={null}
        width={220}
        onBreakpoint={handleCollapse}
      >
        <div className="comprehension-menu-content">
          <div className="comprehension-menu-content-header">
            <div className="comprehension-menu-content-header-logo">
              <div className="comprehension-menu-content-header-logo-icon">
                <AppstoreOutlined />
              </div>
              {!collapsed && <span className="comprehension-menu-content-header-logo-title">某某调试工具</span>}
            </div>
          </div>
          <div className="comprehension-menu-content-search">
            {!collapsed ? (
              <Input
                allowClear
                placeholder="搜索菜单"
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
              />
            ) : (
              <div className="comprehension-menu-content-search-collapsed">
                <div className="comprehension-menu-content-search-icon" onClick={() => handleCollapse(false)}>
                  <SearchOutlined />
                </div>
              </div>
            )}
          </div>
          <div className="comprehension-menu-content-menu">
            {showMenuList ? (
              <div className="comprehension-menu-content-menu-results">
                <div className="comprehension-menu-content-menu-results-count">
                  共搜索到 {flatSearchResults.length} 项与"{searchValue}"相关的菜单
                </div>
                <List
                  className="comprehension-menu-content-menu-results-list"
                  dataSource={flatSearchResults as IFlatMenuItem[]}
                  renderItem={(item: IFlatMenuItem) => (
                    <List.Item
                      className={`comprehension-menu-content-menu-results-item ${
                        selectedKeys.includes(item.key) ? "comprehension-menu-content-menu-results-item-selected" : ""
                      }`}
                      onClick={() => {
                        if (item.key.startsWith("/")) {
                          handleMenuClick({ key: item.key });
                        }
                      }}
                    >
                      <div className="comprehension-menu-content-menu-results-content">
                        {item.icon && <span className="comprehension-menu-content-menu-results-icon">{item.icon}</span>}
                        <span className="comprehension-menu-content-menu-results-label">
                          {item.parentLabel ? `${item.parentLabel} / ${item.label}` : item.label}
                        </span>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            ) : (
              <Menu
                items={filteredMenuItems}
                mode="inline"
                openKeys={openKeys}
                selectedKeys={selectedKeys}
                theme="light"
                onClick={handleMenuClick}
                onOpenChange={handleOpenChange}
              />
            )}
          </div>

          <div>底部用户内容</div>
        </div>
      </Sider>

      <Layout className="comprehension-content" style={{ height: "100%", overflow: "hidden" }}>
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
