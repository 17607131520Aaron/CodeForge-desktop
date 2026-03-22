import React from "react";

import { Outlet } from "react-router-dom";

import { Layout } from "antd";
const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
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
      />

      <Layout style={{ height: "100%", overflow: "hidden" }}>
        <Header />
        <Content className="asp-comprehension-home-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
