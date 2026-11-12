# 노션 연동 포트폴리오·블로그 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hugo + AWS 블로그를 Astro + GitHub Pages로 바꾸고, 노션 "포트폴리오" 데이터베이스에서 공개 체크한 항목이 사이트에 자동으로 올라가게 한다.

**Architecture:** 빌드할 때 `src/lib/notion/`이 노션 API에서 공개 항목을 읽어 `PortfolioItem[]`으로 바꾸고 이미지를 `public/notion/`에 내려받는다. Astro 화면은 `getPortfolio()`와 저장소 안 마크다운 글(content collection)만 읽는다. GitHub Actions가 push·하루 한 번·수동 실행으로 빌드해 GitHub Pages에 올린다.

**Tech Stack:** Node 22, Astro 7.4, TypeScript(strict), `@notionhq/client` 5.31(Notion API `2025-09-03`, data source 기준), Vitest 5, `@astrojs/sitemap`, `@astrojs/rss`, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-12-notion-portfolio-blog-design.md`

## Global Constraints

- 브랜치: `redesign/astro-notion`. `main`에는 Task 9에서만 합친다.
- 사이트 주소: `site: "https://aqua99-99.github.io"`, `base: "/Aqua-Blog"`. 내부 링크는 전부 `withBase()`를 거친다.
- 노션에서 `공개` 체크박스가 켜진 항목만 읽는다. 꺼진 항목의 내용은 빌드 결과물과 저장소에 들어가면 안 된다.
- 노션 파일 주소(만료되는 서명 주소)를 HTML에 남기지 않는다. 모든 이미지·파일은 내려받아 `/Aqua-Blog/notion/<파일>`로 참조한다.
- 비밀값은 환경 변수 `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`로만 받는다. 저장소에 적지 않는다.
- 디자인 값: 바탕 `#F6F7F9`, 글자 `#14181F`, 보조 글자 `#4A5462`, 본문 보조 `#333B47`, 강조 `#0B5FA5`(hover `#08467A`), 테두리 `#D9DDE3`, 카드 바탕 `#FFFFFF`. 글꼴 `IBM Plex Sans KR`(400·500·600·700), `IBM Plex Mono`(400·500). 본문 폭 `max-width: 1040px`.
- 화면 문구는 한국어. 표시 이름 `황준현`, 한 줄 소개 `클라우드 보안을 공부하며, 배운 것과 막힌 곳을 그대로 기록합니다.`, 소속 `영남이공대학교 사이버보안과 · 2학년`, 이메일 `dkzndk1223@gmail.com`, GitHub `https://github.com/Aqua99-99`.
- Astro 7은 작성자의 사전 지식보다 새 버전이다. content collection, 설정 파일 형식은 Task 1·2를 시작할 때 `https://docs.astro.build`의 현재 문서로 확인하고 그 방식을 따른다.
- 커밋 메시지는 한국어, 끝에 저장소 규칙의 Co-Authored-By 줄을 붙인다.

## Review Focus

1. 노션 항목이나 본문 블록이 100개를 넘는 경우: 첫 100개만 나오지 않고 전부 나와야 한다. → Task 5 `fetches every page of results`.
2. 노션 글에 `<script>`나 `&`, `<` 같은 문자가 들어 있는 경우: 그대로 글자로 보여야 하고 HTML로 해석되면 안 된다. → Task 4 `escapes html in text`.
3. 두 항목의 슬러그가 같은 경우: 한쪽이 조용히 덮어써지지 않고, 두 항목 이름을 적어 빌드가 실패해야 한다. → Task 5 `rejects duplicate slugs`.
4. 날짜가 비어 있거나 기간(시작~끝)인 경우: 화면이 깨지지 않고, 빈 날짜는 목록 맨 뒤로 가고 기간은 `2025.11.01 – 2025.11.02`로 보여야 한다. → Task 3 `formats date`, `sorts undated last`.
5. 지원하지 않는 블록(토글, 표, 하위 페이지)이나 한글 파일명 첨부가 있는 경우: 빌드가 죽지 않고 그 블록만 빠지며 경고가 남고, 파일은 안전한 이름으로 저장돼야 한다. → Task 4 `skips unsupported blocks with a warning`, Task 5 `names assets by content hash`.

---

## File Structure

```
astro.config.mjs            site/base, sitemap 통합
package.json, tsconfig.json, vitest.config.ts
src/
  lib/
    paths.ts                withBase(path): 하위 경로 붙이기
    dates.ts                formatDate(), compareByDateDesc()
    notion/
      types.ts              PortfolioItem, PortfolioKind
      slug.ts               toSlug()
      properties.ts         pageToItem(): 노션 페이지 속성 → PortfolioItem(본문 제외)
      blocks.ts             blocksToHtml(): 블록 → HTML 문자열
      assets.ts             saveAsset(): 파일 내려받아 public/notion/ 에 저장
      client.ts             queryPublished(), listBlocks(): API 호출과 페이지 넘김
      index.ts              loadPortfolio(): 위를 묶는 한 함수
    portfolio.ts            getPortfolio(): 환경 변수 확인, 개발용 예시 대체, 메모이즈
  data/site.ts              프로필, 프로젝트 카드
  fixtures/portfolio.json   로컬 개발용 예시 항목
  content/posts/*.md        기존 글 3편
  content.config.ts         posts 컬렉션
  styles/global.css         디자인 토큰과 기본 스타일
  layouts/Base.astro        head, 메뉴, 꼬리말
  components/               CertTable, ActivityTimeline, ProjectCards, PostList
  pages/                    index, portfolio/index, portfolio/[slug], posts/index,
                            posts/[slug], tags/[tag], about, rss.xml.ts, 404
tests/                      src/lib 과 같은 구조의 *.test.ts, fixtures/*.json
.github/workflows/deploy.yml
README.md                   운영 방법(노션에서 올리는 법, 비밀값 넣는 법)
```

