import { expect, test, type Page } from "@playwright/test";

// The moon shows the real phase for the current moment, so pin the clock, time zone, and motion to
// keep screenshots stable. Its WebGL scene loads once the page is idle.
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
    await expect(page.locator("[data-moon-title]")).toHaveText("Tonight · Waxing gibbous");
    await expect(page.locator("[data-moon-detail]")).toHaveText("73% lit · 10.5 days old");
    await expect(page.locator("[data-moon-next]")).toHaveText("Full moon Oct 26");

    await waitForMoon(page);
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
});
