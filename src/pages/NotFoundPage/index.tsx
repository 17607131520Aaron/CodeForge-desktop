import React from "react";

import { useNavigate } from "react-router-dom";

import { ArrowLeftOutlined, HomeOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import "./index.scss";

const { Paragraph } = Typography;

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  // 重试：刷新当前页面
  const handleRetry = (): void => {
    window.location.reload();
  };

  // 返回上一页
  const handleGoBack = (): void => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // 如果没有历史记录，则返回首页
      navigate("/");
    }
  };

  // 返回首页
  const handleGoHome = (): void => {
    navigate("/");
  };

  return (
    <div className="not-found-page">
      <div className="not-found-page-background">
        <div className="bg-pattern bg-pattern-1" />
        <div className="bg-pattern bg-pattern-2" />
        <div className="bg-pattern bg-pattern-3" />
      </div>
      <div className="not-found-page-container">
        <div className="not-found-page-illustration">
          <div className="illustration-wrapper">
            <div className="illustration-person">
              <div className="person-head" />
              <div className="person-body" />
              <div className="person-box" />
            </div>
            <div className="illustration-question-mark">
              <svg className="question-svg" viewBox="0 0 100 100">
                <path
                  d="M50 10 C30 10, 15 25, 15 45 C15 55, 20 60, 30 60 L35 60 L35 70 L50 70 L50 60 L40 60 C35 60, 30 55, 30 50 C30 40, 35 35, 45 35 C55 35, 60 40, 60 50 L75 50 C75 30, 60 15, 50 15 Z"
                  fill="currentColor"
                />
                <circle cx="50" cy="80" fill="currentColor" r="5" />
              </svg>
            </div>
            <div className="illustration-network">
              <div className="network-node network-node-1" />
              <div className="network-node network-node-2" />
              <div className="network-node network-node-3" />
              <div className="network-node network-node-4" />
              <div className="network-line network-line-1" />
              <div className="network-line network-line-2" />
              <div className="network-line network-line-3" />
            </div>
            <div className="illustration-plant">
              <div className="plant-pot" />
              <div className="plant-leaf plant-leaf-1" />
              <div className="plant-leaf plant-leaf-2" />
              <div className="plant-leaf plant-leaf-3" />
            </div>
          </div>
        </div>
        <div className="not-found-content">
          <div className="not-found-title">404</div>
          <div className="not-found-subtitle">抱歉，您访问的页面不存在</div>
          <div className="not-found-actions">
            <Paragraph className="not-found-page-description">页面可能已被删除、移动或暂时不可用</Paragraph>
            <Space wrap className="not-found-buttons" size="large">
              <Button
                className="not-found-page-button-retry"
                icon={<ReloadOutlined />}
                size="large"
                type="primary"
                onClick={handleRetry}
              >
                重试
              </Button>
              <Button
                className="not-found-page-button-back"
                icon={<ArrowLeftOutlined />}
                size="large"
                onClick={handleGoBack}
              >
                返回上一页
              </Button>
              <Button
                className="not-found-page-button-home"
                icon={<HomeOutlined />}
                size="large"
                onClick={handleGoHome}
              >
                返回首页
              </Button>
            </Space>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
