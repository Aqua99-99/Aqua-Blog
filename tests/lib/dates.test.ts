import { expect, test } from "vitest";
import { formatDate } from "../../src/lib/dates";

test("formats a date in Seoul time as yyyy.mm.dd", () => {
  expect(formatDate(new Date("2026-11-05T17:10:00+09:00"))).toBe("2026.11.05");
  expect(formatDate(new Date("2026-11-05T00:30:00+09:00"))).toBe("2026.11.05");
});
