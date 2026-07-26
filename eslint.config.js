import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default [
  // 构建产物与自动生成的类型不参与 lint —— 否则 `npx eslint .` 会被
  // dist/_astro 里 6000+ 条压缩代码的误报淹没，真实问题反而看不见
  {
    ignores: ["dist/**", ".astro/**"],
  },
  // add more generic rule sets here, such as:
  // js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      // override/add rules settings here, such as:
      // "astro/no-set-html-directive": "error"
    },
  },
];
