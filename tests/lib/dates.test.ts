import { expect, test } from "vitest";
import { compareByDateDesc, formatDate, formatRange } from "../../src/lib/dates";

test("formats a date in Seoul time as yyyy.mm.dd", () => {
  expect(formatDate(new Date("2026-11-05T17:10:00+09:00"))).toBe("2026.11.05");
  expect(formatDate(new Date("2026-11-05T00:30:00+09:00"))).toBe("2026.11.05");
});

test("formats date", () => {
  expect(formatRange({ start: "2025-11-02", end: null })).toBe("2025.11.02");
  expect(formatRange({ start: "2025-11-01", end: "2025-11-02" })).toBe("2025.11.01 – 2025.11.02");
  expect(formatRange(null)).toBe("");
});
test("sorts undated last", () => {
  const xs = [{ date: null }, { date: { start: "2025-01-01", end: null } }, { date: { start: "2026-01-01", end: null } }];
  expect(xs.sort(compareByDateDesc).map((x) => x.date?.start ?? null)).toEqual(["2026-01-01", "2025-01-01", null]);
});
