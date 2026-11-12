const seoul = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

/** 한국 시간 기준 `2026.11.05` 형식. */
export function formatDate(d: Date): string {
  return seoul.format(d).replaceAll("-", ".");
}
