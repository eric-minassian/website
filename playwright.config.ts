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
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        // Render WebGL in software so the moon draws the same on every machine, GPU or not.
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
      },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["iPhone 15 Pro"] },
    },
  ],
  webServer: {
    command: `pnpm dev --ignore-lock --port ${port}`,
    url: baseURL,
    // Render the project list from a fixture so the screenshots don't change with live traffic.
    env: { PROJECTS_SOURCE: "tests/fixtures/projects.json" },
    reuseExistingServer: !process.env.CI,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
});
