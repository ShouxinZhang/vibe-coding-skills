# Transformer 架构深度解析

> 本文是 LLM 系列笔记的架构核心篇，详解支撑现代 LLM 的 Transformer 机制。
> 系列入口见 [introduction.md](introduction.md)。

---

## 1. 设计动机：为什么放弃 RNN

在 Transformer 提出之前（Vaswani et al., 2017），序列建模的主流是**循环神经网络（RNN/LSTM/GRU）**。RNN 的根本缺陷在于其**顺序计算**特性：

- **无法并行化**：$h_t$ 依赖 $h_{t-1}$，整条序列必须串行计算，GPU 的大规模并行能力被白白浪费。
- **长距离依赖退化**：梯度在反向传播时跨越长距离会指数级衰减（梯度消失）或爆炸，尽管 LSTM 通过门控机制有所缓解，但对于数千 token 的长序列依然力不从心。
- **信息瓶颈**：Encoder-Decoder 框架中，整个输入序列被压缩为单一的固定维度向量，信息损失严重（注意力机制是对此的第一次修补，但未从根本解决问题）。

Transformer 的核心洞察是：**用注意力机制完全替代循环结构**，使任意两个位置之间的信息交互只需 $O(1)$ 步，同时允许全序列并行计算。

---

## 2. 输入表示

### 2.1 Token Embedding

输入文本首先经过分词器（Tokenizer）切分为词元序列 $[x_1, x_2, \ldots, x_n]$，再通过嵌入矩阵 $\mathbf{E} \in \mathbb{R}^{|V| \times d_{\text{model}}}$ 映射为稠密向量：

$$
\mathbf{e}_t = \mathbf{E}[x_t] \in \mathbb{R}^{d_{\text{model}}}
$$

### 2.2 正弦位置编码（Sinusoidal Positional Encoding）

注意力机制本身对输入顺序**排列不变**（Permutation Invariant），因此必须显式注入位置信息。原始 Transformer 使用固定的正弦/余弦函数：

$$
PE_{(pos, 2i)} = \sin\!\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right)
$$

$$
PE_{(pos, 2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right)
$$

其中 $pos$ 为位置索引，$i$ 为维度索引，$d_{\text{model}}$ 为模型维度。最终输入为：

$$
\mathbf{h}_t^{(0)} = \mathbf{e}_t + PE_t
$$

正弦编码的优雅之处在于它能够通过线性变换表达**相对位置偏移**，且可以外推到训练时未见过的序列长度。

### 2.3 旋转位置编码（RoPE）

现代 LLM（LLaMA、GPT-NeoX 等）普遍使用 Su et al.（2023）提出的 **RoPE（Rotary Position Embedding）**。RoPE 不在嵌入层添加位置向量，而是在计算注意力时，将 Query 和 Key 向量按位置角度旋转：

$$
f_q(\mathbf{x}_m, m) = \mathbf{x}_m e^{im\theta}
$$

RoPE 的核心性质是：两个位置 $m$ 和 $n$ 的 Query/Key 内积只依赖**相对位置差** $m - n$，而非绝对位置，这使得模型具备更好的长度外推能力。

---

## 3. 自注意力机制（Self-Attention）

### 3.1 QKV 抽象

自注意力的核心思想是：对序列中每个位置，计算它与所有其他位置的**相关性权重**，再对全序列做加权求和。

对每个位置的表示 $\mathbf{h}_t$，通过三个独立的线性变换投影为 Query、Key、Value：

$$
\mathbf{Q} = \mathbf{H}\mathbf{W}^Q, \quad \mathbf{K} = \mathbf{H}\mathbf{W}^K, \quad \mathbf{V} = \mathbf{H}\mathbf{W}^V
$$

其中 $\mathbf{H} \in \mathbb{R}^{n \times d_{\text{model}}}$ 为序列表示矩阵，$\mathbf{W}^Q, \mathbf{W}^K \in \mathbb{R}^{d_{\text{model}} \times d_k}$，$\mathbf{W}^V \in \mathbb{R}^{d_{\text{model}} \times d_v}$。

直觉上：**Query 是"我在找什么"，Key 是"我能提供什么索引"，Value 是"我实际携带的信息"**。

### 3.2 缩放点积注意力

完整的注意力公式为：

$$
\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right) V
$$

**缩放因子** $1/\sqrt{d_k}$ 至关重要：当 $d_k$ 较大时，$QK^T$ 的点积方差为 $d_k$（假设 $Q$、$K$ 各分量独立同分布），若不缩放，softmax 的输入落入饱和区（梯度极小），导致训练困难。

### 3.3 计算复杂度分析

