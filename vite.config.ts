import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Fixed port: Playwright and the profiling script expect it.
  preview: { port: 4173, strictPort: true },
  build: {
    sourcemap: false,
    // PixiJS is large by nature; the warning limit is raised accordingly.
    chunkSizeWarningLimit: 900,
  },
});
