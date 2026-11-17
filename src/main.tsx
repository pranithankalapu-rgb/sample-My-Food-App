import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { queryClient } from "./api/queries";
import { SessionProvider } from "./auth/session";
import { ToastProvider } from "./components/Toasts";
import { AppErrorBoundary } from "./components/RouteError";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </ToastProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
