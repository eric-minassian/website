import { defineConfig, devices } from "@playwright/test";

// Other checkouts may already serve the default port; PORT moves the test server elsewhere.
const port = Number(process.env.PORT ?? 4321);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "html",
  use: {
    baseURL,
    // No retries, so a failure keeps its trace for the uploaded report.
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["iPhone 15 Pro"] },
    },
  ],
  webServer: {
    command: `pnpm dev --ignore-lock --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
});
