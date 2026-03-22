import React from "react";

import { Spin } from "antd";

import "./index.scss";

const LoadingFallback: React.FC = () => {
  return (
    <div className="loading-fallback">
      <Spin spinning size="large" tip="页面加载中...">
        <div className="loading-fallback-placeholder" />
      </Spin>
    </div>
  );
};

export default LoadingFallback;
