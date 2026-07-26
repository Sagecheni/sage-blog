// 上传 COS 前的照片清洗：就地剥离全部元数据（EXIF/GPS/XMP/IPTC）。
//
// 用法：
//   node scripts/strip-exif.mjs <目录或文件>...           # 就地重写
//   node scripts/strip-exif.mjs <目录> --max 4000         # 顺带把最长边压到 4000px
//
// 说明：
//   - 先按 EXIF Orientation 把像素摆正，再剥元数据 —— 否则竖拍照片会横过来
//   - sharp 输出默认不带元数据，无需额外参数
//   - 只处理 jpg/jpeg/png/webp，其他文件跳过
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseArgs(argv) {
  const paths = [];
  let max = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--max") {
      max = parseInt(argv[++i], 10) || null;
    } else {
      paths.push(argv[i]);
    }
  }
  return { paths, max };
}

async function collectFiles(path) {
  const info = await stat(path);
  if (info.isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else if (IMAGE_EXTS.has(extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function stripOne(file, max) {
  const input = await readFile(file);
  const before = input.byteLength;

  // rotate()（无参）按 EXIF Orientation 摆正像素，之后方向标签就不再需要
  let pipeline = sharp(input).rotate();
  if (max) {
    pipeline = pipeline.resize({
      width: max,
      height: max,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const ext = extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
  } else if (ext === ".png") {
    pipeline = pipeline.png();
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 92 });
  }

  const output = await pipeline.toBuffer();
  await writeFile(file, output);

  const gps = (await sharp(input).metadata()).exif ? "有元数据" : "无元数据";
  const kb = (n) => `${Math.round(n / 1024)}KB`;
  console.log(
    `✓ ${file}  ${kb(before)} → ${kb(output.byteLength)}（原${gps}）`,
  );
}

const { paths, max } = parseArgs(process.argv.slice(2));
if (!paths.length) {
  console.error(
    "用法: node scripts/strip-exif.mjs <目录或文件>... [--max 4000]",
  );
  process.exit(1);
}

let count = 0;
for (const path of paths) {
  for (const file of await collectFiles(path)) {
    await stripOne(file, max);
    count++;
  }
}
console.log(`\n完成：${count} 张照片已就地清洗（EXIF/GPS 已剥离）`);
