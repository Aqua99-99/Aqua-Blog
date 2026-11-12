import type { DateRange } from "./notion/types";

const seoul = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

/** 한국 시간 기준 `2026.11.05` 형식. */
export function formatDate(d: Date): string {
  return seoul.format(d).replaceAll("-", ".");
}

const dotted = (ymd: string) => ymd.slice(0, 10).replaceAll("-", ".");

/** `2025.11.02` 또는 `2025.11.01 – 2025.11.02`. 날짜가 없으면 빈 문자열. */
export function formatRange(d: DateRange | null): string {
  if (!d) return "";
  return d.end && d.end !== d.start ? `${dotted(d.start)} – ${dotted(d.end)}` : dotted(d.start);
}

/** 최신순 정렬. 날짜가 없는 항목은 맨 뒤로 간다. */
export function compareByDateDesc(a: { date: DateRange | null }, b: { date: DateRange | null }): number {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return b.date.start.localeCompare(a.date.start);
}
