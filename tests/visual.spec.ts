import { expect, test, type Page } from "@playwright/test";

// The moon shows the real phase for the current moment, so pin the clock, time zone, and motion to
// keep screenshots stable. Its WebGL scene loads a few seconds after the page.
const NOW = new Date("2026-10-21T04:00:00Z");

test.use({ timezoneId: "UTC", locale: "en-US", contextOptions: { reducedMotion: "reduce" } });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW);
});

const waitForMoon = async (page: Page) => {
  await expect(page.locator("[data-moon]")).not.toHaveAttribute("data-state", "loading", {
    timeout: 15_000,
  });
};

test.describe("visual regression", () => {
  test("home page - light", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='light']")).toBeVisible();
    await waitForMoon(page);
    await expect(page).toHaveScreenshot("home-light.png", { fullPage: true });
  });

  test("home page - dark", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    await waitForMoon(page);
    await expect(page).toHaveScreenshot("home-dark.png", { fullPage: true });
  });

  test("home page - system", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "system");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='system']")).toBeVisible();
    await waitForMoon(page);
    await expect(page).toHaveScreenshot("home-system.png", { fullPage: true });
  });

  test("theme toggle cycles through system, dark, and light", async ({ page }) => {
    // Start with system
    await page.addInitScript(() => {
      localStorage.setItem("theme", "system");
    });
    await page.goto("/");

    // Verify system mode
    await expect(page.locator("[data-theme-icon='system']")).toBeVisible();
    let theme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(theme).toBe("system");

    // Click to go to dark
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    theme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(theme).toBe("dark");

    // Click to go to light
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("[data-theme-icon='light']")).toBeVisible();
    theme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(theme).toBe("light");

    // Click to go back to system
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("[data-theme-icon='system']")).toBeVisible();
    theme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(theme).toBe("system");
  });

  test("404 page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/nonexistent-page");
    await waitForMoon(page);
    await expect(page).toHaveScreenshot("404.png", { fullPage: true });
  });

  test("moon describes tonight and steps through other nights", async ({ page }) => {
    await page.goto("/");
    await waitForMoon(page);
    await expect(page.locator("[data-moon-title]")).toHaveText("Tonight · Waxing gibbous");
    await expect(page.locator("[data-moon-detail]")).toHaveText("73% lit · 10.5 days old");
    await expect(page.locator("[data-moon-next]")).toHaveText("Full moon Oct 26");

    const state = await page.locator("[data-moon]").getAttribute("data-state");
    test.skip(state !== "ready", "WebGL is unavailable in this browser");

    const moon = page.locator("[data-moon-hit]");
    for (let day = 0; day < 5; day++) {
      // Sequential on purpose: each press steps one night forward.
      // eslint-disable-next-line no-await-in-loop -- see comment above
      await moon.press("ArrowRight");
    }
    await expect(page.locator("[data-moon-title]")).toHaveText("Mon, Oct 26 · Full moon");
    await expect(page.locator("[data-moon-next]")).toHaveText("New moon Nov 9");
    await expect(moon).toHaveAttribute("aria-label", /^Moon on Mon, Oct 26: full moon, 100% lit\./);
  });

  // Rendered from tests/fixtures/projects.json (see webServer in playwright.config.ts).
  for (const theme of ["light", "dark"] as const) {
    test(`projects page - ${theme}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/projects");
      await expect(page.locator(`[data-theme-icon='${theme}']`)).toBeVisible();
      // A page of rows to scroll past leaves the corner moon out.
      await expect(page.locator("[data-moon]")).toHaveCount(0);
      await expect(page).toHaveScreenshot(`projects-${theme}.png`, { fullPage: true });
    });
  }

  test("projects list the platform's apps, latest deploy first", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page).toHaveTitle("Projects - Eric Minassian");
    const projects = page.getByRole("list", { name: "Projects" });
    const rows = projects.getByRole("listitem");

    await expect(rows.locator(":scope > a")).toHaveText([
      "virtual-fly",
      "encore",
      "platform",
      "atlas",
    ]);
    await expect(rows.nth(0)).toContainText("Deployed Nov 26");
    await expect(rows.nth(0)).toContainText("No page views");
    await expect(rows.nth(1)).toContainText("329 page views");
    await expect(rows.nth(2)).toContainText("9,112 page views");
    await expect(rows.nth(3)).toContainText("6,431 page views");
    await expect(rows.nth(3).getByRole("link", { name: "Source" })).toHaveAttribute(
      "href",
      "https://github.com/eric-minassian/atlas",
    );
    await expect(rows.nth(1).getByRole("link", { name: "Source" })).toHaveCount(0);
    await expect(page.getByText("Page views over the 30 days to Nov 25.")).toBeVisible();
  });
});
