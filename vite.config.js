import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app calls the API at the relative path /api; the nginx container
// proxies it to API_BASE_URL (see nginx/default.conf.template). Nothing about
// the backend's address is baked into the build.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
});
