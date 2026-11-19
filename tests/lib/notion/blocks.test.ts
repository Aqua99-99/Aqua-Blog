import { expect, test } from "vitest";
import { blocksToHtml } from "../../../src/lib/notion/blocks";
import { bullet, code, divider, file, heading, image, numbered, para, quote, text, unsupported } from "./helpers";

const ctx = () => {
  const warnings: string[] = [];
  return { warnings, resolveAsset: async (_u: string, n: string) => `/Aqua-Blog/notion/${n}`, warn: (m: string) => warnings.push(m) };
};

test("renders paragraphs with annotations", async () => {
  expect(await blocksToHtml([para([text("굵게", { bold: true }), text(" 보통")])], ctx())).toBe("<p><strong>굵게</strong> 보통</p>");
});
test("renders italic, inline code and links", async () => {
  expect(await blocksToHtml([para([text("a", { italic: true }), text("b", { code: true }), text("c", { href: "https://kisa.or.kr/?a=1&b=2" })])], ctx()))
    .toBe('<p><em>a</em><code>b</code><a href="https://kisa.or.kr/?a=1&amp;b=2">c</a></p>');
});
test("shifts headings down one level", async () => {
  expect(await blocksToHtml([heading(2, "레드팀 공격활동")], ctx())).toBe("<h3>레드팀 공격활동</h3>");
  expect(await blocksToHtml([heading(1, "가"), heading(3, "나")], ctx())).toBe("<h2>가</h2><h4>나</h4>");
});
test("groups adjacent list items and nests children", async () => {
  expect(await blocksToHtml([bullet("가", [bullet("가-1")]), bullet("나"), para([text("끝")])], ctx()))
    .toBe("<ul><li>가<ul><li>가-1</li></ul></li><li>나</li></ul><p>끝</p>");
});
test("bulleted and numbered lists next to each other stay separate", async () => {
  expect(await blocksToHtml([bullet("가"), numbered("하나"), numbered("둘")], ctx())).toBe("<ul><li>가</li></ul><ol><li>하나</li><li>둘</li></ol>");
});
test("renders quote, code and divider", async () => {
  expect(await blocksToHtml([quote("인용"), code("nmap -sV <ip>", "bash"), divider()], ctx()))
    .toBe('<blockquote>인용</blockquote><pre><code class="language-bash">nmap -sV &lt;ip&gt;</code></pre><hr>');
});
test("escapes html in text", async () => {
  expect(await blocksToHtml([para([text('<script>alert(1)</script> & "x"')])], ctx()))
    .toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</p>");
});
test("rejects javascript: links", async () => {
  expect(await blocksToHtml([para([text("눌러", { href: "javascript:alert(1)" })])], ctx())).toBe("<p>눌러</p>");
});
test("images go through resolveAsset and never keep the notion url", async () => {
  const html = await blocksToHtml([image("https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/photo.jpg?X-Amz-Signature=abc", "단체 사진")], ctx());
  expect(html).toBe('<img src="/Aqua-Blog/notion/photo.jpg" alt="단체 사진" loading="lazy">');
});
test("files become links named after the file", async () => {
  const html = await blocksToHtml([file("https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/x.pdf?sig=1", "LOS 풀이 보고서.pdf")], ctx());
  expect(html).toBe('<p><a href="/Aqua-Blog/notion/LOS 풀이 보고서.pdf">LOS 풀이 보고서.pdf</a></p>');
  expect(html).not.toContain("amazonaws");
});
test("skips unsupported blocks with a warning", async () => {
  const c = ctx();
  expect(await blocksToHtml([para([text("앞")]), unsupported("embed"), para([text("뒤")])], c)).toBe("<p>앞</p><p>뒤</p>");
  expect(c.warnings).toEqual([expect.stringContaining("embed")]);
});
test("drops empty paragraphs", async () => {
  expect(await blocksToHtml([para([]), para([text("")]), para([text("  ")])], ctx())).toBe("");
});

import { callout, paraWith, table, todo, toggle } from "./helpers";

test("soft line breaks become <br>", async () => {
  expect(await blocksToHtml([para([text("첫 줄\n둘째 줄")])], ctx())).toBe("<p>첫 줄<br>둘째 줄</p>");
});
test("children of a paragraph are rendered after it", async () => {
  expect(await blocksToHtml([paraWith("위", [bullet("아래")])], ctx())).toBe('<p>위</p><div class="indent"><ul><li>아래</li></ul></div>');
});
test("toggle becomes details and summary", async () => {
  expect(await blocksToHtml([toggle("대응 방법", [para([text("서버에서 검증")])])], ctx()))
    .toBe("<details><summary>대응 방법</summary><p>서버에서 검증</p></details>");
});
test("callout keeps its emoji as decoration", async () => {
  expect(await blocksToHtml([callout("실습 환경에서만", "🧪")], ctx()))
    .toBe('<aside class="callout"><span aria-hidden="true">🧪</span><div>실습 환경에서만</div></aside>');
});
test("to-do items show a disabled checkbox", async () => {
  expect(await blocksToHtml([todo("완료", true), todo("남음", false)], ctx()))
    .toBe('<ul class="todo"><li><input type="checkbox" checked disabled aria-label="완료됨"> 완료</li><li><input type="checkbox" disabled aria-label="미완료"> 남음</li></ul>');
});
test("table with a header row", async () => {
  expect(await blocksToHtml([table([["주차", "주제"], ["1", "<개요>"]])], ctx()))
    .toBe('<div class="table-scroll"><table><thead><tr><th scope="col">주차</th><th scope="col">주제</th></tr></thead><tbody><tr><td>1</td><td>&lt;개요&gt;</td></tr></tbody></table></div>');
});
test("table without a header row", async () => {
  expect(await blocksToHtml([table([["a", "b"]], false)], ctx())).toBe('<div class="table-scroll"><table><tbody><tr><td>a</td><td>b</td></tr></tbody></table></div>');
});
