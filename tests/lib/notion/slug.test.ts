import { expect, test } from "vitest";
import { toSlug } from "../../../src/lib/notion/slug";

test("uses the explicit slug, lowercased and trimmed", () => {
  expect(toSlug("  Indonesia-Training ", "2658ad03-29f0-8028-ae2d-d2aeba27c72c")).toBe("indonesia-training");
});
test("falls back to the first 8 hex chars of the page id", () => {
  expect(toSlug("", "2658ad03-29f0-8028-ae2d-d2aeba27c72c")).toBe("2658ad03");
});
test("rejects characters outside a-z 0-9 hyphen", () => {
  expect(() => toSlug("인도네시아 연수", "2658ad03-29f0")).toThrow();
});
