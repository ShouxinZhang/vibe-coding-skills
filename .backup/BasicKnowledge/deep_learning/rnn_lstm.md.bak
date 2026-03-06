# 循环神经网络：RNN、LSTM 与 Seq2Seq

## 1. 为什么需要序列建模？

现实世界中大量信息以**序列**形式存在：自然语言、语音信号、股价时间序列、视频帧流。传统前馈神经网络（Feedforward NN）假设输入样本彼此独立，无法捕捉样本内部或样本之间的时序依赖关系。

序列建模的核心挑战在于：

- **输入长度可变**：一段文本可能有 5 个词，也可能有 500 个词。
- **位置依赖**："猫追狗"与"狗追猫"语义截然不同，词序不可忽略。
- **长程依赖**：句子开头的主语往往决定句尾动词的形式（主谓一致），距离可能跨越数十步。

递归神经网络（Recurrent Neural Network，**RNN**）通过引入**隐状态**（hidden state）$h_t$，将历史信息压缩为固定维度的向量并传递给下一步，从而在原理上解决了上述问题。

---

## 2. RNN 基础

### 2.1 展开图与前向传播

将 RNN 沿时间轴"展开"，可以看到一条链式结构：每个时间步 $t$ 接收当前输入 $x_t$ 与上一步隐状态 $h_{t-1}$，计算新的隐状态 $h_t$，再输出 $y_t$。

$$
h_t = \tanh(W_h h_{t-1} + W_x x_t + b_h)
$$

$$
y_t = W_y h_t + b_y
$$

其中：
- $x_t \in \mathbb{R}^{d_x}$：第 $t$ 步的输入向量
- $h_t \in \mathbb{R}^{d_h}$：隐状态，充当"记忆"
- $W_h \in \mathbb{R}^{d_h \times d_h}$：隐状态到隐状态的权重矩阵
- $W_x \in \mathbb{R}^{d_h \times d_x}$：输入到隐状态的权重矩阵
- $\tanh$：使隐状态值域限制在 $(-1, 1)$，起到归一化作用

**关键性质**：$W_h$、$W_x$、$b_h$ 在所有时间步**共享**，这使得模型参数规模与序列长度无关。

### 2.2 三种任务模式

| 模式 | 输入→输出 | 典型任务 |
|------|-----------|----------|
| 一对多 | 单图像 → 文字描述 | 图像描述生成 |
| 多对一 | 句子 → 情感标签 | 情感分类 |
| 多对多 | 单词序列 → 标签序列 | 命名实体识别 |

---

## 3. BPTT：时间反向传播与梯度问题

### 3.1 BPTT 原理

训练 RNN 使用**时间反向传播**（Backpropagation Through Time，**BPTT**）。设序列长度为 $T$，损失 $\mathcal{L} = \sum_{t=1}^{T} \mathcal{L}_t$。对 $W_h$ 的梯度需要沿时间链展开：

$$
\frac{\partial \mathcal{L}_T}{\partial W_h} = \sum_{t=1}^{T} \frac{\partial \mathcal{L}_T}{\partial h_T} \cdot \left(\prod_{k=t+1}^{T} \frac{\partial h_k}{\partial h_{k-1}}\right) \cdot \frac{\partial h_t}{\partial W_h}
$$

其中每一步的 Jacobian 矩阵为：

$$
\frac{\partial h_k}{\partial h_{k-1}} = \text{diag}(1 - h_k^2) \cdot W_h
$$

（$\tanh$ 导数为 $1 - \tanh^2(x)$，即 $1 - h_k^2$）

### 3.2 梯度消失与爆炸

连乘项 $\prod_{k=t+1}^{T} \frac{\partial h_k}{\partial h_{k-1}}$ 本质上是矩阵 $W_h$ 的 $T-t$ 次幂（忽略 $\tanh$ 导数缩放）。设 $W_h$ 的最大奇异值为 $\sigma_1$：

- 若 $\sigma_1 < 1$：连乘趋向 $\mathbf{0}$，早期梯度消失，**长程依赖无法学习**
- 若 $\sigma_1 > 1$：连乘趋向 $\infty$，梯度爆炸，训练不稳定

这是原始 RNN 在长序列任务上表现糟糕的根本原因。

### 3.3 缓解方法

- **梯度裁剪**（Gradient Clipping）：若 $\|\mathbf{g}\| > \theta$，则令 $\mathbf{g} \leftarrow \theta \cdot \mathbf{g} / \|\mathbf{g}\|$，有效抑制梯度爆炸
- **LSTM / GRU**：通过门控机制从根本上解决梯度消失问题

