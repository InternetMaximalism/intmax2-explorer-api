import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    coverage: {
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
