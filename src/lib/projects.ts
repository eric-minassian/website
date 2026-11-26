// The apps running on my platform, read once at build time from its public endpoint (or a local
// JSON file, set through PROJECTS_SOURCE). Any failure throws so the build fails and GitHub Pages
// keeps serving the last good deploy instead of a page with the list missing.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "astro/zod";
import { PROJECTS_SOURCE } from "astro:env/server";

// The values land in hrefs, so only web links are accepted.
const webUrl = z.url({ protocol: /^https?$/, hostname: z.regexes.domain });
const dailyCounts = z.array(z.number().int().nonnegative());

const app = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  url: webUrl,
  source: webUrl.optional(),
  liveSince: z.iso.datetime(),
  lastDeployedAt: z.iso.datetime(),
  up: z.boolean().nullable(),
  pageViews: dailyCounts,
  requests: dailyCounts,
});

const response = z
  .object({
    generatedAt: z.iso.datetime(),
    days: z.array(z.iso.date()).min(1),
    apps: z.array(app),
  })
  .check((ctx) => {
    const { days, apps } = ctx.value;
    for (const [index, { name, pageViews, requests }] of apps.entries()) {
      for (const [key, series] of Object.entries({ pageViews, requests })) {
        if (series.length === days.length) continue;
        ctx.issues.push({
          code: "custom",
          input: series,
          path: ["apps", index, key],
          message: `${name} has ${series.length} ${key} entries for ${days.length} days`,
        });
      }
    }
  });

export type Project = z.infer<typeof app>;

const read = async (source: string): Promise<unknown> => {
  if (!/^https?:\/\//i.test(source)) return JSON.parse(await readFile(resolve(source), "utf8"));

  const res = await fetch(source, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Every app with its daily page views, the most recently deployed first. */
export const getProjects = async () => {
  let body: unknown;
  try {
    body = await read(PROJECTS_SOURCE);
  } catch (error) {
    throw new Error(`Couldn't load projects from ${PROJECTS_SOURCE}`, { cause: error });
  }

  const result = response.safeParse(body);
  if (!result.success) {
    throw new Error(
      `Projects from ${PROJECTS_SOURCE} don't match the expected shape:\n${z.prettifyError(result.error)}`,
    );
  }

  const { days, apps } = result.data;
  return {
    days,
    projects: apps.toSorted((a, b) => Date.parse(b.lastDeployedAt) - Date.parse(a.lastDeployedAt)),
  };
};
