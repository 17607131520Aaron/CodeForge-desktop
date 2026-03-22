import React from "react";

import { Outlet } from "react-router-dom";

import { Layout, Menu } from "antd";

import useApp from "./userApp";
import "./index.scss";
const { Sider, Content } = Layout;

const App: React.FC = () => {

  const { filteredMenuItems, handleMenuClick, handleOpenChange } = useApp();

  return (
    <Layout className="asp-comprehension-home" style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        collapsible
        breakpoint="md"
        className="asp-comprehension-home-menu"
        collapsed={false}
        collapsedWidth={80}
        trigger={null}
        width={240}
      >
        <Menu
          className="asp-comprehension-home-menu-content"
          items={filteredMenuItems}
          mode="inline"
          theme="light"
          onClick={handleMenuClick}
          onOpenChange={handleOpenChange}
        />
      </Sider>

      <Layout style={{ height: "100%", overflow: "hidden" }}>
        <Content className="asp-comprehension-home-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
