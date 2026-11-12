import { expect, test } from "vitest";
import { toSlug } from "../../../src/lib/notion/slug";

test("uses the explicit slug, lowercased and trimmed", () => {
  expect(toSlug("  Indonesia-Training ", "2658ad03-29f0-8028-ae2d-d2aeba27c72c")).toBe("indonesia-training");
});
test("falls back to the whole page id, because ids made together share their first characters", () => {
  expect(toSlug("", "4168ad03-29f0-81ca-8593-ed9c48961718")).toBe("4168ad0329f081ca8593ed9c48961718");
  expect(toSlug("", "4168ad03-29f0-81f2-8a8c-dbaca6fa6e23")).not.toBe(toSlug("", "4168ad03-29f0-81ca-8593-ed9c48961718"));
});
test("rejects characters outside a-z 0-9 hyphen", () => {
  expect(() => toSlug("인도네시아 연수", "2658ad03-29f0")).toThrow();
});
