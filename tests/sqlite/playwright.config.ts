import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

const run = process.env.SQLITE_WORKFLOW_RUN;
if (!run || !process.env.PLAYWRIGHT_BASE_URL)
  throw new Error("Run with npm run test:workflow:sqlite");

export default defineConfig({
  testDir: ".",
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list", { printSteps: true }],
    ["html", { open: "never", outputFolder: join(run, "report") }],
  ],
  outputDir: join(run, "test-results"),
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
