import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const blogs = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/blog" }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    date: z.date(),
    author: z.string(),
    tags: z.array(z.string()),

    // 连载系列名（如「日本游记」）。同名文章自动串联，篇序按日期升序
    series: z.string().optional(),

    // 列表页置顶（不影响首页「最新文章」的时间序）
    pinned: z.boolean().optional(),

    readTime: z.number().optional(),

    // ✅ 给 rehype-citation 用
    bibliography: z.union([z.string(), z.array(z.string())]).optional(),
    csl: z.string().optional(),
    lang: z.string().optional(),
    noCite: z.array(z.string()).optional(),
    suppressBibliography: z.boolean().optional(),
  }),
});

export const collections = { blogs };

export type BlogType = import("astro:content").CollectionEntry<"blogs">;
