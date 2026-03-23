import React from "react";

import { Outlet } from "react-router-dom";

import { AppstoreOutlined, SearchOutlined } from "@ant-design/icons";
import { Layout, Menu, Input } from "antd";

import useApp from "./userApp";
import "./index.scss";
const { Sider, Content } = Layout;

const App: React.FC = () => {

  const { collapsed, searchValue, filteredMenuItems, handleMenuClick, handleOpenChange, handleSearch, handleCollapse } =
    useApp();

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
                <div className="comprehension-menu-content-search-icon">
                  <SearchOutlined />
                </div>
              </div>
            )}
          </div>
          <Menu
            items={filteredMenuItems}
            mode="inline"
            theme="light"
            onClick={handleMenuClick}
            onOpenChange={handleOpenChange}
            className="comprehension-menu-content-menu"
          />
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
