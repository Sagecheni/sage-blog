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
| 功能 | 状态 | 备注 |
| :--- | :---: | ---: |
| GFM | ✅ | 基础支持 |
| Citations | ✅ | 学术必备 |
```

**效果：**

| 功能 | 状态 | 备注 |
| :--- | :---: | ---: |
| GFM | ✅ | 基础支持 |
| Citations | ✅ | 学术必备 |
| Callouts | ✅ | 样式增强 |

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

---

## 4. 流程与架构图 (Mermaid)

使用 Mermaid 语法绘制流程图、时序图、甘特图等。（需配合 `div` 容器或代码块使用，具体视配置而定，以下为通用示例）。

**语法：**

```html
<div class="mermaid">
graph TD;
    A[开始] --> B{判断};
    B -- 是 --> C[执行操作];
    B -- 否 --> D[结束];
    C --> D;
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



## 5. 总结

| 插件 | 用途 | 场景 |
| :--- | :--- | :--- |
| `remark-gfm` | 脚注、表格、任务列表 | 通用写作增强 |
| `rehype-citation` | 参考文献 | 研究型、技术深究型文章 |
| `remark-directive`| Callouts | 提示、警告、旁注 |
| `mermaid` | 流程图 | 架构设计、逻辑梳理 |

## 6.参考文献

[^ref]


[^1]: 这是脚注的实际渲染效果。


