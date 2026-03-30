import { lazy } from "react";

import { createHashRouter } from "react-router-dom";
import type { DataRouter } from "react-router-dom";

const LayoutHome = lazy(() => import("@/app"));
const Home = lazy(() => import("@/pages/Home"));
const SmartserviceappDebugLogs = lazy(() => import("@/pages/DebugLogs"));
const SmartserviceappDebugNetwork = lazy(() => import("@/pages/Netword"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const TestPage = lazy(() => import("@/pages/Test"));
// Barcode 模块
const BarcodeManage = lazy(() => import("@/pages/Barcode/Manage"));

const router: DataRouter = createHashRouter([
  {
    path: "/",
    element: (
      // <RequireAuth>
      //   <LayoutHome />
      // </RequireAuth>
      <LayoutHome />
    ),
    children: [
      { index: true, element: <Home /> },
      {
        path: "/debuglogs",
        element: <SmartserviceappDebugLogs />,
      },
      {
        path: "/network",
        element: <SmartserviceappDebugNetwork />,
      },
      {
        path: "/barcode/manage",
        element: <BarcodeManage />,
      },
      {
        path: "/test",
        element: <TestPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
