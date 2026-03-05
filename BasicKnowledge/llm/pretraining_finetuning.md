# 大语言模型：预训练与微调

> 本文系统梳理大语言模型（LLM）从"学会语言"到"学会指令"的完整链路，涵盖预训练目标、数据工程、分词算法、以及各类微调范式。读者定位为具备基础深度学习知识的工程师或研究者。

---

## 一、预训练范式：自监督学习

预训练的核心思想是**自监督学习**（Self-Supervised Learning）：从海量无标注文本中构造监督信号，让模型在预测"正确答案"的过程中学习语言的统计规律和世界知识。

### 1.1 自回归语言模型（CLM）：GPT 风格

自回归模型（Causal Language Model，CLM）的目标是最大化文本序列的联合概率，通过链式法则分解为逐词预测：

$$
\mathcal{L}_{\text{CLM}} = -\sum_{t=1}^{T} \log P(x_t \mid x_1, x_2, \ldots, x_{t-1}; \theta)
$$

其中 $\theta$ 为模型参数，$x_t$ 为第 $t$ 个 token。模型只能看到**左侧上下文**（单向注意力掩码），天然适合文本生成任务。GPT 系列、LLaMA、Mistral 均采用此目标。

### 1.2 掩码语言模型（MLM）：BERT 风格

掩码语言模型（Masked Language Model，MLM）随机遮盖输入中 15% 的 token，让模型根据**双向上下文**预测被遮盖的词：

$$
\mathcal{L}_{\text{MLM}} = -\sum_{i \in \mathcal{M}} \log P(x_i \mid x_{\setminus \mathcal{M}}; \theta)
$$

其中 $\mathcal{M}$ 为被掩码的位置集合，$x_{\setminus \mathcal{M}}$ 为未被掩码的其余 token。双向编码器使其在理解任务（分类、NER、问答）上表现优异，但无法直接用于生成。

### 1.3 两种范式的对比

| 维度 | CLM（自回归） | MLM（掩码） |
|------|--------------|------------|
| 注意力方向 | 单向（因果掩码） | 双向 |
| 核心优势 | 生成、补全、推理 | 理解、分类、抽取 |
| 代表模型 | GPT、LLaMA、Qwen | BERT、RoBERTa、DeBERTa |
| 训练效率 | 每个 token 都参与损失 | 仅 15% 被掩码位置参与损失 |

---

## 二、预训练数据工程

模型能力的上限很大程度上由数据决定。"Garbage in, garbage out"在 LLM 领域被放大了几个数量级。

### 2.1 数据来源

- **Common Crawl**：最大规模网页语料，原始体积达 PB 级，但质量参差不齐，需大量清洗。
- **GitHub**：代码数据，显著提升模型推理和结构化输出能力（The Pile、StarCoder 等均大量使用）。
- **书籍（Books3、Pile-Books）**：长篇叙事文本，有助于长距离依赖建模和连贯性。
- **Wikipedia / Wikidata**：高质量的百科知识，事实密度高。
- **arXiv**：科学论文，提升数学和专业推理能力。
- **Stack Exchange、Reddit**：问答对形式的对话数据，天然含有指令跟随的雏形。

### 2.2 数据清洗与去重

- **语言过滤**：基于字符级 n-gram 分类器（如 fastText）过滤非目标语言文本。
- **质量过滤**：困惑度过滤（用小型语言模型对文本打分，去除熵过高或过低的文本）；关键词黑名单过滤有害内容。
- **去重（Deduplication）**：精确去重（哈希）和模糊去重（MinHash LSH）。研究表明，数据集中存在大量重复会导致模型过拟合特定文本片段，显著损害泛化能力。
- **PII 处理**：移除个人身份信息（电话、邮箱、社会安全号码等），降低隐私风险。

### 2.3 数据混合比例

不同来源数据的比例对最终模型能力有决定性影响。Llama 2 的技术报告指出，代码数据的比例直接影响数学推理能力；过多低质量网页数据则会"稀释"高质量知识。常见做法是对书籍、代码、Wikipedia 等高质量来源进行**上采样**（Upsampling）。

---

## 三、分词（Tokenization）

分词是 LLM 的第一道关卡，它决定了模型"看到"的是什么粒度的单元。

### 3.1 BPE（Byte Pair Encoding）算法

BPE 是目前最主流的子词分词算法，核心思路是迭代合并语料库中频率最高的相邻字节对：