对长度为 $n$ 的序列，注意力矩阵 $QK^T \in \mathbb{R}^{n \times n}$ 的计算复杂度为 $O(n^2 d_k)$，空间复杂度为 $O(n^2)$。这是注意力机制的核心瓶颈，也是 Flash Attention、稀疏注意力、线性注意力等高效变体被大量提出的根本原因。

---

## 4. 多头注意力（Multi-Head Attention）

单头注意力在每个位置只能捕捉一种相关性模式。多头注意力通过并行运行 $h$ 个独立的注意力头，让模型同时关注来自不同子空间的信息：

$$
\text{head}_i = \text{Attention}(Q\mathbf{W}_i^Q, K\mathbf{W}_i^K, V\mathbf{W}_i^V)
$$

$$
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h)\,\mathbf{W}^O
$$

其中 $\mathbf{W}^O \in \mathbb{R}^{hd_v \times d_{\text{model}}}$ 为输出投影矩阵。每个头的维度为 $d_k = d_v = d_{\text{model}}/h$，从而总计算量与单头相当，但表达能力大幅提升。

实践上，不同的注意力头确实学习到不同的语言模式：有的关注句法依存，有的关注指代关系，有的关注局部搭配。

---

## 5. 前馈网络（FFN）

每个 Transformer 层在注意力子层之后还有一个**逐位置前馈网络（Position-wise FFN）**，对序列中每个位置独立应用相同的两层 MLP：

$$
\text{FFN}(\mathbf{x}) = \max(0, \mathbf{x}\mathbf{W}_1 + \mathbf{b}_1)\,\mathbf{W}_2 + \mathbf{b}_2
$$

原始 Transformer 使用 ReLU 激活，中间维度通常为 $4d_{\text{model}}$。现代 LLM 普遍采用 **SwiGLU**（Shazeer, 2020）：

$$
\text{SwiGLU}(\mathbf{x}, \mathbf{W}, \mathbf{V}, \mathbf{b}, \mathbf{c}) = \text{Swish}(\mathbf{x}\mathbf{W} + \mathbf{b}) \odot (\mathbf{x}\mathbf{V} + \mathbf{c})
$$

其中 $\text{Swish}(x) = x \cdot \sigma(x)$，$\odot$ 为逐元素乘法。SwiGLU 使用门控机制动态调节信息流，实验上一致优于 ReLU 和 GELU。

FFN 层被认为是 Transformer 中存储**事实知识**的主要场所（Geva et al., 2021），其参数量通常占模型总参数量的约 2/3。

---

## 6. 残差连接与层归一化

### 6.1 残差连接

每个子层（注意力或 FFN）都配有残差连接，确保梯度能够直接流向浅层：

$$
\mathbf{x}_{l+1} = \text{SubLayer}(\mathbf{x}_l) + \mathbf{x}_l
$$

### 6.2 Post-LN vs Pre-LN

原始 Transformer 采用 **Post-LN**（层归一化在残差之后）：

$$
\mathbf{x}_{l+1} = \text{LayerNorm}(\text{SubLayer}(\mathbf{x}_l) + \mathbf{x}_l)
$$

然而 Post-LN 训练不稳定，深层网络需要精细的学习率预热。现代 LLM 几乎全部采用 **Pre-LN**（层归一化在子层之前）：

$$
\mathbf{x}_{l+1} = \text{SubLayer}(\text{LayerNorm}(\mathbf{x}_l)) + \mathbf{x}_l
$$

Pre-LN 更稳定，梯度范数随深度保持相对均匀，但理论上无法保证模型最终收敛到与 Post-LN 相同的精度上界。

此外，现代 LLM 还常用 **RMSNorm** 替代 LayerNorm，去掉均值归一化步骤，仅保留均方根缩放，计算更高效：

$$
\text{RMSNorm}(\mathbf{x}) = \frac{\mathbf{x}}{\sqrt{\frac{1}{d}\sum_{i=1}^d x_i^2 + \epsilon}} \cdot \mathbf{g}
$$

---

## 7. Encoder-Decoder vs Decoder-Only

| 架构 | 代表模型 | 注意力类型 | 适用场景 |
|------|----------|-----------|---------|
| Encoder-Decoder | T5、BART、mT5 | Encoder: 双向；Decoder: 因果 | 翻译、摘要（有明确输入/输出边界） |
| Encoder-Only | BERT、RoBERTa | 双向 | 分类、NER、句子嵌入 |
| **Decoder-Only** | **GPT 系列、LLaMA、Claude** | **因果（单向）** | **生成、对话、通用任务** |

**为什么现代 LLM 倾向 Decoder-Only？**

