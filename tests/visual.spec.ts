import { expect, test } from "@playwright/test";

test.describe("visual regression", () => {
  test("home page - light", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='light']")).toBeVisible();
    await expect(page).toHaveScreenshot("home-light.png", { fullPage: true });
  });

  test("home page - dark", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    await expect(page).toHaveScreenshot("home-dark.png", { fullPage: true });
  });

  test("home page - system", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    await expect(page).toHaveScreenshot("home-system.png", { fullPage: true });
  });

  test("theme toggle cycles through dark and light", async ({
    page,
  }) => {
    // Start with dark
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");

    // Verify dark mode
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    let theme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(theme).toBe("dark");

    // Click to go to light
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("[data-theme-icon='light']")).toBeVisible();
    theme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(theme).toBe("light");

    // Click to go back to dark
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    theme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(theme).toBe("dark");
  });

  test("work page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/work");
    await expect(page).toHaveScreenshot("work.png", { fullPage: true });
  });

  test("404 page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/nonexistent-page");
    await expect(page).toHaveScreenshot("404.png", { fullPage: true });
  });
});
