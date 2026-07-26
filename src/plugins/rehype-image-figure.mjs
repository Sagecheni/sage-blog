import { visit } from "unist-util-visit";
import { optimizedImageDomains } from "../data/image-domains.mjs";

/**
 * Rehype plugin to wrap Markdown images in a <figure> element.
 * Structure:
 * <figure class="group">
 *   <a href="{src}" target="_blank" rel="noopener">   ← 仅绝对地址（https:// 或 /）才包链接
 *     <img loading="lazy" decoding="async" src="{src}" alt="{alt}" />
 *     <figcaption>图 {count}：{alt}</figcaption>
 *   </a>
 * </figure>
 *
 * 为什么相对路径不包 <a>：本插件先于 Astro 的 rehypeImages 执行，
 * <img src> 随后会被改写为 /_astro/hash 而 <a href> 保留原始字符串 ——
 * 对 "./x.jpg" 这类相对路径，href 会按页面路径解析而 404。
 */

/** 命中授权优化域（image.domains）的远程图 —— 有优化副本，不链接原图 */
function isOptimizedRemote(src) {
  if (!/^https?:\/\//.test(src)) return false;
  try {
    return optimizedImageDomains.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}
export function rehypeImageFigure() {
  return (tree) => {
    let count = 1;

    visit(tree, "element", (node, index, parent) => {
      // Look for <img> tags
      if (node.tagName !== "img") {
        return;
      }

      // Skip images that are already wrapped in <figure> or <a>
      // This prevents double-wrapping if the user manually wrote HTML
      if (parent.tagName === "figure" || parent.tagName === "a") {
        return;
      }

      const { src, alt, title } = node.properties || {};
      const currentCount = count++;

      const imgNode = {
        ...node,
        properties: {
          ...node.properties,
          loading: "lazy",
          decoding: "async",
        },
      };

      const captionNode = {
        type: "element",
        tagName: "figcaption",
        properties: {},
        children: [
          {
            type: "text",
            value: `图 ${currentCount}：${alt || title || ""}`,
          },
        ],
      };

      // 绝对地址（远程图 / public 路径）才有稳定可链接的原图；
      // 但授权优化域（COS）除外 —— 产物里已有全尺寸优化副本，
      // 不再链接原图：原图保留 EXIF/GPS，站点上不该出现它的 URL
      const isLinkable =
        typeof src === "string" &&
        /^(https?:\/\/|\/)/.test(src) &&
        !isOptimizedRemote(src);

      const figureChildren = isLinkable
        ? [
            {
              type: "element",
              tagName: "a",
              properties: {
                href: src,
                target: "_blank",
                rel: "noopener",
              },
              children: [imgNode, captionNode],
            },
          ]
        : [imgNode, captionNode];

      // Construct the new node structure
      const figureNode = {
        type: "element",
        tagName: "figure",
        properties: { className: ["group"] },
        children: figureChildren,
      };

      // Check if the image is the sole child of a <p> tag
      const isParentParagraph = parent.tagName === "p";
      const isSoleChild =
        parent.children.length === 1 ||
        parent.children.every(
          (child) =>
            child === node || (child.type === "text" && !child.value.trim()),
        );

      if (isParentParagraph && isSoleChild) {
        // Transform the parent <p> into the <figure>
        // We replace the parent's properties and children with our figure's properties and children
        parent.tagName = figureNode.tagName;
        parent.properties = figureNode.properties;
        parent.children = figureNode.children;
        // Since we modified parent in search, we don't need to do anything to 'index' since 'node' is effectively gone/replaced within 'parent'
      } else {
        // Replace the <img> with the <figure> inline (not ideal HTML but fallback)
        parent.children[index] = figureNode;
      }
    });
  };
}
