import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { loadPortfolio } from "../../../src/lib/notion";
import { fakeApi, files, loadFixture, okFetcher, rawBlock, richText, select, title, withProps } from "./helpers";

const base = loadFixture("notion-page.json");
const page = (id: string, props: Record<string, unknown>) => ({ ...withProps(base, props), id });
const S3 = "https://prod-files-secure.s3.us-west-2.amazonaws.com";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "portfolio-")); });

const twoItemsOneWithImage = {
  queryPages: [[
    page("older-id", { 이름: title("예전"), 슬러그: richText("older"), 날짜: { type: "date", date: { start: "2025-01-01", end: null } }, 증빙: files([]) }),
    page("newer-id", { 이름: title("최근"), 슬러그: richText("newer"), 날짜: { type: "date", date: { start: "2026-01-01", end: null } }, 증빙: files([`${S3}/a/cert.pdf?sig=1`]) }),
  ]],
  blocks: { "newer-id": [[rawBlock("img", false, "image", { type: "file", file: { url: `${S3}/a/photo.jpg?sig=2` }, caption: [] })]] },
};

test("returns items newest first with local asset paths and body html", async () => {
  const items = await loadPortfolio({ api: fakeApi(twoItemsOneWithImage), dataSourceId: "ds", outDir: dir, publicPrefix: "/Aqua-Blog/notion/", fetcher: okFetcher("img") });
  expect(items.map((i) => i.slug)).toEqual(["newer", "older"]);
  expect(items[0].bodyHtml).toMatch(/src="\/Aqua-Blog\/notion\/[0-9a-f]{16}\.jpg"/);
  expect(items[0].proofUrls).toEqual([expect.stringMatching(/^\/Aqua-Blog\/notion\/[0-9a-f]{16}\.pdf$/)]);
  expect(items[1].bodyHtml).toBe("");
  expect(JSON.stringify(items)).not.toContain("amazonaws");
});
test("rejects duplicate slugs", async () => {
  const dup = { queryPages: [[page("1", { 이름: title("가"), 슬러그: richText("same") }), page("2", { 이름: title("나"), 슬러그: richText("same") })]] };
  await expect(loadPortfolio({ api: fakeApi(dup), dataSourceId: "ds", outDir: dir, publicPrefix: "/", fetcher: okFetcher("x") })).rejects.toThrow(/가.*나|나.*가/s);
});
test("an invalid item fails the whole load", async () => {
  const bad = { queryPages: [[page("1", { 증빙: files([]) }), page("2", { 구분: { type: "select", select: null }, 슬러그: richText("b") })]] };
  await expect(loadPortfolio({ api: fakeApi(bad), dataSourceId: "ds", outDir: dir, publicPrefix: "/", fetcher: okFetcher("x") })).rejects.toThrow(/구분/);
});
test("warnings from unsupported blocks name the item", async () => {
  const warnings: string[] = [];
  const data = { queryPages: [[page("1", { 이름: title("연수"), 증빙: files([]) })]], blocks: { "1": [[rawBlock("t", false, "table", {})]] } };
  await loadPortfolio({ api: fakeApi(data), dataSourceId: "ds", outDir: dir, publicPrefix: "/", warn: (m) => warnings.push(m) });
  expect(warnings).toEqual([expect.stringMatching(/연수.*table/)]);
});
test("drops an unpublished page even if the api returns it", async () => {
  const data = { queryPages: [[page("1", { 이름: title("비공개 메모"), 공개: { type: "checkbox", checkbox: false }, 증빙: files([]) })]] };
  expect(await loadPortfolio({ api: fakeApi(data), dataSourceId: "ds", outDir: dir, publicPrefix: "/" })).toEqual([]);
});
