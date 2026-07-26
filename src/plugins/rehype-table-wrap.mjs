import { visit } from "unist-util-visit";

/**
 * Rehype plugin to wrap Markdown tables in a scroll container.
 *
 * <div class="table-wrap"><table>…</table></div>
 *
 * 宽表格（列多）在窄屏上会撑破文章版面，包一层横向滚动容器兜住。
 * 样式见 typography.css 的 .table-wrap。
 */
export function rehypeTableWrap() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || !parent || index === null) return;

      // 已经包过的跳过（visit 会进入新建的 wrapper 再访问一次 table）
      if (
        parent.tagName === "div" &&
        Array.isArray(parent.properties?.className) &&
        parent.properties.className.includes("table-wrap")
      ) {
        return;
      }

      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrap"] },
        children: [node],
      };
    });
  };
}
