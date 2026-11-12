import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;

/** 사이트에 그대로 올려도 브라우저가 실행하지 않는 형식만 확장자를 살린다. */
const SAFE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "pdf"]);

function extension(suggestedName: string, url: string): string {
  let path = "";
  try { path = new URL(url).pathname; } catch { /* 주소가 아니면 이름만 본다 */ }
  for (const candidate of [suggestedName, path]) {
    const m = /\.([A-Za-z0-9]{1,8})$/.exec(candidate);
    if (m && SAFE_EXTENSIONS.has(m[1].toLowerCase())) return `.${m[1].toLowerCase()}`;
  }
  return ".bin";
}

/**
 * 파일을 내려받아 outDir 에 `<내용 해시 16자>.<확장자>` 로 저장하고 그 파일 이름을 돌려준다.
 * 원래 파일 이름과 노션 주소는 결과에 남지 않는다.
 */
export async function saveAsset(url: string, suggestedName: string, outDir: string, fetcher: Fetcher = fetch): Promise<string> {
  const res = await fetcher(url);
  if (!res.ok) throw new Error(`파일을 내려받지 못했습니다 (HTTP ${res.status}): ${suggestedName || new URL(url).pathname}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const name = createHash("sha256").update(bytes).digest("hex").slice(0, 16) + extension(suggestedName, url);
  mkdirSync(outDir, { recursive: true });
  const target = join(outDir, name);
  if (!existsSync(target)) writeFileSync(target, bytes);
  return name;
}
