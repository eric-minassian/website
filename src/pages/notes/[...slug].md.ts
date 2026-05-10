import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("notes");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const { post } = props;
  const tags = post.data.tags.length > 0 ? `\ntags: [${post.data.tags.join(", ")}]` : "";
  const frontmatter = `---
title: ${JSON.stringify(post.data.title)}
description: ${JSON.stringify(post.data.description)}
date: ${post.data.date.toISOString()}${tags}
---

`;
  return new Response(frontmatter + (post.body ?? ""), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
