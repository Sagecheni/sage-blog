/**
 * 站点级元信息的单一事实来源。
 * 之前 Seo.astro / rss.xml.ts 各自散落着模板遗留的默认值
 * （author "Rahul"、site_name "Ryze"、"A minimalist Astro starter…"），
 * 会在没有显式传参的页面上泄漏出去。
 */
export const site = {
  name: "Sage Forge",
  nameZh: "贤者工坊",
  title: "Sage Forge｜贤者工坊",
  description: "SageChen 的个人博客 —— 技术笔记、踩坑记录，和偶尔的胡思乱想。",
  author: "SageChen",
  url: "https://blog.sagec.fun",
  repo: "https://github.com/Sagecheni/sage-blog",
  locale: "zh_CN",
} as const;
