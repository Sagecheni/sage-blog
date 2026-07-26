import rss from "@astrojs/rss";
import { site } from "../data/site";
import { getPublishedBlogs } from "../data/blog";
import type { BlogType } from "../content.config";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  if (!context.site) {
    return new Response("Site is not defined on the request context", {
      status: 500,
    });
  }

  // 共享数据层：未来日期的文章不进 feed（定时发布），已按日期降序
  const blogs = await getPublishedBlogs();
  return rss({
    // stylesheet: "/pretty-feed-v3.xsl",
    title: site.title,
    description: site.description,
    site: context.site,
    trailingSlash: false,
    customData: "<language>zh-CN</language>",
    items: blogs.map((blog: BlogType) => ({
      title: blog.data.title,
      description: blog.data.description,
      pubDate: blog.data.date,
      author: blog.data.author,
      categories: blog.data.tags,
      link: `/blog/${blog.data.slug}`,
    })),
  });
}
