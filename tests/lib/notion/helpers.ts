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
