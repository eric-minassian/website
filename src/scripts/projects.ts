// Fills the projects ledger (Projects.astro) from the platform's directory once the page loads.
import { arrow } from "../lib/icons";
import { leave } from "../lib/leave";
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
import { touchScrub } from "../lib/scrub";

const SVG = "http://www.w3.org/2000/svg";

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

const link = (href: string, text: string, className = ""): HTMLAnchorElement => {
  const a = element("a", className, text);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
};

/** A total as shown, with what a screen reader hears beside it. */
function figure(el: HTMLElement, n: number): void {
  const seen = element("span", "", formatViews(n));
  seen.setAttribute("aria-hidden", "true");
  el.replaceChildren(seen, element("span", "sr-only", describeViews(n)));
  el.classList.toggle("text-muted", n === 0);
}

/** How a sparkline is drawn: the spacing of its dots, across and up, and how many rows it stands. */
interface Dots {
  pitch: number;
  rows: number;
}

/** How wide a day's reading beside the dots can be on a phone ("Today so far · 12,345"), px. */
const READING = 150;

/**
 * The home page's halftone in small: a column of dots per day on a square 5px pitch, about 36px
 * tall, its texture finer than the 6px dotted rules between the rows so the two never read as one.
 * On a phone a day's reading stands beside the dots, so they close up a little where that's tight.
 */
const dotsFor = (phone: boolean, width: number): Dots => {
  const pitch = phone ? Math.max(4, Math.min(5, Math.floor(((width - READING) / 30) * 2) / 2)) : 5;
  return { pitch, rows: Math.floor(36 / pitch) };
};

/** Room under a sparkline's ground for the keyboard's mark under a day, px. */
const FOOT = 5;

/**
 * The project's 30 days as columns of dots like the home page's horizon, in its darkest tone, so
 * every row's days line up. Each is scaled to the app's own busiest day (but never fewer than ten
 * views, so a handful doesn't stand full height); the footnote says so and the totals compare the
 * rows. Any traffic at all stands at least one dot; a day with none is a small dot in the third
 * band's tone; a day before the app was live, or before the platform counted, is a fine ground of
 * the faintest dots, smaller than the dotted rules between the rows so it's never taken for one.
 */
function sparkline(pageViews: number[], from: number, peak: number, dots: Dots): SVGSVGElement {
  const { pitch, rows } = dots;
  const width = pageViews.length * pitch;
  const height = rows * pitch + FOOT;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "block");
  const r = pitch * 0.4;
  const scale = Math.max(10, peak);
  const ground = rows * pitch - pitch / 2;
  const bare: string[] = [];
  pageViews.forEach((views, day) => {
    const x = (day + 0.5) * pitch;
    if (day < from) {
      bare.push(dot(x, ground, 0.55));
      return;
    }
    const count = views === 0 ? 0 : Math.max(1, Math.round((views / scale) * rows));
    const path = document.createElementNS(SVG, "path");
    const marks =
      count === 0
        ? [dot(x, ground, Math.max(1, pitch * 0.25))]
        : Array.from({ length: count }, (_, i) => dot(x, ground - i * pitch, r));
    path.setAttribute("d", marks.join(""));
    path.setAttribute("class", views === 0 ? "fill-band-3" : "fill-band-1");
    path.dataset.day = String(day);
    svg.append(path);
  });
  const floor = document.createElementNS(SVG, "path");
  floor.setAttribute("d", bare.join(""));
  floor.setAttribute("class", "fill-faint");
  svg.prepend(floor);
  // From the keyboard, the day in hand is underlined, as on the home page's horizon.
  const mark = document.createElementNS(SVG, "rect");
  mark.setAttribute("class", "spark-mark fill-ink");
  mark.setAttribute("y", String(height - 2));
  mark.setAttribute("width", String(pitch + 8));
  mark.setAttribute("height", "2");
  svg.append(mark);
  return svg;
}