---

## 4. LSTM：长短期记忆网络

### 4.1 设计动机

LSTM（Long Short-Term Memory，**Hochreiter & Schmidhuber, 1997**）的关键创新在于引入**细胞状态**（Cell State）$C_t$，它像传送带一样贯穿整个时间序列，梯度可以沿此通道直接流动，几乎不衰减。

通过**门控机制**，网络动态决定：哪些历史信息应当遗忘、哪些新信息应当写入、哪些信息应当输出。

### 4.2 四个核心方程

设输入 $x_t \in \mathbb{R}^{d_x}$，上一隐状态 $h_{t-1} \in \mathbb{R}^{d_h}$，合并向量 $[h_{t-1}; x_t] \in \mathbb{R}^{d_h + d_x}$。

**遗忘门**（Forget Gate）$f_t$：决定从细胞状态中遗忘多少信息

$$
f_t = \sigma(W_f [h_{t-1}; x_t] + b_f)
$$

**输入门**（Input Gate）$i_t$ 与候选细胞 $\tilde{C}_t$：决定写入多少新信息

$$
i_t = \sigma(W_i [h_{t-1}; x_t] + b_i)
$$

$$
\tilde{C}_t = \tanh(W_C [h_{t-1}; x_t] + b_C)
$$

**细胞状态更新**：

$$
C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t
$$

**输出门**（Output Gate）$o_t$ 与隐状态 $h_t$：

$$
o_t = \sigma(W_o [h_{t-1}; x_t] + b_o)
$$

$$
h_t = o_t \odot \tanh(C_t)
$$

其中 $\sigma(\cdot)$ 表示 Sigmoid 函数，$\odot$ 表示逐元素乘法（Hadamard 积）。

### 4.3 梯度高速公路

LSTM 解决梯度消失的关键在于细胞状态的更新方式：

$$
C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t
$$

$C_t$ 对 $C_{t-1}$ 的梯度为 $f_t$（逐元素乘），而非矩阵乘后经过非线性压缩。若遗忘门 $f_t \approx 1$，梯度可以**无损地**流过整个序列，深层依赖得以保留。这条路径被称为**梯度高速公路**（Gradient Highway）。

---

## 5. GRU：门控循环单元

GRU（Gated Recurrent Unit，**Cho et al., 2014**）是 LSTM 的简化版本，将遗忘门与输入门合并为**重置门** $r_t$ 与**更新门** $z_t$，消除了独立的细胞状态，参数量更少。

$$
r_t = \sigma(W_r [h_{t-1}; x_t] + b_r)
$$

$$
z_t = \sigma(W_z [h_{t-1}; x_t] + b_z)
$$

$$
\tilde{h}_t = \tanh(W_h [r_t \odot h_{t-1}; x_t] + b_h)
$$

$$
h_t = (1 - z_t) \odot h_{t-1} + z_t \odot \tilde{h}_t
$$

### LSTM vs GRU 对比

| 维度 | LSTM | GRU |
|------|------|-----|
| 参数量 | 较多（4 组权重矩阵） | 较少（3 组权重矩阵） |
| 表达能力 | 更强（独立细胞状态） | 略弱 |
| 训练速度 | 较慢 | 较快 |
| 适用场景 | 超长序列、复杂依赖 | 中等序列、快速迭代 |
| 实践经验 | 两者性能差距通常不大，GRU 常为首选 |  |

---

## 6. 双向 RNN 与深层 RNN

### 6.1 双向 RNN（BiRNN）

标准 RNN 只能利用**历史**信息（$t$ 之前）。但许多任务需要同时利用上下文：例如在句子中填空，既需要前文也需要后文。

双向 RNN 同时运行两个方向的 RNN：

$$
\overrightarrow{h}_t = \text{RNN}_{\text{fwd}}(x_t, \overrightarrow{h}_{t-1})
$$

$$
\overleftarrow{h}_t = \text{RNN}_{\text{bwd}}(x_t, \overleftarrow{h}_{t+1})
$$

$$
h_t = [\overrightarrow{h}_t; \overleftarrow{h}_t]
$$

将前向和后向隐状态拼接，每个时间步可以看到完整上下文。**注意**：BiRNN 不适用于需要逐步生成的自回归任务（如语言模型），因为推理时无法获得"未来"信息。

### 6.2 深层 RNN（Stacked RNN）

将多层 RNN 垂直堆叠，下层的隐状态序列作为上层的输入序列：

