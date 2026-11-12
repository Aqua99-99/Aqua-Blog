import { expect, test } from "vitest";
import { listBlocks, queryPublished } from "../../../src/lib/notion/client";
import { fakeApi, rawBlock } from "./helpers";

const p = (n: number) => ({ object: "page", id: String(n), properties: {} });

test("fetches every page of results", async () => {
  const api = fakeApi({ queryPages: [[p(1), p(2)], [p(3)]] });
  expect((await queryPublished(api, "ds")).map((x) => x.id)).toEqual(["1", "2", "3"]);
  expect(api.calls.query[1].start_cursor).toBe("cursor-1");
});
test("asks only for published items", async () => {
  const api = fakeApi({ queryPages: [[]] });
  await queryPublished(api, "ds");
  expect(api.calls.query[0].data_source_id).toBe("ds");
  expect(api.calls.query[0].filter).toEqual({ property: "공개", checkbox: { equals: true } });
});
test("walks child blocks and paginates them", async () => {
  const api = fakeApi({ blocks: { root: [[rawBlock("a", true)], [rawBlock("b", false)]], a: [[rawBlock("a1", false)]] } });
  const nodes = await listBlocks(api, "root");
  expect(nodes.map((n) => n.block.id)).toEqual(["a", "b"]);
  expect(nodes[0].children.map((n) => n.block.id)).toEqual(["a1"]);
  expect(nodes[1].children).toEqual([]);
});
