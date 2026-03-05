# 大语言模型：工程化与部署

> 本文聚焦 LLM 落地过程中的核心工程挑战，涵盖模型量化、推理框架、分布式训练、长上下文扩展、评估体系与部署要点。面向需要将 LLM 从研究原型推向生产环境的工程师。

---

## 一、模型量化

量化（Quantization）通过降低模型权重和/或激活值的数值精度，换取显存占用和计算速度的提升。

### 1.1 基本原理

**对称线性量化：**

$$
x_q = \text{round}\!\left(\frac{x}{s}\right), \qquad s = \frac{\max(|x|)}{2^{b-1} - 1}
$$

其中 $s$ 为量化步长（scale），$b$ 为量化位数，$x_q$ 为量化后的整数。反量化（Dequantization）时，$\hat{x} = x_q \cdot s$，误差 $|x - \hat{x}| \leq s/2$。

**非对称量化：** 额外引入零点（zero point）$z$，用于处理分布不关于零对称的激活值：

$$
x_q = \text{round}\!\left(\frac{x}{s}\right) - z
$$

### 1.2 INT8 与 INT4 的精度/性能权衡

| 精度 | 显存相比 FP16 | 典型精度损失 | 适用场景 |
|------|-------------|------------|---------|
| FP16 / BF16 | 1× | 基准 | 训练、高精度推理 |
| INT8 | 0.5× | < 1% 困惑度上升 | 大多数生产推理场景 |
| INT4 | 0.25× | 1%–3% 困惑度上升 | 消费级硬件、吞吐优先场景 |

### 1.3 GPTQ

GPTQ 是一种**逐层（Layer-wise）训练后量化**方法，基于近似二阶信息（Optimal Brain Surgeon 框架）：

1. 逐层将权重量化为 INT4。
2. 通过 Hessian 矩阵的逆（使用 Cholesky 分解高效计算）补偿量化误差，更新同列中未量化的权重。
3. 使用少量校准数据（通常 128 条样本）即可完成，无需完整数据集。

GPTQ 可将 175B 模型在单 GPU 上于数小时内完成量化，且精度损失极小。

### 1.4 AWQ（Activation-aware Weight Quantization）

AWQ 的核心洞察：**并非所有权重都同等重要**。激活值绝对值较大的通道对应的权重更重要，量化这些权重时损失更大。

AWQ 的策略：对重要权重通道按缩放因子 $s > 1$ 放大（等效于提高其量化精度），同时对应地缩小激活值，保持矩阵乘法结果不变：

$$
W x = (W \cdot \text{diag}(s))({\text{diag}(s)}^{-1} x)
$$

AWQ 在 INT4 精度下通常优于 GPTQ，且量化速度更快。

---

## 二、推理框架

### 2.1 vLLM 与 PagedAttention

传统推理框架为每个序列预分配最大长度的 KV Cache 显存，导致严重的**内部碎片**和**外部碎片**浪费，GPU 显存利用率通常低于 40%。

**PagedAttention** 借鉴操作系统虚拟内存与分页管理的思想：

- 将 KV Cache 划分为固定大小的**物理块（Block）**（如每块存储 16 个 token 的 KV）。
- 为每个序列维护一张**块表（Block Table）**，记录逻辑块到物理块的映射。
- 动态按需分配物理块，不同序列可共享相同的提示词前缀对应的 KV 块（Prefix Caching）。

结果：vLLM 的显存利用率可达 90% 以上，吞吐量相比 HuggingFace Transformers 提升 **10–24 倍**。

### 2.2 连续批处理（Continuous Batching）

传统静态批处理（Static Batching）等待一批请求全部完成后再处理下一批，长序列请求会阻塞短请求。

连续批处理（也称 Iteration-level Scheduling）在**每个解码步骤**（而非每次请求完成后）动态插入新请求、移除已完成请求，使 GPU 始终处于满负荷状态。

### 2.3 吞吐量 vs 延迟权衡

- **延迟敏感场景**（如实时聊天）：使用小批大小，甚至 batch size = 1；优化 TTFT（首 token 延迟）。
- **吞吐优先场景**（如离线批处理）：尽可能增大批大小，将 GPU 利用率推向上限。
- 两者存在根本性张力：批大小越大，单请求的排队等待时间越长，但整体 tokens/sec 越高。

---

## 三、分布式训练

当模型或数据规模超出单 GPU 容量时，需要分布式训练策略。

### 3.1 数据并行（DDP）

**数据并行（Distributed Data Parallel）** 将相同的模型副本复制到多个 GPU，每个 GPU 处理不同的数据分片：

1. 前向传播各自独立。
2. 反向传播后，通过 All-Reduce 操作同步所有 GPU 的梯度。
3. 每个 GPU 用平均梯度更新本地参数副本。

DDP 适用于模型能放入单 GPU 的情况，扩展性极好，通信开销仅为一次 All-Reduce。

### 3.2 模型并行

