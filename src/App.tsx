import { lazy, Suspense, type ReactNode } from "react";
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RouteError } from "./components/RouteError";
import { RequireAdmin, RequireAuth } from "./components/guards";
import { Skeleton } from "./components/states";
import { StatusPage } from "./pages/StatusPage";
import { LoginPage } from "./pages/LoginPage";
import { LookupPage } from "./pages/LookupPage";
import { ProductPage } from "./pages/ProductPage";
import { SearchPage } from "./pages/SearchPage";
import { ScanPage } from "./pages/ScanPage";
import { ProfilePage } from "./pages/ProfilePage";
import { NotFoundPage } from "./pages/NotFoundPage";

// the heavier tools load on demand
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ExplorerPage = lazy(() => import("./pages/ExplorerPage"));
const TestDashboardPage = lazy(() => import("./pages/TestDashboardPage"));

const page = (node: ReactNode) => <Suspense fallback={<Skeleton lines={6} />}>{node}</Suspense>;

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/lookup" replace />, errorElement: <RouteError /> },
      { path: "status", element: <StatusPage />, errorElement: <RouteError /> },
      { path: "login", element: <LoginPage />, errorElement: <RouteError /> },
      {
        path: "lookup",
        element: (
          <RequireAuth>
            <LookupPage />
          </RequireAuth>
        ),
        errorElement: <RouteError />,
      },
      {
        path: "product/:code",
        element: (
          <RequireAuth>
            <ProductPage />
          </RequireAuth>
        ),
        errorElement: <RouteError />,
      },
      {
        path: "search",
        element: (
          <RequireAuth>
            <SearchPage />
          </RequireAuth>
        ),
        errorElement: <RouteError />,
      },
      {
        path: "scan",
        element: (
          <RequireAuth>
            <ScanPage />
          </RequireAuth>
        ),
        errorElement: <RouteError />,
      },
      {
        path: "profile",
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
        errorElement: <RouteError />,
      },
      {
        path: "admin",
        element: <RequireAdmin>{page(<AdminPage />)}</RequireAdmin>,
        errorElement: <RouteError />,
      },
      { path: "explorer", element: page(<ExplorerPage />), errorElement: <RouteError /> },
      { path: "tests", element: page(<TestDashboardPage />), errorElement: <RouteError /> },
      { path: "*", element: <NotFoundPage />, errorElement: <RouteError /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
