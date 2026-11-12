import type { BlockObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type { BlockNode } from "./blocks";

interface Paged { results: unknown[]; has_more: boolean; next_cursor: string | null }

/** 노션 SDK 중 이 모듈이 쓰는 부분. 시험에서는 가짜를 넣는다. */
export interface NotionApi {
  dataSources: { query(args: { data_source_id: string; filter: unknown; start_cursor?: string; page_size?: number }): Promise<Paged> };
  blocks: { children: { list(args: { block_id: string; start_cursor?: string; page_size?: number }): Promise<Paged> } };
}

async function all(fetchPage: (cursor: string | undefined) => Promise<Paged>): Promise<unknown[]> {
  const out: unknown[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetchPage(cursor);
    out.push(...res.results);
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

/** "공개"가 체크된 페이지를 전부 가져온다. */
export async function queryPublished(api: NotionApi, dataSourceId: string): Promise<PageObjectResponse[]> {
  const filter = { property: "공개", checkbox: { equals: true } };
  const results = await all((start_cursor) => api.dataSources.query({ data_source_id: dataSourceId, filter, start_cursor, page_size: 100 }));
  return results.filter((r): r is PageObjectResponse => (r as { object?: string }).object === "page" && "properties" in (r as object));
}

/** 블록의 자식을 끝까지, 하위 블록까지 가져온다. */
export async function listBlocks(api: NotionApi, blockId: string): Promise<BlockNode[]> {
  const results = (await all((start_cursor) => api.blocks.children.list({ block_id: blockId, start_cursor, page_size: 100 }))) as BlockObjectResponse[];
  const nodes: BlockNode[] = [];
  for (const block of results) {
    if (!("type" in block)) continue;
    nodes.push({ block, children: block.has_children ? await listBlocks(api, block.id) : [] });
  }
  return nodes;
}
