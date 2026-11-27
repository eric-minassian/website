import { expect, test, type Page } from "@playwright/test";

import { SITE } from "../src/lib/site";
import PROJECTS from "./fixtures/projects.json" with { type: "json" };

/** Answers the page's request for the platform's directory with `body` (the fixture by default). */
const serveProjects = (page: Page, body: unknown = PROJECTS) =>
  page.route(SITE.projectsUrl, (route) => route.fulfill({ json: body }));

/** Fails the page's request for the platform's directory. */
const failProjects = (page: Page) =>
  page.route(SITE.projectsUrl, (route) => route.fulfill({ status: 503, body: "" }));

// Pin the time zone and skip the fades, so pages draw the same every run.
test.use({ timezoneId: "UTC", locale: "en-US", contextOptions: { reducedMotion: "reduce" } });

/** Waits for the home page's projects key to fill and the horizon to draw. */
const waitForTraffic = async (page: Page) => {
  await expect(page.locator("[data-traffic]")).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-horizon-chart] path").first()).toBeAttached();
};

/** Waits for the key to fill, with or without a chart to draw. */
const waitForTrafficKey = (page: Page) =>
  expect(page.locator("[data-traffic]")).toHaveAttribute("data-state", "ready");

const storedTheme = (page: Page) => page.evaluate(() => localStorage.getItem("theme"));
const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains("dark"));

test.describe("visual regression", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`home page - ${theme}`, async ({ page }) => {
      await serveProjects(page);
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/");
      await expect(page.locator("[data-theme-toggle]")).toHaveAccessibleName(
        `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      );
      await waitForTraffic(page);
      await expect(page).toHaveScreenshot(`home-${theme}.png`, { fullPage: true });
    });
  }

  test("home page - system", async ({ page }) => {
    await serveProjects(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("[data-theme-toggle]")).toHaveAccessibleName("Switch to light theme");
    await waitForTraffic(page);
    await expect(page).toHaveScreenshot("home-system.png", { fullPage: true });
  });

  test("404 page", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto("/nonexistent-page");
    await expect(page).toHaveTitle("Page not found – Eric Minassian");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
    await expect(page).toHaveScreenshot("404.png", { fullPage: true });
  });

  for (const theme of ["light", "dark"] as const) {
    test(`projects page - ${theme}`, async ({ page }) => {
      await serveProjects(page);
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/projects");
      await expect(page.locator("[data-theme-toggle]")).toHaveAccessibleName(
        `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      );
      await expect(page.locator("[data-projects]")).toHaveAttribute("data-state", "ready");
      await expect(page).toHaveScreenshot(`projects-${theme}.png`, { fullPage: true });
    });
  }
});

