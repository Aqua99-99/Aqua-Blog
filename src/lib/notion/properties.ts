import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { toSlug } from "./slug";
import { KINDS, type DateRange, type PortfolioItem, type PortfolioKind } from "./types";

export class InvalidItemError extends Error {}

type Props = PageObjectResponse["properties"];
type Prop = Props[string];

function prop<T extends Prop["type"]>(page: PageObjectResponse, name: string, type: T): Extract<Prop, { type: T }> {
  const p = page.properties[name];
  if (!p) throw new InvalidItemError(`페이지 ${page.id}: 데이터베이스에 "${name}" 속성이 없습니다.`);
  if (p.type !== type) throw new InvalidItemError(`페이지 ${page.id}: "${name}" 속성의 종류가 ${type} 이어야 하는데 ${p.type} 입니다.`);
  return p as Extract<Prop, { type: T }>;
}

const plain = (parts: { plain_text: string }[]) => parts.map((t) => t.plain_text).join("").trim();

export interface ProofSource { url: string; /** 노션에 올린 파일이 아니라 바깥 링크인지. */ external: boolean }

/** "증빙" 속성의 파일과 링크. 바깥 링크는 https 만 받는다. */
export function proofSources(page: PageObjectResponse): ProofSource[] {
  const out: ProofSource[] = [];
  for (const f of prop(page, "증빙", "files").files) {
    if ("file" in f) out.push({ url: f.file.url, external: false });
    else if ("external" in f && /^https:\/\//i.test(f.external.url)) out.push({ url: f.external.url, external: true });
  }
  return out;
}

/** 노션 페이지의 속성을 포트폴리오 항목으로 바꾼다. 본문은 채우지 않는다. */
export function pageToItem(page: PageObjectResponse): PortfolioItem {
  const name = plain(prop(page, "이름", "title").title);
  if (name === "") throw new InvalidItemError(`페이지 ${page.id}: "이름"이 비어 있습니다.`);
  const where = `"${name}" (페이지 ${page.id})`;

  const kind = prop(page, "구분", "select").select?.name;
  if (!kind) throw new InvalidItemError(`${where}: "구분"이 비어 있습니다.`);
  if (!(KINDS as readonly string[]).includes(kind)) {
    throw new InvalidItemError(`${where}: "구분" 값 "${kind}" 은 ${KINDS.join(", ")} 중 하나여야 합니다.`);
  }

  const d = prop(page, "날짜", "date").date;
  const date: DateRange | null = d ? { start: d.start.slice(0, 10), end: d.end ? d.end.slice(0, 10) : null } : null;

  const proofUrls = proofSources(page).map((p) => p.url);

  const slugProp = page.properties["슬러그"];
  const explicitSlug = slugProp?.type === "rich_text" ? plain(slugProp.rich_text) : "";
  let slug: string;
  try {
    slug = toSlug(explicitSlug, page.id);
  } catch (e) {
    throw new InvalidItemError(`${where}: ${(e as Error).message}`);
  }

  return {
    id: page.id,
    slug,
    name,
    kind: kind as PortfolioKind,
    org: plain(prop(page, "기관", "rich_text").rich_text),
    date,
    summary: plain(prop(page, "요약", "rich_text").rich_text),
    featured: prop(page, "대표", "checkbox").checkbox,
    proofUrls,
    bodyHtml: "",
  };
}
