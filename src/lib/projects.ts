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

export async function loadProjects(): Promise<Projects> {
  const res = await fetch(PROJECTS_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`the project directory answered ${res.status}`);
  return parseProjects(await res.json());
}

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");

/** `Nov 26`, for a date or a timestamp, in UTC like the counts. */
export const formatDay = (when: string): string => day.format(new Date(when));

/** A page-view total as shown: `6.4k`, `329`, or an en dash for none. */
export const formatViews = (n: number): string =>
  n === 0 ? "–" : compact.format(n).replace("K", "k");

/** The same total as a screen reader hears it. */
export const describeViews = (n: number): string =>
  n === 0 ? "No page views" : `${full.format(n)} page views`;

export const totalOf = (counts: number[]): number => counts.reduce((sum, n) => sum + n, 0);