**算法流程：**
1. 初始化词表为所有单字符（或字节）。
2. 统计语料中所有相邻符号对的频次。
3. 合并频次最高的符号对，将其加入词表作为新符号。
4. 重复步骤 2-3，直到词表大小达到预设的 $|V|$。

例如，语料中 `low`、`lower`、`newest` 频繁出现，BPE 会逐步将 `l+o`→`lo`，`lo+w`→`low` 合并为单一 token。

### 3.2 Byte-level BPE

标准 BPE 基于字符，遇到词表外的 Unicode 字符会产生 `[UNK]` token。**Byte-level BPE**（GPT-2 首创）将所有文本先转为原始字节（256 个可能值），再在字节序列上运行 BPE，从根本上消除 OOV（Out-of-Vocabulary）问题，对多语言文本尤为重要。

### 3.3 词表大小的影响

词表大小 $|V|$ 是一个关键超参数：

| 词表过小 | 词表过大 |
|---------|---------|
| 单词被切分为过多 token，序列变长，计算开销增加 | Embedding 层参数量膨胀，稀有 token 训练不足 |
| 数字和代码处理效率低 | 跨语言知识迁移困难 |

主流模型词表大小通常在 32K（LLaMA 1）到 128K（Qwen2、LLaMA 3）之间。

---

## 四、全量微调（Full Fine-tuning）

全量微调即在预训练模型的**所有参数**上继续进行梯度更新，使其适配特定下游任务。

**适用场景：**
- 目标领域与预训练数据分布差异较大（如医疗、法律专业术语）。
- 计算资源充裕，拥有大规模高质量标注数据。
- 对模型推理速度有极致要求（无需 PEFT 的额外延迟）。

**灾难性遗忘（Catastrophic Forgetting）：**

全量微调的主要风险是模型在学习新任务后遗忘预训练习得的通用能力。缓解策略包括：
- 使用较小学习率（如 $1 \times 10^{-5}$）。
- 混入少量通用域数据（Replay Buffer）。
- 使用 Elastic Weight Consolidation（EWC）限制重要参数的偏移幅度：

$$
\mathcal{L}_{\text{EWC}} = \mathcal{L}_{\text{task}} + \frac{\lambda}{2} \sum_i F_i (\theta_i - \theta_i^*)^2
$$

其中 $F_i$ 为 Fisher 信息矩阵的对角元素，衡量参数 $\theta_i$ 对旧任务的重要性。

---

## 五、参数高效微调（PEFT）

PEFT 方法仅更新少量参数，大幅降低计算和存储开销，同时保留预训练模型的通用能力。

### 5.1 LoRA（Low-Rank Adaptation）

**核心思想：** 预训练模型的权重矩阵更新量 $\Delta W$ 本质上是低秩的。因此，不直接训练 $\Delta W \in \mathbb{R}^{d \times k}$，而是将其分解为两个低秩矩阵之积：

$$
\Delta W = BA, \quad B \in \mathbb{R}^{d \times r},\; A \in \mathbb{R}^{r \times k},\; r \ll \min(d, k)
$$

前向传播时：

$$
h = W_0 x + \Delta W x = W_0 x + B A x
$$

训练时 $W_0$ 冻结，只有 $A$ 和 $B$ 参与梯度更新。参数量从 $d \times k$ 降至 $r(d + k)$，当 $r = 8$，$d = k = 4096$ 时，参数量约减少 **256 倍**。

**秩 $r$ 的选择：**
- $r$ 越大，表达能力越强，但接近全量微调。
- 任务越简单，$r$ 可以越小（$r = 4$ 或 $r = 8$ 通常已足够指令跟随）。
- 域适配等复杂任务可能需要 $r = 64$ 甚至更高。

**应用位置：** 通常施加在 Transformer 的注意力层权重矩阵（$W_Q, W_K, W_V, W_O$）上，有时也包含 FFN 层。

### 5.2 QLoRA

QLoRA（Quantized LoRA）将量化与 LoRA 结合：**将预训练模型量化为 4-bit NF4（NormalFloat4）格式**以极大压缩显存占用，同时在量化基础上叠加 LoRA 适配层（保持 BFloat16 精度），实现在消费级显卡（如单张 A100 40GB 甚至 RTX 3090）上微调 65B 参数模型。

