import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));

const html = `<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px 100px;
    background: #f8f5ed;
    font-family: 'Newsreader', Georgia, serif;
    color: #262626;
  }
  h1 {
    font-size: 64px;
    font-weight: 500;
    letter-spacing: -0.02em;
    margin-bottom: 20px;
  }
  p {
    font-size: 28px;
    color: #525252;
    line-height: 1.5;
  }
  .domain {
    position: absolute;
    bottom: 60px;
    left: 100px;
    font-size: 22px;
    color: #a3a3a3;
  }
</style>
</head>
<body>
  <h1>Eric Minassian</h1>
  <p>Software Engineer & Tech Lead at Amazon</p>
  <span class="domain">ericminassian.com</span>
</body>
</html>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
  });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: join(__dirname, "..", "public", "og-image.png"),
    type: "png",
  });
  await browser.close();
  console.log("Generated public/og-image.png (1200x630)");
}

main();