Hugo 파일(`hugo.toml`, `layouts/`, `assets/`, `archetypes/`, `content/`, `data/`, `static/`)은 Task 1에서 지운다. `static/favicon.svg`는 `public/favicon.svg`로 옮긴다.

---

### Task 1: Astro 뼈대와 기본 레이아웃

**Files:**
- Delete: `hugo.toml`, `layouts/`, `assets/`, `archetypes/`, `data/`, `.github/workflows/deploy.yml`(Task 7에서 새로 만든다). `content/`는 Task 2에서 옮긴 뒤 지운다.
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/lib/paths.ts`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/pages/index.astro`(임시 제목만), `src/pages/404.astro`, `public/favicon.svg`
- Modify: `.gitignore` (`node_modules/`, `dist/`, `.astro/`, `public/notion/` 추가)
- Test: `tests/lib/paths.test.ts`

**Interfaces:**
- Produces: `withBase(path: string): string` — `import.meta.env.BASE_URL`을 앞에 붙이고 슬래시 중복을 없앤다. `Base.astro`는 props `{ title: string; description?: string }`를 받고 기본 slot에 본문을 받는다. npm 스크립트 `dev`, `build`, `preview`, `test`(`vitest run`).

- [ ] **Step 1: 의존성 설치.** `npm init -y` 후 `npm i astro@^7.4 @astrojs/sitemap @astrojs/rss @notionhq/client@^5.31` 과 `npm i -D vitest@^5 typescript @types/node`. `package.json`에 `"type": "module"`, `"engines": {"node": ">=22.23"}`, 스크립트 네 개를 넣는다.
- [ ] **Step 2: 실패하는 시험 작성** (`tests/lib/paths.test.ts`). `withBase`는 base를 인자로도 받을 수 있게 해서 시험한다: `withBase(path: string, base = import.meta.env.BASE_URL)`.

```ts
import { expect, test } from "vitest";
import { withBase } from "../../src/lib/paths";

test("prefixes the base path", () => {
  expect(withBase("/portfolio/", "/Aqua-Blog")).toBe("/Aqua-Blog/portfolio/");
  expect(withBase("portfolio/", "/Aqua-Blog/")).toBe("/Aqua-Blog/portfolio/");
  expect(withBase("/", "/Aqua-Blog")).toBe("/Aqua-Blog/");
});

test("leaves absolute urls alone", () => {
  expect(withBase("https://github.com/Aqua99-99", "/Aqua-Blog")).toBe("https://github.com/Aqua99-99");
  expect(withBase("mailto:dkzndk1223@gmail.com", "/Aqua-Blog")).toBe("mailto:dkzndk1223@gmail.com");
});
```

- [ ] **Step 3:** `npm test` → `withBase` 없음으로 FAIL 확인.
- [ ] **Step 4:** `src/lib/paths.ts` 구현, `npm test` PASS.
- [ ] **Step 5:** `astro.config.mjs`에 `site`, `base`(Global Constraints 값), `trailingSlash: "always"`, sitemap 통합. `tsconfig.json`은 Astro의 strict 프리셋 확장.
- [ ] **Step 6:** `global.css`에 Global Constraints의 색·글꼴을 CSS 변수로 정의하고, `Base.astro`에 Google Fonts 링크, `<title>`·`<meta name="description">`, 메뉴(`황준현` → `/`, `포트폴리오`, `글`, `소개`), 꼬리말(GitHub, 이메일 링크)을 넣는다. 메뉴는 `flex-wrap`으로 좁은 화면에서 줄바꿈된다. 링크의 터치 영역은 높이 44px 이상.
- [ ] **Step 7:** `npm run build` → `dist/index.html`이 생기고, 그 안의 CSS·favicon 주소가 `/Aqua-Blog/`로 시작하는지 `grep -c 'href="/Aqua-Blog/' dist/index.html`로 확인(1 이상).
- [ ] **Step 8:** Commit `Hugo를 Astro 뼈대로 교체`.

---

### Task 2: 기존 글 3편과 글 화면

**Files:**
- Create: `src/content.config.ts`, `src/content/posts/first-post.md`, `src/content/posts/aws-s3-cloudfront-hosting.md`, `src/content/posts/github-actions-oidc-deploy.md`, `src/lib/dates.ts`, `src/components/PostList.astro`, `src/pages/posts/index.astro`, `src/pages/posts/[slug].astro`, `src/pages/tags/[tag].astro`, `src/pages/rss.xml.ts`
- Delete: `content/`
- Test: `tests/lib/dates.test.ts`

**Interfaces:**
- Consumes: `withBase`, `Base.astro`.
- Produces: `posts` 컬렉션, 스키마 `{ title: string; description: string; date: Date; tags: string[]; draft: boolean(default false) }`. `formatDate(d: Date): string` → `2026.11.05`. `PostList.astro` props `{ posts: CollectionEntry<"posts">[] }`.

