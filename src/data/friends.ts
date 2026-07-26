export interface Friend {
  name: string;
  url: string;
  desc: string;
}

// 友链。新朋友往下加即可，卡片按名字哈希配色
export const friends: Friend[] = [
  {
    name: "Muir's Cream",
    url: "https://nova.gal/",
    desc: "本站骨架的灵感来源 · Pwn 与甜点",
  },
];
