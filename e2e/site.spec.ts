import { expect, test, type Locator } from "@playwright/test";

// The live site on the platform, reading the platform's live directory: what's listed and how busy
// it is change from run to run, so these check that it loads and renders, not what it shows.

/**
 * Waits for the directory to load into `section` (a `data-state` that leaves "loading"; the fetch
 * gives up after 6 seconds) and returns the state it settled on.
 */
const settled = async (section: Locator): Promise<string | null> => {
  await expect(section).not.toHaveAttribute("data-state", "loading", { timeout: 15_000 });
  return section.getAttribute("data-state");
};

test("the home page renders, its projects key filled from the directory", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Eric Minassian");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Eric Minassian");
  await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
  expect(await settled(page.locator("[data-traffic]")), "the directory loaded").toBe("ready");
});

test("the projects page lists the apps from the directory", async ({ page }) => {
  const response = await page.goto("/projects");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Projects – Eric Minassian");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");

  const ledger = page.locator("[data-projects]");
  const state = await settled(ledger);
  expect(["ready", "empty"], "the directory loaded").toContain(state);
  const list = ledger.locator("[data-projects-list]");
  if (state === "ready") {
    await expect(list.getByRole("listitem").first()).toBeVisible();
    // The directory lists the site itself, which its own projects pages leave out.
    await expect(list.locator('[data-name="website"]')).toHaveCount(0);
  } else {
    await expect(ledger.locator("[data-projects-note]")).toHaveText(
      "Nothing is running right now.",
    );
  }
});

for (const path of ["/projects", "/projects/"]) {
  test(`${path} serves the projects page`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("<title>Projects – Eric Minassian</title>");
  });
}

test("an unknown path answers 404 with the site's own page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found – Eric Minassian");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  await expect(page.locator("[data-missing-path]")).toHaveText("“/no-such-page”");
});

test("the hashed files under /_astro/ are cached as immutable", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const files = [...new Set(Array.from(html.matchAll(/"(\/_astro\/[^"]+)"/g), (m) => m[1]!))];
  expect(files.length, "the home page loads files from /_astro/").toBeGreaterThan(0);
  const responses = await Promise.all(files.map((file) => request.get(file)));
  responses.forEach((response, i) => {
    expect(response.status(), files[i]).toBe(200);
    expect(response.headers()["cache-control"], files[i]).toContain("immutable");
  });
});
