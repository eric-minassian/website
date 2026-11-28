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
/** An app of the directory, with one count per day for each of the `days`. */
const isProject = (v: unknown, days: number): v is Project =>
  isObject(v) &&
  typeof v.name === "string" &&
  (v.description === undefined || typeof v.description === "string") &&
  isWebUrl(v.url) &&
  (v.source === undefined || isWebUrl(v.source)) &&
  isTime(v.liveSince) &&
  isTime(v.lastDeployedAt) &&
  (v.up === null || typeof v.up === "boolean") &&
  isCounts(v.pageViews, days) &&
  isCounts(v.requests, days);

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
  const projects = body.apps.map((app: unknown, i): Project => {
    if (!isProject(app, days.length)) {
      throw new Error(`the project directory's app ${i} has an unexpected shape`);
    }
    return app;
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

export async function loadProjects(): Promise<Projects> {
  const res = await fetch(PROJECTS_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`the project directory answered ${res.status}`);
  return parseProjects(await res.json());
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
