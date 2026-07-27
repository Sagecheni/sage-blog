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
  // 标签过滤胶囊已填充
  await expect(page.locator("#search-filters .blog-tag").first()).toBeVisible();
});

test("客户端导航链路：零 console 错误 + 主题跨页持久", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  // 切到 light 主题
  await page.getByRole("button", { name: /Activate/ }).click();
  await expect(page.locator("html")).toHaveClass(/light/);

  // ClientRouter 换页（非整页刷新），主题类必须在 after-swap 补回
  await page.click('nav a[href="/blog"]');
  await expect(page.locator("h1.blog-hero-title")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/light/);

  await page.locator(".blog-post-item a").first().click();
  // 文章页独有的标题类（列表页的卡片也是 <article>，不能用元素选择器）
  await expect(page.locator("h1.blog-title")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/light/);

  expect(errors).toEqual([]);
});

test("新页面都能渲染", async ({ page }) => {
  for (const [path, text] of [
    ["/archive", "ARCHIVE"],
    ["/series", "SERIES"],
    ["/footprints", "FOOTPRINTS"],
    ["/friends", "FRIENDS"],
    ["/changelog", "CHANGELOG"],
  ] as const) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toContainText(text);
  }
});