- [ ] **Step 1:** 글 3편을 옮긴다. Hugo의 `+++` TOML 머리말을 `---` YAML로 바꾸고 키는 그대로(`title`, `description`, `date`, `tags`, `draft`). 본문은 한 글자도 바꾸지 않는다. `content/about.md`와 `_index.md`는 옮기지 않는다.
- [ ] **Step 2: 실패하는 시험** (`tests/lib/dates.test.ts`).

```ts
import { expect, test } from "vitest";
import { formatDate } from "../../src/lib/dates";

test("formats a date in Seoul time as yyyy.mm.dd", () => {
  expect(formatDate(new Date("2026-11-05T17:10:00+09:00"))).toBe("2026.11.05");
  expect(formatDate(new Date("2026-11-05T00:30:00+09:00"))).toBe("2026.11.05");
});
```

- [ ] **Step 3:** FAIL 확인 → `formatDate` 구현(시간대 `Asia/Seoul` 고정) → PASS.
- [ ] **Step 4:** `content.config.ts`에 컬렉션 정의(현재 Astro 문서의 loader 방식). 글 목록은 `draft`가 아닌 글을 날짜 내림차순으로, 상세는 제목·날짜·태그·본문, 태그 페이지는 그 태그의 글 목록. 코드 블록은 Astro 기본 하이라이팅을 쓰고 밝은 테마로 맞춘다. `rss.xml.ts`는 `@astrojs/rss`로 같은 글 목록을 낸다.
- [ ] **Step 5:** `npm run build` 후 확인: `ls dist/posts` 에 세 글 폴더와 `index.html`, `dist/tags/AWS/index.html`, `dist/rss.xml` 존재. `grep -c "<item>" dist/rss.xml` → `3`.
- [ ] **Step 6:** Commit `기존 글 3편과 글 화면 추가`.

---

### Task 3: 노션 속성 → PortfolioItem

**Files:**
- Create: `src/lib/notion/types.ts`, `src/lib/notion/slug.ts`, `src/lib/notion/properties.ts`, `tests/fixtures/notion-page.json`
- Modify: `src/lib/dates.ts`
- Test: `tests/lib/notion/properties.test.ts`, `tests/lib/notion/slug.test.ts`, `tests/lib/dates.test.ts`

**Interfaces:**
- Produces:

```ts
// types.ts
export type PortfolioKind = "자격증" | "수료" | "수상" | "대외활동";
export interface DateRange { start: string; end: string | null }   // "YYYY-MM-DD"
export interface PortfolioItem {
  id: string;            // 노션 페이지 ID
  slug: string;
  name: string;
  kind: PortfolioKind;
  org: string;           // 비어 있으면 ""
  date: DateRange | null;
  summary: string;       // 비어 있으면 ""
  featured: boolean;
  proofUrls: string[];   // properties 단계에서는 노션 원본 주소, loadPortfolio 가 로컬 경로로 바꾼다
  bodyHtml: string;      // properties 단계에서는 ""
}
// properties.ts
export class InvalidItemError extends Error {}
export function pageToItem(page: PageObjectResponse): PortfolioItem;
// slug.ts
export function toSlug(explicit: string, pageId: string): string;
// dates.ts
export function formatRange(d: DateRange | null): string;
export function compareByDateDesc(a: { date: DateRange | null }, b: { date: DateRange | null }): number;
```

노션 속성 이름(정확히 이 한글 이름): `이름`(title), `구분`(select), `기관`(rich_text), `날짜`(date), `요약`(rich_text), `증빙`(files), `대표`(checkbox), `공개`(checkbox), `슬러그`(rich_text, 선택). `슬러그`는 스펙의 표에 없는 추가 속성이다: 주소에 쓸 영문 이름이고, 비어 있으면 페이지 ID 앞 8자를 쓴다. Task 8에서 스펙의 표에 한 줄 추가한다.

- [ ] **Step 1:** `tests/fixtures/notion-page.json`에 Notion API `2025-09-03` 형식의 페이지 객체 하나를 손으로 만든다(위 속성 전부 채움: 이름 `인도네시아 해외 IT 기업 기술 연수`, 구분 `대외활동`, 날짜 start `2025-08-25` end `2025-08-29`, 슬러그 `indonesia-training`, 증빙 파일 1개).
- [ ] **Step 2: 실패하는 시험.**

```ts
// properties.test.ts
test("maps every property", () => {
  const item = pageToItem(page);
  expect(item).toMatchObject({
    slug: "indonesia-training", name: "인도네시아 해외 IT 기업 기술 연수",
    kind: "대외활동", date: { start: "2025-08-25", end: "2025-08-29" },
    featured: true, bodyHtml: "",
  });
  expect(item.proofUrls).toHaveLength(1);
});
test("empty optional properties become empty values", () => {
  const item = pageToItem(withProps(page, { 기관: richText(""), 날짜: { type: "date", date: null }, 요약: richText(""), 증빙: files([]) }));
  expect(item).toMatchObject({ org: "", date: null, summary: "", proofUrls: [] });
});
test("missing name or kind throws with the page id", () => {
  expect(() => pageToItem(withProps(page, { 이름: title("") }))).toThrow(InvalidItemError);
  expect(() => pageToItem(withProps(page, { 구분: { type: "select", select: null } }))).toThrow(/구분/);
});
test("unknown kind throws", () => {
  expect(() => pageToItem(withProps(page, { 구분: select("기타") }))).toThrow(InvalidItemError);
});
// slug.test.ts
test("uses the explicit slug, lowercased and trimmed", () => {
  expect(toSlug("  Indonesia-Training ", "2658ad03-29f0-8028-ae2d-d2aeba27c72c")).toBe("indonesia-training");
});
test("falls back to the first 8 hex chars of the page id", () => {
  expect(toSlug("", "2658ad03-29f0-8028-ae2d-d2aeba27c72c")).toBe("2658ad03");
});
test("rejects characters outside a-z 0-9 hyphen", () => {
  expect(() => toSlug("인도네시아 연수", "2658ad03-29f0")).toThrow();
});
// dates.test.ts 에 추가 (Review Focus 4)
test("formats date", () => {
  expect(formatRange({ start: "2025-11-02", end: null })).toBe("2025.11.02");
  expect(formatRange({ start: "2025-11-01", end: "2025-11-02" })).toBe("2025.11.01 – 2025.11.02");
  expect(formatRange(null)).toBe("");
});
test("sorts undated last", () => {
  const xs = [{ date: null }, { date: { start: "2025-01-01", end: null } }, { date: { start: "2026-01-01", end: null } }];
  expect(xs.sort(compareByDateDesc).map((x) => x.date?.start ?? null)).toEqual(["2026-01-01", "2025-01-01", null]);
});
```

