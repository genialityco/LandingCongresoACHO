import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra los emuladores de Firebase. Requisitos:
 *   1. npm run emulators:fresh   (en otra terminal)
 *   2. npm run emulators:users
 *   3. npm run build && npm run test:e2e   (levanta `next start` si no está corriendo)
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/admin/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
