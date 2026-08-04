// 按「全站 Markdown 引用」清理广州 COS 上的图片。
//
// 用法：
//   npm run gc-images
//       默认 dry-run：列出 img/ 下未被任何文章引用的孤儿对象
//   npm run gc-images -- --apply
//       真正删除上述孤儿
//   npm run gc-images -- --delete <url或key> [<url或key>...]
//       删除指定对象（可多次 / 多个参数）
//   npm run gc-images -- --prefix img/某篇文章/
//       只扫描该 key 前缀（整篇废弃时好用）
//
// 安全：
//   - 只动 COS_PREFIX（默认 img）下的对象，不动桶里其它文件
//   - 引用扫描跳过 fenced code / 行内 code（与 sync-images 一致）
//   - --delete 若仍被 MD 引用会警告，需加 --force 才删
//
// 环境变量：同 sync-images（.env 里 COS_SECRET_ID / COS_SECRET_KEY 等）
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import COS from "cos-nodejs-sdk-v5";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BLOG_DIR = join(ROOT, "src", "blog");

const DEFAULTS = {
  bucket: "sageblog-1316665129",
  region: "ap-guangzhou",
  prefix: "img",
};

const IMAGE_RE = /!\[([^\]]*)\]\((<)?([^>\s)]+)(>)?(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;

function mapContentSegments(content, mapProse) {
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
    // optional
  }
}

function parseArgs(argv) {
  const deletes = [];
  let apply = false;
  let force = false;
  let prefixFilter = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") apply = true;
    else if (a === "--force") force = true;
    else if (a === "--dry-run") {
      // 默认就是 dry-run；显式写出也兼容
    } else if (a === "--prefix") {
      prefixFilter = argv[++i];
      if (!prefixFilter) {
        console.error("--prefix 需要一个值，例如 img/japan-day1/");
        process.exit(1);
      }
    } else if (a === "--delete") {
      const v = argv[++i];
      if (!v) {
        console.error("--delete 需要 url 或 key");
        process.exit(1);
      }
      deletes.push(v);
      // 允许 --delete a b c 或多次 --delete
      while (argv[i + 1] && !argv[i + 1].startsWith("-")) {
        deletes.push(argv[++i]);
      }
    } else if (a.startsWith("-")) {
      console.error(`未知参数: ${a}`);
      process.exit(1);
    } else {
      // 裸参数当作 --delete 目标，方便：npm run gc-images -- <url>
      deletes.push(a);
    }
  }
  return { deletes, apply, force, prefixFilter };
}

async function collectMarkdownFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectMarkdownFiles(full)));
    else if (/\.(md|mdx)$/i.test(entry.name) && !entry.name.startsWith("_")) {
      out.push(full);
    }
  }
  return out;
}

function createCos() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;
  if (!SecretId || !SecretKey) {
    console.error(
      "缺少 COS_SECRET_ID / COS_SECRET_KEY。请在项目根目录 .env 中配置。",
    );
    process.exit(1);
  }
  return new COS({ SecretId, SecretKey });
}

function listObjects(cos, { Bucket, Region, Prefix }) {
  return new Promise((resolvePromise, reject) => {
    const all = [];
    const next = (Marker) => {
      cos.getBucket(
        {
          Bucket,
          Region,
          Prefix,
          Marker,
          MaxKeys: 1000,
        },
        (err, data) => {
          if (err) return reject(err);
          const contents = data.Contents || [];
          for (const obj of contents) {
            // 跳过「目录占位」类 0 字节且以 / 结尾的 key（若有）
            if (obj.Key && !(obj.Key.endsWith("/") && Number(obj.Size) === 0)) {
              all.push({
                Key: obj.Key,
                Size: Number(obj.Size) || 0,
                LastModified: obj.LastModified,
              });
            }
          }
          if (data.IsTruncated === "true" || data.IsTruncated === true) {
            next(data.NextMarker || contents[contents.length - 1]?.Key);
          } else {
            resolvePromise(all);
          }
        },
      );
    };
    next();
  });
}

function deleteObject(cos, { Bucket, Region, Key }) {
  return new Promise((resolvePromise, reject) => {
    cos.deleteObject({ Bucket, Region, Key }, (err, data) =>
      err ? reject(err) : resolvePromise(data),
    );
  });
}

function normalizePrefix(prefix) {
  let p = (prefix || DEFAULTS.prefix).replace(/^\/+/, "");
  if (p && !p.endsWith("/")) {
    // list 时用无尾 / 也能列出；比较时 orphans 用 startsWith
  }
  return p;
}

