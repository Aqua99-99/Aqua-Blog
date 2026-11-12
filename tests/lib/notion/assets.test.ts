import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { saveAsset } from "../../../src/lib/notion/assets";
import { okFetcher } from "./helpers";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "assets-")); });

test("names assets by content hash", async () => {
  const name = await saveAsset("https://x.amazonaws.com/a/%EC%88%98%EB%A3%8C%EC%A6%9D.PDF?sig=1", "수료증.PDF", dir, okFetcher("hello"));
  expect(name).toMatch(/^[0-9a-f]{16}\.pdf$/);
  expect(readFileSync(join(dir, name), "utf8")).toBe("hello");
});
test("the same content is stored once", async () => {
  const a = await saveAsset("https://x/a.png?sig=1", "a.png", dir, okFetcher("same"));
  const b = await saveAsset("https://x/a.png?sig=2", "a.png", dir, okFetcher("same"));
  expect(a).toBe(b);
  expect(readdirSync(dir)).toHaveLength(1);
});
test("extension falls back to the url path, then .bin", async () => {
  expect(await saveAsset("https://x/a/photo.JPG?sig=1", "", dir, okFetcher("a"))).toMatch(/\.jpg$/);
  expect(await saveAsset("https://x/a/blob", "", dir, okFetcher("b"))).toMatch(/\.bin$/);
});
test("an odd extension cannot smuggle path characters", async () => {
  expect(await saveAsset("https://x/a", "evil.p/../../x", dir, okFetcher("c"))).toMatch(/^[0-9a-f]{16}\.bin$/);
});
test("a failed download throws with the status", async () => {
  const forbidden = async () => ({ ok: false, status: 403, arrayBuffer: async () => new ArrayBuffer(0) });
  await expect(saveAsset("https://x/a.png", "a.png", dir, forbidden)).rejects.toThrow(/403/);
});
test("creates the output directory when it is missing", async () => {
  const name = await saveAsset("https://x/a.png", "a.png", join(dir, "deep", "notion"), okFetcher("d"));
  expect(readFileSync(join(dir, "deep", "notion", name), "utf8")).toBe("d");
});
