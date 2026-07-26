// 被授权走 Astro 构建期优化的远程图片域名。
// astro.config.mjs（image.domains）与 rehype-image-figure.mjs 共用这一份 ——
// 授权域的图有全尺寸优化副本，站点不再链接 COS 原图（隐私：原图含 EXIF/GPS）。
// 换/加 bucket 只改这里。
export const optimizedImageDomains = [
  "sageblog-1316665129.cos.ap-guangzhou.myqcloud.com",
  "sa1geblogimage-1316665129.cos.ap-beijing.myqcloud.com",
];
