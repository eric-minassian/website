import { defineConfig, devices } from "@playwright/test";

// The deployed site, as the platform serves it (`pnpm test:e2e`). CI runs this against each PR's
// preview and against production after each deploy, with BASE_URL set to the stage's URL.
const baseURL = process.env.BASE_URL;
if (!baseURL) {
  throw new Error("Set BASE_URL to the stage to test, e.g. https://website.ericminassian.com");
}

export default defineConfig({
  testDir: ".",
  // Where the platform's pipeline uploads traces from when a run fails.
  outputDir: "../test-results",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } }],
});
