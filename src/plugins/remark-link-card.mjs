import { visit } from "unist-util-visit";

/**
 * Remark plugin：`::linkcard{url="https://..."}` → 带标题/描述的链接卡片。
 *
 * 构建期抓取目标页的 og:title / og:description（5s 超时，进程内缓存），
 * 抓不到就降级为只显示主机名和 URL 的朴素卡片 —— 外站宕机不能弄失败构建。
 * 必须注册在 remarkDirectiveHandle 之前，否则会被通用规则吃成 callout div。
 */

const cache = new Map();

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function pick(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

async function fetchMeta(url) {
  if (cache.has(url)) return cache.get(url);

  let meta = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (SageForge link-card)" },
    });
    clearTimeout(timer);

    if (res.ok) {
      // 只取前 200KB —— og 标签都在 head 里
      const html = (await res.text()).slice(0, 200_000);
      const title = pick(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
        /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i,
        /<title[^>]*>([^<]*)<\/title>/i,
      ]);
      const desc = pick(html, [
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      ]);
      if (title) meta = { title, desc };
    }
  } catch {
    // 超时/网络失败 → 降级卡片
  }

  cache.set(url, meta);
  return meta;
}

export function remarkLinkCard() {
  return async (tree) => {
    const targets = [];
    visit(tree, "leafDirective", (node) => {
      if (node.name === "linkcard" && node.attributes?.url) {
        targets.push(node);
      }
    });

    await Promise.all(
      targets.map(async (node) => {
        const url = node.attributes.url;
        const meta = await fetchMeta(url);
        const host = new URL(url).hostname;

        const span = (className, value) => ({
          type: "element",
          tagName: "span",
          properties: { className: [className] },
          children: [{ type: "text", value }],
        });

        const children = [span("link-card-title", meta?.title ?? url)];
        if (meta?.desc) children.push(span("link-card-desc", meta.desc));
        children.push(span("link-card-host", host));

        node.data = {
          hName: "a",
          hProperties: {
            className: ["link-card"],
            href: url,
            target: "_blank",
            rel: "noopener noreferrer",
          },
          hChildren: children,
        };
      }),
    );
  };
}
