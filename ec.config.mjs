import { defineEcConfig } from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import {
  pluginCollapsibleSections,
  pluginCollapsibleSectionsTexts,
} from "@expressive-code/plugin-collapsible-sections";

// 折叠摘要中文（保持 EC 默认外观，只改文案）
pluginCollapsibleSectionsTexts.overrideTexts(undefined, {
  collapsedLines: "{lineCount} 行已折叠 · 点击展开",
});

/**
 * 长代码块默认整段折叠，避免大段配置把正文撑爆。
 * - ≥ minLines 才折；短 snippet 保持展开
 * - 已手写 collapse= / nocollapse 时不覆盖
 * - collapsible-start：展开后仍可再折上
 *
 * 注意：必须在 pluginCollapsibleSections 之前，且用 preprocessMetadata
 *（该插件在 preprocessMetadata 里读取 collapse，preprocessCode 太晚）。
 */
function pluginAutoCollapseWholeBlock({ minLines = 8 } = {}) {
  return {
    name: "Auto collapse whole block",
    hooks: {
      preprocessMetadata: ({ codeBlock }) => {
        const meta = codeBlock.metaOptions;
        if (meta.getBoolean("nocollapse") === true) return;

        const fromProps = codeBlock.props.collapse;
        const propRanges = fromProps
          ? Array.isArray(fromProps)
            ? fromProps
            : [fromProps]
          : [];
        const metaRanges = meta.getRanges("collapse") ?? [];
        if (propRanges.length > 0 || metaRanges.length > 0) return;

        const lineCount = codeBlock.getLines().length;
        if (lineCount < minLines) return;

        codeBlock.props.collapse = [`1-${lineCount}`];
        if (!codeBlock.props.collapseStyle) {
          codeBlock.props.collapseStyle = "collapsible-start";
        }
      },
    },
  };
}

export default defineEcConfig({
  plugins: [
    pluginLineNumbers(),
    pluginAutoCollapseWholeBlock({ minLines: 8 }),
    pluginCollapsibleSections(),
  ],

  defaultProps: {
    collapseStyle: "collapsible-start",
  },

  themes: ["github-dark", "github-light-high-contrast"],
  // 跟站点 .dark / .light，而不是系统偏好
  themeCssSelector: (theme) => `.${theme.type}`,
  useDarkModeMediaQuery: false,

  styleOverrides: {
    codeFontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    uiFontFamily: "'IBM Plex Mono', ui-monospace, monospace",

    // 与站内 .card 一致的直角 + 硬阴影
    borderRadius: "0",
    borderWidth: "2px",
    borderColor: "var(--border)",
    frames: {
      frameBoxShadowCssValue: "4px 4px 0 var(--accent)",
      editorTabBarBackground: "var(--surface-deep)",
      editorTabBarBorderBottomColor: "var(--border)",
      editorActiveTabBackground: "var(--accent)",
      editorActiveTabForeground: "#ffffff",
      editorActiveTabBorderTopColor: "transparent",
      editorActiveTabBorderBottomColor: "var(--accent)",
      editorActiveTabIndicatorTopColor: "transparent",
      terminalTitlebarBackground: "var(--accent)",
      terminalTitlebarForeground: "#ffffff",
      terminalTitlebarBorderBottomColor: "var(--border)",
      terminalBackground: "var(--surface-deep)",
    },
    // 折叠条：轻微 accent 提示即可，不重做一整套 UI
    collapsibleSections: {
      closedBackgroundColor:
        "color-mix(in srgb, var(--accent) 12%, transparent)",
      closedBorderColor: "var(--accent)",
      // 必须是单长度：插件拿去算 inset box-shadow
      closedBorderWidth: "1px",
      closedTextColor: "var(--foreground-secondary)",
      openBackgroundColorCollapsible:
        "color-mix(in srgb, var(--accent) 5%, transparent)",
    },
  },
});
