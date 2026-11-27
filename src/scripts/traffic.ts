// Fills the home page's projects key (ProjectsKey.astro) and raises the traffic horizon
// (TrafficHorizon.astro): each day's page views as a block of halftone dots, as tall as its count
// on a linear scale and split by app, the busiest at the bottom in the largest, darkest dots.
// Pointing at a day, tapping it or stepping through the days with the arrow keys reads out its
// exact counts, above its block and app by app in the key.
import { arrow } from "../lib/icons";
import {
  dayName,
  describeViews,
  firstCounted,
  formatCount,
  formatDay,
  formatViews,
  loadProjects,
  periodOf,
  type Project,
  type Projects,
  totalOf,
} from "../lib/projects";

const SVG = "http://www.w3.org/2000/svg";
/**
 * Each band's tone (globals.css) as a fill and as a ring's stroke, and its dot radius at a 9px
 * pitch, busiest first. The class names are whole so Tailwind finds them.
 */
const FILLS = ["fill-band-1", "fill-band-2", "fill-band-3"];
const STROKES = ["stroke-band-1", "stroke-band-2", "stroke-band-3"];
const RADIUS = [3.4, 2.5, 1.7];

/** A row of the key, and the band of the horizon it names. */
export interface Band {
  /** One app, or the quieter apps that share the last band. */
  apps: Project[];
  /** What the key calls it: the app's name, or "2 others". */
  name: string;
  daily: number[];
}

/** The apps by page views, busiest first; among equals, by name. */
export const ranked = (projects: Project[]): Project[] =>
  projects.toSorted(
    (a, b) => totalOf(b.pageViews) - totalOf(a.pageViews) || a.name.localeCompare(b.name),
  );

/**
 * One band per app, busiest first, up to the tones there are; past them the quieter apps share
 * the last band as one row of the key, so every row has its own tone and neighbouring bands are
 * always far enough apart to tell apart.
 */
export function bandsOf(apps: Project[], max = FILLS.length): Band[] {
  const own = apps.length <= max ? apps : apps.slice(0, max - 1);
  const rest = apps.slice(own.length);
  const bands = [
    ...own.map((p) => ({ apps: [p], name: p.name, daily: p.pageViews })),
    ...(rest.length
      ? [
          {
            apps: rest,
            name: `${rest.length} others`,
            daily: rest[0]!.pageViews.map((_, d) => totalOf(rest.map((p) => p.pageViews[d]!))),
          },
        ]
      : []),
  ];
  // Busiest first, the others too when together they outdo the apps named on their own, so the
  // darkest band at the bottom is always the largest.
  return bands.toSorted((a, b) => totalOf(b.daily) - totalOf(a.daily));
}

