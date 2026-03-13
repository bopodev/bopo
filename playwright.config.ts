import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.E2E_API_PORT ?? "4020";
const webPort = process.env.E2E_WEB_PORT ?? "4010";
const apiUrl = process.env.E2E_API_URL ?? `http://127.0.0.1:${apiPort}`;
const webUrl = process.env.E2E_WEB_URL ?? `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: webUrl,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "pnpm --filter bopodev-api dev",
      url: `${apiUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: true,
      env: {
        PORT: apiPort,
        BOPO_DB_PATH: "./tmp/e2e-api.db"
      }
    },
    {
      command: "pnpm --filter bopodev-web dev",
      url: webUrl,
      timeout: 120_000,
      reuseExistingServer: true,
      env: {
        NEXT_PUBLIC_API_URL: apiUrl
      }
    }
  ]
});
