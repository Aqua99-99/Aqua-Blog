import { expect, test } from "vitest";
import { resolveSource } from "../../src/lib/portfolio";

test("uses notion when both secrets are set", () => {
  expect(resolveSource({ NOTION_TOKEN: "t", NOTION_DATA_SOURCE_ID: "d", DEV: false })).toBe("notion");
  expect(resolveSource({ NOTION_TOKEN: "t", NOTION_DATA_SOURCE_ID: "d", DEV: true })).toBe("notion");
});
test("falls back to fixtures only in dev", () => {
  expect(resolveSource({ DEV: true })).toBe("fixtures");
  expect(() => resolveSource({ DEV: false })).toThrow(/NOTION_TOKEN/);
  expect(() => resolveSource({ NOTION_TOKEN: "t", DEV: false })).toThrow(/NOTION_DATA_SOURCE_ID/);
  expect(() => resolveSource({ NOTION_TOKEN: "", NOTION_DATA_SOURCE_ID: "", DEV: false })).toThrow(/NOTION_TOKEN/);
});
test("PORTFOLIO_FIXTURES=1 forces fixtures", () => {
  expect(resolveSource({ DEV: false, PORTFOLIO_FIXTURES: "1" })).toBe("fixtures");
  expect(resolveSource({ NOTION_TOKEN: "t", NOTION_DATA_SOURCE_ID: "d", DEV: false, PORTFOLIO_FIXTURES: "1" })).toBe("fixtures");
});