시험 도우미 `withProps`, `richText`, `title`, `select`, `files`는 시험 파일 안에 둔다.

- [ ] **Step 3:** FAIL 확인 → 구현 → `npm test` PASS. 오류 메시지에는 페이지 ID와 빠진 속성 이름을 넣는다. 속성 자체가 없는 경우(데이터베이스에 그 열이 없음)도 `InvalidItemError`로 속성 이름을 알린다.
- [ ] **Step 4:** Commit `노션 속성을 포트폴리오 항목으로 바꾸는 모듈 추가`.

---

### Task 4: 노션 블록 → HTML

**Files:**
- Create: `src/lib/notion/blocks.ts`, `tests/fixtures/notion-blocks.json`
- Test: `tests/lib/notion/blocks.test.ts`

**Interfaces:**
- Produces:

```ts
export interface BlockNode { block: BlockObjectResponse; children: BlockNode[] }
export interface RenderContext {
  resolveAsset(url: string, suggestedName: string): Promise<string>; // 사이트 안 주소를 돌려준다
  warn(message: string): void;
}
export function blocksToHtml(nodes: BlockNode[], ctx: RenderContext): Promise<string>;
```

지원 블록과 출력: `paragraph`→`<p>`, `heading_1/2/3`→`<h2>/<h3>/<h4>`(페이지 제목이 `<h1>`이므로 한 단계 내린다), `bulleted_list_item`·`numbered_list_item`→이웃한 것끼리 `<ul>`/`<ol>`로 묶고 자식은 중첩 목록, `quote`→`<blockquote>`, `code`→`<pre><code class="language-…">`, `image`→`<img src alt loading="lazy">`(alt는 캡션, 없으면 `""`), `file`·`pdf`→`<a href>`(파일 이름을 글자로), `divider`→`<hr>`. 글자 꾸밈은 굵게 `<strong>`, 기울임 `<em>`, 코드 `<code>`, 링크 `<a href>`. 빈 문단은 내보내지 않는다.

- [ ] **Step 1:** `tests/fixtures/notion-blocks.json`에 위 블록 종류를 하나씩 담은 `BlockNode[]`를 만든다.
- [ ] **Step 2: 실패하는 시험.**

```ts
const ctx = () => { const warnings: string[] = []; return { warnings, resolveAsset: async (_u: string, n: string) => `/Aqua-Blog/notion/${n}`, warn: (m: string) => warnings.push(m) }; };

test("renders paragraphs with annotations", async () => {
  expect(await blocksToHtml([para([text("굵게", { bold: true }), text(" 보통")])], ctx()))
    .toBe("<p><strong>굵게</strong> 보통</p>");
});
test("shifts headings down one level", async () => {
  expect(await blocksToHtml([heading(2, "레드팀 공격활동")], ctx())).toBe("<h3>레드팀 공격활동</h3>");
});
test("groups adjacent list items and nests children", async () => {
  expect(await blocksToHtml([bullet("가", [bullet("가-1")]), bullet("나"), para([text("끝")])], ctx()))
    .toBe("<ul><li>가<ul><li>가-1</li></ul></li><li>나</li></ul><p>끝</p>");
});
test("escapes html in text", async () => {            // Review Focus 2
  expect(await blocksToHtml([para([text('<script>alert(1)</script> & "x"')])], ctx()))
    .toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</p>");
});
test("rejects javascript: links", async () => {
  expect(await blocksToHtml([para([text("눌러", { href: "javascript:alert(1)" })])], ctx())).toBe("<p>눌러</p>");
});
test("images go through resolveAsset and never keep the notion url", async () => {
  const html = await blocksToHtml([image("https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/photo.jpg?X-Amz-Signature=abc")], ctx());
  expect(html).toContain('src="/Aqua-Blog/notion/photo.jpg"');
  expect(html).not.toContain("amazonaws");
});
test("skips unsupported blocks with a warning", async () => {   // Review Focus 5
  const c = ctx();
  expect(await blocksToHtml([para([text("앞")]), { block: { type: "table", id: "t1" } as any, children: [] }, para([text("뒤")])], c))
    .toBe("<p>앞</p><p>뒤</p>");
  expect(c.warnings).toEqual([expect.stringContaining("table")]);
});
test("drops empty paragraphs", async () => {
  expect(await blocksToHtml([para([]), para([text("")])], ctx())).toBe("");
});
```

