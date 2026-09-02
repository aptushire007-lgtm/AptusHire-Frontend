import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Mirrors admin/vitest.config.js. Separate from vite.config.js on purpose: the
// build config carries a manualChunks function and a strictPort dev server that
// have nothing to do with running tests, and Vitest picks this file up ahead of
// vite.config.js automatically.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
    include: ["test/**/*.test.{js,jsx}"],
  },
});
