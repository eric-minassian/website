import { expect, test, type Page } from "@playwright/test";

const SITE_URL = "https://www.ericminassian.com";
const INDEXABLE_ROUTES = ["/", "/notes/"] as const;

const TITLE_MAX = 60;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 160;

const REQUIRED_OG_PROPS = [
  "og:type",
  "og:title",
  "og:description",
  "og:url",
  "og:site_name",
  "og:locale",
  "og:image",
  "og:image:width",
  "og:image:height",
  "og:image:alt",
] as const;

const REQUIRED_TWITTER_NAMES = [
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:image:alt",
] as const;

async function metaContent(page: Page, selector: string): Promise<string> {
  const value = await page.locator(selector).first().getAttribute("content");
  expect(value, `${selector} must have content`).not.toBeNull();
  return value ?? "";
}

async function linkHref(page: Page, selector: string): Promise<string> {
  const value = await page.locator(selector).first().getAttribute("href");
  expect(value, `${selector} must have href`).not.toBeNull();
  return value ?? "";
}

test.describe("seo metadata", () => {
  for (const route of INDEXABLE_ROUTES) {
    test.describe(route, () => {
      test.beforeEach(async ({ page }) => {
        const response = await page.goto(route);
        expect(response?.status(), `${route} must respond 200`).toBe(200);
      });

      test("title is non-empty and within 60 chars", async ({ page }) => {
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
      });

      test("description meta is within 50-160 chars", async ({ page }) => {
        const description = await metaContent(page, "meta[name='description']");
        expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
        expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
      });

      test("canonical points to absolute site URL for route", async ({ page }) => {
        const canonical = await linkHref(page, "link[rel='canonical']");
        expect(canonical).toBe(`${SITE_URL}${route}`);
      });

      test("robots meta allows indexing", async ({ page }) => {
        const robots = await metaContent(page, "meta[name='robots']");
        expect(robots).toBe("index, follow");
      });

      test("author meta is set", async ({ page }) => {
        const author = await metaContent(page, "meta[name='author']");
        expect(author).toBe("Eric Minassian");
      });

      test("viewport meta is mobile-friendly", async ({ page }) => {
        const viewport = await metaContent(page, "meta[name='viewport']");
        expect(viewport).toContain("width=device-width");
      });

      test("Open Graph tags are present and consistent", async ({ page }) => {
        const ogValues = await Promise.all(
          REQUIRED_OG_PROPS.map((prop) => metaContent(page, `meta[property='${prop}']`)),
        );
        for (const [index, value] of ogValues.entries()) {
          expect(value.length, `${REQUIRED_OG_PROPS[index]} non-empty`).toBeGreaterThan(0);
        }
        const [ogTitle, ogUrl, ogImage, docTitle] = await Promise.all([
          metaContent(page, "meta[property='og:title']"),
          metaContent(page, "meta[property='og:url']"),
          metaContent(page, "meta[property='og:image']"),
          page.title(),
        ]);
        expect(ogTitle).toBe(docTitle);
        expect(ogUrl).toBe(`${SITE_URL}${route}`);
        expect(ogImage).toMatch(/^https:\/\/.+\.(png|jpe?g|webp)$/);
      });

      test("Twitter Card tags are present", async ({ page }) => {
        const values = await Promise.all(
          REQUIRED_TWITTER_NAMES.map((name) => metaContent(page, `meta[name='${name}']`)),
        );
        for (const [index, value] of values.entries()) {
          expect(value.length, `${REQUIRED_TWITTER_NAMES[index]} non-empty`).toBeGreaterThan(0);
        }
        const card = await metaContent(page, "meta[name='twitter:card']");
        expect(card).toBe("summary_large_image");
      });

      test("exactly one h1 element", async ({ page }) => {
        const count = await page.locator("h1").count();
        expect(count).toBe(1);
      });

      test("html element has lang attribute", async ({ page }) => {
        const lang = await page.locator("html").getAttribute("lang");
        expect(lang).toBeTruthy();
      });

      test("favicon link is present", async ({ page }) => {
        const count = await page.locator("link[rel='icon']").count();
        expect(count).toBeGreaterThan(0);
      });

      test("all images have non-empty alt text", async ({ page }) => {
        const images = await page.locator("img").all();
        const alts = await Promise.all(images.map((img) => img.getAttribute("alt")));
        for (const alt of alts) {
          expect(alt, "img must have alt attribute").not.toBeNull();
        }
      });

      test("all anchor links have accessible text", async ({ page }) => {
        const links = await page.locator("a").all();
        const linkInfo = await Promise.all(
          links.map(async (link) => {
            const [text, aria, title] = await Promise.all([
              link.textContent(),
              link.getAttribute("aria-label"),
              link.getAttribute("title"),
            ]);
            return { text: text?.trim() ?? "", aria: aria ?? "", title: title ?? "" };
          }),
        );
        for (const info of linkInfo) {
          expect(info.text.length > 0 || info.aria.length > 0 || info.title.length > 0).toBe(true);
        }
      });

      test("JSON-LD parses and uses schema.org context", async ({ page }) => {
        const scripts = await page.locator("script[type='application/ld+json']").all();
        expect(scripts.length).toBeGreaterThan(0);
        const texts = await Promise.all(scripts.map((script) => script.textContent()));
        for (const raw of texts) {
          const text = raw ?? "";
          let parsed: unknown;
          expect(() => {
            parsed = JSON.parse(text);
          }).not.toThrow();
          expect(parsed).toBeTruthy();
          const data = parsed as Record<string, unknown>;
          expect(data["@context"]).toBe("https://schema.org");
        }
      });

      test("JSON-LD graph contains Person and WebSite", async ({ page }) => {
        const text =
          (await page.locator("script[type='application/ld+json']").first().textContent()) ?? "";
        const data = JSON.parse(text) as { "@graph"?: Array<{ "@type"?: string }> };
        const types = (data["@graph"] ?? []).map((node) => node["@type"]);
        expect(types).toContain("Person");
        expect(types).toContain("WebSite");
      });
    });
  }

  test("404 page is marked noindex, nofollow", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    const robots = await metaContent(page, "meta[name='robots']");
    expect(robots).toBe("noindex, nofollow");
  });

  test("robots.txt is reachable and references the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/^User-agent:\s*\*/m);
    expect(body).toMatch(/Sitemap:\s*https?:\/\/\S+sitemap.*\.xml/i);
  });

  test("sitemap-index.xml is reachable and well-formed", async ({ request }) => {
    const response = await request.get("/sitemap-index.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body.trimStart()).toMatch(/^<\?xml/);
    expect(body).toContain("<sitemapindex");
  });

  test("sitemap contains all indexable routes and excludes 404", async ({ request }) => {
    const indexResponse = await request.get("/sitemap-index.xml");
    expect(indexResponse.status()).toBe(200);
    const indexBody = await indexResponse.text();

    const subSitemapMatches = indexBody.match(/<loc>([^<]+)<\/loc>/g) ?? [];
    expect(subSitemapMatches.length).toBeGreaterThan(0);

    const subBodies = await Promise.all(
      subSitemapMatches.map(async (match) => {
        const url = match.replace(/<\/?loc>/g, "");
        const path = new URL(url).pathname;
        const subResponse = await request.get(path);
        expect(subResponse.status()).toBe(200);
        return subResponse.text();
      }),
    );

    const allUrls: string[] = [];
    for (const subBody of subBodies) {
      const urlMatches = subBody.match(/<loc>([^<]+)<\/loc>/g) ?? [];
      for (const m of urlMatches) {
        allUrls.push(m.replace(/<\/?loc>/g, ""));
      }
    }

    for (const route of INDEXABLE_ROUTES) {
      expect(allUrls.some((url) => url === `${SITE_URL}${route}`)).toBe(true);
    }
    expect(allUrls.some((url) => url.includes("/404"))).toBe(false);
  });
});
