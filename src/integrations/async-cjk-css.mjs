/**
 * CJK webfont CSS（fonts-cjk.*.css）体积大（~350KB，上百条 @font-face），
 * 即使只在 <script> 里 dynamic import，Astro/Vite 仍会在产物 HTML 里
 * 插一条 render-blocking 的 <link rel="stylesheet">。
 *
 * 构建结束后把这些 link 改成 media="print" + onload 切换，首屏不阻塞；
 * 无 JS 时 <noscript> 仍同步加载。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CJK_CSS_RE = /fonts-cjk\.[^"'/]+\.css/;

/**
 * @param {string} html
 * @returns {string}
 */
function rewriteHtml(html) {
  // <link rel="stylesheet" href="/_astro/fonts-cjk.XXX.css" ...>
  // 或属性顺序对调；匹配后改成异步加载
  return html.replace(
    /<link([^>]* rel="stylesheet"[^>]*)>/gi,
    (full, attrs) => {
      const hrefMatch = attrs.match(/href="([^"]+)"/i);
      if (!hrefMatch || !CJK_CSS_RE.test(hrefMatch[1])) return full;
      if (/\bmedia=/i.test(attrs) && /onload=/i.test(attrs)) return full;

      const href = hrefMatch[1];
      // 去掉可能已有的 media，避免冲突
      let nextAttrs = attrs.replace(/\s+media="[^"]*"/gi, "");
      if (!/\bonload=/i.test(nextAttrs)) {
        nextAttrs += ` media="print" onload="this.media='all'"`;
      }
      const asyncLink = `<link${nextAttrs}>`;
      const noscript = `<noscript><link rel="stylesheet" href="${href}" /></noscript>`;
      return asyncLink + noscript;
    },
  );
}

/**
 * @param {URL | string} dirUrl
 */
function walkHtmlFiles(dirUrl) {
  const root = typeof dirUrl === "string" ? dirUrl : fileURLToPath(dirUrl);
  /** @type {string[]} */
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) stack.push(full);
      else if (name.endsWith(".html")) out.push(full);
    }
  }
  return out;
}

/** @returns {import('astro').AstroIntegration} */
export function asyncCjkCss() {
  return {
    name: "async-cjk-css",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const files = walkHtmlFiles(dir);
        let rewritten = 0;
        for (const file of files) {
          const before = fs.readFileSync(file, "utf8");
          if (!CJK_CSS_RE.test(before)) continue;
          const after = rewriteHtml(before);
          if (after !== before) {
            fs.writeFileSync(file, after);
            rewritten++;
          }
        }
        logger.info(
          `async-cjk-css: rewrote ${rewritten}/${files.length} HTML files`,
        );
      },
    },
  };
}
