import rehypeCitation from "rehype-citation";

export function rehypeCitationFrontmatter(defaults = {}) {
  return async (tree, file) => {
    const fm = file?.data?.astro?.frontmatter ?? {};
    const bibliography = fm.bibliography ?? defaults.bibliography;

    // rehype-citation：不传 bibliography 就会 skip :contentReference[oaicite:4]{index=4}
    if (!bibliography) return tree;

    // rehype-citation 的 path 默认是 process.cwd()，会 join bibliography / csl :contentReference[oaicite:5]{index=5}
    return rehypeCitation({
      path: process.cwd(),
      ...defaults,
      // 允许每篇文章用 frontmatter 覆盖 csl/lang/noCite/suppressBibliography 等 :contentReference[oaicite:6]{index=6}
      ...fm,
      bibliography,
    })(tree, file);
  };
}
