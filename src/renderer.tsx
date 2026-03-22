/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { Suspense } from "react";

import { RouterProvider } from "react-router-dom";

import { createRoot } from "react-dom/client";

// import ErrorBoundary from "@/components/ErrorBoundary";
// import ErrorReportingProvider from "@/components/ErrorReportingProvider";
import LoadingFallback from "@/components/LoadingFallback";
// import PerformanceMonitorWrapper from "@/components/PerformanceMonitorWrapper";

import routers from "./routers";
import "antd/dist/reset.css";
import "./render.scss";
const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  // <ErrorReportingProvider>
  //   <ErrorBoundary scope="AppRoot">
  //     <PerformanceMonitorWrapper>
  <Suspense fallback={<LoadingFallback />}>
    <RouterProvider router={routers} />
  </Suspense>,
  //     </PerformanceMonitorWrapper>
  //   </ErrorBoundary>
  // </ErrorReportingProvider>,
);
