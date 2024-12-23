import { expect, test } from "@playwright/test";
import { personalConfig, siteConfig } from "../src/config";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("meta is correct", async ({ page }) => {
  await expect(page).toHaveTitle(siteConfig.title);
});

test("main heading is correct", async ({ page }) => {
  const mainHeadingSelector = "h1";
  await expect(page.locator(mainHeadingSelector)).toHaveText(
    `hey, i'm ${personalConfig.name} ${personalConfig.emoji}`
  );
});

test("should have correct external links", async ({ page }) => {
  for (const link of personalConfig.externalLinks) {
    const externalLink = page.locator(`a[href="${link.href}"]`);
    await expect(externalLink).toHaveText(link.text);
  }
});

test("should render Badge components correctly", async ({ page }) => {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = personalConfig.description.matchAll(regex);

  for (const match of matches) {
    const [_, text, href] = match;
    const badgeElement = page.locator(`a[href="${href}"] span.no-prose`);
    await expect(badgeElement).toHaveText(text);
  }
});
