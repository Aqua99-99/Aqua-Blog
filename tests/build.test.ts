import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";

const BASE = "/Aqua-Blog";

beforeAll(() => {
  // Vitest 가 넣는 BASE_URL, MODE 같은 값이 자식 빌드로 넘어가면 사이트의 base 가 "/" 로 바뀐다.
  const env: NodeJS.ProcessEnv = { ...process.env, PORTFOLIO_FIXTURES: "1" };
  for (const key of ["BASE_URL", "MODE", "DEV", "PROD", "SSR", "NODE_ENV", "VITEST", "NOTION_TOKEN", "NOTION_DATA_SOURCE_ID"]) delete env[key];
  execSync("npm run build", { env, stdio: "pipe" });
});

function allHtml(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? allHtml(path) : name.endsWith(".html") ? [path] : [];
  });
}
const internalHrefs = (file: string) =>
  [...readFileSync(file, "utf8").matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith("/") && !u.startsWith("//"));
function existsTarget(href: string): boolean {
  const path = decodeURIComponent(href.slice(BASE.length).split("#")[0]);
  const target = join("dist", path);
  return path.endsWith("/") ? existsSync(join(target, "index.html")) : existsSync(target);
}

test("every page exists", () => {
  for (const p of ["index.html", "portfolio/index.html", "posts/index.html", "about/index.html", "404.html", "sitemap-index.xml", "rss.xml"])
    expect(existsSync(join("dist", p)), p).toBe(true);
});
test("items with a body get a detail page, items without do not", () => {
  expect(existsSync("dist/portfolio/example-activity/index.html")).toBe(true);
  expect(existsSync("dist/portfolio/example-cert/index.html")).toBe(false);
});
test("every internal link resolves under the base path", () => {
  const files = allHtml("dist");
  expect(files.length).toBeGreaterThan(10);
  for (const file of files) for (const href of internalHrefs(file)) {
    expect(href.startsWith(`${BASE}/`), `${file}: ${href}`).toBe(true);
    expect(existsTarget(href), `${file}: ${href}`).toBe(true);
  }
});
test("portfolio table shows the fixture certificate and its date", () => {
  const html = readFileSync("dist/portfolio/index.html", "utf8");
  expect(html).toContain("예시 자격증");
  expect(html).toContain("2025.11.02");
  expect(html).toContain("2025.11.29 – 2025.11.30");
});
test("home shows featured items, activities and recent posts", () => {
  const html = readFileSync("dist/index.html", "utf8");
  expect(html).toContain("영남이공대학교 사이버보안과 · 2학년");
  expect(html).toContain("예시 자격증");
  expect(html).not.toContain("예시 대회 우수상");
  expect(html).toContain(`href="${BASE}/portfolio/example-activity/"`);
  expect(html).toContain("블로그를 시작하며");
});
test("detail page renders the body html", () => {
  expect(readFileSync("dist/portfolio/example-activity/index.html", "utf8")).toContain("<strong>예시 본문</strong>");
});