/** 从图片 URL / 裸 key 解析出 COS object key */
function toObjectKey(input, { domain, prefix }) {
  let s = input.trim();
  // 去掉包裹引号
  s = s.replace(/^['"]|['"]$/g, "");

  if (/^https?:\/\//i.test(s) || s.startsWith("//")) {
    let url;
    try {
      url = new URL(s.startsWith("//") ? `https:${s}` : s);
    } catch {
      throw new Error(`无法解析 URL: ${input}`);
    }
    // 只接受当前配置域名（避免误删其它 host 的路径）
    if (url.hostname !== domain && !url.hostname.endsWith(".myqcloud.com")) {
      throw new Error(
        `域名不匹配（期望 ${domain} 或 *.myqcloud.com）: ${url.hostname}`,
      );
    }
    // pathname: /img/foo/bar.jpg
    s = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } else {
    s = decodeURIComponent(s.replace(/^\/+/, ""));
  }

  if (!s.startsWith(prefix.replace(/\/$/, "") + "/") && s !== prefix.replace(/\/$/, "")) {
    // 允许用户只传 article/file.jpg → 自动补 prefix
    if (!s.startsWith("img/") && prefix.replace(/\/$/, "") === "img") {
      s = `img/${s}`;
    }
  }
  return s;
}

/**
 * 收集 MD 中引用的、属于本 bucket 域名的 object key → Set
 * @returns {Promise<{ keys: Set<string>, refs: Map<string, string[]> }>}
 */
async function collectReferencedKeys(domain, prefix) {
  const keys = new Set();
  const refs = new Map(); // key -> [md paths]
  const prefixRoot = prefix.replace(/\/$/, "");
  const mdFiles = await collectMarkdownFiles(BLOG_DIR);

  for (const mdPath of mdFiles) {
    const content = await readFile(mdPath, "utf8");
    const rel = relative(ROOT, mdPath);
    forEachProse(content, (prose) => {
      for (const match of prose.matchAll(IMAGE_RE)) {
        const rawSrc = match[3];
        if (!rawSrc || !/^https?:\/\//i.test(rawSrc)) continue;
        let url;
        try {
          url = new URL(rawSrc);
        } catch {
          continue;
        }
        if (url.hostname !== domain) continue;
        let key;
        try {
          key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
        } catch {
          key = url.pathname.replace(/^\/+/, "");
        }
        if (!key.startsWith(prefixRoot + "/") && key !== prefixRoot) continue;
        keys.add(key);
        if (!refs.has(key)) refs.set(key, []);
        refs.get(key).push(rel);
      }
    });
  }

  return { keys, refs };
}

function formatSize(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

async function main() {
  await loadDotEnv();
  const { deletes, apply, force, prefixFilter } = parseArgs(
    process.argv.slice(2),
  );

  const bucket = process.env.COS_BUCKET || DEFAULTS.bucket;
  const region = process.env.COS_REGION || DEFAULTS.region;
  const prefix = normalizePrefix(process.env.COS_PREFIX || DEFAULTS.prefix);
  const domain =
    process.env.COS_DOMAIN || `${bucket}.cos.${region}.myqcloud.com`;

  const cos = createCos();
  const listPrefix = prefixFilter
    ? prefixFilter.replace(/^\/+/, "")
    : prefix.endsWith("/")
      ? prefix
      : `${prefix}/`;

  console.log(
    `GC 图片 → cos://${bucket} (${region})  listPrefix=${listPrefix}  domain=${domain}`,
  );

  // ---------- 模式 A：显式删除 ----------
  if (deletes.length) {
    const { keys: referenced, refs } = await collectReferencedKeys(
      domain,
      prefix,
    );

    /** @type {{ key: string, stillUsed: boolean }[]} */
    const targets = [];
    for (const item of deletes) {
      let key;
      try {
        key = toObjectKey(item, { domain, prefix });
      } catch (e) {
        console.error(`✗ ${e.message}`);
        continue;
      }
      const stillUsed = referenced.has(key);
      if (stillUsed && !force) {
        console.error(
          `✗ 仍被引用，拒绝删除（加 --force 可强制）: ${key}\n  ← ${refs.get(key).join(", ")}`,
        );
        continue;
      }
      if (stillUsed && force) {
        console.warn(
          `⚠ --force：仍被引用仍将删除: ${key}\n  ← ${refs.get(key).join(", ")}`,
        );
      }
      targets.push({ key, stillUsed });
    }

    if (!targets.length) {
      console.log("没有可删除的对象。");
      return;
    }

    // --delete 也必须带 --apply，避免误触
    if (!apply) {
      console.log("预览模式：以下对象将被删除（加上 --apply 才执行）：\n");
      for (const t of targets) {
        console.log(
          `· ${t.key}${t.stillUsed ? "（仍被引用 + force）" : ""}`,
        );
      }
      console.log(
        `\n确认后运行：\n  npm run gc-images -- --apply --delete <url或key>`,
      );
      return;
    }

    let deleted = 0;
    for (const t of targets) {
      await deleteObject(cos, { Bucket: bucket, Region: region, Key: t.key });
      console.log(`✓ 已删除  ${t.key}`);
      deleted++;
    }
    console.log(`\n完成：删除 ${deleted} 个对象`);
    return;
  }

  // ---------- 模式 B：孤儿 GC ----------
  const { keys: referenced } = await collectReferencedKeys(domain, prefix);
  console.log(`Markdown 中引用的本桶图片：${referenced.size} 个`);

  const objects = await listObjects(cos, {
    Bucket: bucket,
    Region: region,
    Prefix: listPrefix,
  });
  console.log(`COS 前缀 ${listPrefix} 下对象：${objects.length} 个`);

  const orphans = objects.filter((o) => !referenced.has(o.Key));
  const live = objects.length - orphans.length;

  console.log(`仍在使用：${live}  孤儿：${orphans.length}\n`);

  if (!orphans.length) {
    console.log("没有可清理的孤儿图片。");
    return;
  }

  let totalBytes = 0;
  for (const o of orphans) {
    totalBytes += o.Size;
    console.log(
      `· ${o.Key}  ${formatSize(o.Size)}  ${o.LastModified || ""}`.trimEnd(),
    );
  }
  console.log(`\n合计可释放约 ${formatSize(totalBytes)}`);

  if (!apply) {
    console.log(
      `\n这是 dry-run，未删除任何文件。\n确认无误后执行：\n  npm run gc-images -- --apply` +
        (prefixFilter ? ` --prefix ${prefixFilter}` : ""),
    );
    return;
  }

  let deleted = 0;
  for (const o of orphans) {
    await deleteObject(cos, { Bucket: bucket, Region: region, Key: o.Key });
    console.log(`✓ 已删除  ${o.Key}`);
    deleted++;
  }
  console.log(`\n完成：删除 ${deleted} 个孤儿对象`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
