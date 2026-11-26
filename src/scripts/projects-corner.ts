// Draws the home page's projects corner (ProjectsCorner.astro): a key naming each app with its
// page views, and the days' traffic as halftone strata, one band per app in the key's order and
// dot size, smoothed so the shape reads as a picture, not a bar chart (/projects has the exact
// days).
import {
  describeViews,
  formatDay,
  formatViews,
  loadProjects,
  type Project,
  totalOf,
} from "../lib/projects";

const SVG = "http://www.w3.org/2000/svg";
/** Distance between dot centres, px. */
const PITCH = 9;
/** Each band's dot radius and opacity, busiest first; the last band holds whatever doesn't fit. */
const RADIUS = [3.6, 2.5, 1.7, 1.1, 0.8];
const OPACITY = [1, 0.7, 0.5, 0.38, 0.3];
/** How far a day's traffic spreads into its neighbours, in days. */
const SPREAD = 1.1;

export interface Band {
  name: string;
  total: number;
  daily: number[];
}

/** The busiest first; past the bands there are dot sizes for, the rest share the last as "N more". */
export function bandsOf(projects: Project[], max = RADIUS.length): Band[] {
  const ranked = projects
    .map((p) => ({ name: p.name, total: totalOf(p.pageViews), daily: p.pageViews }))
    .toSorted((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  if (ranked.length <= max) return ranked;
  const rest = ranked.slice(max - 1);
  return [
    ...ranked.slice(0, max - 1),
    {
      name: `${rest.length} more`,
      total: totalOf(rest.map((b) => b.total)),
      daily: rest[0]!.daily.map((_, d) => totalOf(rest.map((b) => b.daily[d]!))),
    },
  ];
}

const smoothed = (daily: number[], at: number): number =>
  daily.reduce((v, n, d) => v + n * Math.exp(-((at - d) ** 2) / (2 * SPREAD ** 2)), 0);

const circle = (x: number, y: number, r: number): SVGCircleElement => {
  const c = document.createElementNS(SVG, "circle");
  c.setAttribute("cx", x.toFixed(1));
  c.setAttribute("cy", y.toFixed(1));
  c.setAttribute("r", r.toFixed(2));
  return c;
};

/**
 * The strata at `width` × `height`: a column of dots every `PITCH` px, the oldest day at the left
 * and today at the right edge. A column's height follows the square root of its traffic, so quiet
 * days still show beside the busiest; the bands split it by each app's share. Dots shrink toward
 * the top edge, and the bottom row keeps faint dots where there's nothing, so the 30 days read.
 */
export function strata(bands: Band[], width: number, height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("class", "fill-muted");
  const days = bands[0]?.daily.length ?? 0;
  const columns = Math.ceil(width / PITCH);
  const xs = Array.from(
    { length: columns },
    (_, c) => width - PITCH / 2 - (columns - 1 - c) * PITCH,
  );
  const at = (x: number) => (days > 1 ? (x / width) * (days - 1) : 0);
  const totals = xs.map((x) => bands.map((b) => smoothed(b.daily, at(x))));
  const peak = Math.max(0, ...totals.map((t) => Math.sqrt(totalOf(t))));
  const faint = document.createElementNS(SVG, "g");
  faint.setAttribute("class", "fill-faint");
  const layers = bands.map((_, i) => {
    const g = document.createElementNS(SVG, "g");
    g.setAttribute("fill-opacity", String(OPACITY[i]));
    return g;
  });

  xs.forEach((x, c) => {
    const shares = totals[c]!;
    const total = totalOf(shares);
    const top = peak ? (Math.sqrt(total) / peak) * (height - PITCH) : 0;
    for (let y = height - PITCH / 2, row = 0; y > 0; y -= PITCH, row++) {
      const up = height - y;
      if (total > 0 && up <= top) {
        let band = 0;
        for (let below = (shares[0]! / total) * top; up > below && band < bands.length - 1;) {
          band++;
          below += (shares[band]! / total) * top;
        }
        const fade = 0.55 + 0.45 * Math.min(1, (top - up) / (2 * PITCH));
        layers[band]!.append(circle(x, y, RADIUS[band]! * fade));
      } else if (row === 0) {
        faint.append(circle(x, y, 0.9));
      }
    }
  });
  svg.append(faint, ...layers);
  return svg;
}

function keyRow(band: Band, index: number): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "grid grid-cols-[1rem_1fr_auto] items-center gap-x-2";
  const swatch = document.createElementNS(SVG, "svg");
  swatch.setAttribute("width", "12");
  swatch.setAttribute("height", "12");
  swatch.setAttribute("aria-hidden", "true");
  swatch.setAttribute("class", "fill-muted");
  const dot = circle(6, 6, RADIUS[index]! + 0.6);
  dot.setAttribute("fill-opacity", String(OPACITY[index]));
  swatch.append(dot);
  const name = document.createElement("span");
  name.textContent = band.name;
  const total = document.createElement("span");
  total.className = "text-right";
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  shown.textContent = formatViews(band.total);
  const heard = document.createElement("span");
  heard.className = "sr-only";
  heard.textContent = describeViews(band.total);
  total.append(shown, heard);
  li.append(swatch, name, total);
  return li;
}

export async function initProjectsCorner(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-corner]");
  if (!root) return;
  const list = root.querySelector<HTMLUListElement>("[data-corner-list]")!;
  const period = root.querySelector<HTMLElement>("[data-corner-period]")!;
  const chart = root.querySelector<HTMLElement>("[data-corner-chart]")!;

  let projects;
  try {
    projects = await loadProjects();
  } catch (error) {
    // The heading still leads to /projects, which says what went wrong.
    console.error(error);
    root.dataset.state = "error";
    return;
  }

  const bands = bandsOf(projects.projects);
  list.replaceChildren(...bands.map(keyRow));
  list.hidden = bands.length === 0;
  period.textContent = projects.countingSince
    ? `Page views since ${formatDay(projects.countingSince)}`
    : `Page views, last ${projects.days.length} days`;

  let frame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() =>
      chart.replaceChildren(strata(bands, chart.clientWidth, chart.clientHeight)),
    );
  }).observe(chart);
  root.dataset.state = "ready";
}