**张量并行（Tensor Parallelism）：** 将单个权重矩阵按行或列切分到多个 GPU：

- 对于 $Y = XA$，将 $A$ 按列切分为 $[A_1, A_2]$，在两个 GPU 上分别计算 $XA_1$ 和 $XA_2$，最后 All-Gather 拼接结果。
- Megatron-LM 将张量并行系统化，用于训练千亿参数模型。

**流水线并行（Pipeline Parallelism）：** 将模型的不同层分配到不同 GPU，数据像流水线一样流经各级。

- 使用微批次（Micro-batching）将大批次拆分为多个小批次，使流水线各级尽量保持忙碌，降低"气泡"（Bubble）比例。
- GPipe 和 PipeDream 是两种经典的流水线调度方案，权衡内存使用和流水线效率。

### 3.3 ZeRO 优化策略

ZeRO（Zero Redundancy Optimizer）分三个阶段消除数据并行中的冗余内存占用：

| 阶段 | 分片内容 | 显存节省（N GPU） |
|------|---------|----------------|
| ZeRO-1 | 优化器状态 | 4× |
| ZeRO-2 | 优化器状态 + 梯度 | 8× |
| ZeRO-3 | 优化器状态 + 梯度 + 模型参数 | 64× |

ZeRO-3（即 DeepSpeed Stage 3）理论上可在任意多卡上训练任意大小的模型，代价是每次 forward/backward 需要额外的通信来重建分片后的参数。

---

## 四、长上下文扩展

将模型上下文窗口从 4K 扩展至 128K 乃至百万 token 是当前的核心挑战之一。

### 4.1 位置编码外推（RoPE Scaling）

RoPE（Rotary Position Embedding）将位置编码表示为旋转矩阵：

$$
\text{RoPE}(\mathbf{q}, m) = \mathbf{q} \cdot e^{im\theta_d}, \quad \theta_d = \text{base}^{-2d/D}
$$

其中 $m$ 为位置，$d$ 为维度索引，`base` 通常为 10000。

**线性内插（Position Interpolation）：** 将位置 $m$ 缩放为 $m' = m \cdot L_{\text{train}} / L_{\text{target}}$，使模型在原训练长度的范围内处理更长序列，通过少量微调恢复性能。

**YaRN（Yet another RoPE extensioN）：** 对不同频率维度应用不同的缩放因子，高频维度插值，低频维度外推，是 Mistral 和 LLaMA 3 长上下文版本采用的主流方案。

### 4.2 滑动窗口注意力（Sliding Window Attention）

不同于全局注意力（$O(n^2)$ 复杂度），滑动窗口注意力限制每个 token 只关注其局部窗口内的 $w$ 个 token：

$$
\text{Attention}(Q, K, V)_i = \text{softmax}\!\left(\frac{Q_i K^T_{\max(0, i-w):i}}{\sqrt{d_k}}\right) V_{\max(0, i-w):i}
$$

Mistral 7B 使用窗口大小 $w = 4096$，配合滚动 KV Cache，实现常数显存消耗处理任意长度序列。

### 4.3 FlashAttention

标准注意力计算的瓶颈不在 FLOP（浮点运算），而在**显存 I/O**：

$$
\text{标准注意力 HBM 访问量} = O(N^2 d + N^2) \approx O(N^2)
$$

FlashAttention 通过**分块（Tiling）**将注意力计算分解为多个小块，每块完全在 SRAM（片上高速缓存）中完成，避免中间矩阵 $S = QK^T \in \mathbb{R}^{N \times N}$ 写回 HBM（高带宽显存）：

$$
\text{FlashAttention HBM 访问量} = O(N^2 d / M) \quad (M = \text{SRAM 大小})
$$

在 $N = 4096, d = 128$ 时，FlashAttention 的 HBM 访问量约为标准注意力的 **1/5 到 1/9**，实际端到端速度提升 2–4 倍，同时内存占用从 $O(N^2)$ 降至 $O(N)$。

---

## 五、推理优化技巧

### 5.1 投机采样（Speculative Decoding）

自回归生成每步只产出一个 token，GPU 算力严重浪费（大量算力空转等待串行步骤）。投机采样的思路：

1. **草稿模型（Draft Model）**：用一个小型快速模型（如 68M 参数）一次性自回归生成 $K$ 个候选 token（如 $K = 5$）。
2. **验证（Verify）**：用目标大模型对 $K$ 个 token **并行**一次性打分。
3. **接受/拒绝**：按概率接受草稿 token，若草稿 token 被接受则直接采用，若被拒绝则从目标模型的分布中重采样。

数学上，最终生成分布等同于目标模型（无偏），但延迟降低至原来的 $1/K$（最优情况）。实践中，对于聊天任务通常可获得 **2–3 倍**的吞吐提升。

### 5.2 KV Cache 管理

KV Cache 存储每层每个 token 的 Key 和 Value 张量，避免重复计算历史 token：

