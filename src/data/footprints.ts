import raw from "./footprints.json";

export interface Footprint {
  place: string;
  /** 纬度 -90..90 */
  lat: number;
  /** 经度 -180..180 */
  lng: number;
  /** 展示用，如 "2022 至今" 或 "2026-08" */
  date: string;
  /** 关联游记 slug（可多篇；slug 写错会被构建期死链检查拦下） */
  posts?: string[];
  /** 旅行分组：同名 trip 的点连成路线。约定 = 游记的 series 名 */
  trip?: string;
  /** 想去清单：渲染为空心点，计入「想去」统计 */
  planned?: boolean;
  /** 列表卡配图（COS 缩略图 URL，可选） */
  photo?: string;
  note?: string;
}

// 手动足迹（数据在 footprints.json —— JSON 是为了让 scripts/build-maps.mjs
// 也能读同一份来算省份点亮）。
// 带 location frontmatter 的游记会自动生成足迹并与这里合并，
// 手动条目只需要维护「想去」和没写过游记的地方。
export const footprints = raw as Footprint[];
