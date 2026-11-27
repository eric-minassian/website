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

const SVG = "http://www.w3.org/2000/svg";
const BAR_GAP = 1;
const HEIGHT = 32;
/** The rise from one dot to the next up a column, px. */
const RISE = 3.5;

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

/**
 * The project's 30 days as columns of small dots like the home page's horizon, in its darkest
 * tone, each scaled to the app's own busiest day so every row shows its shape (the footnote says
 * so; the totals compare the rows). Any traffic at all stands at least one dot; a day with none
 * keeps a faint dot on the ground; a day before the app was live, or before the platform counted,
 * is left blank.
 */
function sparkline(pageViews: number[], from: number, peak: number, bar: number): SVGSVGElement {
  const step = bar + BAR_GAP;
  const width = pageViews.length * step - BAR_GAP;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(HEIGHT));
  svg.setAttribute("viewBox", `0 0 ${width} ${HEIGHT}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "block");
  const r = bar * 0.42;
  const rows = Math.floor(HEIGHT / RISE);
  pageViews.forEach((views, day) => {
    if (day < from) return;
    const x = day * step + bar / 2;
    const count = views === 0 ? 0 : Math.max(1, Math.round((views / peak) * rows));
    const path = document.createElementNS(SVG, "path");
    const dots =
      count === 0
        ? [dot(x, HEIGHT - RISE / 2, r * 0.5)]
        : Array.from({ length: count }, (_, i) => dot(x, HEIGHT - RISE / 2 - i * RISE, r));
    path.setAttribute("d", dots.join(""));
    path.setAttribute("class", views === 0 ? "fill-band-3" : "fill-band-1");
    path.dataset.day = String(day);
    svg.append(path);
  });
  return svg;
}

/** A dot as path data. */
const dot = (x: number, y: number, r: number): string =>
  `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;

/** The days the ledger covers, the first the platform counted, and the bars' width. */
interface Span {
  days: string[];
  from: number;
  bar: number;
}

function row(project: Project, index: number, span: Span): HTMLLIElement {
  const { days, bar } = span;
  // The app's first day: the first the platform counted, or the day it went live if later.
  const live = days.findIndex((day) => day >= project.liveSince.slice(0, 10));
  const from = Math.max(span.from, live === -1 ? days.length - 1 : live);
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
  const svg = sparkline(project.pageViews, from, peak, bar);
  const spark = element("div", "ledger-spark");
  // A day's reading, beside the dots on a phone and under them where the description sits beside
  // the name; either way nothing moves. The slider's value is what a screen reader hears.
  const reading = element("span", "spark-reading text-sm tabular-nums");
  reading.setAttribute("aria-hidden", "true");
  spark.setAttribute("role", "slider");
  spark.tabIndex = 0;
  spark.setAttribute("aria-label", `${project.name}, page views by day`);
  spark.setAttribute("aria-valuemin", String(from));
  spark.setAttribute("aria-valuemax", String(days.length - 1));
  spark.append(svg, reading);
  const bars = [...svg.querySelectorAll("path")];
  let shown: number | null = null;
  const show = (d: number | null) => {
    shown = d;
    if (d === null) {
      delete spark.dataset.day;
      return;
    }
    spark.dataset.day = String(d);
    for (const mark of bars) mark.classList.toggle("is-day", mark.dataset.day === String(d));
    reading.textContent = `${dayName(days, d)} · ${formatCount(project.pageViews[d]!)}`;
    spark.setAttribute("aria-valuenow", String(d));
    spark.setAttribute(
      "aria-valuetext",
      `${dayName(days, d)}: ${describeViews(project.pageViews[d]!).toLowerCase()}`,
    );
  };
  show(null);
  spark.setAttribute("aria-valuenow", String(days.length - 1));

  const dayUnder = (e: PointerEvent) => {
    const x = e.clientX - svg.getBoundingClientRect().left;
    return Math.min(days.length - 1, Math.max(from, Math.floor(x / (bar + BAR_GAP))));
  };
  // A finger or pen reads the day it touches and, dragged sideways, each day it crosses.
  spark.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    spark.setPointerCapture(e.pointerId);
    show(dayUnder(e));
  });
  spark.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || spark.hasPointerCapture(e.pointerId)) show(dayUnder(e));
  });
  spark.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !spark.matches(":focus-visible")) show(null);
  });
  // A tap anywhere else puts a tapped-out reading away.
  document.addEventListener("pointerdown", (e) => {
    if (shown !== null && e.target instanceof Node && !spark.contains(e.target)) show(null);
  });
  // From the keyboard the dots are a slider over the days, starting from today.
  spark.addEventListener("focus", () => {
    if (spark.matches(":focus-visible")) show(shown ?? days.length - 1);
  });
  spark.addEventListener("blur", () => show(null));
  spark.addEventListener("keydown", (e) => {
    const d = shown ?? days.length - 1;
    const step: Record<string, number> = {
      ArrowLeft: d - 1,
      ArrowDown: d - 1,
      ArrowRight: d + 1,
      ArrowUp: d + 1,
      PageDown: d - 7,
      PageUp: d + 7,
      Home: from,
      End: days.length - 1,
    };
    // Escape puts the reading away and leaves the keyboard where it was.
    if (e.key === "Escape") return show(null);
    if (!(e.key in step)) return;
    e.preventDefault();
    show(Math.min(days.length - 1, Math.max(from, step[e.key]!)));
  });

  li.append(about, spark, total);
  return li;
}

/** The busiest first, like the home page's key; among equals, the latest deployed. */
const byTraffic = (a: Project, b: Project): number =>
  totalOf(b.pageViews) - totalOf(a.pageViews) ||
  Date.parse(b.lastDeployedAt) - Date.parse(a.lastDeployedAt);

export async function initProjects(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-projects]");
  if (!root) return;
  const placeholder = root.querySelector<HTMLElement>("[data-projects-placeholder]")!;
  const list = root.querySelector<HTMLUListElement>("[data-projects-list]")!;
  const note = root.querySelector<HTMLElement>("[data-projects-note]")!;

  const load = async (): Promise<void> => {
    root.dataset.state = "loading";
    placeholder.hidden = false;
    list.setAttribute("aria-busy", "true");
    note.replaceChildren();
    try {
      const projects: Projects = await loadProjects();
      const from = firstCounted(projects);
      const apps = projects.projects.toSorted(byTraffic);
      // Narrower bars on a small phone, so the name keeps its room.
      const bar = matchMedia("(width >= 26rem)").matches ? 3 : 2;
      const span = { days: projects.days, from, bar };
      list.replaceChildren(...apps.map((p, i) => row(p, i, span)));
      list.hidden = apps.length === 0;
      note.textContent = apps.length
        ? `${periodOf(projects)}. Each app’s days are scaled to its own busiest one.`
        : "Nothing is running right now.";
      leave(placeholder);
    } catch (error) {
      console.error(error);
      list.hidden = true;
      placeholder.hidden = true;
      const retry = element("button", "link tap cursor-pointer", "Try again");
      retry.type = "button";
      retry.addEventListener("click", async () => {
        await load();
        // The button is gone; carry the keyboard on to the list, or to the next try.
        (list.querySelector("a") ?? note.querySelector("button"))?.focus();
      });
      note.replaceChildren("The projects couldn’t be loaded. ", retry);
    } finally {
      list.removeAttribute("aria-busy");
      root.dataset.state = "ready";
    }
  };
  await load();
}
