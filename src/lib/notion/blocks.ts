import type { BlockObjectResponse, RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

export interface BlockNode { block: BlockObjectResponse; children: BlockNode[] }

export interface RenderContext {
  /** 노션 파일 주소를 받아 사이트 안 주소를 돌려준다. */
  resolveAsset(url: string, suggestedName: string): Promise<string>;
  warn(message: string): void;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

const SAFE_LINK = /^(https?:|mailto:)/i;

function richText(parts: RichTextItemResponse[]): string {
  return parts
    .map((part) => {
      let html = escapeHtml(part.plain_text).replace(/\r?\n/g, "<br>");
      if (html === "") return "";
      const a = part.annotations;
      if (a?.code) html = `<code>${html}</code>`;
      if (a?.bold) html = `<strong>${html}</strong>`;
      if (a?.italic) html = `<em>${html}</em>`;
      if (part.href && SAFE_LINK.test(part.href)) html = `<a href="${escapeHtml(part.href)}">${html}</a>`;
      return html;
    })
    .join("");
}

const plain = (parts: RichTextItemResponse[]) => parts.map((p) => p.plain_text).join("");

function hostedUrl(data: { type: string; file?: { url: string }; external?: { url: string } }): string | null {
  return data.type === "file" ? (data.file?.url ?? null) : data.type === "external" ? (data.external?.url ?? null) : null;
}

const nameFromUrl = (url: string) => decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");

const LIST_OPEN: Record<string, string> = { bulleted_list_item: "<ul>", numbered_list_item: "<ol>", to_do: '<ul class="todo">' };
const LIST_CLOSE: Record<string, string> = { bulleted_list_item: "</ul>", numbered_list_item: "</ol>", to_do: "</ul>" };

function checkbox(checked: boolean): string {
  return checked ? '<input type="checkbox" checked disabled aria-label="완료됨"> ' : '<input type="checkbox" disabled aria-label="미완료"> ';
}

/** 블록 나무를 HTML 문자열로 바꾼다. 지원하지 않는 블록은 건너뛰고 경고를 남긴다. */
export async function blocksToHtml(nodes: BlockNode[], ctx: RenderContext): Promise<string> {
  let html = "";
  for (let i = 0; i < nodes.length; i++) {
    const type = nodes[i].block.type;
    if (LIST_OPEN[type]) {
      let items = "";
      while (i < nodes.length && nodes[i].block.type === type) {
        const b = nodes[i].block as any;
        const box = type === "to_do" ? checkbox(Boolean(b.to_do.checked)) : "";
        items += `<li>${box}${richText(b[type].rich_text)}${await blocksToHtml(nodes[i].children, ctx)}</li>`;
        i++;
      }
      i--;
      html += LIST_OPEN[type] + items + LIST_CLOSE[type];
      continue;
    }
    html += await renderBlock(nodes[i], ctx);
  }
  return html;
}

async function renderBlock(node: BlockNode, ctx: RenderContext): Promise<string> {
  const b = node.block as any;
  switch (b.type as string) {
    case "paragraph": {
      const inner = richText(b.paragraph.rich_text);
      const children = await blocksToHtml(node.children, ctx);
      return (inner.trim() === "" ? "" : `<p>${inner}</p>`) + (children ? `<div class="indent">${children}</div>` : "");
    }
    case "toggle":
      return `<details><summary>${richText(b.toggle.rich_text)}</summary>${await blocksToHtml(node.children, ctx)}</details>`;
    case "callout": {
      const emoji = b.callout.icon?.type === "emoji" ? `<span aria-hidden="true">${escapeHtml(b.callout.icon.emoji)}</span>` : "";
      return `<aside class="callout">${emoji}<div>${richText(b.callout.rich_text)}${await blocksToHtml(node.children, ctx)}</div></aside>`;
    }
    case "table": {
      const rows = node.children.filter((c) => c.block.type === "table_row").map((c) => (c.block as any).table_row.cells as RichTextItemResponse[][]);
      const head = b.table.has_column_header && rows.length > 0 ? rows.shift()! : null;
      const thead = head ? `<thead><tr>${head.map((c) => `<th scope="col">${richText(c)}</th>`).join("")}</tr></thead>` : "";
      const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${richText(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
      return `<div class="table-scroll"><table>${thead}${tbody}</table></div>`;
    }
    case "heading_1":
    case "heading_2":
    case "heading_3": {
      const level = Number(b.type.slice(-1)) + 1;
      const inner = richText(b[b.type].rich_text);
      return inner.trim() === "" ? "" : `<h${level}>${inner}</h${level}>`;
    }
    case "quote":
      return `<blockquote>${richText(b.quote.rich_text)}${await blocksToHtml(node.children, ctx)}</blockquote>`;
    case "code": {
      const lang = String(b.code.language ?? "").replace(/[^a-z0-9+#-]/gi, "");
      return `<pre><code class="language-${lang || "plain"}">${escapeHtml(plain(b.code.rich_text))}</code></pre>`;
    }
    case "divider":
      return "<hr>";
    case "image": {
      const url = hostedUrl(b.image);
      if (!url) return skip(b, ctx);
      const src = await ctx.resolveAsset(url, nameFromUrl(url));
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(plain(b.image.caption ?? []))}" loading="lazy">`;
    }
    case "file":
    case "pdf": {
      const data = b[b.type];
      const url = hostedUrl(data);
      if (!url) return skip(b, ctx);
      const name = data.name || nameFromUrl(url);
      const href = await ctx.resolveAsset(url, name);
      return `<p><a href="${escapeHtml(href)}">${escapeHtml(name)}</a></p>`;
    }
    default:
      return skip(b, ctx);
  }
}

function skip(block: { type: string; id: string }, ctx: RenderContext): string {
  ctx.warn(`지원하지 않는 블록을 건너뜁니다: ${block.type} (${block.id})`);
  return "";
}