- **内存占用估算：** 对于 $L$ 层、隐藏维度 $d$、序列长度 $n$ 的模型，KV Cache 大小为 $2 \times L \times n \times d \times \text{bytes}$（BF16 为 2 字节）。
- **多查询注意力（MQA）/ 分组查询注意力（GQA）：** 将多个查询头共享一组 Key/Value 头，KV Cache 体积缩小 $G$ 倍（$G$ 为分组数），LLaMA 3 和 Mistral 均采用 GQA。

---

## 六、评估体系

### 6.1 困惑度（Perplexity）

困惑度是语言模型的标准自动化评估指标：

$$
\text{PPL} = \exp\!\left(-\frac{1}{T} \sum_{t=1}^{T} \log P(x_t \mid x_{<t})\right)
$$

PPL 越低表示模型对文本的预测能力越强。常用于衡量量化、压缩带来的精度损失，但 PPL 与下游任务性能的相关性并不完美。

### 6.2 常见 Benchmark

| Benchmark | 测试能力 | 题型 | 规模 |
|-----------|---------|------|------|
| MMLU | 多领域知识（57 个学科） | 4 选 1 选择题 | 14K 题 |
| HumanEval | Python 代码正确性 | 函数实现 + 测试用例 | 164 题 |
| GSM8K | 小学数学推理 | 文字题 | 8.5K 题 |
| MATH | 竞赛级数学 | 解题过程 | 12.5K 题 |
| MT-Bench | 多轮对话能力 | GPT-4 评分 | 80 题 |

### 6.3 评估陷阱

- **数据污染（Data Contamination）：** 如果评估集出现在训练数据中，分数虚高。MMLU 的部分题目已被证实出现在多个开源模型的训练集中。
- **基准过拟合（Benchmark Overfitting）：** 专门针对某个 benchmark 调整训练数据或微调策略，分数上涨但通用能力未改善。
- **评分者偏见（Evaluator Bias）：** 使用 GPT-4 作为裁判时，它倾向于给格式优美、措辞接近 OpenAI 风格的回复打高分，而非真正最准确的回复。
- **上下文长度敏感性：** 许多 benchmark 设计于短上下文时代，无法反映模型在长文档理解上的真实能力。

---

## 七、工程部署要点

### 7.1 显存估算

模型推理的显存需求主要由三部分构成：

$$
\text{显存}_{total} \approx \underbrace{N_{\text{params}} \times b_{\text{weights}}}_{\text{模型权重}} + \underbrace{2 \times L \times n \times d \times b_{\text{kv}}}_{\text{KV Cache}} + \underbrace{\text{激活值（相对较小）}}
$$

其中 $b_{\text{weights}}$ 为权重字节数（FP16 = 2，INT8 = 1，INT4 = 0.5），$n$ 为序列长度。

**经验法则：** 70B 参数的 FP16 模型约需 **140 GB** 显存（不含 KV Cache），INT4 量化后约需 **35 GB**，即两张 A100 40GB 可运行。

### 7.2 批大小选择

- 过小的批大小导致 GPU 算术单元利用率低（Compute-bound 但 Memory-bound 不足）。
- 过大的批大小受限于显存，且增加每条请求的排队延迟。
- 使用 vLLM 等框架时，通过 `max_num_seqs` 和 `gpu_memory_utilization` 参数控制。

### 7.3 SLA 指标

生产环境中 LLM 服务的核心 SLA（服务等级协议）指标：

| 指标 | 全称 | 含义 | 典型目标 |
|------|------|------|---------|
| TTFT | Time to First Token | 从请求发出到收到第一个 token 的时间 | < 500ms（交互式） |
| TPOT | Time Per Output Token | 每个后续 token 的生成间隔 | < 50ms（流畅体验） |
| E2EL | End-to-End Latency | 完整响应的总延迟 | 取决于输出长度 |
| Throughput | 吞吐量 | 单位时间产出的 token 总数 | 最大化（离线场景） |

**TTFT 优化：** 采用更激进的 Prefill 并行（多 GPU 张量并行）；使用 Chunked Prefill 避免长 Prefill 阻塞 Decode 请求。

**TPOT 优化：** 增大 Decode 批大小；使用 GQA/MQA 减少 KV Cache 读取量；量化激活和权重降低内存带宽压力。

---

## 参考资料

- Kwon et al., 2023 — *Efficient Memory Management for Large Language Model Serving with PagedAttention* (vLLM)
- Dao et al., 2022 / 2023 — *FlashAttention* / *FlashAttention-2*
- Frantar et al., 2022 — *GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers*
- Lin et al., 2023 — *AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration*
- Leviathan et al., 2023 — *Fast Inference from Transformers via Speculative Decoding*
- Rajbhandari et al., 2020 — *ZeRO: Memory Optimizations Toward Training Trillion Parameter Models*
- Chen et al., 2023 — *Extending Context Window of Large Language Models via Positional Interpolation*
