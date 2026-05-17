import type { CollectionEntry } from "astro:content";

export type NormalizedNote = {
  id: string;
  title: string;
  description: string;
  date: Date | null;
  tags: string[];
};

export function titleFromId(id: string): string {
  const segments = id.split("/");
  const last = segments[segments.length - 1] ?? id;
  const base =
    last === "index" && segments.length > 1 ? (segments[segments.length - 2] ?? last) : last;
  return base.replaceAll(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeNote(post: CollectionEntry<"notes">): NormalizedNote {
  return {
    id: post.id,
    title: post.data.title ?? titleFromId(post.id),
    description: post.data.description ?? "",
    date: post.data.date ?? null,
    tags: post.data.tags,
  };
}
