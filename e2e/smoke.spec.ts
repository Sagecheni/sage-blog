import { test, expect } from "@playwright/test";

// 冒烟：核心页面渲染 + 关键交互（搜索/筛选/目录）没有悄悄坏掉。
// 跑在构建产物上，Pagefind 索引真实可用。

test.beforeEach(async ({ context }) => {
  // 跳过首页开场动画（2.4s 全屏遮罩会挡住一切交互）
  await context.addInitScript(() => {
    sessionStorage.setItem("opening-played", "true");
  });
});

test("首页：Hero 与最新文章", async ({ page }) => {
  await page.goto("/");
  // 标题被拆成逐字 span 动画，文本含模板空白 —— 断言语义化的 aria-label
  await expect(page.locator("#hero-title")).toHaveAttribute(
    "aria-label",
    "SAGE FORGE",
  );
  await expect(page.locator(".latest-post-row").first()).toBeVisible();
});

test("博客列表：标签筛选生效且写回 URL", async ({ page }) => {
  await page.goto("/blog");
  const total = await page.locator(".blog-post-item:visible").count();
  expect(total).toBeGreaterThan(0);

  // 点第一个具体标签（跳过 All）
  await page.locator(".blog-tag:visible").nth(1).click();
  await expect
    .poll(async () => page.locator(".blog-post-item:visible").count())
    .toBeLessThan(total);
  expect(page.url()).toContain("tag=");
});

test("带参筛选链接直接生效", async ({ page }) => {
  await page.goto("/blog?tag=guide");
  const visible = page.locator(".blog-post-item:visible");
  await expect(visible.first()).toBeVisible();
  await expect(visible.first()).toContainText("写作功能指南");
});

test("文章页：目录、画廊与代码块", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/blog/writing-guide");
  await expect(page.locator(".toc").first()).toBeVisible();
  await expect(page.locator(".callout.gallery").first()).toBeVisible();
  await expect(page.locator(".expressive-code").first()).toBeVisible();
});

test("搜索：Cmd+K 打开并能命中中文", async ({ page }) => {
  await page.goto("/blog");
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.locator("#search-input");
  await expect(input).toBeFocused();
  await input.fill("注意力");
  await expect(page.locator(".search-hit").first()).toBeVisible();
});

test("新页面都能渲染", async ({ page }) => {
  for (const [path, text] of [
    ["/archive", "ARCHIVE"],
    ["/series", "SERIES"],
    ["/footprints", "FOOTPRINTS"],
    ["/friends", "FRIENDS"],
  ] as const) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toContainText(text);
  }
});
