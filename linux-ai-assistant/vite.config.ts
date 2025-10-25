import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  // Prevent Vite/Rollup from trying to statically resolve Tauri's API modules
  // when building a web bundle. These modules are only available at runtime
  // inside the Tauri desktop environment.
  build: {
    rollupOptions: {
      external: [/^@tauri-apps\/api($|\/)/],
    },
  },
});
