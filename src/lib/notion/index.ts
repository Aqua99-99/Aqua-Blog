import { compareByDateDesc } from "../dates";
import { saveAsset, type Fetcher } from "./assets";
import { blocksToHtml } from "./blocks";
import { listBlocks, queryPublished, type NotionApi } from "./client";
import { InvalidItemError, pageToItem } from "./properties";
import type { PortfolioItem } from "./types";

export interface LoadOptions {
  api: NotionApi;
  dataSourceId: string;
  /** 내려받은 파일을 둘 폴더. */
  outDir: string;
  /** 그 폴더가 사이트에서 보이는 주소. 슬래시로 끝난다. */
  publicPrefix: string;
  fetcher?: Fetcher;
  warn?: (message: string) => void;
}

/** 노션에서 공개된 포트폴리오 항목을 읽어, 본문과 파일까지 사이트에서 쓸 수 있는 형태로 돌려준다. */
export async function loadPortfolio(opts: LoadOptions): Promise<PortfolioItem[]> {
  const warn = opts.warn ?? ((m: string) => console.warn(`[notion] ${m}`));
  const pages = await queryPublished(opts.api, opts.dataSourceId);
  const published = pages.filter((page) => {
    const flag = page.properties["공개"];
    return flag?.type === "checkbox" && flag.checkbox === true;
  });

  const items = published.map(pageToItem);
  const bySlug = new Map<string, PortfolioItem>();
  for (const item of items) {
    const other = bySlug.get(item.slug);
    if (other) throw new InvalidItemError(`슬러그 "${item.slug}" 가 겹칩니다: "${other.name}", "${item.name}"`);
    bySlug.set(item.slug, item);
  }

  for (const item of items) {
    const resolveAsset = async (url: string, suggestedName: string) =>
      opts.publicPrefix + (await saveAsset(url, suggestedName, opts.outDir, opts.fetcher));
    item.proofUrls = await Promise.all(item.proofUrls.map((url) => resolveAsset(url, "")));
    item.bodyHtml = await blocksToHtml(await listBlocks(opts.api, item.id), { resolveAsset, warn: (m) => warn(`"${item.name}": ${m}`) });
  }
  return items.sort(compareByDateDesc);
}

export type { PortfolioItem, PortfolioKind, DateRange } from "./types";
