---
slug: "test-markdown-features"
title: "Markdown Features Test"
date: 2025-05-31
description: "Testing new markdown features: Citations, directives, and mermaid."
author: "Sage"
tags: ["tech"]
featured: false
editable: false
bibliography: public/bibs/ai.bib
---

## 1. Citations

AI Papers Test:
Transformer: [@vaswani2017attention]

## 2. Directives / Callouts

:::note
This is a **note** callout.
:::

:::tip
This is a **tip** callout.
:::

:::warning
This is a **warning** callout.
:::

:::important
This is an **important** callout.
:::

:::caution
This is a **caution** callout.
:::

## 3. Mermaid

<!-- markdownlint-disable MD033 -->
<div class="mermaid">
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
</div>
<!-- markdownlint-enable MD033 -->

## 4. References

[^ref]:
