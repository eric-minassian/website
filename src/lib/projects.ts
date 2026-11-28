// The apps running on my platform, from its public directory. Browsers fetch it when a page that
// shows them loads, so new apps and today's page views appear without a deploy; the platform
// caches it for a few minutes.
import { PROJECTS_URL } from "astro:env/client";

export interface Project {
  name: string;
  description?: string;
  url: string;
  source?: string;
  liveSince: string;
  lastDeployedAt: string;
  /** Whether it was up at the platform's last check; null before the first. */
  up: boolean | null;
  /** One count per entry of `days`. */
  pageViews: number[];
  requests: number[];
}

export interface Projects {
  /** UTC dates, `YYYY-MM-DD`, oldest first; the last is today, counted so far. */
  days: string[];
  /** The first day the platform counted page views, when that's within `days`. */
  countingSince?: string;
  /** The most recently deployed first. */
  projects: Project[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
// The values land in hrefs, so only web links are accepted.
const isWebUrl = (v: unknown): v is string => {
  if (typeof v !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
const isCounts = (v: unknown, length: number): v is number[] =>
  Array.isArray(v) && v.length === length && v.every((n) => Number.isInteger(n) && n >= 0);

/** The directory's response, checked; throws when it isn't the shape this site reads. */
export function parseProjects(body: unknown): Projects {
  if (
    !isObject(body) ||
    !Array.isArray(body.days) ||
    !body.days.every(isDate) ||
    !Array.isArray(body.apps)
  ) {
    throw new Error("the project directory answered with an unexpected shape");
  }
  const days = body.days;
  const projects = body.apps.map((app, i): Project => {
    const ok =
      isObject(app) &&
      typeof app.name === "string" &&
      (app.description === undefined || typeof app.description === "string") &&
      isWebUrl(app.url) &&
      (app.source === undefined || isWebUrl(app.source)) &&
      isTime(app.liveSince) &&
      isTime(app.lastDeployedAt) &&
      (app.up === null || typeof app.up === "boolean") &&
      isCounts(app.pageViews, days.length) &&
      isCounts(app.requests, days.length);
    if (!ok) throw new Error(`the project directory's app ${i} has an unexpected shape`);
    return app as unknown as Project;
  });
  const since =
    isDate(body.countingSince) && body.countingSince > days[0]! ? body.countingSince : undefined;
  return {
    days,
    ...(since ? { countingSince: since } : {}),
    projects: projects.toSorted(
      (a, b) => Date.parse(b.lastDeployedAt) - Date.parse(a.lastDeployedAt),
    ),
  };
}

/** How long to wait for the directory before showing that it couldn't load. */
const TIMEOUT_MS = 6_000;

/** Where this browser keeps the directory it last fetched, for the session. */
const KEPT = "projects";

/**
 * How long a directory this browser already has stands in for a fresh one: long enough that going
 * from page to page draws at once, even after a while reading the one before; short enough that
 * today's counts stay as current as the platform's own few minutes of caching keep them.
 */
const KEEP_MS = 10 * 60_000;

/**
 * The directory this browser fetched in the last couple of minutes, checked, if there is one and
 * the visitor followed a link here (a reload always asks the platform again).
 */
export function keptProjects(): Projects | null {
  const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (entry?.type === "reload") return null;
  try {
    const kept: unknown = JSON.parse(sessionStorage.getItem(KEPT) ?? "null");
    if (!isObject(kept) || typeof kept.at !== "number" || Date.now() - kept.at > KEEP_MS) {
      return null;
    }
    return parseProjects(kept.body);
  } catch {
    return null;
  }
}

/**
 * Runs in the head before the first paint: when `keptProjects` will have a directory to draw at
 * once, the page says so (`kept` on the root), and the placeholders that would show for a moment
 * before it don't.
 */
export const getKeptScript = (): string => `
try {
  const n = performance.getEntriesByType("navigation")[0];
  const k = JSON.parse(sessionStorage.getItem("${KEPT}") || "null");
  if (n?.type !== "reload" && k && Date.now() - k.at <= ${KEEP_MS}) {
    document.documentElement.classList.add("kept");
  }
} catch {}
`;

export async function loadProjects(): Promise<Projects> {
  const res = await fetch(PROJECTS_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`the project directory answered ${res.status}`);
  const body: unknown = await res.json();
  const projects = parseProjects(body);
  try {
    sessionStorage.setItem(KEPT, JSON.stringify({ at: Date.now(), body }));
  } catch {
    // Storage that's full or off only means the next page fetches the directory again.
  }
  return projects;
}

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");

/** `Nov 26`, for a date or a timestamp, in UTC like the counts. */
export const formatDay = (when: string): string => day.format(new Date(when));

/** A page-view count as shown: `6.4k`, `329`, `0`. */
export const formatViews = (n: number): string => compact.format(n).replace("K", "k");

/** A count in full: `2,844`. */
export const formatCount = (n: number): string => full.format(n);

/** The same total as a screen reader hears it. */
export const describeViews = (n: number): string =>
  n === 0 ? "No page views" : `${full.format(n)} page views`;

export const totalOf = (counts: number[]): number => counts.reduce((sum, n) => sum + n, 0);

/** The index of the first day the platform counted: 0, or `countingSince`'s place in `days`. */
export const firstCounted = ({ days, countingSince }: Projects): number =>
  countingSince ? Math.max(0, days.indexOf(countingSince)) : 0;

/** What the counts cover, as the pages caption them. */
export const periodOf = (projects: Projects): string =>
  projects.countingSince
    ? `Page views since ${formatDay(projects.countingSince)}`
    : `Page views over the last ${projects.days.length} days`;

/** A day as a readout names it: `Today so far` for the last, which is still counting. */
export const dayName = (days: string[], d: number): string =>
  d === days.length - 1 ? "Today so far" : formatDay(days[d]!);