/** A dot as path data. */
const dot = (x: number, y: number, r: number): string =>
  `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;

/** A sparkline size, to tell whether a new one differs. */
const sizeOf = ({ pitch, rows }: Dots): string => `${pitch}:${rows}`;

/** The days the ledger covers and the first the platform counted. */
interface Span {
  days: string[];
  from: number;
}

/** A drawn row, and a way to redraw its days at another size, in place. */
interface Row {
  li: HTMLLIElement;
  resize: (dots: Dots) => void;
}

/** The app's first day in the ledger: the first the platform counted, or the day it went live. */
const firstDayOf = (project: Project, days: string[], counting: number): number => {
  const live = days.findIndex((day) => day >= project.liveSince.slice(0, 10));
  return Math.max(counting, live === -1 ? days.length - 1 : live);
};

/** The page views the ledger shows for an app: those from its first day on. */
const shownTotal = (project: Project, days: string[], counting: number): number =>
  totalOf(project.pageViews.slice(firstDayOf(project, days, counting)));

function row(project: Project, index: number, span: Span, start: Dots, signal: AbortSignal): Row {
  const { days } = span;
  /** The app's first day; the days from `counting` on can be read, those before it as not live. */
  const from = firstDayOf(project, days, span.from);
  const counting = span.from;
  const last = days.length - 1;
  const li = element("li", "ledger-row rule-above arrive");
  li.style.setProperty("--i", String(index));
  const name = element("span", "ledger-name");
  const out = link(project.url, "", "link-quiet tap");
  out.title = project.name;
  out.append(element("span", "ledger-name-text", project.name), arrow("out"));
  name.append(out);
  if (project.up === false) name.append(element("span", "ledger-down text-sm", "Down"));
  li.append(name);

  const about = element("div", "ledger-about");
  if (project.description) about.append(element("p", "text-muted", project.description));
  const meta = element("p", "ledger-meta text-sm text-muted");
  const sep = () => element("span", "ledger-sep", "·");
  meta.append(`Deployed ${formatDay(project.lastDeployedAt)}`);
  if (project.source) meta.append(sep(), link(project.source, "Source", "tap"));
  about.append(meta);

  const total = element("span", "ledger-total");
  const counted = project.pageViews.slice(from);
  figure(total, totalOf(counted));

  const peak = Math.max(1, ...counted);
  const spark = element("div", "ledger-spark");
  // A day's reading, beside the dots on a phone and under them beside the description, in room kept
  // for it, so nothing moves. The slider's value is what a screen reader hears.
  const reading = element("span", "spark-reading text-sm tabular-nums");
  reading.setAttribute("aria-hidden", "true");
  spark.setAttribute("role", "slider");
  spark.tabIndex = 0;
  spark.setAttribute("aria-label", `${project.name}, page views by day`);
  spark.setAttribute("aria-valuemin", String(counting));
  spark.setAttribute("aria-valuemax", String(last));
  let dots = start;
  let svg = sparkline(project.pageViews, from, peak, dots);
  spark.append(svg, reading);
  let shown: number | null = null;
  const mark = () => {
    for (const bar of svg.querySelectorAll("path"))
      bar.classList.toggle("is-day", bar.dataset.day === String(shown));
    if (shown !== null) {
      svg.querySelector(".spark-mark")?.setAttribute("x", String(shown * dots.pitch - 4));
    }
  };
  const show = (d: number | null) => {
    shown = d;
    if (d === null) {
      delete spark.dataset.day;
      return;
    }
    spark.dataset.day = String(d);
    mark();
    const views = project.pageViews[d]!;
    reading.textContent = `${dayName(days, d)} · ${d < from ? "not live yet" : formatCount(views)}`;
    spark.setAttribute("aria-valuenow", String(d));
    spark.setAttribute(
      "aria-valuetext",
      `${dayName(days, d)}: ${d < from ? "not live yet" : describeViews(views).toLowerCase()}`,
    );
  };
  show(null);
  spark.setAttribute("aria-valuenow", String(last));

  // The day under the pointer; on the ground before the platform counted, none.
  const dayUnder = (e: PointerEvent): number | null => {
    const x = e.clientX - svg.getBoundingClientRect().left;
    const d = Math.floor(x / dots.pitch);
    return d < counting ? null : Math.min(last, d);
  };
  spark.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") show(dayUnder(e));
  });
  touchScrub(
    spark,
    (e) => show(dayUnder(e)),
    () => show(null),
  );
  spark.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !spark.matches(":focus-visible")) show(null);
  });
  // A tap anywhere else puts a tapped-out reading away.
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (shown !== null && e.target instanceof Node && !spark.contains(e.target)) show(null);
    },
    { signal },
  );
  // From the keyboard the dots are a slider over the days, starting from today.
  spark.addEventListener("focus", () => {
    if (spark.matches(":focus-visible")) show(shown ?? last);
  });
  spark.addEventListener("blur", () => show(null));
  spark.addEventListener("keydown", (e) => {
    const d = shown ?? last;
    const step: Record<string, number> = {
      ArrowLeft: d - 1,
      ArrowDown: d - 1,
      ArrowRight: d + 1,
      ArrowUp: d + 1,
      PageDown: d - 7,
      PageUp: d + 7,
      Home: counting,
      End: last,
    };
    // Escape puts the reading away and leaves the keyboard where it was.
    if (e.key === "Escape") return show(null);
    if (!(e.key in step)) return;
    e.preventDefault();
    show(Math.min(last, Math.max(counting, step[e.key]!)));
  });

  li.append(about, spark, total);
  // A new size redraws only the dots, so focus, and a day being read, stay where they are.
  const resize = (next: Dots) => {
    dots = next;
    const old = svg;
    svg = sparkline(project.pageViews, from, peak, dots);
    old.replaceWith(svg);
    mark();
  };
  return { li, resize };
}

export async function initProjects(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-projects]");
  if (!root) return;
  const placeholder = root.querySelector<HTMLElement>("[data-projects-placeholder]")!;
  const list = root.querySelector<HTMLUListElement>("[data-projects-list]")!;
  const note = root.querySelector<HTMLElement>("[data-projects-note]")!;
  const head = root.querySelector<HTMLElement>("[data-projects-head]")!;
  /** Whether the days have a line of their own. */
  const phone = matchMedia("(width < 52rem)");
  const dotsNow = () => dotsFor(phone.matches, list.clientWidth);
  /** The rows drawn, and the size of their dots. */
  let rows: Row[] = [];
  let drawnAt = "";
  const redraw = () => {
    const dots = dotsNow();
    if (rows.length === 0 || sizeOf(dots) === drawnAt) return;
    drawnAt = sizeOf(dots);
    for (const r of rows) r.resize(dots);
  };
  phone.addEventListener("change", redraw);
  new ResizeObserver(redraw).observe(root);
  /** Ends the listeners the last rows left on the document. */
  let drawn: AbortController | null = null;

  const load = async (): Promise<void> => {
    drawn?.abort();
    drawn = new AbortController();
    rows = [];
    root.dataset.state = "loading";
    placeholder.hidden = false;
    list.setAttribute("aria-busy", "true");
    note.replaceChildren();
    head.textContent = "";
    // The head and the footnote arrive with the rows, each time.
    head.classList.remove("arrive");
    note.classList.remove("arrive");
    try {
      const projects: Projects = await loadProjects();
      const from = firstCounted(projects);
      const { days } = projects;
      // The busiest first by the totals shown, like the home page's key; among equals, the latest
      // deployed.
      const apps = projects.projects.toSorted(
        (a, b) =>
          shownTotal(b, days, from) - shownTotal(a, days, from) ||
          Date.parse(b.lastDeployedAt) - Date.parse(a.lastDeployedAt),
      );
      list.hidden = apps.length === 0;
      const dots = dotsNow();
      drawnAt = sizeOf(dots);
      const { signal } = drawn;
      rows = apps.map((p, i) => row(p, i, { days, from }, dots, signal));
      list.replaceChildren(...rows.map((r) => r.li));
      // What the totals cover, over them; how the days are drawn, under the list.
      head.textContent = apps.length ? periodOf(projects) : "";
      note.textContent = apps.length
        ? "Each app’s days are scaled to its own busiest one."
        : "Nothing is running right now.";
      head.classList.add("arrive");
      note.classList.add("arrive");
      note.style.setProperty("--i", String(apps.length));
      leave(placeholder);
    } catch (error) {
      console.error(error);
      list.hidden = true;
      placeholder.hidden = true;
      // The way on, in the ink of a link, from a note in muted text.
      const retry = element("button", "link tap cursor-pointer text-ink", "Try again");
      retry.type = "button";
      retry.addEventListener("click", () => {
        // The button is about to go: the keyboard waits on the page's name, as the home page's
        // does on its key's, rather than dropping to the page.
        document.querySelector<HTMLElement>("#page-heading")?.focus();
        void load();
      });
      note.replaceChildren("The projects couldn’t be loaded. ", retry);
    } finally {
      list.removeAttribute("aria-busy");
      root.dataset.state = "ready";
    }
  };
  await load();
}
