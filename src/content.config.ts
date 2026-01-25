import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const work = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/work" }),
  schema: z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(200).optional(),
    github: z.string().url(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    status: z.enum(["active", "completed", "archived"]).default("active"),
  }),
});

export const collections = { work };
