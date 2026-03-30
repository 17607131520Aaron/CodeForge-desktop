import path from "node:path";

import { app, BrowserWindow, nativeImage, dialog, autoUpdater } from "electron";

import started from "electron-squirrel-startup";
import { updateElectronApp, UpdateSourceType } from "update-electron-app";

import { startLogServer, stopLogServer } from "./server/log-server";

// App metadata managed by scripts/update_app_meta.py
const APP_DISPLAY_NAME = "AI助理调试工具";
const APP_ICON_PATH = "src/assets/app_icon.jpg";
const APP_VERSION = "1.0.2";
const UPDATE_REPO = "17607131520Aaron/CodeForge-desktop";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const iconPath = path.resolve(app.getAppPath(), APP_ICON_PATH);

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: `${APP_DISPLAY_NAME} v${APP_VERSION}`,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open DevTools only in development.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

app.on("ready", () => {
  app.setName(APP_DISPLAY_NAME);
  if (process.platform === "darwin") {
    app.dock?.setIcon(nativeImage.createFromPath(path.resolve(app.getAppPath(), APP_ICON_PATH)));
  }

  // Only check updates in production mode (packaged + not Vite dev-server).
  // In local dev (`electron-forge start`) we should not check updates.
  if (app.isPackaged && !MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    updateElectronApp({
      updateSource: {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: UPDATE_REPO,
      },
      notifyUser: true,
      updateInterval: "10 minutes",
      onNotifyUser: (info) => {
        const releaseName = info.releaseName || "";
        const releaseNotes = info.releaseNotes || "";

        // update-electron-app won't use its default dialog when onNotifyUser is provided,
        // so we show our own and then apply the update.
        dialog
          .showMessageBox({
            type: "info",
            title: "发现新版本",
            message: releaseName || "新版本已下载完成",
            detail: releaseNotes || "点击重启立即安装更新。",
            buttons: ["重启并更新"],
            defaultId: 0,
          })
          .then(() => autoUpdater.quitAndInstall())
          .catch(() => autoUpdater.quitAndInstall());
      },
      logger: console,
    });
  }

  createWindow();
  startLogServer(8082, "/logs");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // 停止 WebSocket 日志服务器
    stopLogServer();
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用退出前停止 WebSocket 服务器
app.on("before-quit", () => {
  stopLogServer();
});
