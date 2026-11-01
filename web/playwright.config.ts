import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 240000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
