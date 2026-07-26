// 足迹页底图与省份点亮层生成器。已挂进 npm run build 开头（点亮随数据变，必须每次构建重算）。
//
// 产物：
//   public/world-map.webp  世界无国界大陆剪影（Natural Earth，公有领域）
//   public/china-map.webp  中国标准画法（DataV/高德：台湾省同色、淡省界、南海诸岛图框）
//   public/china-lit.webp  省份点亮层（透明底红色填充，页面叠加时不参与暗色反相）
//
// 点亮数据来源 = footprints.json 的已去地点 + 所有游记 frontmatter 的 location，
// 经 d3-geo geoContains 反查省份 —— 零手工字段。
// DataV 数据缓存于 node_modules/.cache/sageforge/，仅首次联网。
//
// 尺寸与 footprints.astro 的线性映射约定绑定：
//   世界 1600×800（-180..180 / -90..90）   中国 1400×813（73..135 / 18..54）
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import * as topojson from "topojson-client";
import { geoEquirectangular, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const CACHE_DIR = "node_modules/.cache/sageforge";
const CHINA_GEO_CACHE = join(CACHE_DIR, "china-geo.json");

// ── 投影：经纬度 → 像素（等距圆柱，线性） ──
function projector(box, w, h) {
  return (lng, lat) => [
    ((lng - box.lngMin) / (box.lngMax - box.lngMin)) * w,
    ((box.latMax - lat) / (box.latMax - box.latMin)) * h,
  ];
}

function ringsToPath(geometry, project) {
  const polys =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let d = "";
  for (const poly of polys) {
    for (const ring of poly) {
      d += ring
        .map(([lng, lat], i) => {
          const [x, y] = project(lng, lat);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join("");
      d += "Z";
    }
  }
  return d;
}

function linesToPath(geometry, project) {
  const lines =
    geometry.type === "LineString"
      ? [geometry.coordinates]
      : geometry.coordinates;
  let d = "";
  for (const line of lines) {
    d += line
      .map(([lng, lat], i) => {
        const [x, y] = project(lng, lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join("");
  }
  return d;
}

// 平面射线法点在多边形内（奇偶规则）。
// 不用 d3 的 geoContains：它按球面环绕向定义内外，DataV 数据的绕向
// 与其相反，会把「除目标省外的所有省」都判成命中。
// 奇偶规则对绕向免疫，外环+洞自动由奇偶性处理，省级尺度平面近似足够。
function pointInGeometry(geometry, [px, py]) {
  const polys =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys) {
    let inside = false;
    for (const ring of poly) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (
          yi > py !== yj > py &&
          px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
        ) {
          inside = !inside;
        }
      }
    }
    if (inside) return true;
  }
  return false;
}

const LAND = "#d9d9d9";
const PROVINCE_BORDER = "#c2c2c2";
const SEA = "#ffffff";
const CHINA_W = 1400;
const CHINA_H = 813;
const CHINA_BOX = { lngMin: 73, lngMax: 135, latMin: 18, latMax: 54 };

// ── 中国省级数据（带缓存） ──
async function loadChinaGeo() {
  if (existsSync(CHINA_GEO_CACHE)) {
    return JSON.parse(readFileSync(CHINA_GEO_CACHE, "utf8"));
  }
  const res = await fetch(
    "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
  );
  if (!res.ok) throw new Error(`DataV 数据拉取失败: ${res.status}`);
  const geo = await res.json();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CHINA_GEO_CACHE, JSON.stringify(geo));
  return geo;
}

// ── 已去地点收集：footprints.json（非 planned） + 游记 frontmatter location ──
function collectVisitedPoints() {
  const points = [];

  const manual = JSON.parse(readFileSync("src/data/footprints.json", "utf8"));
  for (const fp of manual) {
    if (!fp.planned) points.push([fp.lng, fp.lat]);
  }

  for (const file of readdirSync("src/blog")) {
    if (!file.endsWith(".md") || file.startsWith("_")) continue;
    const raw = readFileSync(join("src/blog", file), "utf8");
    const fm = raw.match(/^---\n([\s\S]*?)\n---/)?.[1];
    if (!fm || !/^location:/m.test(fm)) continue;

    // 支持行内 { place: 杭州, lat: 30.27, lng: 120.15 } 与缩进块两种写法
    const block =
      fm.match(/^location:\s*\{([^}]*)\}/m)?.[1] ??
      fm.match(/^location:\s*\n((?:[ \t]+.+\n?)+)/m)?.[1] ??
      "";
    const lat = parseFloat(block.match(/lat:\s*(-?[\d.]+)/)?.[1] ?? "");
    const lng = parseFloat(block.match(/lng:\s*(-?[\d.]+)/)?.[1] ?? "");
    if (Number.isFinite(lat) && Number.isFinite(lng)) points.push([lng, lat]);
  }

  return points;
}

// ── 世界：无国界大陆剪影（d3-geo 处理反经线切割） ──
async function buildWorld() {
  const topo = require("world-atlas/land-110m.json");
  const land = topojson.feature(topo, topo.objects.land);
  const projection = geoEquirectangular()
    .scale(1600 / (2 * Math.PI))
    .translate([800, 400]);
  const d = geoPath(projection)(land);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 800"><rect width="1600" height="800" fill="${SEA}"/><path d="${d}" fill="${LAND}"/></svg>`;
  await sharp(Buffer.from(svg))
    .grayscale()
    .webp({ quality: 75 })
    .toFile("public/world-map.webp");
  console.log("✓ world-map.webp（Natural Earth 无国界剪影）");
}

// ── 中国：标准画法底图 + 南海诸岛图框 ──
async function buildChina(geo) {
  function renderFeatures(project) {
    let fills = "";
    let lines = "";
    for (const feature of geo.features) {
      const geom = feature.geometry;
      if (!geom) continue;
      if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
        fills += `<path d="${ringsToPath(geom, project)}" fill="${LAND}" stroke="${PROVINCE_BORDER}" stroke-width="1"/>`;
      } else if (
        geom.type === "LineString" ||
        geom.type === "MultiLineString"
      ) {
        lines += `<path d="${linesToPath(geom, project)}" fill="none" stroke="#9a9a9a" stroke-width="2" stroke-dasharray="8 6"/>`;
      }
    }
    return fills + lines;
  }

  const main = renderFeatures(projector(CHINA_BOX, CHINA_W, CHINA_H));

  const INSET = { w: 180, h: 240, x: CHINA_W - 196, y: CHINA_H - 256 };
  const insetProject = (lng, lat) => {
    const [x, y] = projector(
      { lngMin: 105, lngMax: 125, latMin: 2, latMax: 26 },
      INSET.w,
      INSET.h,
    )(lng, lat);
    return [x + INSET.x, y + INSET.y];
  };
  const inset = renderFeatures(insetProject);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHINA_W} ${CHINA_H}">
    <rect width="${CHINA_W}" height="${CHINA_H}" fill="${SEA}"/>
    ${main}
    <clipPath id="inset"><rect x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}"/></clipPath>
    <rect x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}" fill="${SEA}" stroke="#8a8a8a" stroke-width="2"/>
    <g clip-path="url(#inset)">${inset}</g>
  </svg>`;

  await sharp(Buffer.from(svg))
    .grayscale()
    .webp({ quality: 78 })
    .toFile("public/china-map.webp");
  console.log("✓ china-map.webp（DataV/高德 标准画法 + 南海诸岛图框）");
}

// ── 省份点亮层：透明底，去过的省填淡红。
//    单独成图是因为页面暗色模式会把底图整体反相 —— 红色反相会变青，
//    点亮层不参与反相才能两种主题都是红 ──
async function buildLitOverlay(geo) {
  const points = collectVisitedPoints();
  const project = projector(CHINA_BOX, CHINA_W, CHINA_H);

  let lit = "";
  const litNames = [];
  for (const feature of geo.features) {
    const geom = feature.geometry;
    if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon"))
      continue;
    if (points.some((pt) => pointInGeometry(geom, pt))) {
      lit += `<path d="${ringsToPath(geom, project)}" fill="rgba(216,0,12,0.18)" stroke="rgba(216,0,12,0.45)" stroke-width="1.5"/>`;
      litNames.push(feature.properties?.name ?? "?");
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHINA_W} ${CHINA_H}">${lit}</svg>`;
  await sharp(Buffer.from(svg))
    .webp({ quality: 80 })
    .toFile("public/china-lit.webp");
  console.log(
    `✓ china-lit.webp（点亮 ${litNames.length} 省：${litNames.join("、") || "无"}）`,
  );
}

const geo = await loadChinaGeo();
await buildWorld();
await buildChina(geo);
await buildLitOverlay(geo);
