import { expect, test } from "vitest";
import { mergePosts } from "../../src/lib/post-model";
import type { PortfolioItem } from "../../src/lib/notion/types";

const md = (id: string, date: string, tags: string[] = []) => ({ id, data: { title: `md ${id}`, description: "d", date: new Date(date), tags } });
const notion = (slug: string, start: string, kind: PortfolioItem["kind"] = "공부 글"): PortfolioItem => ({
  id: slug, slug, name: `노션 ${slug}`, kind, org: "", date: { start, end: null }, summary: "요약", featured: false, tags: ["웹해킹"], proofUrls: [], bodyHtml: "<p>본문</p>",
});

test("merges markdown and notion posts newest first", () => {
  const posts = mergePosts([md("old", "2026-11-05T10:00:00+09:00")], [notion("new", "2026-11-18"), notion("cert", "2026-12-01", "자격증")]);
  expect(posts.map((p) => p.slug)).toEqual(["new", "old"]);
  expect(posts[0]).toMatchObject({ title: "노션 new", description: "요약", tags: ["웹해킹"], source: "notion", bodyHtml: "<p>본문</p>" });
  expect(posts[1]).toMatchObject({ title: "md old", source: "markdown" });
});
test("a notion post date is midnight in Seoul", () => {
  expect(mergePosts([], [notion("a", "2026-06-27")])[0].date.toISOString()).toBe("2026-06-26T15:00:00.000Z");
});
test("a notion slug that collides with a markdown file fails with both names", () => {
  expect(() => mergePosts([md("same", "2026-11-05T10:00:00+09:00")], [notion("same", "2026-11-18")])).toThrow(/md same.*노션 same|노션 same.*md same/);
});
