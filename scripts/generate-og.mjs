import { readFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

// The site's own Newsreader file, embedded, so the card matches the pages and needs no network.
const font = readFileSync(
  join(
    import.meta.dirname,
    "..",
    "node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2",
  ),
).toString("base64");

/**
 * A quiet halftone horizon along the foot of the card, drawn like the home page's: a block of dots
 * per day on a ground row, the busiest app's dots at the bottom, largest and darkest. The days are
 * fixed, the same every time, rather than any day's real traffic.
 */
function horizon() {
  const width = 1200;
  const height = 160;
  const pitch = 12;
  const per = 3;
  const tones = ["#4b4743", "#6a6661", "#8e8a84"];
  const radius = [4.5, 3.3, 2.3];
  // Rows of dots per day and band, oldest first; today, still counting, ends in rings.
  const days = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [1, 0, 0],
    [3, 1, 0],
    [4, 7, 0],
    [1, 1, 0],
    [0, 0, 0],
    [0, 0, 0],
    [1, 0, 0],
    [0, 0, 1],
    [0, 0, 0],
    [0, 0, 0],
    [3, 0, 1],
  ];
  const dots = [];
  const columns = Math.floor(width / pitch);
  // Today ends in line with the text's right margin, as the home page's ends at its column's edge.
  const first = columns - 8 - days.length * per;
  for (let c = 0; c < columns; c++) {
    const x = c * pitch + pitch / 2;
    const d = Math.floor((c - first) / per);
    const rows = c >= first && (c - first) % per !== 0 ? days[d] : null;
    const stack = rows ? rows.flatMap((n, band) => Array(n).fill(band)) : [];
    if (stack.length === 0) {
      dots.push(`<circle cx="${x}" cy="${height - pitch / 2}" r="1.3" fill="#d2ccc1"/>`);
      continue;
    }
    stack.forEach((band, r) => {
      const y = height - pitch / 2 - r * pitch;
      const ring = d === days.length - 1 && r === stack.length - 1;
      dots.push(
        ring
          ? `<circle cx="${x}" cy="${y}" r="${radius[band] - 0.6}" fill="none" stroke="${tones[band]}" stroke-width="1.2"/>`
          : `<circle cx="${x}" cy="${y}" r="${radius[band]}" fill="${tones[band]}"/>`,
      );
    });
  }
  return `<svg class="horizon" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${dots.join("")}</svg>`;
}

const html = `<!DOCTYPE html>
<html>
<head>
<style>
  @font-face {
    font-family: "Newsreader";
    src: url(data:font/woff2;base64,${font}) format("woff2");
    font-weight: 200 800;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    position: relative;
    width: 1200px;
    height: 630px;
    padding: 112px 100px 0;
    background: #f8f5ed;
    font-family: "Newsreader", Georgia, serif;
    color: #2a2622;
  }
  h1 {
    font-size: 72px;
    font-weight: 500;
    letter-spacing: -0.01em;
    margin-bottom: 18px;
  }
  p {
    font-size: 32px;
    line-height: 1.45;
    color: #2a2622;
  }
  .domain {
    margin-top: 10px;
    font-size: 24px;
    color: #6b655d;
  }
  .horizon {
    position: absolute;
    left: 0;
    bottom: 36px;
  }
</style>
</head>
<body>
  <h1>Eric Minassian</h1>
  <p>Software engineer and tech lead at Amazon</p>
  <p class="domain">ericminassian.com</p>
  ${horizon()}
</body>
</html>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: join(import.meta.dirname, "..", "public", "og-image.png"),
    type: "png",
  });
  await browser.close();
  console.log("Generated public/og-image.png (1200x630)");
}

await main();