/** A dot as path data: two arcs, so a row's dots are one element. */
const dot = (x: number, y: number, r: number): string =>
  `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;

/**
 * Which dot columns each day owns. Every day gets the same whole number of columns, and the days
 * exactly fill the page's column, the first starting at its left edge and today ending at its
 * right; so the spacing of the dots is whatever whole days need, as near the page's `--pitch` as
 * it can be. When there's room, the first of each day's columns is left empty, a gap between days.
 */
export interface Grid {
  pitch: number;
  /** How much of its full size each dot is drawn (a little smaller on a dark ground). */
  weight: number;
  days: number;
  /** The centre of the first day's first column, px from the chart's left. */
  x0: number;
  /** Columns per day, the gap included. */
  per: number;
  gap: boolean;
}

export function gridOf(
  column: { from: number; to: number },
  days: number,
  target: number,
  weight = 1,
): Grid {
  const width = column.to - column.from;
  const ideal = width / (target * Math.max(1, days));
  // Whichever whole number of columns per day keeps the spacing closest to the target.
  const per = [Math.floor(ideal), Math.ceil(ideal)]
    .filter((n) => n >= 1)
    .reduce(
      (best, n) =>
        Math.abs(Math.log(width / (n * days) / target)) <
        Math.abs(Math.log(width / (best * days) / target))
          ? n
          : best,
      1,
    );
  const pitch = width / (per * days);
  // A gap only when a day keeps at least two columns of dots; on a phone, days stand side by side.
  return { pitch, weight, days, x0: column.from + pitch / 2, per, gap: per >= 3 };
}

/**
 * The x of each of day `d`'s dot columns. With a gap column, they sit on the grid after it.
 * Without one (two columns a day, on a phone), a day's columns draw closer together than the grid
 * so that each day reads as a pair, a little apart from its neighbours.
 */
const columnsOf = ({ pitch, x0, per, gap }: Grid, d: number): number[] => {
  if (gap) return Array.from({ length: per - 1 }, (_, i) => x0 + (d * per + i + 1) * pitch);
  const middle = x0 + (d * per + (per - 1) / 2) * pitch;
  return Array.from({ length: per }, (_, i) => middle + (i - (per - 1) / 2) * pitch * 0.8);
};

/** The middle of day `d`'s dots. */
export const dayX = (grid: Grid, d: number): number => {
  const xs = columnsOf(grid, d);
  return (xs[0]! + xs.at(-1)!) / 2;
};

/** The day whose columns are under `x`. */
export const dayAt = ({ pitch, x0, per, days }: Grid, x: number): number =>
  Math.min(days - 1, Math.max(0, Math.floor((x - x0 + pitch / 2) / (per * pitch))));

/** The grid's edges, px from the chart's left: where the first day starts and today ends. */
export const gridEdges = ({ pitch, x0, per, days }: Grid) => ({
  from: x0 - pitch / 2,
  to: x0 + (per * days - 0.5) * pitch,
});

/** Room kept clear above the strata for a day's reading and the busiest day's note, px. */
export const HEADROOM = 26;

/** How many rows of dots a chart `height` px tall has room for under its headroom. */
const capacityOf = (height: number, pitch: number): number =>
  Math.max(1, Math.floor((height - HEADROOM) / pitch));

/**
 * How many rows a day with `total` views stands, of `capacity`: its share of the busiest day,
 * rounded to whole rows. A day with some traffic but less than half a row's worth stands none; it
 * gets a single smaller dot instead (see `dotsOf`).
 */
export const rowsOf = (total: number, peak: number, capacity: number): number =>
  peak > 0 ? Math.round((total / peak) * capacity) : 0;

/** One dot of the strata. */
interface Dot {
  x: number;
  y: number;
  r: number;
  band: number;
  row: number;
  /** Today's top row, still counting, is drawn as a ring. */
  ring: boolean;
}

/**
 * Day `d`'s dots, in a chart `height` px tall on `grid`, where the busiest day had `peak` views.
 * Its rows are split between the bands by each app's share of the day, the busiest at the bottom.
 * A day too quiet for a whole row gets one dot on the ground, its area its share of a row, so two
 * views and two hundred don't look alike.
 */
function dotsOf(bands: Band[], grid: Grid, height: number, d: number, peak: number): Dot[] {
  const total = totalOf(bands.map((b) => b.daily[d]!));
  if (total === 0) return [];
  const { pitch } = grid;
  const scale = (pitch / 9) * grid.weight;
  const capacity = capacityOf(height, pitch);
  const count = rowsOf(total, peak, capacity);
  const today = d === grid.days - 1;
  // Which band row `r` of `count` belongs to, by each app's share of the day.
  const bandOf = (r: number) => {
    const at = ((r + 0.5) / Math.max(1, count)) * total;
    let below = 0;
    let band = 0;
    for (let i = 0; i < bands.length; i++) {
      if (bands[i]!.daily[d]! <= 0) continue;
      band = i;
      below += bands[i]!.daily[d]!;
      if (below >= at) break;
    }
    return band;
  };
  const ground = height - pitch / 2;
  return columnsOf(grid, d).flatMap((x): Dot[] => {
    if (count === 0) {
      const band = bandOf(0);
      const share = Math.sqrt(Math.max(0.12, (total / peak) * capacity));
      return [
        {
          x,
          y: ground,
          r: Math.max(1.1, RADIUS[band]! * scale * share),
          band,
          row: 0,
          ring: today,
        },
      ];
    }
    return Array.from({ length: count }, (_, row) => {
      const band = bandOf(row);
      const ring = today && row === count - 1;
      const r = RADIUS[band]! * scale;
      return { x, y: ground - row * pitch, r: ring ? Math.max(1.4, r - 0.5) : r, band, row, ring };
    });
  });
}

/** Dots as paths, one per row and band (and one for rings), each tagged for the styles. */
function paths(dots: Dot[]): SVGPathElement[] {
  const groups = new Map<string, { d: string; band: number; row: number; ring: boolean }>();
  for (const { x, y, r, band, row, ring } of dots) {
    const key = ring ? "ring" : `${row}:${band}`;
    const group = groups.get(key) ?? { d: "", band, row, ring };
    group.d += dot(x, y, r);
    groups.set(key, group);
  }
  return [...groups.values()].map(({ d, band, row, ring }) => {
    const el = document.createElementNS(SVG, "path");
    el.setAttribute("d", d);
    el.setAttribute("class", ring ? `today fill-none ${STROKES[band]}` : FILLS[band]!);
    el.dataset.band = String(band);
    el.style.setProperty("--row", String(row));
    return el;
  });
}

/**
 * The strata at `width` × `height` on `grid`, standing on a ground row of faint dots in step with
 * them from one edge of the chart to the other. Each row of each band is one path, so the strata
 * can rise row by row while a phone lays out a few dozen nodes rather than hundreds of dots.
 */
export function strata(bands: Band[], width: number, height: number, grid: Grid): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  const { days, pitch } = grid;
  // The ground: in step with the days' columns across the grid, on the grid's pitch either side.
  const edges = gridEdges(grid);
  const xs = Array.from({ length: days }, (_, d) => columnsOf(grid, d)).flat();
  for (let x = edges.from - pitch / 2; x > 0; x -= pitch) xs.push(x);
  for (let x = edges.to + pitch / 2; x < width; x += pitch) xs.push(x);
  if (grid.gap) {
    for (let d = 0; d < days; d++) xs.push(grid.x0 + d * grid.per * pitch);
  }
  const ground = xs.map((x) => dot(x, height - pitch / 2, 0.9)).join("");
  const floor = document.createElementNS(SVG, "path");
  floor.setAttribute("d", ground);
  floor.setAttribute("class", "fill-faint");
  const peak = Math.max(
    0,
    ...Array.from({ length: days }, (_, d) => totalOf(bands.map((b) => b.daily[d]!))),
  );
  const dots = Array.from({ length: days }, (_, d) => dotsOf(bands, grid, height, d, peak)).flat();
  const rows = Math.max(1, ...dots.map((dt) => dt.row + 1));
  // However tall the strata, the rise from the ground takes under half a second.
  svg.style.setProperty("--stagger", `${Math.min(24, 300 / rows)}ms`);
  svg.append(floor, ...paths(dots));
  return svg;
}

/** Day `d`'s dots alone, drawn at full strength over the strata while the rest are quieted. */
export function dayLayer(bands: Band[], height: number, grid: Grid, d: number): SVGGElement {
  const g = document.createElementNS(SVG, "g");
  g.setAttribute("class", "day-layer");
  const peak = Math.max(
    0,
    ...Array.from({ length: grid.days }, (_, i) => totalOf(bands.map((b) => b.daily[i]!))),
  );
  g.append(...paths(dotsOf(bands, grid, height, d, peak)));
  return g;
}

/** A band's swatch in the key: a patch of its dots, in its size and tone. */
function swatch(band: number): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", FILLS[band]!);
  const path = document.createElementNS(SVG, "path");
  const r = Math.max(2, RADIUS[band]! * (8 / 9));
  path.setAttribute("d", [4, 12].flatMap((x) => [4, 12].map((y) => dot(x, y, r))).join(""));
  svg.append(path);
  return svg;
}

/** A count as shown, with what a screen reader hears beside it. */
function figure(el: HTMLElement, n: number): void {
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  shown.textContent = formatViews(n);
  const heard = document.createElement("span");
  heard.className = "sr-only";
  heard.textContent = describeViews(n);
  el.replaceChildren(shown, heard);
  el.classList.toggle("text-muted", n === 0);
}

/**
 * A row of the key: the band's swatch, its name (a link to the app, or to /projects for the
 * others), its count, and under the name what it is, so the key says what each app does, not only
 * how busy it is. `band` is its place in the stack, which sets its tone; `position` its place in
 * the key.
 */
function keyRow(row: Band, band: number, position: number): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "key-row arrive";
  li.style.setProperty("--i", String(position));
  li.dataset.band = String(band);
  const mark = document.createElement("span");
  mark.className = "key-swatch";
  mark.append(swatch(band));

  const name = document.createElement("span");
  name.className = "key-name";
  const link = document.createElement("a");
  link.className = "link-quiet tap";
  const text = document.createElement("span");
  text.className = "key-name-text";
  text.textContent = row.name;
  link.append(text);
  const [only] = row.apps;
  if (row.apps.length === 1 && only) {
    // An app opens in a new tab; the arrow says so.
    link.href = only.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.append(arrow("out"));
  } else {
    // The others are listed on /projects; the arrow says it's a page here.
    link.href = "/projects";
    link.append(arrow("right"));
  }
  name.append(link);
  if (row.apps.some((p) => p.up === false)) {
    const down = document.createElement("span");
    down.className = "key-down";
    down.textContent = "down";
    name.append(down);
  }

  const total = document.createElement("span");
  total.className = "text-right";
  total.dataset.total = "";
  figure(total, totalOf(row.daily));

  const about = document.createElement("span");
  about.className = "key-about";
  about.textContent =
    row.apps.length === 1 && only
      ? (only.description ?? "")
      : row.apps.map((p) => p.name).join(", ");
  li.append(mark, name, total, about);
  return li;
}

/** The band a row of the key names. */
const bandOfRow = (row: HTMLLIElement): number => Number(row.dataset.band);

/** Keeps only the days the platform counted, from `countingSince` on. */
const counted = (projects: Projects): { days: string[]; apps: Project[] } => {
  const start = firstCounted(projects);
  return {
    days: projects.days.slice(start),
    apps: projects.projects.map((p) => ({
      ...p,
      pageViews: p.pageViews.slice(start),
      requests: p.requests.slice(start),
    })),
  };
};

export async function initTraffic(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-traffic]");
  const horizon = document.querySelector<HTMLElement>("[data-horizon]");
  if (!root || !horizon) return;
  const placeholder = root.querySelector<HTMLElement>("[data-traffic-placeholder]")!;
  const list = root.querySelector<HTMLUListElement>("[data-traffic-list]")!;
  const period = root.querySelector<HTMLElement>("[data-traffic-period]")!;
  const chart = horizon.querySelector<HTMLElement>("[data-horizon-chart]")!;
  const scrub = horizon.querySelector<HTMLElement>("[data-horizon-scrub]")!;
  const axis = horizon.querySelector<HTMLElement>("[data-horizon-axis]")!;
  const guide = horizon.querySelector<HTMLElement>("[data-horizon-guide]")!;
  const label = horizon.querySelector<HTMLElement>("[data-horizon-label]")!;
  const peakLabel = horizon.querySelector<HTMLElement>("[data-horizon-peak]")!;
  const start = horizon.querySelector<HTMLElement>("[data-horizon-start]")!;

  let projects: Projects;
  try {
    projects = await loadProjects();
  } catch (error) {
    // The heading still leads to /projects; the horizon isn't drawn.
    console.error(error);
    placeholder.hidden = true;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "link tap cursor-pointer";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => {
      placeholder.hidden = false;
      period.textContent = "";
      root.dataset.state = "loading";
      horizon.dataset.state = "loading";
      // Keep the keyboard in the key while it reloads, rather than dropping it to the page.
      root.querySelector<HTMLElement>("#projects-heading a")?.focus();
      void initTraffic();
    });
    period.replaceChildren("Traffic is unavailable right now. ", retry);
    root.dataset.state = "error";
    horizon.dataset.state = "error";
    return;
  }

  placeholder.hidden = true;
  const { days, apps: counts } = counted(projects);
  const bands = bandsOf(ranked(counts));
  root.dataset.state = "ready";
  if (bands.length === 0) {
    period.textContent = "Nothing is running right now.";
    horizon.dataset.state = "empty";
    return;
  }
  // The key names the apps first, busiest first, and the others after them, whatever their tone.
  const order = bands
    .map((_, i) => i)
    .toSorted((a, b) => Number(bands[a]!.apps.length > 1) - Number(bands[b]!.apps.length > 1));
  list.replaceChildren(...order.map((band, position) => keyRow(bands[band]!, band, position)));
  list.hidden = false;
  const periodText = periodOf(projects);
  period.textContent = periodText;
  start.textContent = formatDay(days[0]!);
  horizon.dataset.state = "ready";

  const totals = days.map((_, d) => totalOf(bands.map((b) => b.daily[d]!)));
  const peakDay = totals.indexOf(Math.max(...totals));
  /** The day being read out, if any. */
  let shownDay: number | null = null;

  // Pointing at or focusing an app in the key picks out its band.
  const rows = [...list.querySelectorAll<HTMLLIElement>("li")];
  const focusBand = (band: number | null) => {
    if (band === null) delete root.dataset.focus;
    else root.dataset.focus = String(band);
    for (const row of rows) row.classList.toggle("is-focused", bandOfRow(row) === band);
    for (const path of chart.querySelectorAll<SVGPathElement>("path[data-band]")) {
      path.classList.toggle("is-quiet", band !== null && path.dataset.band !== String(band));
    }
  };
  for (const row of rows) {
    row.addEventListener("pointerenter", () => focusBand(bandOfRow(row)));
    row.addEventListener("pointerleave", () => focusBand(null));
    row.addEventListener("focusin", () => focusBand(bandOfRow(row)));
    row.addEventListener("focusout", () => focusBand(null));
  }

  let grid: Grid = { pitch: 9, weight: 1, days: days.length, x0: 0, per: 1, gap: false };
  const measure = () => {
    const box = chart.getBoundingClientRect();
    const column = axis.getBoundingClientRect();
    const inset = getComputedStyle(axis);
    const from = column.left + parseFloat(inset.paddingLeft) - box.left;
    const to = column.right - parseFloat(inset.paddingRight) - box.left;
    const style = getComputedStyle(chart);
    const pitch = parseFloat(style.getPropertyValue("--pitch")) || 9;
    const weight = parseFloat(style.getPropertyValue("--dot-scale")) || 1;
    grid = gridOf({ from, to }, days.length, pitch, weight);
    const edges = gridEdges(grid);
    scrub.style.left = `${edges.from}px`;
    scrub.style.width = `${edges.to - edges.from}px`;
  };

  /** Where day `d`'s top dot's top edge is, px from the chart's top. */
  const crestOf = (d: number) => {
    const height = chart.clientHeight;
    const capacity = Math.max(1, Math.floor((height - HEADROOM) / grid.pitch));
    const stands = Math.max(1, rowsOf(totals[d]!, totals[peakDay]!, capacity));
    return height - stands * grid.pitch;
  };

  /**
   * Puts a note centred over day `d`, inside the grid: just above the highest block anywhere under
   * it, so a quiet day's reading sits near its data, and never higher than the headroom, which no
   * block reaches; returns its top.
   */
  const place = (note: HTMLElement, d: number): number => {
    const width = note.offsetWidth;
    const edges = gridEdges(grid);
    const left = Math.min(edges.to - width, Math.max(edges.from, dayX(grid, d) - width / 2));
    const reach = (grid.per * grid.pitch) / 2;
    const under = days
      .map((_, i) => i)
      .filter((i) => dayX(grid, i) + reach >= left && dayX(grid, i) - reach <= left + width);
    const crest = Math.min(
      ...under.map((i) => (totals[i]! > 0 ? crestOf(i) : chart.clientHeight - grid.pitch)),
    );
    const top = Math.max(HEADROOM - note.offsetHeight - 8, crest - note.offsetHeight - 10);
    note.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
    return top;
  };

  // The busiest day is named in the headroom once the strata have risen, so heights have a scale.
  const showPeak = () => {
    peakLabel.hidden = shownDay !== null;
    if (peakLabel.hidden) return;
    peakLabel.textContent = `${dayName(days, peakDay)} · ${formatCount(totals[peakDay]!)}`;
    place(peakLabel, peakDay);
  };

  // Reading a day: the other days quiet down and its own dots stay, its total above it with a
  // thread down to its top, and each app's count in the key.
  const showDay = (d: number | null) => {
    shownDay = d;
    for (const row of rows) {
      const band = bands[bandOfRow(row)]!;
      const total = row.querySelector<HTMLElement>("[data-total]")!;
      figure(total, d === null ? totalOf(band.daily) : band.daily[d]!);
    }
    label.hidden = guide.hidden = d === null;
    showPeak();
    const svg = chart.querySelector("svg");
    svg?.querySelector(".day-layer")?.remove();
    svg?.classList.toggle("is-reading", d !== null);
    if (d === null) {
      period.textContent = periodText;
      return;
    }
    svg?.append(dayLayer(bands, chart.clientHeight, grid, d));
    // On the chart, the short form; the slider's value and the key's caption say it in full.
    const reading = `${dayName(days, d)} · ${describeViews(totals[d]!).toLowerCase()}`;
    label.textContent = `${dayName(days, d)} · ${formatCount(totals[d]!)}`;
    const top = place(label, d) + label.offsetHeight + 4;
    const bottom = totals[d]! > 0 ? crestOf(d) - 3 : chart.clientHeight - grid.pitch;
    guide.style.translate = `${Math.round(dayX(grid, d))}px ${Math.round(top)}px`;
    guide.style.height = `${Math.max(0, bottom - top)}px`;
    period.textContent =
      d === days.length - 1 ? "Page views today so far" : `Page views on ${formatDay(days[d]!)}`;
    scrub.setAttribute("aria-valuenow", String(d));
    scrub.setAttribute("aria-valuetext", reading.replace(" · ", ": "));
  };

  const dayUnder = (e: PointerEvent) => dayAt(grid, e.clientX - chart.getBoundingClientRect().left);
  scrub.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") showDay(dayUnder(e));
  });
  scrub.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") showDay(dayUnder(e));
  });
  scrub.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !scrub.matches(":focus-visible")) showDay(null);
  });
  // A tap anywhere else puts a tapped-out reading away.
  document.addEventListener("pointerdown", (e) => {
    if (shownDay !== null && e.target instanceof Node && !scrub.contains(e.target)) {
      showDay(null);
    }
  });

  // From the keyboard the strata are a slider over the days, starting from today.
  scrub.tabIndex = 0;
  scrub.hidden = false;
  scrub.setAttribute("aria-valuemax", String(days.length - 1));
  scrub.setAttribute("aria-valuenow", String(days.length - 1));
  scrub.setAttribute(
    "aria-valuetext",
    `${dayName(days, days.length - 1)}: ${describeViews(totals.at(-1)!).toLowerCase()}`,
  );
  scrub.addEventListener("focus", () => {
    if (scrub.matches(":focus-visible")) showDay(shownDay ?? days.length - 1);
  });
  scrub.addEventListener("blur", () => showDay(null));
  scrub.addEventListener("keydown", (e) => {
    const d = shownDay ?? days.length - 1;
    const step: Record<string, number> = {
      ArrowLeft: d - 1,
      ArrowDown: d - 1,
      ArrowRight: d + 1,
      ArrowUp: d + 1,
      PageDown: d - 7,
      PageUp: d + 7,
      Home: 0,
      End: days.length - 1,
    };
    // Escape puts the reading away and leaves the keyboard where it was.
    if (e.key === "Escape") return showDay(null);
    if (!(e.key in step)) return;
    e.preventDefault();
    showDay(Math.min(days.length - 1, Math.max(0, step[e.key]!)));
  });

  let frame = 0;
  let drawn = false;
  const redraw = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      measure();
      const svg = strata(bands, chart.clientWidth, chart.clientHeight, grid);
      // The strata rise from the ground the first time, the busiest day's note after them; a
      // resize just redraws them.
      if (!drawn) {
        svg.classList.add("rise");
        peakLabel.classList.add("after-rise");
        peakLabel.addEventListener("animationend", () => peakLabel.classList.remove("after-rise"), {
          once: true,
        });
      }
      drawn = true;
      chart.replaceChildren(svg);
      // The strata bring their own ground, in step with them; the CSS one held the place.
      chart.dataset.drawn = "";
      showDay(shownDay);
    });
  };
  new ResizeObserver(redraw).observe(chart);
  // A theme flip changes how large the dots are drawn (`--dot-scale`), so it redraws them too.
  new MutationObserver(redraw).observe(document.documentElement, { attributeFilter: ["class"] });
}
