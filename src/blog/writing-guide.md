---
slug: "writing-guide"
title: "博客写作功能指南"
date: 2026-01-01
description: "全面介绍本博客系统的写作功能：基本 Markdown 增强、学术引用、样式块与图表绘制。"
author: "Sage"
tags: ["guide", "markdown"]
bibliography: public/bibliography.bib
---

本文档介绍了本博客系统集成的核心写作功能，旨在提升文章的表现力与专业度。

## 1. 基础增强 (GFM)

基于 `remark-gfm`，我们支持了更丰富的 Markdown 标准语法。

### 1.1 脚注 (Footnotes)

对某个词或句子的补充说明，会自动链接到文章底部。

**语法：**

```markdown
这是一个需要解释的词[^1]。

[^1]: 这是该词的解释内容。
```

**效果：**

这是一个需要解释的词[^1]。

### 1.2 表格 (Tables)

快速创建结构化数据展示。

**语法：**

```markdown
| 功能      | 状态 |     备注 |
| :-------- | :--: | -------: |
| GFM       |  ✅  | 基础支持 |
| Citations |  ✅  | 学术必备 |
```

**效果：**

| 功能      | 状态 |     备注 |
| :-------- | :--: | -------: |
| GFM       |  ✅  | 基础支持 |
| Citations |  ✅  | 学术必备 |
| Callouts  |  ✅  | 样式增强 |

### 1.3 任务列表 (Task List)

适合用于 TODO 列表或进度追踪。

**语法：**

```markdown
- [x] 已完成的任务
- [ ] 待办任务
```

**效果：**

- [x] 已完成的任务
- [ ] 待办任务

---

## 2. 学术引用 (Citations)

基于 `rehype-citation`，支持专业的学术文献引用。

### 2.1 配置

在文章 Frontmatter 中指定 `.bib` 文件路径：

```yaml
---
bibliography: public/bibliography.bib
---
```

### 2.2 引用语法

使用 BibTeX 中的引用 Key 进行引用。

**语法：**

```markdown
根据 Vaswani 等人的研究 [@vaswani2017attention]...
```

**效果：**

根据 Vaswani 等人的研究 [@vaswani2017attention]...

系统会自动在文章末尾生成参考文献列表。

---

## 3. 自定义标注块 (Callouts)

基于 `remark-directive`，我们实现了类似 Obsidian/GitHub 的 Callout 块，用于突出显示特定内容。

**语法：**

```markdown
:::note
这是一个普通的**笔记**块。
:::

:::tip
这是一个**提示**块，用于给出建议。
:::

:::warning
这是一个**警告**块，请注意。
:::

:::important
这是一个**重要**信息块。
:::

:::caution
这是一个**危险**警告块。
:::

:::cite
这是一个**引用**块。
:::
```

**效果：**

:::note
这是一个普通的**笔记**块。
:::

:::tip
这是一个**提示**块，用于给出建议。
:::

:::warning
这是一个**警告**块，请注意。
:::

:::important
这是一个**重要**信息块。
:::

:::caution
这是一个**危险**警告块。
:::

:::cite
这是一个**引用**块（中文正体）。
:::

:::cite{.en}
Stay hungry, stay foolish. (English Italic)
:::

:::cite{.bi}
知行合一。

Knowledge and action are one.
:::

---

## 4. 流程与架构图 (Mermaid)

使用 Mermaid 语法绘制流程图、时序图、甘特图等。（需配合 `div` 容器或代码块使用，具体视配置而定，以下为通用示例）。

**语法：**

```html
<div class="mermaid">
  graph TD; A[开始] --> B{判断}; B -- 是 --> C[执行操作]; B -- 否 --> D[结束]; C
  --> D;
</div>
```

**效果：**

<div class="mermaid">
graph TD;
    A[开始] --> B{判断};
    B -- 是 --> C[执行操作];
    B -- 否 --> D[结束];
    C --> D;
</div>

---

## 5. 文本特效 (Text Effects)

使用 `:directive[text]` 语法为文本添加颜色、高亮或特殊效果。

### 5.1 基础颜色

支持 `:color[text]` 格式。

```markdown
- :red[红色文字] (`:red[...]`)
- :blue[蓝色文字] (`:blue[...]`)
- :green[绿色文字] (`:green[...]`)
- :yellow[黄色文字] (`:yellow[...]`)
- :purple[紫色文字] (`:purple[...]`)
- :orange[橙色文字] (`:orange[...]`)
- :pink[粉色文字] (`:pink[...]`)
- :gray[灰色文字] (`:gray[...]`)
```

**效果：**

- :red[红色文字]
- :blue[蓝色文字]
- :green[绿色文字]
- :yellow[黄色文字]
- :purple[紫色文字]
- :orange[橙色文字]
- :pink[粉色文字]
- :gray[灰色文字]

