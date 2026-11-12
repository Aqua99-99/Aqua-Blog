import { readFileSync } from "node:fs";

export const loadFixture = (name: string) => JSON.parse(readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), "utf8"));

const rt = (s: string) => (s === "" ? [] : [{ type: "text", plain_text: s, href: null, annotations: {}, text: { content: s, link: null } }]);
export const richText = (s: string) => ({ type: "rich_text", rich_text: rt(s) });
export const title = (s: string) => ({ type: "title", title: rt(s) });
export const select = (name: string) => ({ type: "select", select: { name } });
export const files = (urls: string[]) => ({ type: "files", files: urls.map((url) => ({ name: url.split("/").pop()!.split("?")[0], type: "file", file: { url } })) });
export const withProps = (page: any, props: Record<string, unknown>): any => ({ ...page, properties: { ...page.properties, ...props } });

// ── 블록 도우미 ──
type Ann = { bold?: boolean; italic?: boolean; code?: boolean; href?: string };
export const text = (s: string, a: Ann = {}) => ({ type: "text", plain_text: s, href: a.href ?? null, annotations: { bold: !!a.bold, italic: !!a.italic, code: !!a.code, strikethrough: false, underline: false, color: "default" } });
let seq = 0;
const node = (type: string, data: unknown, children: any[] = []): any => ({ block: { object: "block", id: `b${++seq}`, type, has_children: children.length > 0, [type]: data }, children });
export const para = (rich: any[]) => node("paragraph", { rich_text: rich });
export const heading = (level: 1 | 2 | 3, s: string) => node(`heading_${level}`, { rich_text: [text(s)] });
export const bullet = (s: string, children: any[] = []) => node("bulleted_list_item", { rich_text: [text(s)] }, children);
export const numbered = (s: string) => node("numbered_list_item", { rich_text: [text(s)] });
export const quote = (s: string) => node("quote", { rich_text: [text(s)] });
export const code = (s: string, language: string) => node("code", { rich_text: [text(s)], language });
export const image = (url: string, caption = "") => node("image", { type: "file", file: { url }, caption: caption ? [text(caption)] : [] });
export const file = (url: string, name: string) => node("file", { type: "file", file: { url }, name, caption: [] });
export const divider = () => node("divider", {});
export const unsupported = (type: string) => node(type, {});

// ── 가짜 노션 API ──
type Paged = { results: unknown[]; has_more: boolean; next_cursor: string | null };
const paged = (pages: unknown[][], cursor: string | undefined): Paged => {
  const i = cursor ? Number(cursor.split("-")[1]) : 0;
  const more = i + 1 < pages.length;
  return { results: pages[i] ?? [], has_more: more, next_cursor: more ? `cursor-${i + 1}` : null };
};
export function fakeApi(data: { queryPages?: unknown[][]; blocks?: Record<string, unknown[][]> }) {
  const calls = { query: [] as any[], blocks: [] as any[] };
  return {
    calls,
    dataSources: { query: async (args: any) => (calls.query.push(args), paged(data.queryPages ?? [[]], args.start_cursor)) },
    blocks: { children: { list: async (args: any) => (calls.blocks.push(args), paged(data.blocks?.[args.block_id] ?? [[]], args.start_cursor)) } },
  };
}
export const okFetcher = (body: string) => async (_url: string) => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(body).buffer as ArrayBuffer });
export const rawBlock = (id: string, hasChildren: boolean, type = "paragraph", data: unknown = { rich_text: [text(id)] }) => ({ object: "block", id, type, has_children: hasChildren, [type]: data });
