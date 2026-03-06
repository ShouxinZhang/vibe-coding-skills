# Transformer：从背景、直觉到现代 LLM 骨架

> Transformer 不是一组孤立公式，而是自然语言建模一路试错后的结果。这个子模块先讲它为什么会出现，再讲它为什么有效，最后讲它为什么在今天变成了 LLM 的默认底座。

---

## 一、这个子模块讲什么

很多人第一次接触 Transformer，直接就会撞上 $Q$、$K$、$V$、多头注意力、KV Cache 这些术语。这样当然能学，但体验通常很差，因为中间缺了三层关键背景：

1. 在它出现之前，大家到底卡在哪。
2. 它真正解决的瓶颈是什么。
3. 今天的 LLM 用的 Transformer，和 2017 年论文版已经有哪些差别。

这个子模块就是把这三层补上。

---

## 二、文件导览

| 文件 | 内容简介 |
|------|---------|
| [why_transformer.md](./why_transformer.md) | 从 RNN、CNN、Seq2Seq 到 Attention，解释 Transformer 为什么会出现 |
| [attention_intuition.md](./attention_intuition.md) | 用通俗类比讲清自注意力、QKV 和多头注意力到底在做什么 |
| [architecture.md](./architecture.md) | 逐层拆开 Transformer 的结构：输入表示、注意力、FFN、残差与归一化 |
| [decoder_only_and_inference.md](./decoder_only_and_inference.md) | 解释现代 LLM 为什么偏爱 Decoder-Only，以及因果掩码和 KV Cache 如何影响训练与推理 |
| [modern_evolution.md](./modern_evolution.md) | 对比原始论文与现代 LLM：RoPE、RMSNorm、SwiGLU、GQA、FlashAttention 等演化 |

---

## 三、历史脉络

**第一阶段：顺序模型时代。** 早期自然语言模型主要依赖 RNN、LSTM、GRU。它们的优点是天然适合处理序列，但缺点也很明显：计算必须一步一步走，长距离依赖很难稳定保住。

**第二阶段：Seq2Seq 与早期 Attention。** 研究者发现，单个固定向量装不下完整输入，于是引入 Attention，让解码器在生成时能回头看源序列。这一步非常关键，因为它第一次证明了“动态看重点”比“死记全句”更有效。

**第三阶段：Transformer 出现。** 2017 年的论文真正激进的地方，不是提出了 Attention，而是说：既然 Attention 这么重要，那干脆把循环结构整个拿掉。

**第四阶段：LLM 规模化。** 到 GPT-3、ChatGPT、LLaMA 这条线，Transformer 的价值被彻底放大。它之所以统治大模型，不只是因为效果好，更因为它非常适合大规模并行训练和持续工程优化。

---

## 四、建议阅读顺序

如果你想先把来龙去脉理顺，建议先读 [why_transformer.md](./why_transformer.md)，再读 [attention_intuition.md](./attention_intuition.md)。

如果你已经知道大概背景，只是卡在公式和模块分工上，可以直接读 [architecture.md](./architecture.md)。

如果你更关心今天大模型为什么这样训练、为什么这样推理，就接着读 [decoder_only_and_inference.md](./decoder_only_and_inference.md) 和 [modern_evolution.md](./modern_evolution.md)。

---

## 五、一个总判断

从业务结果看，Transformer 真正改变的不是某一项 benchmark，而是把语言模型从“能做一些任务的模型”，变成了“可以持续扩展的通用底座”。

它同时解决了三个问题：

1. 训练可以大规模并行。
2. 长距离信息可以更直接交互。
3. 架构足够统一，便于持续堆规模、堆数据、堆工程优化。

理解了这三点，后面再看公式，很多东西就不会显得像黑魔法。

---

*下一步：先看 [why_transformer.md](./why_transformer.md)，把 Transformer 为什么会出现讲清。*