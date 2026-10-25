import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { credentialsFor } from "./src/env";

const configDir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(configDir, ".env"), quiet: true });

const startLocalWeb = process.env.WMS_START_LOCAL_WEB === "true";
const appUrl =
  startLocalWeb
    ? process.env.WMS_LOCAL_APP_URL || "http://127.0.0.1:5173"
    : process.env.WMS_APP_URL || "https://mywms-686.pages.dev";
const recordRun = process.env.WMS_RECORD === "true";
const roles = ["admin", "owner", "finance", "warehouse", "cashier"] as const;
const hasAllRoleCredentials = roles.every((role) => credentialsFor(role));

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL: appUrl,
    trace: recordRun ? "on" : "retain-on-failure",
    screenshot: recordRun ? "on" : "only-on-failure",
    video: recordRun ? "on" : "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: startLocalWeb
    ? [
        {
          command: "npm run dev",
          cwd: path.resolve(configDir, "../../apps/api"),
          url: "http://127.0.0.1:3000/health",
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: "npm run dev -- --host 127.0.0.1",
          cwd: path.resolve(configDir, "../../apps/web"),
          url: appUrl,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ]
    : undefined,
  projects: [
    {
      name: "public-smoke",
      testMatch: /(?:login|api-health)\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        storageState: { cookies: [], origins: [] },
      },
    },
    ...(hasAllRoleCredentials
      ? [
          {
            name: "setup",
            testMatch: /.*\.setup\.ts/,
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "firefox",
            dependencies: ["setup"],
            testIgnore: /(?:\.setup|login|api-health)\.spec\.ts/,
            use: {
              ...devices["Desktop Firefox"],
              storageState: ".auth/admin.json",
            },
          },
        ]
      : []),
  ],
});
