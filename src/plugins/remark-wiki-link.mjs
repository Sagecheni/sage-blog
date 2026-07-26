import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { visit } from "unist-util-visit";

/**
 * Remark plugin：Obsidian 风格双链。
 *
 *   [[Attention]]            → 按 slug 或标题解析成 /blog/xxx 链接，显示目标标题
 *   [[Attention|这篇文章]]    → 自定义显示文本
 *
 * 解析不到的目标渲染为 .wiki-link-missing（红色波浪线），构建日志告警 ——
 * 作者能看见坏链，读者不至于点到 404。
 * 只处理文本节点：代码块/行内代码/已有链接内部不受影响。
 *
 * 注意：文章清单在模块加载时扫描一次（构建期够用）；
 * dev 模式下新增文章后需重启 dev server 才能被双链解析到。
 */

const BLOG_DIR = "src/blog";
const PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// slug/标题 → { slug, title } 的解析表
function buildIndex() {
  const index = new Map();
  try {
    for (const file of readdirSync(BLOG_DIR)) {
      if (!file.endsWith(".md") || file.startsWith("_")) continue;
      const raw = readFileSync(join(BLOG_DIR, file), "utf8");
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const slug = fm[1].match(/^slug:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1];
      const title = fm[1].match(/^title:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1];
      if (!slug) continue;
      const entry = { slug: slug.trim(), title: (title ?? slug).trim() };
      index.set(entry.slug, entry);
      if (title) index.set(entry.title, entry);
    }
  } catch {
    // 目录读不到就返回空表，所有双链降级为 missing
  }
  return index;
}

const index = buildIndex();

export function remarkWikiLink() {
  return (tree, file) => {
    visit(tree, "text", (node, i, parent) => {
      if (!parent || parent.type === "link" || i === null) return;
      if (!node.value.includes("[[")) return;

      const parts = [];
      let last = 0;
      for (const match of node.value.matchAll(PATTERN)) {
        const [full, target, label] = match;
        const start = match.index;

        if (start > last) {
          parts.push({ type: "text", value: node.value.slice(last, start) });
        }

        const entry = index.get(target.trim());
        if (entry) {
          parts.push({
            type: "link",
            url: `/blog/${entry.slug}`,
            children: [{ type: "text", value: label?.trim() ?? entry.title }],
          });
        } else {
          console.warn(
            `[wiki-link] 解析失败: [[${target}]] （${file?.path ?? "unknown"}）`,
          );
          parts.push({
            type: "html",
            value: `<span class="wiki-link-missing" title="双链目标不存在：${target.trim()}">${
              label?.trim() ?? target.trim()
            }</span>`,
          });
        }
        last = start + full.length;
      }

      if (!parts.length) return;
      if (last < node.value.length) {
        parts.push({ type: "text", value: node.value.slice(last) });
      }
      parent.children.splice(i, 1, ...parts);
      // 跳过新插入的节点，避免重复访问
      return i + parts.length;
    });
  };
}