test.describe("theme toggle", () => {
  test("flips the theme, and forgets the choice when it flips back to the system's", async ({
    page,
  }) => {
    await serveProjects(page);
    await page.goto("/");
    const toggle = page.locator("[data-theme-toggle]");

    // Follows the system (light) until flipped; the icon, like the label, shows where a click goes.
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    await expect(toggle).toHaveAccessibleName("Switch to dark theme");
    expect(await storedTheme(page)).toBeNull();

    await toggle.click();
    await expect(page.locator("[data-theme-icon='light']")).toBeVisible();
    await expect(toggle).toHaveAccessibleName("Switch to light theme");
    expect(await isDark(page)).toBe(true);
    expect(await storedTheme(page)).toBe("dark");

    await toggle.click();
    await expect(page.locator("[data-theme-icon='dark']")).toBeVisible();
    expect(await isDark(page)).toBe(false);
    expect(await storedTheme(page)).toBeNull();
  });

  test("starts dark on a dark system and remembers a flip to light", async ({ page }) => {
    await serveProjects(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    expect(await isDark(page)).toBe(true);

    await page.locator("[data-theme-toggle]").click();
    expect(await isDark(page)).toBe(false);
    expect(await storedTheme(page)).toBe("light");

    await page.reload();
    expect(await isDark(page)).toBe(false);
  });
});

test.describe("home page", () => {
  test("names the projects with their traffic, and leads to them", async ({ page }) => {
    await serveProjects(page);
    await page.goto("/");
    const key = page.getByRole("region", { name: "Projects" });
    // The busiest first, as the horizon stacks them from the ground up; past two, the quieter
    // apps share the last band and row.
    await expect(key.getByRole("listitem")).toHaveText([
      /^platform\s*9\.1k/,
      /^atlas\s*6\.4k/,
      /^2 others\s*329/,
    ]);
    await expect(key.getByRole("listitem").first()).toContainText("9,112 page views");
    await expect(key.getByRole("link", { name: "atlas" })).toHaveAttribute(
      "href",
      "https://atlas.ericminassian.com",
    );
    await expect(key.getByRole("link", { name: "2 others" })).toHaveAttribute("href", "/projects");
    // Each row says what the app is, without pointing at it.
    await expect(key.getByRole("listitem").nth(1)).toContainText("A live, interactive model");
    await expect(key.getByRole("listitem").nth(2)).toContainText("encore, virtual-fly");
    await expect(key).toContainText("Page views over the last 30 days");
    // The busiest day is named above its column; pointing at an app in the key, its own busiest.
    const peak = page.locator("[data-horizon-peak]");
    await expect(peak).toHaveText("Nov 17 · 8,436");
    await expect(page.locator("[data-horizon-start]")).toHaveText("Oct 28");
    await key.getByRole("listitem").first().hover();
    // When that's today, its count joins "Today so far" under it instead.
    await expect(peak).toBeHidden();
    await expect(page.locator("[data-horizon-today]")).toHaveText("Today so far · 2,872");
    await page.mouse.move(0, 0);
    await expect(peak).toHaveText("Nov 17 · 8,436");
    await key.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("reads out the day under the pointer, in the key and on the horizon", async ({ page }) => {
    await serveProjects(page);
    await page.goto("/");
    await waitForTraffic(page);
    const chart = page.locator("[data-horizon-chart]");
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    const key = page.getByRole("region", { name: "Projects" });

    // The strata stand in the page's column, today at its right edge.
    const column = (await page.locator("[data-horizon-axis] span").last().boundingBox())!;
    await page.mouse.move(column.x + column.width - 2, box.y + box.height / 2);
    // On the chart the short form; the key's caption and the slider's value say it in full.
    await expect(page.locator("[data-horizon-label]")).toHaveText("Today so far · 3,215");
    await expect(key.getByRole("listitem")).toHaveText([
      /^platform\s*2,872/,
      /^atlas\s*14/,
      /^2 others\s*329/,
    ]);
    await expect(key).toContainText("Page views today so far");

    await page.mouse.move(box.x + 2, box.y - 40);
    await expect(page.locator("[data-horizon-label]")).toBeHidden();
    await expect(key.getByRole("listitem").first()).toContainText("9,112 page views");
    await expect(key).toContainText("Page views over the last 30 days");
  });

  test("steps through the days from the keyboard", async ({ page }) => {
    await serveProjects(page);
    await page.goto("/");
    await waitForTraffic(page);
    const scrub = page.getByRole("slider", { name: "Page views by day" });
    // It's in the tab order right after the key, and starts from today.
    await page.getByRole("region", { name: "Projects" }).getByRole("link").last().focus();
    await page.keyboard.press("Tab");
    await expect(scrub).toBeFocused();
    await expect(page.locator("[data-horizon-label]")).toHaveText("Today so far · 3,215");
    await expect(scrub).toHaveAttribute("aria-valuetext", "Today so far: 3,215 page views");
    await page.keyboard.press("ArrowLeft");
    await expect(scrub).toHaveAttribute("aria-valuetext", "Nov 25: no page views");
    await page.keyboard.press("Home");
    await expect(page.locator("[data-horizon-label]")).toHaveText("Oct 28 · no apps yet");
    // Escape puts the reading away and keeps the keyboard on the strata.
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-horizon-label]")).toBeHidden();
    await expect(scrub).toBeFocused();
  });

  test("says when counting began, when the data can't load, and when nothing runs", async ({
    page,
  }) => {
    await serveProjects(page, { ...PROJECTS, countingSince: "2026-11-24" });
    await page.goto("/");
    const key = page.getByRole("region", { name: "Projects" });
    await expect(key).toContainText("Page views since Nov 24");
    // The horizon starts where the counting did, a few days at the end of the window, named
    // beside the tick where it began.
    await expect(page.locator("[data-horizon-since]")).toHaveText("Since Nov 24");
    await expect(page.locator("[data-horizon-since]")).toBeVisible();

    await page.unroute(SITE.projectsUrl);
    await failProjects(page);
    await page.reload();
    await expect(page.locator("[data-traffic]")).toHaveAttribute("data-state", "error");
    await expect(key).toContainText("Traffic is unavailable right now.");
    await expect(key.getByRole("listitem")).toHaveCount(0);
    await expect(key.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");

    await page.unroute(SITE.projectsUrl);
    await serveProjects(page);
    await key.getByRole("button", { name: "Try again" }).click();
    await expect(key.getByRole("listitem")).toHaveCount(3);

    await page.unroute(SITE.projectsUrl);
    await serveProjects(page, { ...PROJECTS, apps: [] });
    await page.reload();
    await expect(key).toContainText("Nothing is running right now.");
    await expect(key.getByRole("listitem")).toHaveCount(0);
  });
});

test.describe("home page on a phone", () => {
  test("a tap reads the day under it", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch");
    await serveProjects(page);
    await page.goto("/");
    await waitForTraffic(page);
    const scrub = page.locator("[data-horizon-scrub]");
    await scrub.scrollIntoViewIfNeeded();
    const box = (await scrub.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width - 2, box.y + box.height / 2);
    await expect(page.locator("[data-horizon-label]")).toHaveText("Today so far · 3,215");
    // A tap anywhere else puts it away.
    await page.touchscreen.tap(box.x + 4, box.y - 60);
    await expect(page.locator("[data-horizon-label]")).toBeHidden();
  });
});

test.describe("home page, unusual data", () => {
  test("names no busiest day when there were no views at all", async ({ page }) => {
    const quiet = {
      ...PROJECTS,
      apps: PROJECTS.apps.map((app) => ({ ...app, pageViews: app.pageViews.map(() => 0) })),
    };
    await serveProjects(page, quiet);
    await page.goto("/");
    await waitForTrafficKey(page);
    await expect(page.locator("[data-horizon-peak]")).toBeHidden();
  });
});

test.describe("projects page", () => {
  test("lists the platform's apps, busiest first", async ({ page }) => {
    await serveProjects(page);
    await page.goto("/projects");
    await expect(page).toHaveTitle("Projects – Eric Minassian");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
    await expect(page.getByRole("link", { name: "Eric Minassian" })).toHaveAttribute("href", "/");
    const rows = page.getByRole("list", { name: "Projects" }).getByRole("listitem");

    await expect(rows.locator(".ledger-name a")).toHaveText([
      "platform",
      "atlas",
      "encore",
      "virtual-fly",
    ]);
    await expect(rows.nth(0)).toContainText("Deployed Nov 25");
    await expect(rows.nth(0)).toContainText("9,112 page views");
    await expect(rows.nth(1)).toContainText("6,431 page views");
    await expect(rows.nth(2)).toContainText("329 page views");
    await expect(rows.nth(3)).toContainText("No page views");
    await expect(rows.nth(1).getByRole("link", { name: "Source" })).toHaveAttribute(
      "href",
      "https://github.com/eric-minassian/atlas",
    );
    await expect(rows.nth(2).getByRole("link", { name: "Source" })).toHaveCount(0);
    // What the totals cover sits over them; how the days are drawn, under the list.
    await expect(page.locator("[data-projects-head]")).toHaveText(
      "Page views over the last 30 days",
    );
    await expect(
      page.getByText("Each app’s days are scaled to its own busiest one."),
    ).toBeVisible();
  });

  test("reads out a day's views from a sparkline, by pointer and by keyboard", async ({ page }) => {
    await serveProjects(page);
    await page.goto("/projects");
    const row = page.getByRole("list", { name: "Projects" }).getByRole("listitem").first();
    const reading = row.locator(".spark-reading");
    const box = (await row.locator(".ledger-spark svg").boundingBox())!;
    // Each of the 30 days owns a column of dots; day 19 is Nov 16, 2,844 views.
    const day = box.width / 30;
    // Before the app went live (Nov 14), the ground says so.
    await page.mouse.move(box.x + 5.5 * day, box.y + box.height - 2);
    await expect(reading).toHaveText("Nov 2 · not live yet");
    await page.mouse.move(box.x + 19.5 * day, box.y + 10);
    // The reading sits by the dots, so the row's links and lines stay as they are.
    await expect(reading).toHaveText("Nov 16 · 2,844");
    await expect(reading).toBeVisible();
    await expect(row.getByText("Deployed Nov 25")).toBeVisible();
    // The total stays the total.
    await expect(row.locator(".ledger-total")).toContainText("9,112 page views");

    await page.mouse.move(box.x - 200, box.y);
    await expect(reading).toBeHidden();

    const spark = row.getByRole("slider", { name: "platform, page views by day" });
    await spark.focus();
    await page.keyboard.press("End");
    await expect(spark).toHaveAttribute("aria-valuetext", "Today so far: 2,872 page views");
    // A new window size redraws the dots, and leaves the keyboard and the reading where they were.
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: size.width + 40, height: size.height });
    await expect(spark).toBeFocused();
    await expect(reading).toHaveText("Today so far · 2,872");
    await page.setViewportSize(size);
    await page.keyboard.press("Escape");
    await expect(spark).toBeFocused();
    await expect(reading).toBeHidden();
  });

  test("says when counting began, and offers another try when the list can't load", async ({
    page,
  }) => {
    await serveProjects(page, { ...PROJECTS, countingSince: "2026-11-24" });
    await page.goto("/projects");
    await expect(page.locator("[data-projects-head]")).toHaveText("Page views since Nov 24");

    await page.unroute(SITE.projectsUrl);
    await failProjects(page);
    await page.reload();
    await expect(page.getByText("The projects couldn’t be loaded.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Projects" })).toBeHidden();

    await page.unroute(SITE.projectsUrl);
    await serveProjects(page);
    await page.getByRole("button", { name: "Try again" }).click();
    // The keyboard waits on the page's name while the list comes back.
    await expect(page.locator("#page-heading")).toBeFocused();
    await expect(page.getByRole("list", { name: "Projects" }).getByRole("listitem")).toHaveCount(4);
    await expect(page.getByText("The projects couldn’t be loaded.")).toBeHidden();
  });

  test("says so when nothing is running", async ({ page }) => {
    await serveProjects(page, { ...PROJECTS, apps: [] });
    await page.goto("/projects");
    await expect(page.getByText("Nothing is running right now.")).toBeVisible();
    await expect(page.getByText(/Page views over/)).toHaveCount(0);
  });
});