### 5.2 特殊效果

```markdown
- **彩虹特效**：`:rainbow[这是一段彩虹文字]`
- **发光效果**：`:glow[发光文字]`
- **模糊效果**：`:blur[模糊文字]`
- **防剧透**：`:spoiler[剧透警告！鼠标悬停查看]` (默认模糊，悬停显示)
- **高亮**：`:highlight[高亮背景]`
```

**效果：**

- **彩虹特效**：:rainbow[这是一段彩虹文字]
- **发光效果**：:glow[发光文字]
- **模糊效果**：:blur[模糊文字]
- **防剧透**：:spoiler[剧透警告！鼠标悬停查看] (默认模糊，悬停显示)
- **高亮**：:highlight[高亮背景]

### 5.3 字体样式

- **手写体**：`:font-hand[Using handwritten font style]`

**效果：**

- **手写体**：:font-hand[Using handwritten font style]

---

## 6. 图片与画廊 (Gallery)

普通 Markdown 图片会被自动包装为带编号图注的 `<figure>`（悬停显示「图 N：alt」，点击放大）。多图游记用 `:::gallery` 容器把它们排成画廊。

**写法要求：每行一张图，图与图之间空一行**（多图挤在同一段落会触发非法嵌套的兜底路径）。alt 文本即图注。

### 6.1 发图工作流（照片 → 上线）

从相册到文章上线只有两步手动操作，其余由构建自动完成。

**第 ① 步 · 清洗照片**（上传前必做，就地重写）：

```bash
node scripts/strip-exif.mjs ~/Desktop/游记照片 --max 4000
```

- 按 EXIF 方向摆正像素（否则竖拍照片会横过来）
- 剥离全部元数据（EXIF / GPS / XMP / IPTC）
- `--max 4000` 顺带把最长边压到 4000px，可省略

**第 ② 步 · 传 COS，写 Markdown**：

把清洗后的照片上传到已授权的 bucket（见 6.5），然后正常引用：

```markdown
:::gallery
![神社门口](https://sageblog-1316665129.cos.ap-guangzhou.myqcloud.com/img/001.jpg)

![午饭的拉面](https://.../002.jpg)

中间想插一句解说也行，文字自动横跨整行。
:::
```

不想要画廊就裸写 `![图注](url)` —— 单图大图，自动编号图注。本地相对路径图片同样支持并会被优化，但主流程推荐 COS。

**构建自动做的**（`npm run build`）：

- 拉取 COS 图（首次慢，之后走 `node_modules/.astro` 缓存）
- 转 webp、生成多档宽度 srcset、补 width/height（消除布局抖动）
- 优化副本自动剥离 EXIF；授权域的原图 URL 不出现在页面任何地方

**访客侧**：所有图片（含点击放大）都从 Pages 加载优化副本，COS 零访客流量，仅作图片仓库。

### 6.2 网格（默认）

```markdown
:::gallery
![示例一](../assets/images/character1.jpg)

![示例二](../assets/images/character2.jpg)

![示例三](../assets/images/character3.jpg)

![示例四](../assets/images/character5.webp)
:::
```

**效果：**

:::gallery
![示例一](../assets/images/character1.jpg)

![示例二](../assets/images/character2.jpg)

![示例三](../assets/images/character3.jpg)

![示例四](../assets/images/character5.webp)
:::

### 6.3 指定列数

`{cols=2}`（支持 2–4，窄屏自动回落）。画廊里的文字段落会横跨整行，可以在照片间穿插解说：

```markdown
:::gallery{cols=2}
![左图](...)

两张图中间的一句解说。

![右图](...)
:::
```

**效果：**

:::gallery{cols=2}
![示例一](../assets/images/character1.jpg)

两张图中间的一句解说 —— 文字自动横跨整行。

![示例二](../assets/images/character2.jpg)
:::

### 6.4 瀑布流

`{.masonry}` 保留每张照片的原始比例不裁切（注意排布是列优先，与拍摄顺序不完全一致）：

:::gallery{.masonry}
![示例一](../assets/images/character1.jpg)

![示例二](../assets/images/character2.jpg)

![示例三](../assets/images/character3.jpg)
:::

### 6.5 图片存储须知

:::warning
**COS 域名要授权**：远程图片只有域名列在 `src/data/image-domains.mjs` 里才会被构建期优化（转 webp、补尺寸、生成 srcset）并隐藏原图链接；换或新增 bucket 必须同步该文件，否则该域图片会静默回退为未优化直连。

**EXIF 隐私边界**：站点上出现的全部是剥离过 EXIF 的优化副本，原图 URL 不会出现在页面上；但**原图本身仍在 COS 上公有可读**，知道 URL 就能拿到含 GPS 的元数据 —— 所以 6.1 的清洗一步不可省。
:::

