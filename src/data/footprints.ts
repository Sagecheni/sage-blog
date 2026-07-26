export interface Footprint {
  place: string;
  /** 纬度 -90..90 */
  lat: number;
  /** 经度 -180..180 */
  lng: number;
  /** 展示用，如 "2022 至今" 或 "2026-08" */
  date: string;
  /** 关联游记的 slug（可选） */
  slug?: string;
  note?: string;
}

// 足迹。写完游记把 slug 填上，地图点就能点进文章
export const footprints: Footprint[] = [
  {
    place: "北京",
    lat: 39.9042,
    lng: 116.4074,
    date: "2022 至今",
    note: "读书的地方",
  },
  // { place: "东京", lat: 35.6762, lng: 139.6503, date: "2026-08", slug: "japan-trip-1" },
];
