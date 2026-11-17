import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app calls the API at the relative path /api (VITE_API_PATH); the nginx
// container proxies it to API_BASE_URL. Nothing about the backend's address
// is baked into the build.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes("@zxing")) return "barcode-scanner";
          if (id.includes("node_modules")) return "vendor";
          return undefined;
        },
      },
    },
  },
});
