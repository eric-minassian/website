import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { normalizeNote } from "../../lib/notes";

export async function getStaticPaths() {
  const posts = await getCollection("notes");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const { post } = props;
  const note = normalizeNote(post);
  const lines = [
    `title: ${JSON.stringify(note.title)}`,
    `description: ${JSON.stringify(note.description)}`,
  ];
  if (note.date) lines.push(`date: ${note.date.toISOString()}`);
  if (note.tags.length > 0) lines.push(`tags: [${note.tags.join(", ")}]`);
  const frontmatter = `---\n${lines.join("\n")}\n---\n\n`;
  return new Response(frontmatter + (post.body ?? ""), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
