import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 1000 },
    video: "on",
    trace: "retain-on-failure",
  },
  reporter: [["list"]],
  webServer: [
    {
      command: "npm run start",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
