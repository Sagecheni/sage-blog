# AGENTS.md

Agent guidelines for the **Ryze (SageForge)** repository — a Persona 5 Royal-themed personal blog built with Astro 5, React, TailwindCSS 4, and MDX.

---

## Build, Dev, and Preview Commands

```bash
# Start development server (do NOT run via agent — long-running process)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run Astro CLI directly
npm run astro
```

**Note**: No test suite is currently configured. No `npm test` script exists.

---

## Linting and Formatting

### ESLint

Config: `eslint.config.js` (flat config with TypeScript + Astro plugins)

```bash
# Run ESLint (no script defined — run directly)
npx eslint .

# Fix auto-fixable issues
npx eslint . --fix
```

### Prettier

Config: `.prettierrc` (Astro + Tailwind plugins)

```bash
# Check formatting (no script defined — run directly)
npx prettier --check .

# Format all files
npx prettier --write .
```

### TypeScript

Config: `tsconfig.json` (extends `astro/tsconfigs/strict`)

```bash
# Type-check (no script defined — run directly)
npx tsc --noEmit
```

**Recommendation**: Before committing, run all three checks:

```bash
npx eslint . --fix && npx prettier --write . && npx tsc --noEmit
```

---

## Project Structure

```
src/
├── assets/        # Optimized images, icons (SVG imports via vite-plugin-svgr)
├── blog/          # MDX blog posts (content collection)
├── components/    # Reusable UI components (.astro, .tsx)
├── data/          # Structured data (e.g., confidants.ts)
├── layouts/       # Page layouts (BaseLayout, BlogLayout)
├── pages/         # File-based routing (index, about, blog/[...slug])
├── plugins/       # Custom remark/rehype plugins (.js, .mjs)
└── styles/        # Global CSS (TailwindCSS 4 + custom P5R theme)
```

**Key files**:

- `astro.config.mjs` — Astro config with MDX, React, sitemap, expressive-code integrations
- `content.config.ts` — Content collection schema (Zod-based validation)
- `ec.config.mjs` — Expressive Code config (syntax highlighting)

---

## Code Style Guidelines

### Import Conventions

**Order**: External/framework imports first, then relative internal imports.

```typescript
// ✅ Good
import { useState, useEffect } from "react";
import { getCollection } from "astro:content";
import type { BlogType } from "../content.config";
import IconMoon from "../assets/icons/moon.svg?react";

// ❌ Bad (mixed order)
import IconMoon from "../assets/icons/moon.svg?react";
import { useState } from "react";
```

**Type imports**: Use `import type` for type-only imports.

```typescript
// ✅ Good
import type { APIContext } from "astro";

// ❌ Bad
import { APIContext } from "astro";
```

**SVG imports**: Use `// @ts-ignore` above `*.svg?react` imports (vite-plugin-svgr types not available).

```typescript
// @ts-ignore
import IconSun from "../assets/icons/sun-high.svg?react";
```

**No path aliases**: This project uses relative imports (`../...`), not `@/` aliases.

---

### Naming Conventions

- **Components/Types**: PascalCase (`ThemeToggle`, `BlogType`, `BaseLayout`)
- **Functions/Variables**: camelCase (`changeTheme`, `toggleTheme`, `savedTheme`)
- **Constants/Data**: camelCase plural nouns (`confidants`, `blogs`)
- **Files**: Match export name (e.g., `ThemeToggle.tsx` exports `ThemeToggle`)

---

### Type Annotations

**Explicit annotations required**:

- API route handlers and params
- React event handlers
- Shared content models

```typescript
// ✅ Good
export const GET: APIRoute = (context: APIContext) => { ... };

const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => { ... };

export type BlogType = import("astro:content").CollectionEntry<"blogs">;
```

**Schema-driven validation**: Use Zod for content collections (see `content.config.ts`).

**Escape hatches**: Pragmatic `as any` is acceptable for browser APIs without types.

```typescript
// ✅ Acceptable (View Transitions API not fully typed)
const transition = (document as any).startViewTransition?.(() =>
  changeTheme(newTheme),
);
```

**Never suppress type errors** with `@ts-expect-error` or `@ts-ignore` on application code — only for third-party imports without types.

---

### Error Handling

**Prefer guard clauses** over try/catch for validation:

```typescript
// ✅ Good
export const GET: APIRoute = (context: APIContext) => {
  if (!context.site) {
    return new Response("Site URL not configured", { status: 500 });
  }
  // ... happy path
};

// ❌ Bad (unnecessary try/catch for validation)
try {
  if (!context.site) throw new Error("...");
} catch (e) { ... }
```

**Add try/catch only for truly fallible async I/O** (file reads, network requests, external APIs).

**Client-side APIs**: Wrap fallible browser APIs (clipboard, notifications) in try/catch:

```typescript
// ✅ Good
try {
  await navigator.clipboard.writeText(code);
} catch (err) {
  console.error("Failed to copy:", err);
}
```

---

### Comments and Documentation

