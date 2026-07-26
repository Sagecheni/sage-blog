import { site } from "../data/site";
import { friends } from "../data/friends";
import type { APIContext } from "astro";

// 友链订阅表（OPML 2.0）—— 独立博客圈礼节：
// 访客一键把本站友链圈导入自己的 RSS 阅读器。只收录填了 feed 的友链。
const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function GET(_context: APIContext) {
  const outlines = friends
    .filter((friend) => friend.feed)
    .map(
      (friend) =>
        `    <outline type="rss" text="${escapeXml(friend.name)}" title="${escapeXml(friend.name)}" xmlUrl="${escapeXml(friend.feed!)}" htmlUrl="${escapeXml(friend.url)}"/>`,
    )
    .join("\n");

  const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(site.title)} · 友链订阅表</title>
    <ownerName>${escapeXml(site.author)}</ownerName>
  </head>
  <body>
${outlines}
  </body>
</opml>
`;

  return new Response(opml, {
    headers: { "content-type": "text/x-opml; charset=utf-8" },
  });
}
