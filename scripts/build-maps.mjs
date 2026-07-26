// 足迹页底图生成器。重新生成：node scripts/build-maps.mjs
//
// 世界图：Natural Earth 110m 大陆剪影（公有领域），不画任何国界 —— 无画法争议。
// 中国图：阿里云 DataV GeoAtlas（源自高德，国内标准画法，含台湾省与南海诸岛/
//        断续线），主图裁经 73–135° / 纬 18–54°，右下按标准图惯例加南海诸岛小图框。
//
// 两图都渲染成灰度 webp，尺寸与页面 footprints.astro 的线性映射约定绑定：
//   世界 1600×800（-180..180 / -90..90）   中国 1400×813（73..135 / 18..54）
// 改这里的边界必须同步页面里的 CHINA 常量。
import { createRequire } from "node:module";
import sharp from "sharp";
import * as topojson from "topojson-client";
import { geoEquirectangular, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);

// ── 投影：经纬度 → 像素（等距圆柱，线性） ──
function projector(box, w, h) {
  return (lng, lat) => [
    ((lng - box.lngMin) / (box.lngMax - box.lngMin)) * w,
    ((box.latMax - lat) / (box.latMax - box.latMin)) * h,
  ];
}

// GeoJSON Polygon/MultiPolygon → SVG path d
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

// LineString/MultiLineString → SVG path d（断续线用）
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

const LAND = "#d9d9d9";
const PROVINCE_BORDER = "#c2c2c2";
const SEA = "#ffffff";

// ── 世界：无国界大陆剪影 ──
// 用 d3-geo 而非手写投影：南极洲/楚科奇等跨 180° 经线的多边形
// 需要反经线切割，朴素连线会画出横贯全图的条纹
async function buildWorld() {
  const topo = require("world-atlas/land-110m.json");
  const land = topojson.feature(topo, topo.objects.land);

  // 等距圆柱投影铺满 1600×800（scale = W / 2π），与页面的线性打点公式一致
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

// ── 中国：DataV 数据（含台湾省与南海断续线），主图 + 南海诸岛小图框 ──
async function buildChina() {
  const res = await fetch(
    "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
  );
  if (!res.ok) throw new Error(`DataV 数据拉取失败: ${res.status}`);
  const geo = await res.json();

  const W = 1400;
  const H = 813;

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
        // 南海断续线等线要素
        lines += `<path d="${linesToPath(geom, project)}" fill="none" stroke="#9a9a9a" stroke-width="2" stroke-dasharray="8 6"/>`;
      }
    }
    return fills + lines;
  }

  // 主图
  const main = renderFeatures(
    projector({ lngMin: 73, lngMax: 135, latMin: 18, latMax: 54 }, W, H),
  );

  // 南海诸岛小图框（标准图惯例）：经 105–125° / 纬 2–26°，右下角
  const INSET = { w: 180, h: 240, x: W - 196, y: H - 256 };
  const insetProject = (lng, lat) => {
    const [x, y] = projector(
      { lngMin: 105, lngMax: 125, latMin: 2, latMax: 26 },
      INSET.w,
      INSET.h,
    )(lng, lat);
    return [x + INSET.x, y + INSET.y];
  };
  const inset = renderFeatures(insetProject);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${SEA}"/>
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

await buildWorld();
await buildChina();
