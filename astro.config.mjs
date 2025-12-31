// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vitePluginSvgr from "vite-plugin-svgr";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { rehypeImageFigure } from "./src/plugins/rehype-image-figure.mjs";

import mdx from "@astrojs/mdx";

import expressiveCode from "astro-expressive-code";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), vitePluginSvgr({})],
  },
  devToolbar: {
    enabled: false,
  },
  integrations: [react(), sitemap(), expressiveCode(), mdx()],

  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeImageFigure],
    shikiConfig: {
      defaultColor: false,
      themes: {
        light: "github-light-high-contrast", // one-light
        dark: "github-dark", // plastic
      },
      wrap: true,
    },
  },

  prefetch: {
    prefetchAll: true,
    // defaultStrategy: "load",
  },

  output: "static",
  site: "https://blog.sagec.fun",
});