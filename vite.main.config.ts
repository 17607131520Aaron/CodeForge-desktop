import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    // 使用 esbuild 压缩（更快）
    minify: "esbuild",
    rollupOptions: {
      // bufferutil 和 utf-8-validate 是 ws 的可选原生依赖，用于性能优化
      // 但它们不是必需的，可以保持为 external（如果不存在也不会报错）
      external: ["bufferutil", "utf-8-validate"],
      output: {
        // 优化文件命名
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
      },
    },
    // 生产环境禁用 source map
    sourcemap: process.env["NODE_ENV"] !== "production",
  },
  optimizeDeps: {
    // ws 需要被打包进应用，所以不在这里排除
    exclude: ["bufferutil", "utf-8-validate"],
  },
});
