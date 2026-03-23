import path from "node:path";

import { app, BrowserWindow } from "electron";

import started from "electron-squirrel-startup";

import { startLogServer, stopLogServer } from "./server/log-server";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

app.on("ready", () => {
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
