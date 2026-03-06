# Transformer 的结构骨架

> 如果把注意力看成“模型在互相交流”，那 Transformer 整层结构更像一条装配线：先决定该看谁，再整理吸收回来的信息，最后把结果稳稳传给下一层。

---

## 一、输入是怎么进入模型的

文本不会直接进入神经网络。它首先会被切成 token，再映射成向量。

### 1. Token Embedding

设词表大小为 $|V|$，模型维度为 $d_{\text{model}}$，嵌入矩阵记作：

$$
\mathbf{E} \in \mathbb{R}^{|V| \times d_{\text{model}}}
$$

每个 token $x_t$ 会被映射为向量：

$$
\mathbf{e}_t = \mathbf{E}[x_t]
$$

这一步可以理解成：把离散符号变成模型能处理的连续表示。

### 2. 位置为什么还要单独处理

注意力本身并不天然知道顺序。对它来说，词集合如果只是换了排列，机制上很容易看成差不多的东西。

所以必须额外注入位置信息。

原始 Transformer 使用正弦位置编码；现代 LLM 更常见的是 RoPE。这部分在 [modern_evolution.md](./modern_evolution.md) 里会详细展开。

---

## 二、一层 Transformer 在做什么

一层典型 Transformer 可以拆成两个主子层：

1. 注意力子层。
2. 前馈网络子层（FFN）。

如果用现代 LLM 更常见的 Pre-LN 写法，可以粗略写成：

$$
\mathbf{a}_l = \mathbf{h}_{l-1} + \text{MHA}(\text{Norm}(\mathbf{h}_{l-1}))
$$

$$
\mathbf{h}_l = \mathbf{a}_l + \text{FFN}(\text{Norm}(\mathbf{a}_l))
$$

直觉上：

1. 先让每个位置和全局交流。
2. 再对每个位置单独做更深一步的加工。

---

## 三、注意力子层负责“交流”

对输入表示矩阵 $\mathbf{H}$，模型会线性投影出：

$$
\mathbf{Q} = \mathbf{H}\mathbf{W}^Q, \quad
\mathbf{K} = \mathbf{H}\mathbf{W}^K, \quad
\mathbf{V} = \mathbf{H}\mathbf{W}^V
$$

然后计算：

$$
\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

如果是多头注意力，就不是只做一次，而是并行做好几次，再拼回去：

$$
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h)\mathbf{W}^O
$$

业务上可以把这一层理解成：

**每个位置先向全场搜集相关信息，再把不同视角拼成新的上下文表示。**

---

## 四、FFN 负责“各自消化”

很多人第一次学 Transformer 会误以为“核心只有注意力”。其实不是。

注意力负责位置之间通信，前馈网络（FFN）负责每个位置在拿到上下文之后，如何进一步加工自己的表示。

原始形式通常写成：

$$
\text{FFN}(\mathbf{x}) = \max(0, \mathbf{x}\mathbf{W}_1 + \mathbf{b}_1)\mathbf{W}_2 + \mathbf{b}_2
$$

它本质上是一个逐位置共享参数的两层 MLP。也就是说，序列中的每个位置都走同一套变换，但彼此互不直接通信。

所以可以把 Transformer 中的分工记成一句话：

1. 注意力决定“我该参考谁”。
2. FFN 决定“我拿到这些信息后怎么消化”。

---

## 五、残差连接为什么这么重要

每个子层后面都会加残差：

$$
\mathbf{x}_{l+1} = \mathbf{x}_l + \text{SubLayer}(\mathbf{x}_l)
$$

这一步很像给深网络上保险。即便某一层一时学得不好，原始信息也不至于完全丢掉。

残差的价值主要有两点：

1. 让梯度更容易往回传。
2. 让模型可以逐层做“增量修正”，而不是每层都从头重写表示。

---

## 六、归一化为什么几乎不可缺

深层网络如果没有归一化，很容易训练不稳。Transformer 里常见的是 LayerNorm 或 RMSNorm。

原始论文更接近 Post-LN，现代 LLM 更常见的是 Pre-LN 或 RMSNorm。背后的核心诉求都一样：

**让不同层之间的数值尺度更稳定，别让训练过程忽高忽低。**

这一点看起来很工程，但对大模型成败影响非常大。

---

## 七、一层层堆起来后发生了什么

单层 Transformer 并不神奇，真正有用的是很多层叠加以后，模型开始形成分层表征：

1. 低层更偏局部模式和基础搭配。
2. 中层开始建模更复杂的句法和指代。
3. 高层更接近抽象语义和任务相关模式。

虽然这种分工并不是绝对的，但从经验上看，深层堆叠确实让模型有机会把“看见信息”和“抽象信息”分层处理。

---

## 八、一个最简总结

如果把一层 Transformer 压成一句话，它大概是在做这件事：

**先让每个 token 和全局相关位置交流，再让它自己把这些信息重新整理成更适合下一层使用的表示。**

这就是为什么它既不像传统 RNN，也不像单纯 MLP。它是一种把“全局通信”和“局部加工”硬拆开的架构。

---

*下一步：读 [decoder_only_and_inference.md](./decoder_only_and_inference.md)，看这套结构为什么在现代 LLM 里通常会落成 Decoder-Only。*