关键技术点：
- **NF4 量化**：基于正态分布设计的 4-bit 数据类型，比线性量化保留更多信息。
- **双重量化（Double Quantization）**：对量化常数本身再进行量化，进一步节省显存。
- **分页优化器（Paged Optimizer）**：使用 NVIDIA 的统一内存机制，在 GPU OOM 时自动将优化器状态换页到 CPU 内存。

### 5.3 Prefix Tuning 与 Prompt Tuning

| 方法 | 核心思路 | 参数位置 | 特点 |
|------|---------|---------|------|
| Prefix Tuning | 在每个 Transformer 层的 Key/Value 前拼接可训练向量 | 所有层的 KV | 灵活性强，但多层注入实现复杂 |
| Prompt Tuning | 仅在输入 Embedding 层前拼接可训练 soft prompt | 仅输入层 | 极简，模型越大效果越接近全量微调 |

两者均不修改原始模型权重，切换任务只需替换 prefix/prompt 向量，推理时的额外开销主要来自略微增长的序列长度。

---

## 六、指令微调（Instruction Tuning）

指令微调通过在（指令, 输出）对上进行有监督训练，激活模型"听懂人话"的能力。

**数据格式：** 每条样本由 system prompt、用户指令、以及期望的模型回复组成。

**Chat Template 示例（Llama 3 格式）：**
```
<|begin_of_text|>
<|start_header_id|>system<|end_header_id|>
You are a helpful assistant.<|eot_id|>
<|start_header_id|>user<|end_header_id|>
请解释什么是反向传播。<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
反向传播是...
```

**数据质量 > 数据数量：** LIMA（2023）证明仅用 1000 条精心筛选的数据即可达到接近 GPT-4 的指令跟随能力，而低质量的大规模数据反而会损害模型。

---

## 七、RLHF（人类反馈强化学习）

RLHF 是将人类偏好注入模型的核心技术，ChatGPT 的成功使其广为人知。

### 7.1 三阶段流程

**阶段 1：监督微调（SFT）**

对预训练模型进行指令微调，得到一个能够合理回复指令的基础模型 $\pi_{\text{SFT}}$。

**阶段 2：训练奖励模型（Reward Model）**

收集人类对模型输出的偏好数据：给定同一个问题的两个回复 $y_w$（更好）和 $y_l$（更差），训练奖励模型最大化：

$$
\mathcal{L}_{\text{RM}} = -\mathbb{E}_{(x, y_w, y_l)} \left[ \log \sigma \left( r_\phi(x, y_w) - r_\phi(x, y_l) \right) \right]
$$

**阶段 3：PPO 强化学习优化**

使用 PPO（Proximal Policy Optimization）最大化奖励，同时通过 KL 散度惩罚约束模型偏离 SFT 策略的程度：

$$
\mathcal{L}_{\text{RLHF}} = \mathbb{E}_{x \sim \mathcal{D},\, y \sim \pi_\theta(y|x)} \left[ r_\phi(x, y) - \beta \log \frac{\pi_\theta(y \mid x)}{\pi_{\text{SFT}}(y \mid x)} \right]
$$

其中 $\beta$ 控制 KL 惩罚强度，防止模型为了欺骗奖励模型而输出离奇但高分的内容（奖励黑客，Reward Hacking）。

### 7.2 DPO（Direct Preference Optimization）

PPO 实现复杂，需要同时维护 4 个模型（策略、参考策略、奖励、价值函数），工程负担繁重。DPO 证明可以通过**直接对偏好数据做分类训练**来隐式优化强化学习目标：

$$
\mathcal{L}_{\text{DPO}} = -\mathbb{E}_{(x, y_w, y_l)} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]
$$

DPO 无需独立的奖励模型，训练稳定性更强，目前已成为开源社区最常用的偏好对齐方法（Zephyr、TuluV2、Qwen 系列均有使用）。

---

## 参考资料

- Brown et al., 2020 — *Language Models are Few-Shot Learners* (GPT-3)
- Devlin et al., 2019 — *BERT: Pre-training of Deep Bidirectional Transformers*
- Hu et al., 2022 — *LoRA: Low-Rank Adaptation of Large Language Models*
- Dettmers et al., 2023 — *QLoRA: Efficient Finetuning of Quantized LLMs*
- Ouyang et al., 2022 — *Training language models to follow instructions with human feedback* (InstructGPT)
- Rafailov et al., 2023 — *Direct Preference Optimization: Your Language Model is Secretly a Reward Model*
