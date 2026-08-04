// Typora / 本地相对路径图片 → 清洗 EXIF → 上传广州 COS → 回写 Markdown URL。
//
// 用法：
//   npm run sync-images
//   npm run sync-images -- src/blog/某篇.md
//   npm run sync-images -- --dry-run
//   npm run sync-images -- --delete-local
//   npm run sync-images -- --check          # 仅检查是否还有未上传的本地图（有则 exit 1）
//   npm run sync-images -- --max 4000       # 最长边（默认 4000；--max 0 关闭缩放）
//
// 环境变量（.env 或 shell）：
//   COS_SECRET_ID   必填
//   COS_SECRET_KEY  必填
//   COS_BUCKET      默认 sageblog-1316665129
//   COS_REGION      默认 ap-guangzhou
//   COS_PREFIX      默认 img
//
// 行为：
//   - 只处理 src/blog 下 Markdown 里的本地图片引用
//   - 跳过 http(s)、data:、以及解析后落在 src/assets 的站点静态图
//   - 已是 COS URL 的引用幂等跳过
//   - 上传 key：{prefix}/{文章名无扩展名}/{原文件名}
//   - 默认保留本地文件（并写回已清洗像素）；--delete-local 则上传成功后删除
import { createHash } from "node:crypto";
import { readFile, writeFile, readdir, unlink, access } from "node:fs/promises";
import { dirname, extname, join, basename, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import COS from "cos-nodejs-sdk-v5";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BLOG_DIR = join(ROOT, "src", "blog");
const ASSETS_DIR = resolve(ROOT, "src", "assets");

const IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

const DEFAULTS = {
  bucket: "sageblog-1316665129",
  region: "ap-guangzhou",
  prefix: "img",
  max: 4000,
};

// ![alt](path) 或 ![alt](path "title")；path 不含未转义空格时的常规 MD 写法
const IMAGE_RE = /!\[([^\]]*)\]\((<)?([^>\s)]+)(>)?(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;

/** 按「散文 / 代码」切段，避免动到 fenced code 与行内 code 里的示例路径 */
function mapContentSegments(content, mapProse) {
  // ```...``` 优先；行内 code 次之（不含跨行）
  const splitRe = /```[\s\S]*?```|`[^`\n]+`/g;
  let out = "";
  let last = 0;
  for (const m of content.matchAll(splitRe)) {
    if (m.index > last) out += mapProse(content.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  if (last < content.length) out += mapProse(content.slice(last));
  return out;
}

function forEachProse(content, fn) {
  mapContentSegments(content, (prose) => {
    fn(prose);
    return prose;
  });
}

async function loadDotEnv() {
  try {
    const text = await readFile(join(ROOT, ".env"), "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // .env 可选
  }
}

function parseArgs(argv) {
  const files = [];
  let dryRun = false;
  let deleteLocal = false;
  let check = false;
  let max = DEFAULTS.max;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--delete-local") deleteLocal = true;
    else if (a === "--check") check = true;
    else if (a === "--max") {
      const n = parseInt(argv[++i], 10);
      max = Number.isFinite(n) ? n : DEFAULTS.max;
    } else if (a.startsWith("-")) {
      console.error(`未知参数: ${a}`);
      process.exit(1);
    } else {
      files.push(resolve(a));
    }
  }
  return { files, dryRun, deleteLocal, check, max };
}

async function collectMarkdownFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Typora 的 *.assets 等目录里没有 md；仍递归以兼容子目录文章
      out.push(...(await collectMarkdownFiles(full)));
    } else if (/\.(md|mdx)$/i.test(entry.name) && !entry.name.startsWith("_")) {
      out.push(full);
    }
  }
  return out;
}

function isRemote(src) {
  return /^(https?:|data:|\/\/)/i.test(src);
}

function decodeSrc(src) {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}

function contentTypeFor(ext) {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

function encodeKeyPath(key) {
  // 保留 /，编码每一段（中文文件名 → 与现有 COS URL 风格一致）
  return key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function publicUrl(domain, key) {
  return `https://${domain}/${encodeKeyPath(key)}`;
}

