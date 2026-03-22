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
    // 生产环境禁用 source map
    sourcemap: process.env["NODE_ENV"] !== "production",
  },
});
