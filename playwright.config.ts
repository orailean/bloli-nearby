import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    locale: "en-GB",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:api",
      url: "http://127.0.0.1:3100/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL:
          process.env.TEST_DATABASE_URL ||
          "postgres://postgres:loo-local-test@127.0.0.1:55439/loo",
      },
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
