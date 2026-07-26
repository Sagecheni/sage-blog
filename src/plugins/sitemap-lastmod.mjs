import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 给 @astrojs/sitemap 的 serialize 提供文章级 lastmod。
 *
 * astro.config 上下文用不了 astro:content，这里独立扫 src/blog 的
 * frontmatter slug 并读 git 最后提交时间。信任规则与 src/data/blog.ts
 * 的 lastModOf 一致：文件在可见历史里 ≥2 个提交才可信（浅克隆 CI 下
 * 安全降级为不标 lastmod，而不是标一个错的）。
 */
export function sitemapLastmodSerializer() {
  const lastmodBySlug = new Map();

  try {
    for (const file of readdirSync("src/blog")) {
      if (!file.endsWith(".md") || file.startsWith("_")) continue;
      const path = join("src/blog", file);
      const fm = readFileSync(path, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1];
      const slug = fm?.match(/^slug:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
      if (!slug) continue;

      try {
        const count = parseInt(
          execFileSync("git", ["rev-list", "--count", "HEAD", "--", path], {
            encoding: "utf8",
          }).trim(),
          10,
        );
        if (!(count >= 2)) continue;
        const iso = execFileSync(
          "git",
          ["log", "-1", "--format=%cI", "--", path],
          { encoding: "utf8" },
        ).trim();
        if (iso) lastmodBySlug.set(slug, iso);
      } catch {
        // 单个文件 git 失败不影响其他
      }
    }
  } catch {
    // 目录读不到就全部不标
  }

  return (item) => {
    const slug = item.url.match(/\/blog\/([^/]+)\/?$/)?.[1];
    if (slug) {
      const iso = lastmodBySlug.get(decodeURIComponent(slug));
      if (iso) item.lastmod = iso;
    }
    return item;
  };
}
