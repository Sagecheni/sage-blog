// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vitePluginSvgr from "vite-plugin-svgr";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { remarkLinkCard } from "./src/plugins/remark-link-card.mjs";
import { remarkVideoEmbed } from "./src/plugins/remark-video-embed.mjs";
import { rehypeImageFigure } from "./src/plugins/rehype-image-figure.mjs";
import { rehypeTableWrap } from "./src/plugins/rehype-table-wrap.mjs";
import { optimizedImageDomains } from "./src/data/image-domains.mjs";
import remarkDirective from "remark-directive";
import { remarkDirectiveHandle } from "./src/plugins/remark-directive-rehype.js";
import { rehypeCitationFrontmatter } from "./src/plugins/rehype-citation-frontmatter.mjs";

import mdx from "@astrojs/mdx";

import expressiveCode from "astro-expressive-code";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), vitePluginSvgr({})],
  },
  devToolbar: {
    enabled: true,
  },
  integrations: [react(), sitemap(), expressiveCode(), mdx()],

  image: {
    // 授权 COS bucket：构建期下载→优化→产物自带 width/height + srcset，
    // 访客从 Pages 拿优化副本，不再直连 COS 原图。
    // 域名列表与 rehype-image-figure 共用（src/data/image-domains.mjs）——
    // 精确主机名匹配，换/加 bucket 必须同步那里，否则静默回退为未优化直连
    domains: optimizedImageDomains,
    // 响应式布局：Markdown 图片自动获得 srcset/sizes
    layout: "constrained",
    responsiveStyles: true,
  },

  markdown: {
    // remarkLinkCard 必须在 remarkDirectiveHandle 之前消费掉 ::linkcard，
    // 否则会被通用规则吃成 callout div
    remarkPlugins: [
      remarkMath,
      remarkDirective,
      remarkLinkCard,
      remarkVideoEmbed,
      remarkDirectiveHandle,
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeImageFigure,
      rehypeTableWrap,
      [
        rehypeCitationFrontmatter,
        {
          csl: "public/ieee.csl",
          lang: "en-US",
          linkCitations: true,
          bibliography: "public/bibliography.bib",
        },
      ],
    ],
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
    // viewport：链接一进视口就预取 HTML（默认 hover 要等悬停）——
    // 滚到「下一篇」卡片时页面已在后台取好，配合 ClientRouter 点击即换
    defaultStrategy: "viewport",
  },

  output: "static",
  site: "https://blog.sagec.fun",
});
