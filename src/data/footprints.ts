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
  /** 旅行分组：同名 trip 的点按数组顺序连成路线。约定 = 游记的 series 名 */
  trip?: string;
  /** 想去清单：渲染为空心点，计入「想去」统计 */
  planned?: boolean;
  /** 列表卡配图（COS 缩略图 URL，可选） */
  photo?: string;
  note?: string;
}

// 足迹。数组顺序 = 同一 trip 内的行程顺序
export const footprints: Footprint[] = [
  {
    place: "北京",
    lat: 39.9042,
    lng: 116.4074,
    date: "2022 至今",
    note: "读书的地方",
  },
  {
    place: "东京",
    lat: 35.6762,
    lng: 139.6503,
    date: "计划中",
    planned: true,
  },
  // 游记写完后的完整示例：
  // {
  //   place: "大阪",
  //   lat: 34.6937,
  //   lng: 135.5023,
  //   date: "2026-08",
  //   posts: ["japan-trip-2"],
  //   trip: "日本游记",
  //   photo: "https://sageblog-1316665129.cos.ap-guangzhou.myqcloud.com/img/osaka-thumb.jpg",
  // },
];
