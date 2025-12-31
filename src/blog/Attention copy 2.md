---
slug: "Attention2"
title: "注意力机制解析与实现"
description: "注意力机制解析与实现"
date: 2025-11-31
author: "Sage"
tags: ["AI", "LLM", "Attention"]
featured: true
editable: true
---

![Attention Mind Map](https://sa1geblogimage-1316665129.cos.ap-beijing.myqcloud.com/img/Attention-Mind-Map.png)

## 为什么需要注意力机制

传统的 Seq2Seq 模型(此处以 RNN 的 Encoder - Decoder 模型为例)，会将输入序列压缩为一个定长的向量，解码器再从这个向量生成输出序列。但是定长的向量难以有效编码所有必要的信息，那么就成为了处理长句子的瓶颈。

## 注意力机制的具体运作

注意力机制将输入编码成一个向量序列(annotations)。在生成输出序列的每个词的时候，模型会软搜索输入序列中的相关位置，根据这些相关的上下文向量和之前已经生成的目标词来预测下一个目标词。

## 缩放点积注意力(SDPA)

$$
Atten(Q,K,V)=softmax\left( \frac{QK^T}{\sqrt{ d_{k} }} \right)V \tag{1}
$$

- 注意力机制的核心在于计算一个上下文向量$(Atten(Q,K,V))$，这个向量是输入序列的加权和，权重反应了输入序列中每个部分对于生成序列当前输出词的重要性。
- 在Scaled Dot-Product Attention 中，首先计算 query 和 key 的关联性，然后将这个关联性作为value 的权重，各个权重与 value 的乘积相加得到输出。(公式 1)
- $\sqrt{ d_{k} }$作用是缩放注意力分数。因为当$d_{k}$很大的时候，点积$QK^T$的结果会很大，导致 Softmax 产生极度不均匀的分布，梯度会变得很小。

```py title="ScaledDotProductAttention.py" 
import torch
import torch.nn as nn

class ScaledDotProductAttention(nn.Module):
    def __init__(self):
        super(ScaledDotProductAttention, self).__init__()

    def forward(self, query, key, value, causal_mask=None,padding_mask=None):
        """
        Single-head Scaled Dot-Product Attention
        Args:
            query: Query tensor of shape (batch_size, seq_len_q, d_k)
            key: Key tensor of shape (batch_size, seq_len_k, d_k)
            value: Value tensor of shape (batch_size, seq_len_v, d_v)
            causal_mask: Optional causal mask tensor of shape (batch_size, seq_len_q, seq_len_k)
            padding_mask: Optional padding mask tensor of shape (batch_size, seq_len_q, seq_len_k)
            1. Causal mask is used to prevent attending to future tokens in the sequence.
            2. Padding mask is used to ignore padding tokens in the sequence.
            3. Both masks are optional and can be None.
        Returns:
            attention_output: Attention weighted output tensor of shape (batch_size, seq_len_q, d_v)
        """
        d_k = query.size(-1) # Hidden size of the key/query
        attention_scores = torch.matmul(query,key.transpose(-1,-2)) / torch.sqrt(torch.tensor(d_k,dtype=torch.float32))
        if causal_mask is not None:
            attention_scores = attention_scores.masked_fill(causal_mask == 0, float('-inf'))
        if padding_mask is not None:
            attention_scores = attention_scores.masked_fill(padding_mask == 0, float('-inf'))

        attention_weights = torch.softmax(attention_scores, dim=-1)
        attention_output = torch.matmul(attention_weights, value)

        return attention_output


def test():
    batch_size = 8
    seq_len = 16
    hidden_size = 64

    query = torch.randn(batch_size,seq_len,hidden_size)
    key = torch.randn(batch_size,seq_len,hidden_size)
    value = torch.randn(batch_size,seq_len,hidden_size)
    sdpa = ScaledDotProductAttention()
    output = sdpa(query, key, value)

    print("Query shape:", query.shape)
    print("Key shape:", key.shape)
    print("Value shape:", value.shape)
    print("Output shape:", output.shape)

if __name__ == "__main__":
    test()
```


## 多头注意力

Transformer 是完全基于注意力机制的新架构，放弃了循环和卷积，使用多头注意力(Multi-Head Attention)(MHA)。

MHA 的基本思想是并行地执行多次注意力函数(SDPA)。

- 好处是允许模型在不同的表示子空间中共同关注来自不同位置的信息
- 只是用一个注意力头，简单地平均注意力会导致这种能力受到抑制

具体步骤：

1. 线性投影：对于输入的 Q,K,V，MHA 使用不同的、可学习的线性投影投影 h 次到 $d_{k},d_{k},d_{v}$ 维。
2. 并行注意力：对于这 h 组投影后的 Q,K,V，并行地执行注意力函数(SDPA)。Transformer模型中通常会将每个头的维度$d_{k}$和$d_{v}$设置为模型维度$d_{model}$除以头的数量 h$d_{k}=d_{v}=\frac{d_{model}}{k}$
3. 拼接和最终投影：将 h 个并行注意力函数的输出($d_{v}$维)拼接起来，形成一个维度为$h \times d_{v}$ 的向量。最后通过，另一个学习到的线性投影矩阵$W_{O}$将这个拼接后的向量投影到最终的输出维度$d_{model}$


$$
\begin{aligned}
&MultiHead(Q,K,V)=Concat(head_{1},\dots,head_{h})W^O \\
&where \ head_{i}=Attention(QW_{i}^Q,KW_{i}^K,VW_{i}^V)
\tag{2}
\end{aligned}
$$

其中，线性投影都是参数矩阵.$W_{i}^Q \in \mathbb{R}^{d_{model} \times d_{k}},W_{i}^Q \in \mathbb{R}^{d_{model} \times d_{k}},W_{i}^V \in \mathbb{R}^{d_{model} \times d_{v}},W_{i}^O \in \mathbb{R}^{d_{model} \times hd_{v}}$

## Reference

[1][Hwcoder 的 手撕经典算法 #1 Attention篇](https://hwcoder.top/Manual-Coding-1)
