export const KINDS = ["자격증", "수료", "수상", "대외활동", "공부 글"] as const;
export type PortfolioKind = (typeof KINDS)[number];

/** 날짜는 `YYYY-MM-DD`. 하루짜리면 end 는 null. */
export interface DateRange { start: string; end: string | null }

export interface PortfolioItem {
  id: string;
  slug: string;
  name: string;
  kind: PortfolioKind;
  org: string;
  date: DateRange | null;
  summary: string;
  featured: boolean;
  /** 공부 글의 태그. 포트폴리오 항목은 보통 비어 있다. */
  tags: string[];
  /** 증빙 파일 주소. loadPortfolio 를 거치면 사이트 안 주소가 된다. */
  proofUrls: string[];
  /** 본문 HTML. 본문이 없으면 빈 문자열. */
  bodyHtml: string;
}

/** 공부 글은 글 목록에, 나머지는 포트폴리오에 나온다. */
export const isPost = (item: { kind: PortfolioKind }) => item.kind === "공부 글";
