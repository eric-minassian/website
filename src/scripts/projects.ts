// Fills the projects ledger (Projects.astro) from the platform's directory once the page loads.
import {
  describeViews,
  formatDay,
  formatViews,
  loadProjects,
  type Project,
  type Projects,
  totalOf,
} from "../lib/projects";

const SVG = "http://www.w3.org/2000/svg";
const BAR_WIDTH = 2;
const BAR_GAP = 1;
const HEIGHT = 14;

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

/** 30 thin bars scaled to the project's own busiest day; a day with none is a 1px tick. */
function sparkline(pageViews: number[]): SVGSVGElement {
  const width = pageViews.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(HEIGHT));
  svg.setAttribute("viewBox", `0 0 ${width} ${HEIGHT}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("class", "col-start-2 row-start-1 sm:col-start-3");
  const max = Math.max(...pageViews);
  const quiet = document.createElementNS(SVG, "g");
  quiet.setAttribute("class", "fill-faint");
  const busy = document.createElementNS(SVG, "g");
  busy.setAttribute("class", "fill-ink");
  pageViews.forEach((views, day) => {
    // Any traffic at all stands at least 2px, clear of the tick drawn for a day with none.
    const height = views === 0 ? 1 : Math.max(2, Math.round((views / max) * HEIGHT));
    const bar = document.createElementNS(SVG, "rect");
    bar.setAttribute("x", String(day * (BAR_WIDTH + BAR_GAP)));
    bar.setAttribute("y", String(HEIGHT - height));
    bar.setAttribute("width", String(BAR_WIDTH));
    bar.setAttribute("height", String(height));
    (views === 0 ? quiet : busy).append(bar);
  });
  svg.append(quiet, busy);
  return svg;
}

function row(project: Project): HTMLLIElement {
  const li = element(
    "li",
    "col-span-full grid grid-cols-subgrid items-baseline border-t border-faint py-3",
  );
  li.append(link(project.url, project.name, "col-start-1 row-start-1"));

  const about = element(
    "div",
    "col-span-full row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1",
  );
  if (project.description) about.append(element("p", "text-muted", project.description));
  const meta = element("p", "text-sm text-muted", `Deployed ${formatDay(project.lastDeployedAt)}`);
  if (project.source) meta.append(" · ", link(project.source, "Source"));
  if (project.up === false) meta.append(" · Down");
  about.append(meta);
  li.append(about, sparkline(project.pageViews));

  const total = totalOf(project.pageViews);
  const figure = element("span", "col-start-3 row-start-1 text-right tabular-nums sm:col-start-4");
  const shown = element("span", "", formatViews(total));
  shown.setAttribute("aria-hidden", "true");
  figure.append(shown, element("span", "sr-only", describeViews(total)));
  li.append(figure);
  return li;
}

/** What the totals cover: the whole window, or the days since counting began. */
const period = ({ days, countingSince }: Projects): string =>
  countingSince
    ? `Page views since ${formatDay(countingSince)}, today included.`
    : `Page views over the last ${days.length} days, today included.`;

export async function initProjects(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-projects]");
  if (!root) return;
  const list = root.querySelector<HTMLUListElement>("[data-projects-list]")!;
  const note = root.querySelector<HTMLElement>("[data-projects-note]")!;
  try {
    const projects = await loadProjects();
    list.replaceChildren(...projects.projects.map(row));
    list.hidden = projects.projects.length === 0;
    note.textContent = period(projects);
  } catch (error) {
    console.error(error);
    note.textContent = "The projects couldn't be loaded. Reload to try again.";
  } finally {
    list.removeAttribute("aria-busy");
    root.dataset.state = "ready";
  }
}
