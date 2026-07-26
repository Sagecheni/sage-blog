import { visit } from "unist-util-visit";

/**
 * Remark plugin：视频嵌入指令 → 响应式懒加载 iframe。
 *
 *   ::bilibili{id=BV1GJ411x7h7}          （可选 page=N 指定分 P）
 *   ::youtube{id=dQw4w9WgXcQ}
 *
 * 必须注册在 remarkDirectiveHandle 之前（其守卫会跳过已设 hName 的节点）。
 */

function embedSrcOf(name, attributes) {
  if (name === "bilibili" && attributes.id) {
    const page = attributes.page ? `&p=${attributes.page}` : "";
    return `https://player.bilibili.com/player.html?bvid=${attributes.id}${page}&autoplay=0`;
  }
  if (name === "youtube" && attributes.id) {
    // nocookie 域：无同意前不落 cookie
    return `https://www.youtube-nocookie.com/embed/${attributes.id}`;
  }
  return null;
}

export function remarkVideoEmbed() {
  return (tree) => {
    visit(tree, "leafDirective", (node) => {
      if (node.name !== "bilibili" && node.name !== "youtube") return;

      const src = embedSrcOf(node.name, node.attributes ?? {});
      if (!src) return;

      node.data = {
        hName: "div",
        hProperties: { className: ["video-embed"] },
        hChildren: [
          {
            type: "element",
            tagName: "iframe",
            properties: {
              src,
              loading: "lazy",
              allowFullScreen: true,
              frameBorder: "0",
              referrerPolicy: "no-referrer",
              allow: "encrypted-media; picture-in-picture; fullscreen",
              title:
                node.name === "bilibili" ? "Bilibili 视频" : "YouTube 视频",
            },
            children: [],
          },
        ],
      };
    });
  };
}
