import { getCollection, type CollectionEntry } from "astro:content";
import { getPortfolio } from "./portfolio";
import { mergePosts, type PostSummary } from "./post-model";

export type { PostSummary };

/** 초안을 뺀 마크다운 글. */
export async function getMarkdownPosts(): Promise<CollectionEntry<"posts">[]> {
  return getCollection("posts", ({ data }) => !data.draft);
}

/** 마크다운 글과 노션 공부 글을 합쳐 최신순으로 돌려준다. */
export async function getPosts(): Promise<PostSummary[]> {
  return mergePosts(await getMarkdownPosts(), await getPortfolio());
}
