import { site } from "../data/site";
import { getPublishedBlogs } from "../data/blog";
import type { APIContext } from "astro";

// JSON Feed 1.1 —— 现代阅读器原生支持，与 /rss.xml 内容对等（摘要，非全文）
export async function GET(context: APIContext) {
  if (!context.site) {
    return new Response("Site is not defined on the request context", {
      status: 500,
    });
  }

  const base = context.site.toString().replace(/\/$/, "");
  const blogs = await getPublishedBlogs();

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: site.title,
    home_page_url: `${base}/`,
    feed_url: `${base}/feed.json`,
    description: site.description,
    language: "zh-CN",
    authors: [{ name: site.author, url: `${base}/about` }],
    items: blogs.map((blog) => ({
      id: `${base}/blog/${blog.data.slug}`,
      url: `${base}/blog/${blog.data.slug}`,
      title: blog.data.title,
      summary: blog.data.description,
      content_text: blog.data.description,
      date_published: blog.data.date.toISOString(),
      tags: blog.data.tags,
      authors: [{ name: blog.data.author }],
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "content-type": "application/feed+json; charset=utf-8" },
  });
}
