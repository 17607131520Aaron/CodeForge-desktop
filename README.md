# CodeForge Desktop

一个基于 `Electron Forge + Vite + React + TypeScript` 构建的桌面调试工具项目，当前主要用于日志查看与网络请求监控。

## 项目简介

项目以 Electron 作为桌面容器，渲染层使用 React 与 Ant Design，主进程在应用启动后会同时拉起本地 WebSocket 服务，供外部应用接入并推送调试数据。

从当前代码状态来看，这个仓库已经具备可继续演进的桌面调试工具骨架，重点能力集中在：

- 日志调试页面
- 网络监控页面
- 本地 WebSocket 日志服务
- 基础桌面壳、菜单和页面路由

首页目前仍保留部分演示模板内容，更多是占位性质，而不是最终业务界面。

## 当前功能

### 1. 日志调试

- 连接本地日志服务
- 展示连接状态
- 支持日志级别筛选
- 支持关键字搜索
- 支持清空日志
- 使用虚拟列表渲染大批量日志

### 2. 网络监控

- 连接本地监控服务
- 展示请求列表
- 支持按请求方法筛选
- 支持按成功/失败状态筛选
- 支持关键字过滤
- 支持暂停/继续记录
- 支持查看请求详情

### 3. 桌面端能力

- Electron 主进程启动桌面窗口
- 使用 Vite 构建主进程、preload 和 renderer
- 支持 Electron Forge 打包与发布流程

## 技术栈

- Electron Forge
- Vite
- React 19
- TypeScript
- Ant Design
- react-router-dom
- zustand
- Dexie / IndexedDB
- ECharts
- ws
- socket.io-client

## 运行方式

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm start
```

### 其他常用命令

```bash
pnpm lint
pnpm package
pnpm make
```

## 本地服务说明

应用启动后会在主进程中启动本地 WebSocket 日志服务，默认配置如下：

- 端口：`8082`
- 路径：`/logs`

服务代码位于 `src/server/log-server/`，主要负责：

- 接收客户端发送的日志消息
- 转发日志到已连接页面
- 管理连接与断开
- 处理广播队列与基础容错

## 项目结构

```text
.
├── forge.config.ts
├── package.json
├── src
│   ├── main.ts
│   ├── preload.ts
│   ├── renderer.tsx
│   ├── app
│   ├── components
│   ├── hooks
│   ├── pages
│   │   ├── Home
│   │   ├── DebugLogs
│   │   └── Netword
│   ├── routers
│   ├── server/log-server
│   ├── store
│   └── utils
└── 项目介绍.md
```

## 当前现状

当前仓库还有一些明显的过渡状态，后续建议逐步整理：

- `package.json` 中的项目描述仍是默认占位文案
- 首页包含较多 mock 数据和模板化内容
- 首页部分入口路由与实际注册路由不完全一致
- UI 文案中仍有“某某调试工具”等占位名称
- `src/pages/Netword` 存在目录拼写问题，可在后续重构时修正

## 后续建议

- 补充日志协议和网络协议说明
- 将首页替换为真实业务入口
- 完善应用命名、图标和产品文案
- 增加发布流程和环境变量说明
- 视需要补充截图、联调方式和接入示例

## 补充文档

更详细的中文项目介绍见：[项目介绍.md](./项目介绍.md)
