import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site } from "../data/site";
import type { BlogType } from "../content.config";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  if (!context.site) {
    return new Response("Site is not defined on the request context", {
      status: 500,
    });
  }

  const blogs: BlogType[] = await getCollection("blogs");
  return rss({
    // stylesheet: "/pretty-feed-v3.xsl",
    title: site.title,
    description: site.description,
    site: context.site,
    trailingSlash: false,
    items: blogs
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((blog: BlogType) => ({
        title: blog.data.title,
        description: blog.data.description,
        pubDate: blog.data.date,
        author: blog.data.author,
        categories: blog.data.tags,
        link: `/blog/${blog.data.slug}`,
      })),
  });
}
