import React, { useEffect, useRef, useState } from "react";

import { Outlet, useLocation } from "react-router-dom";

import { AppstoreOutlined, SearchOutlined } from "@ant-design/icons";
import { Input, Layout, List, Menu, Spin } from "antd";

import PerformanceMonitor from "@/components/PerformanceMonitorWrapper";

import useApp from "./userApp";

import type { IFlatMenuItem } from "./types";

import "./index.scss";
const { Sider, Content } = Layout;

const App: React.FC = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFirstRenderRef = useRef(true);

  // 区分首次刷新与路由内跳转，首次渲染展示"页面刷新中"
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      setIsRefreshing(true);
      setIsLoading(true);
      const timer = window.setTimeout(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      }, 350);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  // 路由切换时展示短暂加载态，优化页面切换反馈
  useEffect(() => {
    if (isFirstRenderRef.current) {
      return undefined;
    }
    setIsRefreshing(false);
    setIsLoading(true);
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

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

          {/* <div>底部用户内容</div> */}
        </div>
      </Sider>

      <Layout className="comprehension-content" style={{ height: "100%", overflow: "hidden" }}>
        <Content className="comprehension-content-contentPages">
          <div className="wrapper">
            <Spin
              className="comprehension-content-spin"
              size="large"
              spinning={isLoading}
              style={{ height: "100%", flex: 1 }}
              tip={isRefreshing ? "页面刷新中..." : "页面加载中..."}
            >
              <div className="comprehension-content-spin-inner">
                <PerformanceMonitor enableConsoleLog id={`Page-${location.pathname}`}>
                  <div className="comprehension-content-route-host">
                    <Outlet />
                  </div>
                </PerformanceMonitor>
              </div>
            </Spin>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
