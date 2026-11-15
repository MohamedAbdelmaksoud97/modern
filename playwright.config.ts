import { defineConfig, devices } from "@playwright/test";
import { randomInt } from "node:crypto";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const local = ["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname);
// Separate repeated local test runs from each other's real rate-limit counters.
if (local && !process.env.PLAYWRIGHT_FIXTURE_IP) {
  process.env.PLAYWRIGHT_FIXTURE_IP = "198.51.100." + randomInt(1, 255);
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 12000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    extraHTTPHeaders: local ? { "X-Forwarded-For": process.env.PLAYWRIGHT_FIXTURE_IP! } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
