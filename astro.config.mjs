import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://aqua99-99.github.io",
  base: "/Aqua-Blog",
  trailingSlash: "always",
  integrations: [sitemap()],
  markdown: { shikiConfig: { theme: "github-light" } },
});
