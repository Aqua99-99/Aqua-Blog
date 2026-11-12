import { readFileSync } from "node:fs";

export const loadFixture = (name: string) => JSON.parse(readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), "utf8"));

const rt = (s: string) => (s === "" ? [] : [{ type: "text", plain_text: s, href: null, annotations: {}, text: { content: s, link: null } }]);
export const richText = (s: string) => ({ type: "rich_text", rich_text: rt(s) });
export const title = (s: string) => ({ type: "title", title: rt(s) });
export const select = (name: string) => ({ type: "select", select: { name } });
export const files = (urls: string[]) => ({ type: "files", files: urls.map((url) => ({ name: url.split("/").pop()!.split("?")[0], type: "file", file: { url } })) });
export const withProps = (page: any, props: Record<string, unknown>): any => ({ ...page, properties: { ...page.properties, ...props } });