## 7. 系列连载 (Series)

多篇文章组成连载（游记、专题系列）时，在 frontmatter 里声明同一个 `series` 名即可自动串联：

```yaml
---
slug: "japan-trip-1"
title: "日本游记 · 第一天"
series: "日本游记"
---
```

效果与规则：

- 同名 `series` 的文章自动归为一个系列，**篇序按发布日期升序**（连载按时间写，无需手工排序字段）
- 每篇文章的标题下方会出现系列导航卡：「连载 · 日本游记 · 第 N / M 篇」+ 全部篇目列表，当前篇高亮，其余可直接跳转
- 相关文章推荐会自动排除同系列成员（系列卡已覆盖它们）

另外：文章头部的标签贴纸可点击，会跳到博客列表页并带上对应筛选（`/blog?tag=xxx`）；列表页的筛选状态也会同步到地址栏，可以直接分享带筛选的链接。

## 8. 富内容组件

### 8.1 时间线（:::timeline）

行程、演进史用时间线排版。内容写成**无序列表**，每项以加粗开头作节点标题：

```markdown
:::timeline

- **Day 1 · 抵达** 落地后先去酒店放行李，傍晚逛了车站商圈。
- **Day 2 · 神社与拉面** 一早排队参拜，中午的拉面店排了四十分钟。
- **Day 3 · 返程** 买齐伴手礼，机场的最后一碗乌冬。

:::
```

**效果：**

:::timeline

- **Day 1 · 抵达** 落地后先去酒店放行李，傍晚逛了车站商圈。
- **Day 2 · 神社与拉面** 一早排队参拜，中午的拉面店排了四十分钟。
- **Day 3 · 返程** 买齐伴手礼，机场的最后一碗乌冬。

:::

### 8.2 链接卡片（::linkcard）

裸链接升级成带标题/描述的卡片，构建期自动抓取目标页的 og 信息（抓不到会降级为朴素卡片，不影响构建）：

```markdown
::linkcard{url="https://astro.build"}
```

**效果：**

::linkcard{url="https://astro.build"}

### 8.3 视频嵌入（::bilibili / ::youtube）

一行嵌入响应式懒加载播放器，游记配 vlog、技术文配演示都好用：

```markdown
::bilibili{id=BV1GJ411x7h7}

::bilibili{id=BV1GJ411x7h7 page=2} ← 多 P 视频指定分 P

::youtube{id=dQw4w9WgXcQ}
```

**效果：**

::bilibili{id=BV1GJ411x7h7}

### 8.4 代码块进阶（Expressive Code）

代码块支持文件名标题、行高亮、diff 标记与折叠，全部写在开头反引号之后：

````markdown
```python title="train.py" {3} ins={5} del={4} collapse={8-15}

```
````

- `title="train.py"` —— 标题栏显示文件名
- `{3}` / `{2-4}` —— 高亮指定行
- `ins={5}` / `del={4}` —— 绿色新增 / 红色删除的 diff 标记
- `collapse={8-15}` —— 折叠指定行段，点击展开
- `showLineNumbers=false` —— 关掉行号

**效果：**

```python title="train.py" {3} ins={5} del={4}
import torch

model = MyModel().cuda()          # 高亮：模型初始化
optimizer = torch.optim.SGD(model.parameters(), lr=0.1)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

for batch in loader:
    loss = model(batch).loss
    loss.backward()
```

## 9. 发布控制

- **定时发布**：frontmatter 的 `date` 写未来日期，生产构建会自动跳过该文，到期后的下一次构建才会上线（仓库配有每日零点的定时重建工作流，需在 GitHub 配置 `CF_PAGES_DEPLOY_HOOK` secret）。`npm run dev` 里始终可见，方便预览。
- **置顶**：frontmatter 加 `pinned: true`，文章在列表页置顶并带 PINNED 角标（首页「最新文章」仍按时间序）。
- **更新时间**：文章在 git 里有多次提交时，头部会自动显示「更新于」（来自最后一次提交时间）。

## 10. 总结

| 插件               | 用途                 | 场景                   |
| :----------------- | :------------------- | :--------------------- |
| `remark-gfm`       | 脚注、表格、任务列表 | 通用写作增强           |
| `rehype-citation`  | 参考文献             | 研究型、技术深究型文章 |
| `remark-directive` | Callouts、画廊       | 提示、警告、多图排版   |
| `mermaid`          | 流程图               | 架构设计、逻辑梳理     |
| `series` 字段      | 连载导航             | 游记、专题系列         |

## 11. 参考文献

[^ref]

[^1]: 这是脚注的实际渲染效果。
