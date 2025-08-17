import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    workspace: ["packages/*"],
    coverage: {
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
