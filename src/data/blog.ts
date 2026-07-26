import { execFileSync } from "node:child_process";
import { getCollection } from "astro:content";
import type { BlogType } from "../content.config";

/**
 * 文章数据的单一入口。
 * 之前 readTime 的「词数 ÷ 200」在 [...slug] 和 LatestPosts 各写了一份，
 * 且对中文完全失真（中文没有空格，split 出来只有几个"词"）——
 * 这里统一为 CJK 按字、拉丁按词的混合公式。
 */

/** 生产构建过滤未来日期（定时发布）；dev 全量显示便于预览 */
export async function getPublishedBlogs(): Promise<BlogType[]> {
  const blogs: BlogType[] = await getCollection("blogs");
  const now = Date.now();
  return blogs
    .filter((blog) => import.meta.env.DEV || blog.data.date.getTime() <= now)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

function countParts(body: string) {
  const cjk = (body.match(/[一-鿿]/g) ?? []).length;
  const latinWords = body
    .replace(/[一-鿿]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return { cjk, latinWords };
}

/** 中文 ~350 字/分钟，英文 ~200 词/分钟 */
export function readTimeOf(blog: BlogType): number {
  const { cjk, latinWords } = countParts(blog.body ?? "");
  return Math.max(1, Math.ceil(cjk / 350 + latinWords / 200));
}

/** 站点统计用：CJK 字数 + 拉丁词数 */
export function wordCountOf(blog: BlogType): number {
  const { cjk, latinWords } = countParts(blog.body ?? "");
  return cjk + latinWords;
}

/**
 * 文件在 git 里的最后修改时间。
 * 浅克隆（部分 CI）下所有文件都会给出同一个 tip 提交时间 ——
 * 所以只有当文件在可见历史里有 ≥2 个提交时才可信，否则宁可返回 null 不显示。
 */
export function lastModOf(blog: BlogType): Date | null {
  const file = blog.filePath;
  if (!file) return null;
  try {
    // execFileSync + 参数数组：文件名不经 shell 解释，带引号/反引号也不会逃逸
    const count = parseInt(
      execFileSync("git", ["rev-list", "--count", "HEAD", "--", file], {
        encoding: "utf8",
      }).trim(),
      10,
    );
    if (!(count >= 2)) return null;

    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], {
      encoding: "utf8",
    }).trim();
    return iso ? new Date(iso) : null;
  } catch {
    return null;
  }
}

/** 建站日期 = 仓库首个提交时间；取不到则退回 site 上线年份的元旦 */
export function siteFoundedDate(): Date {
  try {
    const first = execFileSync("git", ["log", "--reverse", "--format=%cI"], {
      encoding: "utf8",
    })
      .split("\n")[0]
      .trim();
    if (first) return new Date(first);
  } catch {
    // ignore — fall through to fallback
  }
  return new Date("2025-12-31");
}