async function stripImage(input, max) {
  let pipeline = sharp(input, { animated: false }).rotate();
  if (max && max > 0) {
    pipeline = pipeline.resize({
      width: max,
      height: max,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const meta = await sharp(input).metadata();
  const fmt = meta.format;

  if (fmt === "jpeg" || fmt === "jpg") {
    pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
  } else if (fmt === "png") {
    pipeline = pipeline.png();
  } else if (fmt === "webp") {
    pipeline = pipeline.webp({ quality: 92 });
  } else if (fmt === "gif") {
    // gif 动画保守：原样上传（sharp 对 gif 元数据剥离有限），仍走 put
    return { buffer: input, extFromFormat: ".gif" };
  } else if (fmt === "avif") {
    pipeline = pipeline.avif({ quality: 80 });
  } else {
    pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
  }

  const buffer = await pipeline.toBuffer();
  const extFromFormat =
    fmt === "jpeg" || fmt === "jpg"
      ? ".jpg"
      : fmt === "png"
        ? ".png"
        : fmt === "webp"
          ? ".webp"
          : fmt === "avif"
            ? ".avif"
            : extnameFromBufferFallback(buffer);
  return { buffer, extFromFormat };
}

function extnameFromBufferFallback() {
  return ".jpg";
}

function buildObjectKey(prefix, articleId, fileName) {
  // 避免 path traversal；只取文件名
  const safeName = basename(fileName).replace(/[\\/]/g, "_");
  const safeArticle = articleId.replace(/[\\/]/g, "_");
  const parts = [prefix.replace(/^\/|\/$/g, ""), safeArticle, safeName].filter(
    Boolean,
  );
  return parts.join("/");
}

function createCos() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;
  if (!SecretId || !SecretKey) {
    console.error(
      "缺少 COS_SECRET_ID / COS_SECRET_KEY。请在项目根目录 .env 中配置，或导出到环境变量。",
    );
    process.exit(1);
  }
  return new COS({ SecretId, SecretKey });
}

function putObject(cos, { Bucket, Region, Key, Body, ContentType }) {
  return new Promise((resolvePromise, reject) => {
    cos.putObject(
      { Bucket, Region, Key, Body, ContentType },
      (err, data) => (err ? reject(err) : resolvePromise(data)),
    );
  });
}

function headObject(cos, { Bucket, Region, Key }) {
  return new Promise((resolvePromise, reject) => {
    cos.headObject({ Bucket, Region, Key }, (err, data) => {
      if (err) {
        // 不存在
        if (err.statusCode === 404 || err.code === "NoSuchResource") {
          resolvePromise(null);
          return;
        }
        reject(err);
        return;
      }
      resolvePromise(data);
    });
  });
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 在一篇 MD 里找出需要同步的本地图片。
 * @returns {Promise<Array<{ rawSrc: string, absPath: string, fullMatch: string }>>}
 */
async function findLocalImages(mdPath, content) {
  const mdDir = dirname(mdPath);
  const found = [];
  const seen = new Set();
  const candidates = [];

  forEachProse(content, (prose) => {
    for (const match of prose.matchAll(IMAGE_RE)) {
      candidates.push({
        fullMatch: match[0],
        rawSrc: match[3],
      });
    }
  });

  for (const { fullMatch, rawSrc } of candidates) {
    if (!rawSrc || isRemote(rawSrc)) continue;

    const decoded = decodeSrc(rawSrc);
    const absPath = resolve(mdDir, decoded);

    // 站点演示用静态资源：不上传
    if (absPath === ASSETS_DIR || absPath.startsWith(ASSETS_DIR + sep)) {
      continue;
    }

    const ext = extname(absPath).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    if (!(await fileExists(absPath))) {
      console.warn(
        `⚠ 引用存在但文件缺失，跳过: ${rawSrc}  ← ${relative(ROOT, mdPath)}`,
      );
      continue;
    }

    const dedupe = `${absPath}::${rawSrc}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    found.push({ rawSrc, absPath, fullMatch });
  }

  return found;
}

async function processMarkdownFile(mdPath, ctx) {
  const { cos, bucket, region, prefix, domain, max, dryRun, deleteLocal, check } =
    ctx;
  let content = await readFile(mdPath, "utf8");
  const locals = await findLocalImages(mdPath, content);
  if (!locals.length) return { uploaded: 0, skipped: 0, pending: 0 };

  if (check) {
    for (const item of locals) {
      console.log(
        `✗ 未上传: ${relative(ROOT, mdPath)} → ${item.rawSrc}`,
      );
    }
    return { uploaded: 0, skipped: 0, pending: locals.length };
  }

  const articleId = basename(mdPath, extname(mdPath));
  let uploaded = 0;
  let skipped = 0;

  // 同一文件多处引用：按 absPath 缓存最终 URL
  const urlByPath = new Map();

  for (const item of locals) {
    const { rawSrc, absPath } = item;

    if (urlByPath.has(absPath)) {
      const url = urlByPath.get(absPath);
      content = replaceSrc(content, rawSrc, url);
      continue;
    }

    const fileName = basename(absPath);
    const key = buildObjectKey(prefix, articleId, fileName);
    const url = publicUrl(domain, key);

    if (dryRun) {
      console.log(
        `· dry-run  ${relative(ROOT, absPath)}  →  ${key}`,
      );
      urlByPath.set(absPath, url);
      content = replaceSrc(content, rawSrc, url);
      uploaded++;
      continue;
    }

    const input = await readFile(absPath);
    const { buffer } = await stripImage(input, max);
    const ext = extname(absPath).toLowerCase();
    const ContentType = contentTypeFor(ext);

    // 内容相同则跳过实际上传（省流量）；仍回写 URL
    const localHash = createHash("md5").update(buffer).digest("hex");
    let shouldUpload = true;
    try {
      const head = await headObject(cos, { Bucket: bucket, Region: region, Key: key });
      if (head && head.ETag && head.ETag.replace(/"/g, "") === localHash) {
        shouldUpload = false;
      }
    } catch {
      // head 失败则直接上传
    }

    if (shouldUpload) {
      await putObject(cos, {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: buffer,
        ContentType,
      });
      console.log(
        `✓ 上传  ${relative(ROOT, absPath)}  →  ${url}  (${Math.round(buffer.length / 1024)}KB)`,
      );
    } else {
      console.log(`· 已存在且相同，跳过上传  ${key}`);
      skipped++;
    }

    // 本地写回清洗后的像素（保留文件时）
    if (deleteLocal) {
      await unlink(absPath);
      console.log(`  已删本地  ${relative(ROOT, absPath)}`);
    } else if (shouldUpload || buffer.length !== input.length) {
      await writeFile(absPath, buffer);
    }

    urlByPath.set(absPath, url);
    content = replaceSrc(content, rawSrc, url);
    if (shouldUpload) uploaded++;
  }

  if (!dryRun) {
    await writeFile(mdPath, content, "utf8");
    console.log(`✎ 已回写  ${relative(ROOT, mdPath)}`);
  } else {
    console.log(`· dry-run 不写文件  ${relative(ROOT, mdPath)}（将替换 ${locals.length} 处）`);
  }

  return { uploaded, skipped, pending: 0 };
}

/** 把某 rawSrc 的图片引用换成 COS URL（只改散文区，保留 alt / title） */
function replaceSrc(content, rawSrc, url) {
  const escaped = rawSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `(!\\[[^\\]]*\\]\\()<?${escaped}>?((?:\\s+(?:"[^"]*"|'[^']*'))?\\))`,
    "g",
  );
  return mapContentSegments(content, (prose) =>
    prose.replace(re, `$1${url}$2`),
  );
}

async function main() {
  await loadDotEnv();
  const { files, dryRun, deleteLocal, check, max } = parseArgs(
    process.argv.slice(2),
  );

  const bucket = process.env.COS_BUCKET || DEFAULTS.bucket;
  const region = process.env.COS_REGION || DEFAULTS.region;
  const prefix = process.env.COS_PREFIX || DEFAULTS.prefix;
  const domain =
    process.env.COS_DOMAIN || `${bucket}.cos.${region}.myqcloud.com`;

  const mdFiles = files.length
    ? files
    : await collectMarkdownFiles(BLOG_DIR);

  if (!mdFiles.length) {
    console.log("没有找到 Markdown 文件。");
    return;
  }

  // check / dry-run 不需要密钥；真正上传才初始化 SDK
  const cos = check || dryRun ? null : createCos();

  const ctx = {
    cos,
    bucket,
    region,
    prefix,
    domain,
    max,
    dryRun,
    deleteLocal,
    check,
  };

  console.log(
    `同步图片 → cos://${bucket} (${region})  prefix=${prefix}/  domain=${domain}`,
  );
  if (dryRun) console.log("模式: dry-run（不上传、不写盘）");
  if (check) console.log("模式: check（有本地图则失败）");
  if (deleteLocal) console.log("上传成功后将删除本地图");
  console.log("");

  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalPending = 0;

  for (const mdPath of mdFiles) {
    const result = await processMarkdownFile(mdPath, ctx);
    totalUploaded += result.uploaded;
    totalSkipped += result.skipped;
    totalPending += result.pending;
  }

  console.log("");
  if (check) {
    if (totalPending > 0) {
      console.error(
        `检查失败：仍有 ${totalPending} 处本地图片未上传。请先运行 npm run sync-images`,
      );
      process.exit(1);
    }
    console.log("检查通过：没有待上传的本地图片引用。");
    return;
  }

  console.log(
    `完成：上传 ${totalUploaded} 张` +
      (totalSkipped ? `，跳过（已存在） ${totalSkipped} 张` : "") +
      (dryRun ? "（dry-run）" : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