1. **预训练与推理统一**：自回归语言模型的训练目标（预测下一个 token）与推理时的生成行为完全一致，无需引入特殊的训练信号切换。
2. **任务格式统一**：任何 NLP 任务都可以表述为"给定提示，续写文本"，无需针对每个任务设计特定的输出头。
3. **扩展性更好**：GPT-3 等工作表明 Decoder-Only 架构的规模化收益非常显著。
4. **工程简洁**：单一的 KV Cache 管理，无需维护 Encoder 和 Decoder 两套状态。

---

## 8. 因果掩码（Causal Mask）

Decoder-Only 架构的自回归生成需要保证：预测位置 $t$ 时，模型**只能看到** $t$ 之前的 token，不能"偷看"未来。

这通过在注意力计算中引入**因果掩码**（上三角掩码）实现：

$$
M_{ij} = \begin{cases} 0 & \text{if } i \geq j \\ -\infty & \text{if } i < j \end{cases}
$$

掩码后的注意力分数为：

$$
\text{MaskedAttention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T + M}{\sqrt{d_k}}\right) V
$$

将未来位置的注意力分数置为 $-\infty$，经过 softmax 后权重变为 0，实际上将未来信息完全屏蔽。

在**训练阶段**，因果掩码允许对整个序列的所有位置**并行计算**损失（每个位置预测下一个词），极大提升了训练效率。

---

## 9. KV Cache：推理加速的核心技术

### 9.1 问题起源

自回归解码时，模型每次生成一个新 token $x_t$，就需要重新计算注意力。若每步都重新计算所有历史 token 的 Key 和 Value，复杂度为 $O(n^2)$（生成 $n$ token 的总计算量）。

### 9.2 KV Cache 原理

观察到关键事实：对于已生成的 prefix $[x_1, \ldots, x_{t-1}]$，其每一层的 Key 和 Value 矩阵**完全不变**（因为在新 token 写入之前它们的上下文没有变化）。

因此，可以**缓存**每一层的 $\mathbf{K}_{1:t-1}$ 和 $\mathbf{V}_{1:t-1}$，在生成第 $t$ 个 token 时，只需计算新 token 的 $q_t, k_t, v_t$，然后将 $k_t, v_t$ 追加到缓存，计算：

$$
\text{Attention}(q_t, \mathbf{K}_{1:t}, \mathbf{V}_{1:t}) = \text{softmax}\!\left(\frac{q_t \mathbf{K}_{1:t}^T}{\sqrt{d_k}}\right) \mathbf{V}_{1:t}
$$

单步计算量从 $O(t^2 d_k)$ 降至 $O(t d_k)$，生成 $n$ token 的总计算量从 $O(n^3)$ 降至 $O(n^2)$，对实际推理速度有质的提升。

### 9.3 KV Cache 的代价

KV Cache 以**显存**换**计算**。对于序列长度 $n$、层数 $L$、头数 $h$、每头维度 $d_k$ 的模型，KV Cache 占用显存为：

$$
\text{Memory}_{\text{KV}} = 2 \times L \times h \times d_k \times n \times \text{sizeof(dtype)}
$$

例如，LLaMA-2-70B（$L=80$，$d_{\text{model}}=8192$，$h=64$）在 FP16 下，序列长度为 4096 时，KV Cache 约占 **80GB**，与模型权重相当。这是 LLM 推理的主要显存瓶颈。

缓解策略：
- **多查询注意力（Multi-Query Attention, MQA）**：所有 Query 头共享一组 K/V，显存减少 $h$ 倍。
- **分组查询注意力（Grouped-Query Attention, GQA）**：MQA 与 MHA 的折中，LLaMA-2 70B 采用此方案。
- **PagedAttention（vLLM）**：借鉴操作系统虚拟内存机制，将 KV Cache 分页管理，支持高并发服务。

---

## 10. 架构全景总结

一个完整的 Decoder-Only Transformer Layer $l$ 的计算流程如下：

$$
\mathbf{a}_l = \mathbf{h}_{l-1} + \text{MaskedMHA}(\text{RMSNorm}(\mathbf{h}_{l-1}))
$$

$$
\mathbf{h}_l = \mathbf{a}_l + \text{FFN}(\text{RMSNorm}(\mathbf{a}_l))
$$

叠加 $L$ 层后，最后一个 token 的隐状态经过输出投影（与 Embedding 矩阵转置共享权重），通过 softmax 得到词表上的概率分布，采样得到下一个 token。

正是这一简洁而强大的结构，通过数百层的堆叠和数万亿参数的规模，成就了现代 LLM 的核心能力。

---

*下一步：深入了解预训练与微调范式，请参阅 [pretraining_finetuning.md](pretraining_finetuning.md)。*
