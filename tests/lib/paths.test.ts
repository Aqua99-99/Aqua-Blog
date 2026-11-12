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
