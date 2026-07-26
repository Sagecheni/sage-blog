// 构建后死链检查：扫 dist/**/*.html 里的站内 href/src，
// 确认目标文件在产物里存在。文章互链、双链、图片路径写错时构建期报警。
// 挂在 build 链末尾（见 package.json），有死链则退出码 1。
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";

function collectHtml(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectHtml(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function targetExists(path) {
  // /foo → dist/foo | dist/foo/index.html | dist/foo.html
  const clean = decodeURIComponent(path.replace(/[?#].*$/, ""));
  if (clean === "/" || clean === "") return true;
  const base = join(DIST, clean);
  if (existsSync(base) && statSync(base).isFile()) return true;
  if (existsSync(join(base, "index.html"))) return true;
  if (existsSync(base + ".html")) return true;
  return false;
}

const htmlFiles = collectHtml(DIST);
const broken = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  // 只查站内绝对路径；// 开头是协议相对的外链
  for (const match of html.matchAll(/(?:href|src)="(\/[^/"][^"]*)"/g)) {
    const url = match[1];
    if (!targetExists(url)) {
      broken.push({ page: file.replace(`${DIST}/`, "/"), url });
    }
  }
}

if (broken.length) {
  console.error(`\n✗ 发现 ${broken.length} 处死链：`);
  for (const { page, url } of broken) {
    console.error(`  ${page}  →  ${url}`);
  }
  process.exit(1);
}

console.log(`✓ 死链检查通过（${htmlFiles.length} 个页面）`);
