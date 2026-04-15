#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:-}"
DEFAULT_APP_NAME="AI助理调试工具.app"

print_usage() {
  echo "Usage:"
  echo "  ./scripts/fix_macos_quarantine.command /path/to/YourApp.app"
  echo "  ./scripts/fix_macos_quarantine.command    # auto-detect in current folder"
}

if [[ -z "${APP_PATH}" ]]; then
  if [[ -d "./${DEFAULT_APP_NAME}" ]]; then
    APP_PATH="./${DEFAULT_APP_NAME}"
  else
    CANDIDATE="$(/usr/bin/find . -maxdepth 1 -type d -name "*.app" | /usr/bin/head -n 1 || true)"
    if [[ -n "${CANDIDATE}" ]]; then
      APP_PATH="${CANDIDATE}"
    fi
  fi
fi

if [[ -z "${APP_PATH}" ]]; then
  echo "Cannot locate .app bundle automatically."
  print_usage
  exit 1
fi

if [[ ! -d "${APP_PATH}" ]]; then
  echo "App bundle not found: ${APP_PATH}"
  print_usage
  exit 1
fi

echo "Target app: ${APP_PATH}"
echo "Removing quarantine attribute..."
/usr/bin/xattr -rd com.apple.quarantine "${APP_PATH}" || true

echo "Applying ad-hoc signature (for unsigned local builds)..."
/usr/bin/codesign --force --deep --sign - "${APP_PATH}"

echo "Verifying signature..."
/usr/bin/codesign --verify --deep --strict --verbose=2 "${APP_PATH}"

echo ""
echo "Fix complete. Try launching the app again."
echo "If macOS still blocks it, run once:"
echo "  open \"${APP_PATH}\""
