import { isPost, type PortfolioItem } from "./notion/types";

/** 글 목록과 글 화면이 쓰는 공통 모양. 저장소 마크다운 글과 노션 공부 글을 함께 담는다. */
export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  source: "markdown" | "notion";
  /** 노션 글의 본문 HTML. 마크다운 글은 화면에서 직접 렌더링한다. */
  bodyHtml?: string;
}

interface MarkdownPost { id: string; data: { title: string; description: string; date: Date; tags: string[] } }

/** 마크다운 글과 노션 공부 글을 합쳐 최신순으로 돌려준다. 주소가 겹치면 두 글 이름을 적어 실패한다. */
export function mergePosts(markdown: MarkdownPost[], notionItems: PortfolioItem[]): PostSummary[] {
  const posts: PostSummary[] = [
    ...markdown.map((p) => ({ slug: p.id, title: p.data.title, description: p.data.description, date: p.data.date, tags: p.data.tags, source: "markdown" as const })),
    ...notionItems.filter(isPost).map((item) => ({
      slug: item.slug,
      title: item.name,
      description: item.summary,
      date: new Date(`${item.date!.start}T00:00:00+09:00`),
      tags: item.tags,
      source: "notion" as const,
      bodyHtml: item.bodyHtml,
    })),
  ];
  const seen = new Map<string, PostSummary>();
  for (const post of posts) {
    const other = seen.get(post.slug);
    if (other) throw new Error(`글 주소 "${post.slug}" 가 겹칩니다: "${other.title}", "${post.title}"`);
    seen.set(post.slug, post);
  }
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}