**Style**: Short inline `//` comments for intent/context. Avoid line-by-line narration.

```typescript
// ✅ Good
// initialization from localStorage
useEffect(() => { ... }, []);

// keep localStorage + document class in sync
useEffect(() => { ... }, [theme]);

// ❌ Bad (too verbose)
// This function toggles the theme by checking the current theme state
// and then setting it to the opposite value using the changeTheme utility
```

**JSDoc**: Use for type annotations in `.js` files:

```javascript
/** @type {import('unified').Plugin<[], import('mdast').Root>} */
export function remarkDirectiveHandle() { ... }
```

**Bilingual comments**: English + Chinese notes are acceptable when useful (see `content.config.ts`).

---

## Framework-Specific Patterns

### Astro Components

**Props interface**: Define in frontmatter with `export interface Props`.

```astro
---
export interface Props {
  title: string;
  description: string;
  isHome?: boolean;
}

const { title, description, isHome = false } = Astro.props;
---
```

**Conditional classes**: Use `class:list` for dynamic classes.

```astro
<body class:list={["min-h-svh", bgClass]}></body>
```

---

### React Components

**Hooks**: Standard React patterns (useState, useEffect).

**Event handlers**: Typed with React event types.

```typescript
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => { ... };
```

**Default exports**: React components use default export.

```typescript
export default function ThemeToggle() { ... }
```

---

### Content Collections

**Schema**: Defined in `content.config.ts` with Zod.

**Loader**: Uses `glob` loader for MDX files.

```typescript
const blogs = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/blog" }),
  schema: z.object({ ... }),
});
```

**Type export**: Export collection entry type for reuse.

```typescript
export type BlogType = import("astro:content").CollectionEntry<"blogs">;
```

---

## Styling Guidelines

### TailwindCSS 4

**Config**: Inline `@theme` in `src/styles/global.css`.

**Custom properties**: P5R theme colors defined as CSS variables.

```css
.dark {
  --background: #000000;
  --foreground: #ffffff;
  --accent: #d8000c; /* P5R red */
}
```

**Utility classes**: Use Tailwind utilities. Custom classes only for complex animations/clip-paths.

**Animation class**: Use `.animation` utility for transitions (defined in global.css).

---

### Custom CSS

**Location**: `src/styles/global.css` for global styles, inline `<style>` in `.astro` for component-specific.

**Clip-path animations**: P5R-style geometric animations use vanilla CSS (see `BaseLayout.astro`, `PostCard.astro`).

---

## Plugin Development

**Location**: `src/plugins/`

**Naming**: `remark-*` for remark plugins, `rehype-*` for rehype plugins.

**Pattern**: Export named function, use `unist-util-visit` for AST traversal.

```javascript
import { visit } from "unist-util-visit";

export function rehypeImageFigure() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      // Transform logic
    });
  };
}
```

**Registration**: Add to `astro.config.mjs` in `markdown.remarkPlugins` or `markdown.rehypePlugins`.

---

## Git Workflow

**Commits**: No automated commits. Commit only when explicitly requested.

**Branch**: Work on current branch unless instructed otherwise.

---

## Common Pitfalls

1. **Long-running commands**: Never run `npm run dev` via agent (blocks execution). Recommend user runs manually.

2. **Type suppression**: Never use `@ts-expect-error` or `@ts-ignore` on application code. Only for third-party imports.

3. **Path aliases**: No `@/` aliases configured. Use relative imports.

4. **Test suite**: No tests exist. Do not attempt to run `npm test`.

5. **Lint/format scripts**: Not defined in `package.json`. Run via `npx` directly.

6. **SVG imports**: Require `// @ts-ignore` due to vite-plugin-svgr type limitations.

7. **View Transitions API**: Requires `as any` cast on `document.startViewTransition` (experimental API).

---

## Reference Files

**Canonical style examples**:

- `src/content.config.ts` — Type/schema conventions
- `src/pages/rss.xml.ts` — API route patterns
- `src/components/ThemeToggle.tsx` — React component conventions
- `src/plugins/rehype-image-figure.mjs` — Plugin patterns
- `src/layouts/BaseLayout.astro` — Astro component conventions

---

## Dependencies

**Framework**: Astro 5 (static site generation)

**UI**: React 19, TailwindCSS 4

**Content**: MDX, Expressive Code (syntax highlighting), KaTeX (math), Mermaid (diagrams)

**Fonts**: Space Grotesk, LXGW WenKai Screen, IBM Plex Mono, Bangers, ZCOOL QingKe HuangYou

**Dev tools**: ESLint, Prettier, TypeScript

---

## Additional Notes

- **Theme**: Persona 5 Royal aesthetic (red/black/white, geometric animations, "WANTED" poster style)
- **Language**: Bilingual (English + Chinese) — UI text and comments may mix languages
- **Performance**: Uses `astro:assets` for image optimization, static site generation for speed
- **Accessibility**: Ensure ARIA labels on interactive elements (see `ThemeToggle.tsx` for example)

---

**Last updated**: 2026-03-14
