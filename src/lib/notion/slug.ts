/**
 * 주소에 쓸 이름. 직접 적은 값이 있으면 그것을, 없으면 페이지 ID 전체를 쓴다.
 * 같은 때 만든 노션 페이지는 ID 앞부분이 같아서, 앞 몇 글자만 쓰면 서로 겹친다.
 */
export function toSlug(explicit: string, pageId: string): string {
  const slug = explicit.trim().toLowerCase();
  if (slug === "") return pageId.replaceAll("-", "").toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`슬러그 "${explicit}" 에는 영문 소문자, 숫자, 하이픈만 쓸 수 있습니다.`);
  }
  return slug;
}
