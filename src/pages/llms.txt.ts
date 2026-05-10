import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString().replace(/\/$/, "") ?? "";
  const posts = await getCollection("notes");
  const sorted = posts.toSorted(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const lines = [
    "# Eric Minassian",
    "",
    "> Personal site and notes on various topics.",
    "",
    "## Notes",
    "",
    ...sorted.map(
      (post) =>
        `- [${post.data.title}](${base}/notes/${post.id}.md): ${post.data.description}`,
    ),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