- [ ] **Step 3:** FAIL 확인 → 구현 → PASS. 링크는 `http:`, `https:`, `mailto:`만 허용한다.
- [ ] **Step 4:** Commit `노션 블록을 HTML로 바꾸는 모듈 추가`.

---

### Task 5: 노션 호출, 파일 내려받기, getPortfolio

**Files:**
- Create: `src/lib/notion/assets.ts`, `src/lib/notion/client.ts`, `src/lib/notion/index.ts`, `src/lib/portfolio.ts`, `src/fixtures/portfolio.json`
- Test: `tests/lib/notion/assets.test.ts`, `tests/lib/notion/client.test.ts`, `tests/lib/notion/index.test.ts`, `tests/lib/portfolio.test.ts`

**Interfaces:**
- Consumes: `pageToItem`, `blocksToHtml`, `BlockNode`, `PortfolioItem`, `withBase`.
- Produces:

```ts
// client.ts — 노션 SDK 중 쓰는 부분만 좁힌 타입을 받는다(시험에서 가짜를 넣기 위해)
export interface NotionApi {
  dataSources: { query(args: { data_source_id: string; filter: unknown; start_cursor?: string; page_size?: number }): Promise<{ results: unknown[]; has_more: boolean; next_cursor: string | null }> };
  blocks: { children: { list(args: { block_id: string; start_cursor?: string; page_size?: number }): Promise<{ results: unknown[]; has_more: boolean; next_cursor: string | null }> } };
}
export function queryPublished(api: NotionApi, dataSourceId: string): Promise<PageObjectResponse[]>;  // filter: 공개 checkbox equals true
export function listBlocks(api: NotionApi, blockId: string): Promise<BlockNode[]>;                    // has_children 이면 재귀
// assets.ts
export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;
export function saveAsset(url: string, suggestedName: string, outDir: string, fetcher?: Fetcher): Promise<string>; // 저장한 파일 이름을 돌려준다
// index.ts
export function loadPortfolio(opts: { api: NotionApi; dataSourceId: string; outDir: string; publicPrefix: string; fetcher?: Fetcher; warn?: (m: string) => void }): Promise<PortfolioItem[]>;
// portfolio.ts
export function getPortfolio(): Promise<PortfolioItem[]>;   // 프로세스당 한 번만 읽는다
export function resolveSource(env: { NOTION_TOKEN?: string; NOTION_DATA_SOURCE_ID?: string; DEV: boolean }): "notion" | "fixtures";
```

`saveAsset`의 파일 이름: 내용 SHA-256 앞 16자 + 원래 확장자(소문자, 주소의 query 제외, `suggestedName`에서 먼저 찾고 없으면 URL 경로에서 찾는다, 없으면 `.bin`). 같은 내용이면 같은 이름이라 다시 쓰지 않는다. `loadPortfolio`는 결과를 `compareByDateDesc`로 정렬하고, `proofUrls`와 본문 이미지를 `publicPrefix + 파일이름`으로 바꾼다.

- [ ] **Step 1: 실패하는 시험.**

```ts
// client.test.ts
test("fetches every page of results", async () => {          // Review Focus 1
  const api = fakeApi({ queryPages: [[p(1), p(2)], [p(3)]] });
  expect((await queryPublished(api, "ds")).map((x) => x.id)).toEqual(["1", "2", "3"]);
  expect(api.calls.query[1].start_cursor).toBe("cursor-1");
});
test("asks only for published items", async () => {
  const api = fakeApi({ queryPages: [[]] });
  await queryPublished(api, "ds");
  expect(api.calls.query[0].filter).toEqual({ property: "공개", checkbox: { equals: true } });
});
test("walks child blocks and paginates them", async () => {
  const api = fakeApi({ blocks: { root: [[b("a", true)], [b("b", false)]], a: [[b("a1", false)]] } });
  const nodes = await listBlocks(api, "root");
  expect(nodes.map((n) => n.block.id)).toEqual(["a", "b"]);
  expect(nodes[0].children.map((n) => n.block.id)).toEqual(["a1"]);
});
// assets.test.ts (임시 폴더 사용)
test("names assets by content hash", async () => {             // Review Focus 5
  const name = await saveAsset("https://x.amazonaws.com/a/수료증.PDF?sig=1", "수료증.PDF", dir, okFetcher("hello"));
  expect(name).toMatch(/^[0-9a-f]{16}\.pdf$/);
  expect(readFileSync(join(dir, name), "utf8")).toBe("hello");
});
test("extension falls back to the url path, then .bin", async () => {
  expect(await saveAsset("https://x/a/photo.JPG?sig=1", "", dir, okFetcher("a"))).toMatch(/\.jpg$/);
  expect(await saveAsset("https://x/a/blob", "", dir, okFetcher("b"))).toMatch(/\.bin$/);
});
test("a failed download throws with the status", async () => {
  await expect(saveAsset("https://x/a.png", "a.png", dir, async () => ({ ok: false, status: 403, arrayBuffer: async () => new ArrayBuffer(0) }))).rejects.toThrow(/403/);
});
// index.test.ts
test("returns items newest first with local asset paths and body html", async () => {
  const items = await loadPortfolio({ api: fakeApi(twoItemsOneWithImage), dataSourceId: "ds", outDir: dir, publicPrefix: "/Aqua-Blog/notion/", fetcher: okFetcher("img") });
  expect(items.map((i) => i.slug)).toEqual(["newer", "older"]);
  expect(items[0].bodyHtml).toContain('src="/Aqua-Blog/notion/');
  expect(items[0].proofUrls.every((u) => u.startsWith("/Aqua-Blog/notion/"))).toBe(true);
  expect(JSON.stringify(items)).not.toContain("amazonaws");
});
test("rejects duplicate slugs", async () => {                  // Review Focus 3
  await expect(loadPortfolio({ api: fakeApi(twoItemsSameSlug("가", "나")), dataSourceId: "ds", outDir: dir, publicPrefix: "/" }))
    .rejects.toThrow(/가.*나|나.*가/);
});
test("an invalid item fails the whole load", async () => {
  await expect(loadPortfolio({ api: fakeApi(oneItemWithoutKind), dataSourceId: "ds", outDir: dir, publicPrefix: "/" })).rejects.toThrow(/구분/);
});
// portfolio.test.ts
test("uses notion when both secrets are set", () => {
  expect(resolveSource({ NOTION_TOKEN: "t", NOTION_DATA_SOURCE_ID: "d", DEV: false })).toBe("notion");
});
test("falls back to fixtures only in dev", () => {
  expect(resolveSource({ DEV: true })).toBe("fixtures");
  expect(() => resolveSource({ DEV: false })).toThrow(/NOTION_TOKEN/);
  expect(() => resolveSource({ NOTION_TOKEN: "t", DEV: false })).toThrow(/NOTION_DATA_SOURCE_ID/);
});
```

