
import { visit } from 'unist-util-visit';

/**
 * Rehype plugin to wrap Markdown images in a <figure> element.
 * Structure:
 * <figure class="group">
 *   <a href="{src}" target="_blank" rel="noopener">
 *     <img loading="lazy" src="{src}" alt="{alt}" />
 *     <figcaption>图 {count}：{alt}</figcaption>
 *   </a>
 * </figure>
 */
export function rehypeImageFigure() {
  return (tree) => {
    let count = 1;

    visit(tree, 'element', (node, index, parent) => {
      // Look for <img> tags
      if (node.tagName !== 'img') {
        return;
      }

      // Skip images that are already wrapped in <figure> or <a>
      // This prevents double-wrapping if the user manually wrote HTML
      if (parent.tagName === 'figure' || parent.tagName === 'a') {
        return;
      }

      const { src, alt, title } = node.properties || {};
      const currentCount = count++;
      
      // Construct the new node structure
      const figureNode = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['group'] },
        children: [
          {
            type: 'element',
            tagName: 'a',
            properties: {
              href: src,
              target: '_blank',
              rel: 'noopener'
            },
            children: [
              {
                ...node,
                properties: {
                  ...node.properties,
                  loading: 'lazy'
                }
              },
              {
                type: 'element',
                tagName: 'figcaption',
                properties: {},
                children: [
                  { type: 'text', value: `图 ${currentCount}：${alt || title || ''}` }
                ]
              }
            ]
          }
        ]
      };

      // Check if the image is the sole child of a <p> tag
      const isParentParagraph = parent.tagName === 'p';
      const isSoleChild =
        parent.children.length === 1 ||
        parent.children.every(
          (child) =>
            child === node || (child.type === 'text' && !child.value.trim())
        );

      if (isParentParagraph && isSoleChild) {
        // Transform the parent <p> into the <figure>
        // We replace the parent's properties and children with our figure's properties and children
        parent.tagName = figureNode.tagName;
        parent.properties = figureNode.properties;
        parent.children = figureNode.children;
        // Since we modified parent in search, we don't need to do anything to 'index' since 'node' is effectively gone/replaced within 'parent'
      } else {
        // Replace the <img> with the <figure> inline (not ideal HTML but fallback)
        parent.children[index] = figureNode;
      }
    });
  };
}
