import { fitText } from "../lib/fit";
// Fills the home page's projects key (ProjectsKey.astro) and raises the traffic horizon
// (TrafficHorizon.astro): each day's page views as a block of halftone dots, as tall as its count
// on a linear scale and split by app, the busiest at the bottom in the largest, darkest dots.
// Pointing at a day, tapping it or stepping through the days with the arrow keys reads out its
// exact counts, above its block and app by app in the key.
import { arrow } from "../lib/icons";
import { leave } from "../lib/leave";
import {
  dayName,
  keptProjects,
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
import { touchScrub } from "../lib/scrub";

const SVG = "http://www.w3.org/2000/svg";
/**
 * Each band's tone (globals.css) as a fill and as a ring's stroke, and its dot radius at a 9px
 * pitch, busiest first. The class names are whole so Tailwind finds them.
 */
const FILLS = ["fill-band-1", "fill-band-2", "fill-band-3"];
const STROKES = ["stroke-band-1", "stroke-band-2", "stroke-band-3"];
const RADIUS = [3.4, 2.6, 2];

/** A row of the key, and the band of the horizon it names. */
export interface Band {
  /** One app, or the quieter apps that share the last band. */
  apps: Project[];
  /** What the key calls it: the app's name, or "2 others". */
  name: string;
  daily: number[];
  /** Its dots' radius at a 9px pitch: the busiest app's largest, as its tone is darkest. */
  radius: number;
  /**
   * Whether it's the others, together: drawn in a texture of its own (two fine dots in each
   * cell, of a middle weight), so a group that adds up to more than an app reads as a group, not
   * as the lightest app, and the apps' sizes and tones keep one order.
   */
  group: boolean;
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
  const groups = [
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
  // Busiest first, as ranked, and the others last whatever they add up to: a group isn't an app, so
  // it never takes the darkest band from one, and the key, its tones and the stack read in one order.
  return groups.map((g, i) => ({ ...g, radius: RADIUS[i]!, group: g.apps.length > 1 }));
}

/** Where a band's dots stand in a cell centred on (x, y): one, or the others' two fine ones. */
const cellOf = (
  band: Band,
  x: number,
  y: number,
  r: number,
): { x: number; y: number; r: number }[] => {
  if (!band.group) return [{ x, y, r }];
  // Two dots of about two-thirds of a middle one's radius, on the cell's diagonal.
  const fine = (r / band.radius) * RADIUS[1]! * 0.62;
  const off = fine * 0.95;
  return [
    { x: x - off, y: y + off, r: fine },
    { x: x + off, y: y - off, r: fine },
  ];
};

/**
 * The count a full-height block stands for: the busiest day's, but never under `FLOOR`, nor under
 * `PER_ROW` views for each row of dots the chart has room for. So a few days of a hundred views or
 * so stand as the modest days they are, about as tall on a tall window as on a small one, not as
 * tall as thousands.
 */
const FLOOR = 250;
const PER_ROW = 7;
export const scaleOf = (bands: Band[], days: number, capacity: number): number =>
  Math.max(
    FLOOR,
    PER_ROW * capacity,
    ...Array.from({ length: days }, (_, d) => totalOf(bands.map((b) => b.daily[d]!))),
  );

/** A dot as path data: two arcs, so a row's dots are one element. */
const dot = (x: number, y: number, r: number): string =>
  `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;

/** The most dot columns a day gets, its gap included: a short window's days don't become slabs. */
const MAX_PER = 8;

/**
 * Which dot columns each day owns. Every day of the platform's window gets the same whole number
 * of columns, and the window exactly fills the page's column, its first day starting at the left
 * edge and today ending at the right; so the spacing of the dots is whatever whole days need, as
 * near the page's `--pitch` as rounding gets. Counted days that don't fill the window (counting
 * began within it) keep a whole window's spacing and stand at its right end. When there's room,
 * the first of each day's columns is left empty, a gap between days.
 *
 * The loading ground (`.ground` in globals.css) works out the same spacing in CSS, so the drawn
 * ground lands exactly on it: the two must round the same way.
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

/**
 * The grid for `days` counted days, the last `days` of a window `slots` days long, in `column`.
 * A gap only when a day keeps at least two columns of dots; on a phone, days stand side by side.
 */
export function gridOf(
  column: { from: number; to: number },
  days: number,
  target: number,
  weight = 1,
  slots = days,
): Grid {
  const width = column.to - column.from;
  const per = Math.max(1, Math.round(width / (target * Math.max(1, slots))));
  if (per > MAX_PER) {
    // A window too short to fill the column at a day's widest keeps the target spacing, today at
    // the right edge, the ground running on to the left.
    const x0 = column.to - (MAX_PER * days - 0.5) * target;
    return { pitch: target, weight, days, x0, per: MAX_PER, gap: true };
  }
  const pitch = width / (per * slots);
  const x0 = column.from + ((slots - days) * per + 0.5) * pitch;
  return { pitch, weight, days, x0, per, gap: per >= 3 };
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
export const HEADROOM = 30;

/** Room kept under the ground row for the weeks' ticks, px. */
export const FOOT = 6;

/** How many rows of dots a chart `height` px tall has room for under its headroom. */
const capacityOf = (height: number, pitch: number): number =>
  Math.max(1, Math.floor((height - HEADROOM - FOOT) / pitch));

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
  const ground = height - FOOT - pitch / 2;
  return columnsOf(grid, d).flatMap((x): Dot[] => {
    if (count === 0) {
      const band = bandOf(0);
      const share = Math.sqrt(Math.max(0.12, (total / peak) * capacity));
      // Never much smaller than half a full dot, so it stands clear of the faint ground.
      const r = Math.max(1.6 * grid.weight, bands[band]!.radius * scale * share);
      return cellOf(bands[band]!, x, ground, r).map((c) => ({ ...c, band, row: 0, ring: today }));
    }
    return Array.from({ length: count }, (_, row) => {
      const band = bandOf(row);
      const ring = today && row === count - 1;
      const r = bands[band]!.radius * scale;
      // Today's top row, still counting, is one ring a cell, the others' too (two fine rings would
      // read as a figure of eight).
      if (ring) return [{ x, y: ground - row * pitch, r: Math.max(1.4, r - 0.5), band, row, ring }];
      return cellOf(bands[band]!, x, ground - row * pitch, r).map((c) => ({
        ...c,
        band,
        row,
        ring,
      }));
    }).flat();
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

/** Where the tick before day `d` (the start of a week) stands. */
export const weekX = (grid: Grid, d: number): number =>
  grid.gap
    ? grid.x0 + d * grid.per * grid.pitch
    : d === 0
      ? grid.x0 - grid.pitch / 2
      : (columnsOf(grid, d - 1).at(-1)! + columnsOf(grid, d)[0]!) / 2;

/** What the ground marks besides the days: the weeks named on the axis, and two moments. */
interface Marks {
  /** Each a week's first day, ticked under the ground. */
  weeks?: number[];
  /** The first day any app was live, if after the first day shown. */
  firstLive?: number;
  /**
   * Where the platform began counting, if within its window (on the first day shown): how far its
   * tick rises above the others, up to the note that names it.
   */
  since?: number | null;
}

/**
 * The strata at `width` × `height` on `grid`, standing on a ground row of faint dots on the grid's
 * pitch and in step with its columns, from one edge of the chart to the other. Each row of each
 * band is one path, so the strata can rise row by row while a phone lays out a few dozen nodes
 * rather than hundreds of dots.
 */
export function strata(
  bands: Band[],
  width: number,
  height: number,
  grid: Grid,
  { weeks = [], firstLive = 0, since = null }: Marks = {},
): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  const { days, pitch } = grid;
  // The ground: one dot per column, edge to edge, on the same spacing and phase as the CSS ground
  // that held the place while the data loaded. A day drawn in pairs covers its dots with its own.
  const first = grid.x0 - Math.floor(grid.x0 / pitch) * pitch;
  const xs = Array.from(
    { length: Math.ceil((width - first) / pitch) },
    (_, i) => first + i * pitch,
  );
  const ground = xs.map((x) => dot(x, height - FOOT - pitch / 2, 0.9)).join("");
  // Each week the axis names is marked by a short tick under the ground, just before its first day:
  // a mark of its own shape and tone, below the row the data stands on, so it can't be read as
  // traffic, and the empty stretches have a measure.
  const tick = (d: number) =>
    `M${(weekX(grid, d) - 0.5).toFixed(1)} ${height - FOOT + 2}h1v${FOOT - 2}h-1z`;
  // Where counting began, and the first app's launch, are marked the same way, taller, rising
  // through the ground: the days before the one weren't counted, before the other had no apps.
  // Where counting began rises further still, like a flag's pole, to the note beside it.
  const tall = (d: number, rise = 0) =>
    `M${(weekX(grid, d) - 0.5).toFixed(1)} ${height - FOOT - pitch - rise}h1v${FOOT + pitch + rise}h-1z`;
  const marks = [
    ...weeks.filter((d) => d > 0 && d !== firstLive).map(tick),
    ...(since === null ? [] : [tall(0, since)]),
    ...(firstLive > 0 && firstLive < days ? [tall(firstLive)] : []),
  ].join("");
  const week = document.createElementNS(SVG, "path");
  week.setAttribute("d", marks);
  week.setAttribute("class", "fill-muted");
  const floor = document.createElementNS(SVG, "path");
  floor.setAttribute("d", ground);
  floor.setAttribute("class", "fill-faint");
  const peak = scaleOf(bands, days, capacityOf(height, pitch));
  const dots = Array.from({ length: days }, (_, d) => dotsOf(bands, grid, height, d, peak)).flat();
  const rows = Math.max(1, ...dots.map((dt) => dt.row + 1));
  // However tall the strata, the rise from the ground takes under half a second.
  svg.style.setProperty("--stagger", `${Math.min(24, 300 / rows)}ms`);
  svg.append(floor, week, ...paths(dots));
  return svg;
}

/** Day `d`'s dots alone, drawn at full strength over the strata while the rest are quieted. */
export function dayLayer(bands: Band[], height: number, grid: Grid, d: number): SVGGElement {
  const g = document.createElementNS(SVG, "g");
  g.setAttribute("class", "day-layer");
  const peak = scaleOf(bands, grid.days, capacityOf(height, grid.pitch));
  g.append(...paths(dotsOf(bands, grid, height, d, peak)));
  return g;
}

/** A band's swatch in the key: a patch of its dots, in its size and tone. */
function swatch(band: number, row: Band): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", FILLS[band]!);
  const path = document.createElementNS(SVG, "path");
  // The chart's dots at the patch's 8px pitch, so the swatches differ as the bands do.
  const r = row.radius * (8 / 9);
  path.setAttribute(
    "d",
    [4, 12]
      .flatMap((x) => [4, 12].flatMap((y) => cellOf(row, x, y, r).map((c) => dot(c.x, c.y, c.r))))
      .join(""),
  );
  svg.append(path);
  return svg;
}

/** A count as shown, with what a screen reader hears beside it. */
/**
 * A count as shown, with what a screen reader hears beside it: a total compactly ("9.1k"), a
 * day's count exactly ("2,844"), and an en dash for a day before the app was live.
 */
function figure(el: HTMLElement, n: number | null, exact = false): void {
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  shown.textContent = n === null ? "–" : exact ? formatCount(n) : formatViews(n);
  const heard = document.createElement("span");
  heard.className = "sr-only";
  heard.textContent = n === null ? "Not live yet" : describeViews(n);
  el.replaceChildren(shown, heard);
  el.classList.toggle("text-muted", !n);
}

/**
 * A row of the key: the band's swatch, its name (a link to the app, or to /projects for the
 * others), its count, and under the name what it is, so the key says what each app does, not only
 * how busy it is. `band` is its place in the stack, which sets its tone; `position` its place in
 * the key.
 */
function keyRow(row: Band, band: number, position: number, arrive: boolean): HTMLLIElement {
  const li = document.createElement("li");
  li.className = arrive ? "key-row arrive" : "key-row";
  li.style.setProperty("--i", String(position));
  li.dataset.band = String(band);
  const mark = document.createElement("span");
  mark.className = "key-swatch";
  mark.append(swatch(band, row));

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
  if (row.apps.length === 1 && only?.up === false) {
    const down = document.createElement("span");
    down.className = "key-down";
    down.textContent = "Down";
    name.append(down);
  }

  const total = document.createElement("span");
  total.className = "text-right";
  total.dataset.total = "";
  figure(total, totalOf(row.daily));

  // What it is: the app's description, or the others' names, each kept whole across a line break.
  const about = document.createElement("span");
  about.className = row.group ? "key-about key-others" : "key-about";
  if (row.apps.length === 1 && only) {
    about.textContent = only.description ?? "";
  } else {
    nameOthers(about, row.apps, row.apps.length);
  }
  li.append(mark, name, total, about);
  return li;
}

/**
 * The others' names, the first `shown` of them and "and N more" for the rest. One that's down says
 * so after its name and comes first, so no limit on the line hides it.
 */
function nameOthers(about: HTMLElement, apps: Project[], shown: number): void {
  const named = apps.toSorted((a, b) => Number(b.up === false) - Number(a.up === false));
  about.replaceChildren();
  named.slice(0, shown).forEach((p, i) => {
    if (i) about.append(", ");
    const whole = document.createElement("span");
    whole.className = "whitespace-nowrap";
    whole.textContent = p.name;
    if (p.up === false) {
      const down = document.createElement("span");
      down.className = "key-down";
      down.textContent = " (Down)";
      whole.append(down);
    }
    about.append(whole);
  });
  if (shown < named.length) about.append(`, and ${named.length - shown} more`);
}

/** How far beyond the days a finger still reads the nearest one, px: most of a fingertip. */
const REACH = 44;

/** Whether two labels on the axis stand clear of each other, 20px apart or more. */
const clear = (at: Span, of: Span): boolean => at.right + 20 <= of.left || at.left - 20 >= of.right;

/** Where a label runs across the page, px. */
interface Span {
  left: number;
  right: number;
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
  const notice = root.querySelector<HTMLElement>("[data-traffic-note]")!;
  const chart = horizon.querySelector<HTMLElement>("[data-horizon-chart]")!;
  const scrub = horizon.querySelector<HTMLElement>("[data-horizon-scrub]")!;
  const axis = horizon.querySelector<HTMLElement>("[data-horizon-axis]")!;
  const guide = horizon.querySelector<HTMLElement>("[data-horizon-guide]")!;
  const label = horizon.querySelector<HTMLElement>("[data-horizon-label]")!;
  const mark = horizon.querySelector<HTMLElement>("[data-horizon-mark]")!;
  const sinceNote = horizon.querySelector<HTMLElement>("[data-horizon-since]")!;
  const peakLabel = horizon.querySelector<HTMLElement>("[data-horizon-peak]")!;
  const start = horizon.querySelector<HTMLElement>("[data-horizon-start]")!;
  const today = horizon.querySelector<HTMLElement>("[data-horizon-today]")!;
  const weekLabels = horizon.querySelector<HTMLElement>("[data-horizon-weeks]")!;

  // A directory fetched a moment ago, on the page before, draws at once and without the arrival:
  // going from page to page shows the key and the horizon as they were, not their placeholders.
  const recent = keptProjects();
  const instant = recent !== null;
  let projects: Projects;
  try {
    projects = recent ?? (await loadProjects());
  } catch (error) {
    // The heading still leads to /projects; the horizon isn't drawn.
    console.error(error);
    placeholder.hidden = true;
    const retry = document.createElement("button");
    retry.type = "button";
    // The way on, in the ink of a link, from a note in muted text.
    retry.className = "link tap cursor-pointer text-ink";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => {
      notice.hidden = true;
      notice.replaceChildren();
      placeholder.hidden = false;
      root.dataset.state = "loading";
      horizon.dataset.state = "loading";
      // Keep the keyboard in the key while it reloads, rather than dropping it to the page.
      root.querySelector<HTMLElement>("#projects-heading a")?.focus();
      void initTraffic();
    });
    // Where the rows would be, in the words /projects uses for the same failure.
    notice.replaceChildren("The projects couldn’t be loaded. ", retry);
    notice.hidden = false;
    root.dataset.state = "error";
    horizon.dataset.state = "error";
    return;
  }

  if (instant) placeholder.hidden = true;
  else leave(placeholder);
  horizon.toggleAttribute("data-instant", instant);
  const { days, apps: counts } = counted(projects);
  /** The days of the platform's window, of which `days` are the counted ones at its end. */
  const slots = projects.days.length;
  const bands = bandsOf(ranked(counts));
  root.dataset.state = "ready";
  if (bands.length === 0) {
    notice.textContent = "Nothing is running right now.";
    notice.hidden = false;
    horizon.dataset.state = "empty";
    return;
  }
  // The key reads as a scale, busiest first, like the stack from the ground up and the tones from
  // darkest; the others, marked by their →, last.
  list.replaceChildren(...bands.map((band, i) => keyRow(band, i, i, !instant)));
  list.hidden = false;
  const periodText = periodOf(projects);
  // The caption heads the counts' column, and arrives with them.
  period.textContent = periodText;
  period.classList.toggle("arrive", !instant);
  /** Whether counting began within the window, so the days shown are its last few. */
  const since = days.length < slots;
  start.textContent = since ? `Since ${formatDay(days[0]!)}` : formatDay(days[0]!);
  horizon.dataset.state = "ready";

  const totals = days.map((_, d) => totalOf(bands.map((b) => b.daily[d]!)));
  const peakDay = totals.indexOf(Math.max(...totals));
  /** The Mondays, each the start of a week the ground marks. */
  const weeks = days.flatMap((day, d) =>
    new Date(`${day}T00:00:00Z`).getUTCDay() === 1 ? [d] : [],
  );
  /** The first day each app was live, and the first any was: the days before weren't quiet. */
  const liveFrom = (p: Project) => {
    const at = days.findIndex((day) => day >= p.liveSince.slice(0, 10));
    return at === -1 ? days.length : at;
  };
  const firstLive = Math.min(...counts.map(liveFrom));
  /** Whether any of a band's apps was live on day `d`. */
  const liveOn = (band: Band, d: number) => band.apps.some((p) => liveFrom(p) <= d);
  /** The day being read out, if any. */
  let shownDay: number | null = null;
  /** The band picked out in the key, if any. */
  let picked: number | null = null;

  // Pointing at or focusing an app in the key picks out its band, and the note names its busiest
  // day rather than the busiest overall.
  const rows = [...list.querySelectorAll<HTMLLIElement>("li")];
  const focusBand = (band: number | null) => {
    picked = band;
    if (band === null) delete root.dataset.focus;
    else root.dataset.focus = String(band);
    for (const row of rows) row.classList.toggle("is-focused", bandOfRow(row) === band);
    // The band picked out comes forward in ink, whatever its tone, so even the faintest shows.
    for (const path of chart.querySelectorAll<SVGPathElement>("path[data-band]")) {
      path.classList.toggle("is-quiet", band !== null && path.dataset.band !== String(band));
      path.classList.toggle("is-picked", band !== null && path.dataset.band === String(band));
    }
    showPeak();
  };
  for (const row of rows) {
    row.addEventListener("pointerenter", () => focusBand(bandOfRow(row)));
    row.addEventListener("pointerleave", () => focusBand(null));
    row.addEventListener("focusin", () => focusBand(bandOfRow(row)));
    row.addEventListener("focusout", () => focusBand(null));
  }

  let grid: Grid = { pitch: 9, weight: 1, days: days.length, x0: 0, per: 1, gap: false };
  /** How far the tick where counting began rises to its note, if it's marked. */
  let sinceRise: number | null = null;
  /** The weeks whose ticks the ground draws. */
  let ticked: number[] = [];
  sinceNote.textContent = `Since ${formatDay(days[0]!)}`;
  const measure = () => {
    const box = chart.getBoundingClientRect();
    const column = axis.getBoundingClientRect();
    const inset = getComputedStyle(axis);
    const from = column.left + parseFloat(inset.paddingLeft) - box.left;
    const to = column.right - parseFloat(inset.paddingRight) - box.left;
    const style = getComputedStyle(chart);
    const pitch = parseFloat(style.getPropertyValue("--pitch")) || 9;
    const weight = parseFloat(style.getPropertyValue("--dot-scale")) || 1;
    grid = gridOf({ from, to }, days.length, pitch, weight, slots);
    // A finger reads the nearest day from a fingertip's reach beyond the days, so a few days on a
    // phone aren't a few narrow targets; the rest of the ground stays clear, so a tap there puts a
    // reading away. The mouse, being precise, reads only over the days (see `dayUnder`).
    const edges = gridEdges(grid);
    const left = Math.max(0, edges.from - REACH);
    scrub.style.left = `${left}px`;
    scrub.style.width = `${Math.min(box.width, edges.to + REACH) - left}px`;
    const offset = column.left - box.left;
    // "Today" holds the right edge. Then, in that order, the first day, the first app's launch
    // and the weeks, the latest first (nearest the counts), find room on the axis, each clear of
    // the others, inside the column, or go unnamed.
    const kept = [today.getBoundingClientRect()];
    // The tall ticks (where counting began, the first app's launch) are named by their own notes
    // or by none: no other date stands over one, where it would read as naming it.
    const tall = [
      ...(since ? [box.left + weekX(grid, 0)] : []),
      ...(firstLive > 0 && firstLive < days.length ? [box.left + weekX(grid, firstLive)] : []),
    ];
    const fit = (el: HTMLElement, x: number, shifts: number[], own?: number): boolean => {
      el.hidden = false;
      const fits = shifts.some((shift) => {
        el.style.translate = `${Math.round(x - offset - shift)}px 0`;
        const at = el.getBoundingClientRect();
        const inside = at.left >= box.left + from - 0.5 && at.right <= box.left + to + 0.5;
        const overTick = tall.some((t) => t !== own && t >= at.left - 3 && t <= at.right + 3);
        if (!inside || overTick || !kept.every((other) => clear(at, other))) return false;
        kept.push(at);
        return true;
      });
      el.hidden = !fits;
      return fits;
    };
    // A run that began within the window is named beside its tick, above the ground and ending
    // just before it, like a flag on its pole, so the name belongs to the moment counting began
    // and the bare ground before it reads as not counted. Without room for that before it (counting
    // began early in the window), it's named on the axis, beginning at its tick.
    sinceRise = null;
    sinceNote.hidden = !since;
    if (since) {
      const x = weekX(grid, 0);
      const width = sinceNote.offsetWidth;
      const height = sinceNote.offsetHeight;
      if (x - 6 - width >= from) {
        const top = chart.clientHeight - FOOT - grid.pitch - 4 - height;
        sinceNote.style.translate = `${Math.round(x - 6 - width)}px ${Math.round(top)}px`;
        sinceRise = 4 + height / 2;
        start.hidden = true;
      } else {
        sinceNote.hidden = true;
        sinceRise = 0;
        fit(start, x, [0], box.left + x);
      }
    } else {
      fit(start, edges.from, [0]);
    }
    weekLabels.replaceChildren();
    if (firstLive > 0 && firstLive < days.length) {
      const el = document.createElement("span");
      el.textContent = `${formatDay(days[firstLive]!)} · first app`;
      weekLabels.append(el);
      // Ending at its tick, as the note where counting began does; or centred under it, or
      // beginning at it.
      const width = el.offsetWidth;
      const x = weekX(grid, firstLive);
      fit(el, x, [width, width / 2, 0], box.left + x);
    }
    // Each week is dated in full ("Nov 9", never a bare number beside the counts) where there's
    // room under its tick.
    for (const d of weeks.filter((w) => w > 0 && w !== firstLive).toReversed()) {
      const el = document.createElement("span");
      el.textContent = formatDay(days[d]!);
      el.dataset.week = String(d);
      weekLabels.append(el);
      fit(el, weekX(grid, d), [el.offsetWidth / 2]);
    }
    // Every week is ticked, so the ticks keep time, but for one that another date stands over,
    // which would read as naming it.
    const over = [today, start, ...weekLabels.querySelectorAll<HTMLElement>("span")].filter(
      (el) => !el.hidden && el.offsetWidth > 0,
    );
    ticked = weeks.filter((d) => {
      const x = box.left + weekX(grid, d);
      return !over.some((el) => {
        if (el.dataset.week === String(d)) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left - 3 && x <= r.right + 3;
      });
    });
  };

  /** Where day `d`'s top dot's top edge is, px from the chart's top. */
  const crestOf = (d: number) => {
    const height = chart.clientHeight;
    const capacity = Math.max(1, Math.floor((height - HEADROOM - FOOT) / grid.pitch));
    const scale = scaleOf(bands, days.length, capacity);
    const stands = Math.max(1, rowsOf(totals[d]!, scale, capacity));
    return height - FOOT - stands * grid.pitch;
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
    // One line for every note, just above the tallest block: a reading only moves sideways as it
    // goes from day to day, its guide running down to the day.
    const crest = Math.min(
      ...days.map((_, i) => (totals[i]! > 0 ? crestOf(i) : chart.clientHeight - FOOT - grid.pitch)),
    );
    let top = Math.max(HEADROOM - note.offsetHeight - 8, crest - note.offsetHeight - 10);
    // Clear of the note naming where counting began, too, when the two would cross.
    if (!sinceNote.hidden) {
      const flag = sinceNote.getBoundingClientRect();
      const chartLeft = chart.getBoundingClientRect().left;
      const crosses = left < flag.right - chartLeft + 6 && left + width > flag.left - chartLeft - 6;
      const flagTop = flag.top - chart.getBoundingClientRect().top;
      if (crosses) top = Math.min(top, flagTop - note.offsetHeight - 6);
    }
    note.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
    return top;
  };

  /** The busiest day overall, or of the band picked out, and its count. */
  const busiest = (): { d: number; n: number } => {
    const daily = picked === null ? totals : bands[picked]!.daily;
    const n = Math.max(...daily);
    return { d: picked === null ? peakDay : daily.indexOf(n), n };
  };

  // The busiest day is named in the headroom once the strata have risen, so heights have a scale.
  // Today's is its count "so far": "Today" is right under it, so the two read as one.
  const showPeak = () => {
    const { d, n } = busiest();
    // A month without a single view has no busiest day to name.
    peakLabel.hidden = shownDay !== null || n === 0;
    if (peakLabel.hidden) return;
    peakLabel.textContent =
      d === days.length - 1
        ? `${formatCount(n)} so far`
        : `${dayName(days, d)} · ${formatCount(n)}`;
    place(peakLabel, d);
  };

  // Reading a day: the other days quiet down and its own dots stay, its total above it with a
  // thread down to its top, and each app's count in the key.
  const showDay = (d: number | null) => {
    shownDay = d;
    for (const row of rows) {
      const band = bands[bandOfRow(row)]!;
      const total = row.querySelector<HTMLElement>("[data-total]")!;
      if (d === null) figure(total, totalOf(band.daily));
      else figure(total, liveOn(band, d) ? band.daily[d]! : null, true);
    }
    label.hidden = guide.hidden = d === null;
    // From the keyboard, the day in hand is underlined in the foot, below its ticks.
    mark.hidden = d === null || !scrub.matches(":focus-visible");
    if (d !== null) {
      const xs = columnsOf(grid, d);
      const half = (grid.gap ? grid.pitch : grid.pitch * 0.8) / 2;
      mark.style.translate = `${Math.round(xs[0]! - half)}px ${chart.clientHeight - 2}px`;
      mark.style.width = `${Math.round(xs.at(-1)! - xs[0]! + 2 * half)}px`;
    }
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
    const before = d < firstLive;
    const reading = before
      ? `${dayName(days, d)} · no apps yet`
      : `${dayName(days, d)} · ${describeViews(totals[d]!).toLowerCase()}`;
    label.textContent = before ? reading : `${dayName(days, d)} · ${formatCount(totals[d]!)}`;
    const top = place(label, d) + label.offsetHeight + 4;
    const bottom = totals[d]! > 0 ? crestOf(d) - 3 : chart.clientHeight - FOOT - grid.pitch;
    guide.style.translate = `${Math.round(dayX(grid, d))}px ${Math.round(top)}px`;
    guide.style.height = `${Math.max(0, bottom - top)}px`;
    period.textContent =
      d === days.length - 1 ? "Page views today so far" : `Page views on ${formatDay(days[d]!)}`;
    scrub.setAttribute("aria-valuenow", String(d));
    scrub.setAttribute("aria-valuetext", reading.replace(" · ", ": "));
  };

  // The day under the pointer; on the busiest day's note (where it was last shown, since a
  // reading takes its place), that day, wherever along the note the pointer is. A mouse off the
  // days (past a few pixels' grace) is over none.
  let peakBox: { left: number; right: number; top: number; bottom: number } | null = null;
  const dayUnder = (e: PointerEvent): number | null => {
    const box = chart.getBoundingClientRect();
    if (!peakLabel.hidden) {
      const note = peakLabel.getBoundingClientRect();
      peakBox = {
        left: note.left - box.left,
        right: note.right - box.left,
        top: note.top - box.top,
        bottom: note.bottom - box.top,
      };
    }
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const onNote =
      peakBox !== null &&
      x >= peakBox.left &&
      x <= peakBox.right &&
      y >= peakBox.top - 6 &&
      y <= peakBox.bottom + 6;
    if (onNote) return busiest().d;
    const edges = gridEdges(grid);
    const off = x < edges.from - 8 || x > edges.to + 8;
    return e.pointerType === "mouse" && off ? null : dayAt(grid, x);
  };
  scrub.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const d = dayUnder(e);
    scrub.style.cursor = d === null ? "default" : "";
    showDay(d);
  });
  touchScrub(
    scrub,
    (e) => showDay(dayUnder(e)),
    () => showDay(null),
  );
  scrub.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !scrub.matches(":focus-visible")) showDay(null);
  });
  // A tap anywhere else puts a tapped-out reading away.
  document.addEventListener("pointerdown", (e) => {
    if (shownDay !== null && e.target instanceof Node && !scrub.contains(e.target)) {
      showDay(null);
    }
  });
  // "Today" on the axis reads today, as the busiest day's note reads its day.
  today.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && shownDay !== days.length - 1) showDay(days.length - 1);
  });
  today.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !scrub.matches(":focus-visible")) showDay(null);
  });
  today.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") showDay(days.length - 1);
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
      const svg = strata(bands, chart.clientWidth, chart.clientHeight, grid, {
        weeks: ticked,
        firstLive,
        since: sinceRise,
      });
      // The strata rise from the ground the first time, the busiest day's note after them; a
      // resize just redraws them.
      if (!drawn && !instant) {
        svg.classList.add("rise");
        peakLabel.classList.add("after-rise");
        peakLabel.addEventListener("animationend", () => peakLabel.classList.remove("after-rise"), {
          once: true,
        });
      }
      drawn = true;
      chart.replaceChildren(svg);
      // Where the key's lines are limited: the others' names stop at a whole name, "and N more"
      // after it, and a description cut short keeps its whole text in a title.
      for (const row of rows) {
        const about = row.querySelector<HTMLElement>(".key-about")!;
        const { apps, name } = bands[bandOfRow(row)]!;
        // A name too long for its line ends in "…" right before its arrow, whole in its title.
        const text = row.querySelector<HTMLElement>(".key-name-text")!;
        fitText(text, name);
        text.parentElement!.title = text.textContent === name ? "" : name;
        const cut = () => about.scrollHeight > about.clientHeight + 1;
        if (apps.length > 1) {
          for (let shown = apps.length; shown >= 1; shown--) {
            nameOthers(about, apps, shown);
            if (!cut()) break;
          }
        } else if (cut()) {
          about.title = about.textContent ?? "";
        } else {
          about.removeAttribute("title");
        }
      }
      // The strata bring their own ground, in step with them; the CSS one held the place.
      chart.dataset.drawn = "";
      showDay(shownDay);
    });
  };
  new ResizeObserver(redraw).observe(chart);
  // A theme flip changes how large the dots are drawn (`--dot-scale`), so it redraws them too.
  new MutationObserver(redraw).observe(document.documentElement, { attributeFilter: ["class"] });
}
