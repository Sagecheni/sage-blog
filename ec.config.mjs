import { defineEcConfig } from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";

export default defineEcConfig({
  plugins: [pluginLineNumbers(), pluginCollapsibleSections()],

  themes: ["github-dark", "github-light-high-contrast"],
  // 绑定到站点自己的 .dark / .light 类，而不是系统媒体查询 ——
  // 这样代码块会跟着 ThemeToggle 一起切
  themeCssSelector: (theme) => `.${theme.type}`,
  useDarkModeMediaQuery: false,

  styleOverrides: {
    // 与站内 --font-mono 对齐 —— 否则代码块用系统等宽，行内代码用
    // IBM Plex Mono，同一页两种代码字体
    codeFontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    uiFontFamily: "'IBM Plex Mono', ui-monospace, monospace",

    // P5R：直角 + 硬阴影，与站内 .card 同一套语言
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
  },
});
