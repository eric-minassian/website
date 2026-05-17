import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { normalizeNote } from "../lib/notes";

export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString().replace(/\/$/, "") ?? "";
  const posts = await getCollection("notes");
  const sorted = posts
    .map(normalizeNote)
    .toSorted(
      (a, b) => (b.date ? b.date.getTime() : -Infinity) - (a.date ? a.date.getTime() : -Infinity),
    );

  const lines = [
    "# Eric Minassian",
    "",
    "> Personal site and notes on various topics.",
    "",
    "## Notes",
    "",
    ...sorted.map(
      (note) =>
        `- [${note.title}](${base}/notes/${note.id}.md)${note.description ? `: ${note.description}` : ""}`,
    ),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
