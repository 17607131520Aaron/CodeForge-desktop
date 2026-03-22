import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
// 注意：Electron Forge 的 Vite 插件会自动处理 React 插件，无需手动导入
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    // 使用 esbuild 压缩（更快，但 terser 压缩率更高）
    // 如果需要更好的压缩率，可以改为 "terser" 并安装 terser
    minify: "esbuild",
    // 如果使用 terser，取消下面的注释
    // minify: "terser",
    // terserOptions: {
    //   compress: {
    //     drop_console: true,
    //     drop_debugger: true,
    //     dead_code: true,
    //     unused: true,
    //   },
    // },
    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动代码分割
        manualChunks: {
          // React 相关库单独打包
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Ant Design 单独打包
          "antd-vendor": ["antd", "@ant-design/icons"],
          // ECharts 单独打包（按需加载）
          "echarts-vendor": ["echarts", "echarts-for-react"],
          // 其他工具库
          "utils-vendor": ["axios", "dayjs", "zustand", "ahooks"],
        },
        // 优化 chunk 文件命名
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    // 启用 source map（开发环境）
    sourcemap: process.env["NODE_ENV"] !== "production",
    // 压缩 chunk 大小警告阈值（KB）
    chunkSizeWarningLimit: 1000,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "antd"],
  },
});
