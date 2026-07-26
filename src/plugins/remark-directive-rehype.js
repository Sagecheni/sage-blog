import { visit } from "unist-util-visit";

/** @type {import('unified').Plugin<[], import('mdast').Root>} */
export function remarkDirectiveHandle() {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        // 上游专用插件（如 remark-link-card）已经处理过的指令不再碰，
        // 否则这里的通用规则会把它们覆盖成 callout div
        if (node.data?.hName) return;

        const data = node.data || (node.data = {});
        const attributes = node.attributes || {};
        const name = node.name;

        if (node.type === "textDirective") {
          if (name === "citen") {
            const child = node.children[0];
            const key = child ? child.value : "";
            data.hName = "a";
            data.hProperties = { 
                class: "citation",
                href: `#bib-${key}`,
                style: "cursor: pointer;" 
            };
          } else {
             data.hName = 'span';
             data.hProperties = { class: name, ...attributes };
          }
        } else {
          // containerDirective or leafDirective
          data.hName = "div";
          const { class: attrClass, ...rest } = attributes;
          data.hProperties = {
            class: `callout ${name}${attrClass ? " " + attrClass : ""}`,
            ...rest,
          };
          
          // Inject a title if it's a callout-like directive and not already present
          if (["note", "tip", "warning", "important", "caution"].includes(name)) {
             // For now, we rely on CSS ::before content or just the styling
             // We can also inject a label if we wanted to be more explicit HTML-wise
             // But usually keeping it as a div with a class is flexible enough.
          }
        }
      }
    });
  };
}
