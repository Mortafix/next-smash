import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const port = new URL(baseURL).port || "3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next dev --webpack --port ${port}`,
    url: `${baseURL}/tornei`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
