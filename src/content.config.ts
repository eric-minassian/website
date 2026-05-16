import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const notes = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/CLAUDE.md", "!**/AGENTS.md", "!**/README.md"],
    base: "./src/content/notes",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { notes };