`fakeApi`, `okFetcher`와 예시 데이터는 `tests/lib/notion/helpers.ts`에 둔다.

- [ ] **Step 2:** FAIL 확인 → 구현 → `npm test` 전부 PASS.
- [ ] **Step 3:** `src/fixtures/portfolio.json`에 `PortfolioItem` 4개(구분별 하나씩, 그중 하나는 `bodyHtml` 있음, 실제 개인정보 없이 "예시" 표기)를 넣는다. `getPortfolio()`는 `resolveSource(import.meta.env + process.env)` 결과에 따라 `@notionhq/client`의 `Client`로 `loadPortfolio`를 부르거나 fixtures를 돌려주고, `outDir`은 `public/notion`, `publicPrefix`는 `withBase("/notion/")`.
- [ ] **Step 4:** `NOTION_TOKEN= NOTION_DATA_SOURCE_ID= npm run build` 가 아직은 성공해야 한다(화면이 `getPortfolio`를 부르기 전). Commit `노션 읽기와 파일 내려받기, getPortfolio 추가`.

---

### Task 6: 홈, 포트폴리오, 활동 상세, 소개 화면

**Files:**
- Create: `src/data/site.ts`, `src/components/CertTable.astro`, `src/components/ActivityTimeline.astro`, `src/components/ProjectCards.astro`, `src/pages/portfolio/index.astro`, `src/pages/portfolio/[slug].astro`, `src/pages/about.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: `getPortfolio`, `PortfolioItem`, `formatRange`, `PostList`, `withBase`, `Base.astro`.
- Produces: `site.ts`의 `profile`(Global Constraints의 이름·소개·소속·이메일·GitHub, `education: [{ school: "영남이공대학교", major: "사이버보안과", period: "2025.03 – 재학 중" }]`)과 `projects`:

```ts
export const projects = [
  { name: "한 해 가계부", summary: "캘린더와 도넛 차트로 한 해의 수입·지출을 한눈에 보는 웹 가계부.", repo: "https://github.com/Aqua99-99/Hanhae-Gagyebu", live: "https://hanhae-gagyebu.vercel.app" },
  { name: "이 블로그", summary: "노션에 쓴 내용을 Astro로 빌드해 GitHub Pages에 올린다. 처음에는 Hugo와 AWS S3·CloudFront로 직접 배포했다.", repo: "https://github.com/Aqua99-99/Aqua-Blog", live: null },
];
```

화면 규칙(캔버스 시안 "황준현 블로그 화면 시안"의 홈·포트폴리오 화면을 따른다):
- 홈: 소속(고정폭), 이름 `<h1>`, 한 줄 소개, 버튼 `포트폴리오 보기`·`GitHub` → `featured`이고 구분이 `대외활동`이 아닌 항목을 최대 4개 띠로 → `featured`인 `대외활동` 최대 3개 카드(본문이 있으면 상세로 링크) → 최근 글 3편.
- 포트폴리오: `자격증 · 수료` 표(구분이 자격증·수료·수상인 항목; 열 `구분`·`이름`·`발급·주관`·`날짜`·`증빙`; 증빙이 없으면 칸을 비우고, 여러 개면 `증빙 1`, `증빙 2`; 표는 `overflow-x: auto` 상자 안, `min-width: 720px`) → `대외활동` 타임라인(본문이 있는 항목만 `자세히 보기`) → `프로젝트` 카드.
- 활동 상세(`getStaticPaths`는 `bodyHtml`이 빈 문자열이 아닌 항목만): 구분·날짜·기관, 이름 `<h1>`, `bodyHtml`을 `set:html`로, 증빙 링크, `포트폴리오로 돌아가기`.
- 소개: 학력, 연락처. 기술 목록은 넣지 않는다(확인된 값이 없다).
- 날짜가 없는 항목은 날짜 칸을 비운다. 기관이 `""`이면 그 칸을 비운다.

- [ ] **Step 1: 실패하는 시험** (`tests/build.test.ts`). `beforeAll`에서 `DEV` 대체가 아닌 실제 경로를 시험하기 위해, 빌드를 환경 변수 `PORTFOLIO_FIXTURES=1`로 돌린다. `resolveSource`에 이 값을 받는 인자를 추가한다: `PORTFOLIO_FIXTURES === "1"`이면 `"fixtures"`. 이 값은 `tests/`와 로컬 미리보기에서만 쓰고 워크플로에는 넣지 않는다(Task 5의 `portfolio.test.ts`에 `expect(resolveSource({ DEV: false, PORTFOLIO_FIXTURES: "1" })).toBe("fixtures")` 추가).

```ts
beforeAll(() => { execSync("npm run build", { env: { ...process.env, PORTFOLIO_FIXTURES: "1" }, stdio: "pipe" }); }, 120_000);

