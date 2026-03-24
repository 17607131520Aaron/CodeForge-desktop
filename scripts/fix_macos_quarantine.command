#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$(find "$SCRIPT_DIR" -maxdepth 1 -name "*.app" -print -quit)"

if [[ -z "${APP_PATH:-}" ]]; then
  echo "未找到 .app 文件。"
  echo "请把本脚本和 .app 放在同一目录后再运行。"
  read -r -p "按回车退出..."
  exit 1
fi

echo "正在移除隔离属性: $APP_PATH"
xattr -cr "$APP_PATH"

echo "已完成，正在打开应用..."
open "$APP_PATH"

echo "如果仍提示安全限制，请在 Finder 中右键应用 -> 打开。"
read -r -p "按回车退出..."
