const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;

/** 사이트 하위 경로(base)를 앞에 붙인다. 절대 주소는 그대로 둔다. */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  if (ABSOLUTE.test(path)) return path;
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}