test("every page exists", () => {
  for (const p of ["index.html", "portfolio/index.html", "posts/index.html", "about/index.html", "404.html", "sitemap-index.xml", "rss.xml"])
    expect(existsSync(join("dist", p)), p).toBe(true);
});
test("items with a body get a detail page, items without do not", () => {
  expect(existsSync("dist/portfolio/example-activity/index.html")).toBe(true);
  expect(existsSync("dist/portfolio/example-cert/index.html")).toBe(false);
});
test("every internal link resolves under the base path", () => {
  for (const file of allHtml("dist")) for (const href of internalHrefs(file)) {
    expect(href.startsWith("/Aqua-Blog/"), `${file}: ${href}`).toBe(true);
    expect(existsTarget("dist", href.replace("/Aqua-Blog", "")), `${file}: ${href}`).toBe(true);
  }
});
test("portfolio table shows the fixture certificate and its date", () => {
  const html = readFileSync("dist/portfolio/index.html", "utf8");
  expect(html).toContain("예시 자격증");
  expect(html).toContain("2025.11.02");
});
```

fixtures의 슬러그를 `example-cert`, `example-course`, `example-award`, `example-activity`로 맞춘다(본문은 `example-activity`만).

- [ ] **Step 2:** FAIL 확인 → 화면 구현 → `npm test` PASS.
- [ ] **Step 3:** `PORTFOLIO_FIXTURES=1 npm run build && npm run preview`로 띄워, 너비 390px과 1280px에서 홈·포트폴리오·활동 상세·글 상세를 눈으로 확인한다. 가로 스크롤이 표 상자 밖에서 생기지 않아야 한다.
- [ ] **Step 4:** Commit `홈, 포트폴리오, 활동 상세, 소개 화면 추가`.

---

### Task 7: 배포 워크플로와 운영 문서

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: `npm test`, `npm run build`, 환경 변수 두 개.

- [ ] **Step 1:** `deploy.yml` 작성.
  - `on`: `push`(branches `main`), `schedule`(`cron: "17 21 * * *"`, 한국 시간 06:17), `workflow_dispatch`.
  - `permissions`: `contents: read`, `pages: write`, `id-token: write`. `concurrency: { group: pages, cancel-in-progress: false }`.
  - job `build`: checkout → setup-node(22, npm cache) → `npm ci` → `npm test` → `npm run build`(env `NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}`, `NOTION_DATA_SOURCE_ID: ${{ secrets.NOTION_DATA_SOURCE_ID }}`) → Pages 아티팩트 올리기(`dist`).
  - job `deploy`: `needs: build`, environment `github-pages`, Pages 배포 액션.
  - 액션 버전은 작성 시점의 각 액션 저장소 최신 major를 확인해 고정한다.
  - `PORTFOLIO_FIXTURES`는 넣지 않는다. 비밀값이 없으면 빌드가 실패하고 직전 배포가 유지된다.
- [ ] **Step 2:** `README.md`(한국어, 운영자용): 글 올리는 법(노션에서 `공개` 체크 → 다음 날 아침 반영, 바로 올리려면 Actions 탭에서 `Run workflow`), 속성 표, 지원하는 블록 목록, 처음 한 번 하는 설정(노션 연동 만들기 → 데이터베이스에 연결 추가 → data source ID 찾기 → 저장소 Secrets 두 개 → Settings › Pages › Source를 GitHub Actions로), 로컬에서 보기(`PORTFOLIO_FIXTURES=1 npm run dev`), 빌드가 실패했을 때 읽을 곳(Actions 로그의 오류 메시지가 항목 이름과 빠진 속성을 알려 준다).
- [ ] **Step 3:** 워크플로 문법 확인: `npx --yes yaml-lint .github/workflows/deploy.yml` 또는 동등한 YAML 파서로 파싱 성공. `grep -c PORTFOLIO_FIXTURES .github/workflows/deploy.yml` → `0`.
- [ ] **Step 4:** Commit `GitHub Pages 배포 워크플로와 운영 문서 추가`.

---

### Task 8: 노션 데이터베이스 만들고 1차 내용 채우기

코드가 아니라 노션 작업이다. Notion 커넥터로 수행하고, 공개 전 검수는 본인이 한다.

**Files:**
- Modify: `docs/superpowers/specs/2026-11-12-notion-portfolio-blog-design.md` (속성 표에 `슬러그 | 텍스트 | 주소에 쓸 영문 이름(선택). 비우면 자동으로 정해진다` 추가)

- [ ] **Step 1:** `영남이공대학교` 페이지 아래에 데이터베이스 `포트폴리오`를 만든다. 속성은 Task 3의 이름과 종류 그대로, `구분`의 선택지는 `자격증`·`수료`·`수상`·`대외활동` 네 개.
- [ ] **Step 2:** 증빙 파일을 하나씩 내려받아 열어 본다(수료증 PDF 8개, 네트워크 관리사 이미지 2개, 이수증 이미지 2개). 취득일·발급기관을 읽어 적고, 생년월일·수험번호·주소·사진이 보이는지 기록한다. 가려야 할 파일은 목록으로 만들어 본인에게 보여 주고, 가린 판본을 만들지 원본을 올리지 않을지 본인이 정한다.
- [ ] **Step 3:** 항목을 만든다. `공개`는 전부 꺼 둔다.

| 이름 | 구분 | 기관 | 날짜 | 대표 | 슬러그 | 본문 |
|---|---|---|---|---|---|---|
| AWS Certified Cloud Practitioner | 자격증 | Amazon Web Services | 증빙에서 확인 | ✓ | | 없음 |
| 네트워크 관리사 2급 | 자격증 | 한국정보통신자격협회 | 증빙에서 확인 | ✓ | | 없음 |
| TOLIS 정보보호능력검정 2급 | 자격증 | 증빙에서 확인 | 증빙에서 확인 | ✓ | | 없음 |
| ISO/IEC 27001:2022 | 수료 | 증빙에서 확인 | 증빙에서 확인 | ✓ | | 없음 |
| Skill-up AWS 정보보호·보안 (ISMS-P) | 수료 | 아주대학교 · AWS | 2025-11-01 ~ 2025-11-02 (노션 본문에 "2일부터 3일"이라는 표기도 있어 증빙으로 재확인) | | | 없음 |
| Skill-up AWS 정보보호 위험관리 | 수료 | 아주대학교 · AWS | 2025-11-29 ~ 2025-11-30 | | | 없음 |
| CO-WEEK ACADEMY 제4회 | 수료 | 증빙에서 확인 | 증빙에서 확인 | | | 없음 |
| CO-WEEK ACADEMY 제5회 | 수료 | 증빙에서 확인 | 증빙에서 확인 | | | 없음 |
| 2025 RISE 창업 AI 활용 IP 특허캠프 우수상 | 수상 | 증빙에서 확인 | 증빙에서 확인 | | | 없음 |
| 인도네시아 해외 IT 기업 기술 연수 | 대외활동 | 비움 | 본인에게 확인(2025) | ✓ | `indonesia-training` | 노션 `인도네시아 교육프로그램 보고서` 본문과 사진 |
| Skill-up AWS 정보보호·보안 교육 | 대외활동 | 아주대학교 | 2025-11-01 ~ 2025-11-30 | ✓ | `skill-up-aws` | 노션 `AWS 이수증`의 보고서 2편 |
| 보안 동아리 YESS | 대외활동 | 영남이공대학교 | 2025-03-01 ~ 2025-12-31 | ✓ | `yess` | 첨부 PDF 2편(SQL Injection 과제, LOS 풀이)을 읽고 쓴 요약 초안. 본인이 고친다 |
| CPS Festival | 대외활동 | 비움 | 2025-03-01 ~ 2025-12-31 | | `cps-festival` | 기획 보고서 2편을 읽고 쓴 요약 초안. 본인이 고친다 |
| 2026 대구정보보호지원센터 정보보호 전문 교육 | 대외활동 | 대구정보보호지원센터 | 본인에게 확인(2026) | | | 없음 |

`요약`은 캔버스 시안의 문장을 쓴다. 본문을 옮길 때 원문의 오타는 고치되 내용은 바꾸지 않고, 고친 곳을 본인에게 알린다. 인도네시아 연수 사진에 다른 사람 얼굴이 크게 나온 것이 있으면 본인에게 공개 여부를 묻는다. 증빙에서 값을 읽지 못한 칸은 비워 두고 본인에게 묻는다.

- [ ] **Step 4:** 본인이 데이터베이스를 훑어보고 항목별로 `공개`를 켠다.
- [ ] **Step 5:** 스펙 속성 표에 `슬러그` 줄을 추가하고 Commit `설계 문서에 슬러그 속성 추가`.

---

### Task 9: 전환과 AWS 정리

- [ ] **Step 1 (본인):** 노션에서 내부 연동을 만들고 토큰을 복사한다. `포트폴리오` 데이터베이스의 연결에 그 연동을 추가한다.
- [ ] **Step 2 (본인):** 저장소 Settings › Secrets and variables › Actions에 `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`를 넣는다. Settings › Pages › Source를 `GitHub Actions`로 바꾼다.
- [ ] **Step 3:** `redesign/astro-notion`을 push하고 `main`으로 PR을 연다. 본인이 확인하고 합친다.
- [ ] **Step 4:** 배포 워크플로가 성공했는지 확인한다. `https://aqua99-99.github.io/Aqua-Blog/`에서 홈·포트폴리오·활동 상세 1개·글 1편을 열어 본다. 페이지 소스에 `amazonaws`나 `notion.so` 파일 주소가 없는지 확인한다.
- [ ] **Step 5:** 노션에서 항목 하나의 `요약`을 고치고 워크플로를 수동 실행해, 사이트에 반영되는지 확인한다(성공 기준 1).
- [ ] **Step 6 (본인, 새 사이트 확인 뒤):** AWS 콘솔에서 CloudFront 배포 `EHXVO3V09PJ8L` 비활성화 후 삭제, S3 버킷 `aqua99-blog-site-2026` 비우고 삭제, IAM 역할 `aqua-blog-github-deploy` 삭제. 다른 용도로 쓰지 않는다면 GitHub OIDC 자격 증명 공급자도 삭제. 일주일 뒤 청구서에서 관련 요금이 0인지 본다.
