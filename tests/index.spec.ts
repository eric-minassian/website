import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("meta is correct", async ({ page }) => {
  await expect(page).toHaveTitle("Eric Minassian");
});

test("main heading is correct", async ({ page }) => {
  const mainHeadingSelector = "h1";
  await expect(page.locator(mainHeadingSelector)).toHaveText(
    "hey, i'm eric 👋"
  );
});

test("should have correct external links", async ({ page }) => {
  const links = [
    { href: "https://linkedin.com/in/minassian-eric", text: "linkedin" },
    { href: "/Eric_Minassian_resume.pdf", text: "resume" },
    { href: "https://github.com/eric-minassian", text: "github" },
    { href: "mailto:eric@ericminassian.com", text: "email" },
  ];

  for (const link of links) {
    const externalLink = page.locator(`a[href="${link.href}"]`);
    await expect(externalLink).toHaveText(link.text);
  }
});

test("should render Badge components correctly", async ({ page }) => {
  const badges = [
    { href: "https://amazon.com", text: "Amazon" },
    {
      href: "https://www.aboutamazon.com/what-we-do/devices-services/project-kuiper",
      text: "Project Kuiper",
    },
    { href: "https://tech.walmart.com", text: "Walmart Global Tech" },
    { href: "https://uci.edu", text: "University of California, Irvine" },
  ];

  for (const badge of badges) {
    const badgeElement = page.locator(`a[href="${badge.href}"] span.no-prose`);
    await expect(badgeElement).toHaveText(badge.text);
  }
});
