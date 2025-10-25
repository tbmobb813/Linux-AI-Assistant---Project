import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "src/setupTests.ts",
        exclude: ["**/node_modules/**", "**/e2e/**", "**/playwright-e2e/**"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            reportsDirectory: "coverage",
        },
    },
    resolve: {
        alias: {
            "@tauri-apps/api/tauri": path.resolve(__dirname, "src/mocks/tauri.ts"),
        },
    },
});
