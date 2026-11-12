import { expect, test } from "vitest";
import { InvalidItemError, pageToItem } from "../../../src/lib/notion/properties";
import { files, loadFixture, richText, select, title, withProps } from "./helpers";

const page = loadFixture("notion-page.json");

test("maps every property", () => {
  const item = pageToItem(page);
  expect(item).toMatchObject({
    id: "2658ad03-29f0-8028-ae2d-d2aeba27c72c",
    slug: "indonesia-training", name: "인도네시아 해외 IT 기업 기술 연수",
    kind: "대외활동", org: "영남이공대학교", date: { start: "2025-08-25", end: "2025-08-29" },
    summary: "BSSN 방문, 레드팀·블루팀 실습.", featured: true, bodyHtml: "",
  });
  expect(item.proofUrls).toHaveLength(1);
});

test("empty optional properties become empty values", () => {
  const item = pageToItem(withProps(page, { 기관: richText(""), 날짜: { type: "date", date: null }, 요약: richText(""), 증빙: files([]) }));
  expect(item).toMatchObject({ org: "", date: null, summary: "", proofUrls: [] });
});

test("missing name or kind throws with the page id", () => {
  expect(() => pageToItem(withProps(page, { 이름: title("") }))).toThrow(InvalidItemError);
  expect(() => pageToItem(withProps(page, { 이름: title("") }))).toThrow(/2658ad03/);
  expect(() => pageToItem(withProps(page, { 구분: { type: "select", select: null } }))).toThrow(/구분/);
});

test("unknown kind throws", () => {
  expect(() => pageToItem(withProps(page, { 구분: select("기타") }))).toThrow(InvalidItemError);
});

test("a property missing from the database is reported by name", () => {
  const { 대표: _, ...rest } = page.properties;
  expect(() => pageToItem({ ...page, properties: rest })).toThrow(/대표/);
});

test("the optional slug property may be absent", () => {
  const { 슬러그: _, ...rest } = page.properties;
  expect(pageToItem({ ...page, properties: rest }).slug).toBe("2658ad03");
});
