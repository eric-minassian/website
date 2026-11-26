import { expect, test, type Page } from "@playwright/test";

import { PROJECTS_URL } from "../src/lib/projects";
import PROJECTS from "./fixtures/projects.json" with { type: "json" };

/** Answers the page's request for the platform's directory with `body` (the fixture by default). */
const serveProjects = (page: Page, body: unknown = PROJECTS) =>
  page.route(PROJECTS_URL, (route) => route.fulfill({ json: body }));

// Pin the time zone and skip the fades, so pages draw the same every run.
test.use({ timezoneId: "UTC", locale: "en-US", contextOptions: { reducedMotion: "reduce" } });

/** Waits for the home page's projects corner to draw its key and chart. */
const waitForCorner = async (page: Page) => {
  await expect(page.locator("[data-corner]")).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-corner-chart] circle").first()).toBeAttached();
};

test.describe("visual regression", () => {
  test("home page - light", async ({ page }) => {
    await serveProjects(page);
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='light']")).toBeVisible();
    await waitForCorner(page);
    await expect(page).toHaveScreenshot("home-light.png", { fullPage: true });
  });

  test("home page - dark", async ({ page }) => {
    await serveProjects(page);
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    await waitForCorner(page);
    await expect(page).toHaveScreenshot("home-dark.png", { fullPage: true });
  });

  test("home page - system", async ({ page }) => {
    await serveProjects(page);
    await page.addInitScript(() => {
      localStorage.setItem("theme", "system");
    });
    await page.goto("/");
    await expect(page.locator("[data-theme-icon='system']")).toBeVisible();
    await waitForCorner(page);
    await expect(page).toHaveScreenshot("home-system.png", { fullPage: true });
  });

  test("theme toggle cycles through system, dark, and light", async ({ page }) => {
    await serveProjects(page);
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
    await expect(page).toHaveScreenshot("404.png", { fullPage: true });
  });

  for (const theme of ["light", "dark"] as const) {
    test(`projects page - ${theme}`, async ({ page }) => {
      await serveProjects(page);
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/projects");
      await expect(page.locator(`[data-theme-icon='${theme}']`)).toBeVisible();
      await expect(page.locator("[data-projects]")).toHaveAttribute("data-state", "ready");
      await expect(page).toHaveScreenshot(`projects-${theme}.png`, { fullPage: true });
    });
  }

  test("the home page names the projects with their traffic, and leads to them", async ({
    page,
  }) => {
    await serveProjects(page);
    await page.goto("/");
    const corner = page.getByRole("region", { name: "Projects" });
    // The busiest first, as the chart stacks them.
    await expect(corner.getByRole("listitem")).toHaveText([
      /^platform\s*9\.1k/,
      /^atlas\s*6\.4k/,
      /^encore\s*329/,
      /^virtual-fly\s*–/,
    ]);
    await expect(corner.getByRole("listitem").first()).toContainText("9,112 page views");
    await expect(corner).toContainText("Page views, last 30 days");
    // The chart leads there too, for the pointer; the heading is the link to read.
    await expect(page.locator("[data-corner-chart]")).toHaveAttribute("href", "/projects");
    await corner.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("the home page's projects corner says when counting began, and keeps its link when the data can't load", async ({
    page,
  }) => {
    await serveProjects(page, { ...PROJECTS, countingSince: "2026-11-24" });
    await page.goto("/");
    const corner = page.getByRole("region", { name: "Projects" });
    await expect(corner).toContainText("Page views since Nov 24");

    await page.unroute(PROJECTS_URL);
    await page.route(PROJECTS_URL, (route) => route.fulfill({ status: 503, body: "" }));
    await page.reload();
    await expect(page.locator("[data-corner]")).toHaveAttribute("data-state", "error");
    await expect(corner.getByRole("listitem")).toHaveCount(0);
    await expect(corner.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
  });

  test("projects list the platform's apps, latest deploy first", async ({ page }) => {
    await serveProjects(page);
    await page.goto("/projects");
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
    await expect(page.getByText("Page views over the last 30 days, today included.")).toBeVisible();
  });

  test("projects say when the platform began counting, and when the list can't load", async ({
    page,
  }) => {
    await serveProjects(page, { ...PROJECTS, countingSince: "2026-11-24" });
    await page.goto("/projects");
    await expect(page.getByText("Page views since Nov 24, today included.")).toBeVisible();

    await page.unroute(PROJECTS_URL);
    await page.route(PROJECTS_URL, (route) => route.fulfill({ status: 503, body: "" }));
    await page.reload();
    await expect(
      page.getByText("The projects couldn't be loaded. Reload to try again."),
    ).toBeVisible();
    await expect(page.getByRole("list", { name: "Projects" })).toBeHidden();
  });
});
