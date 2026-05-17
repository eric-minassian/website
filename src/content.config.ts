import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const optionalDate = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}, z.date().optional());

const notes = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/CLAUDE.md", "!**/AGENTS.md", "!**/README.md"],
    base: "./src/content/notes",
  }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    date: optionalDate,
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { notes };
