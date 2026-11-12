import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPosts } from "../lib/posts";
import { withBase } from "../lib/paths";

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: "황준현 블로그",
    description: "클라우드 보안을 공부하며, 배운 것과 막힌 곳을 그대로 기록합니다.",
    site: new URL(withBase("/"), context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: withBase(`/posts/${post.id}/`),
    })),
  });
}