$$
h_t^{(l)} = \text{RNN}^{(l)}(h_t^{(l-1)}, h_{t-1}^{(l)})
$$

更深的网络可以提取更抽象的特征，但训练难度也随之增加。实践中通常叠加 2-4 层，配合 Dropout 防止过拟合。

---

## 7. Seq2Seq 与 Attention 机制

### 7.1 编码器-解码器架构

Seq2Seq（**Sutskever et al., 2014**）用于输入和输出序列长度不同的任务（机器翻译、摘要生成）。

- **编码器**（Encoder）：读入源序列 $x_1, \ldots, x_T$，输出上下文向量 $c = h_T$（最后一步隐状态）
- **解码器**（Decoder）：以 $c$ 为初始隐状态，自回归地生成目标序列 $y_1, \ldots, y_{T'}$

$$
h_t^{\text{enc}} = \text{LSTM}_{\text{enc}}(x_t, h_{t-1}^{\text{enc}})
$$

$$
s_t^{\text{dec}} = \text{LSTM}_{\text{dec}}(y_{t-1}, s_{t-1}^{\text{dec}}, c)
$$

### 7.2 信息瓶颈问题

原始 Seq2Seq 的致命缺陷：所有源序列信息必须压缩进单一向量 $c \in \mathbb{R}^{d_h}$。对于长序列，这个"信息瓶颈"导致早期词的信息严重丢失。

### 7.3 Attention 机制

**Bahdanau Attention**（**2015**）让解码器在每一步动态查询编码器的全部隐状态 $\{h_1^{\text{enc}}, \ldots, h_T^{\text{enc}}\}$：

**对齐分数**（Alignment Score）：

$$
e_{t,k} = v^\top \tanh(W_s s_{t-1}^{\text{dec}} + W_h h_k^{\text{enc}})
$$

**注意力权重**（经 Softmax 归一化）：

$$
\alpha_{t,k} = \frac{\exp(e_{t,k})}{\sum_{j=1}^{T} \exp(e_{t,j})}
$$

**上下文向量**（加权求和）：

$$
c_t = \sum_{k=1}^{T} \alpha_{t,k} h_k^{\text{enc}}
$$

解码器每步使用动态上下文 $c_t$ 而非静态压缩向量，显著提升了长句翻译质量。Attention 机制后来被推广为 Transformer 的核心组件（Self-Attention）。

---

## 8. 实践注意事项

### 8.1 梯度裁剪（Gradient Clipping）

训练 RNN/LSTM 时梯度爆炸仍可能发生（尤其是浅层 RNN）。标准做法：

```python
# PyTorch 示例
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
```

通常设置 `max_norm` 在 1.0 ～ 5.0 之间。

### 8.2 RNN 中的 Dropout

循环网络中 Dropout 的使用需要注意：

- **Naive Dropout**（在每步随机丢弃）会干扰隐状态的时序连贯性，效果差
- **推荐方案**：**Variational Dropout**（**Gal & Ghahramani, 2016**）——在同一序列的所有时间步使用**相同的 Dropout 掩码**，避免打断时序信息流
- 在 PyTorch `nn.LSTM` 中设置 `dropout` 参数，仅对层间连接（非最后一层）应用 Dropout

### 8.3 权重初始化

- $W_h$ 正交初始化（Orthogonal Initialization）可以缓解初始阶段的梯度消失
- LSTM 遗忘门偏置 $b_f$ 建议初始化为正值（如 1.0），使早期训练时遗忘门倾向于"记住"，帮助梯度流动

### 8.4 序列填充与 PackedSequence

批处理变长序列时，需要填充（padding）到相同长度，但不应让模型在填充位置更新隐状态。PyTorch 提供 `pack_padded_sequence` / `pad_packed_sequence` 接口高效处理这一问题。

---

## 参考文献

- Hochreiter, S., & Schmidhuber, J. (1997). Long Short-Term Memory. *Neural Computation*.
- Cho, K., et al. (2014). Learning Phrase Representations using RNN Encoder–Decoder. *EMNLP*.
- Sutskever, I., Vinyals, O., & Le, Q. V. (2014). Sequence to Sequence Learning with Neural Networks. *NeurIPS*.
- Bahdanau, D., Cho, K., & Bengio, Y. (2015). Neural Machine Translation by Jointly Learning to Align and Translate. *ICLR*.
- Gal, Y., & Ghahramani, Z. (2016). A Theoretically Grounded Application of Dropout in Recurrent Neural Networks. *NeurIPS*.
