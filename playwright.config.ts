import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev --webpack",
    url: "http://localhost:3000/tornei",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
