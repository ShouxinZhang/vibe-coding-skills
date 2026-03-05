# 深度学习优化方法全景

## 1. 优化问题的本质

深度学习的训练过程本质上是一个**高维非凸优化问题**：在参数空间 $\theta \in \mathbb{R}^d$（$d$ 可达数十亿）中，寻找使损失函数 $\mathcal{L}(\theta)$ 尽可能小的参数配置。

$$
\theta^* = \arg\min_{\theta} \mathcal{L}(\theta) = \arg\min_{\theta} \frac{1}{N} \sum_{i=1}^{N} \ell(f(x_i; \theta), y_i)
$$

### 1.1 损失景观（Loss Landscape）

参数空间的几何结构极为复杂：
- **鞍点**（Saddle Point）：在某些方向曲率为正、某些方向曲率为负，梯度为零但非极值。高维空间中鞍点数量远多于局部极小值。
- **局部极小值**：现代深度网络中，实践发现大多数局部极小值的损失值与全局极小值相近（**损失值相近假设**）。
- **平坦区域**（Flat Minima）：泛化性能好，因为参数的小扰动不影响损失（**Sharp vs Flat Minima** 假说）。
- **峡谷地形**（Ill-conditioned）：不同方向的曲率相差悬殊，导致梯度下降震荡，收敛缓慢。

---

## 2. 梯度下降家族

### 2.1 批梯度下降（Batch GD）

每次迭代使用**全部** $N$ 个训练样本计算梯度：

$$
\theta \leftarrow \theta - \eta \nabla_\theta \mathcal{L}(\theta)
$$

- **优点**：梯度估计精确，损失单调下降
- **缺点**：$N$ 很大时每步计算代价极高；无法在线更新；容易陷入尖锐极小值

### 2.2 随机梯度下降（SGD）

每次迭代仅使用**单个样本** $(x_i, y_i)$：

$$
\theta \leftarrow \theta - \eta \nabla_\theta \ell(f(x_i; \theta), y_i)
$$

- **优点**：更新频繁，计算快；梯度噪声有助于逃离平坦鞍点和尖锐极小值
- **缺点**：梯度方差大，收敛路径震荡；难以充分利用 GPU 并行能力

### 2.3 Mini-Batch 梯度下降（主流选择）

折中方案：每次使用大小为 $B$ 的随机批次（典型值 32～512）：

$$
\theta \leftarrow \theta - \eta \cdot \frac{1}{B} \sum_{i \in \mathcal{B}} \nabla_\theta \ell(f(x_i; \theta), y_i)
$$

- **平衡了**梯度估计精度与计算效率
- 较大的 $B$ 减少噪声但可能收敛到尖锐极小值（泛化性差）
- 较小的 $B$ 噪声更大，正则化效果更好，但训练不稳定

实践经验：使用线性缩放规则——批大小增大 $k$ 倍时，学习率也应增大约 $k$ 倍。

---

## 3. 动量方法

### 3.1 Momentum（动量 SGD）

受物理中动量概念启发：梯度累积动量，在一致方向上加速，在震荡方向上阻尼。

$$
v_t = \beta v_{t-1} + \nabla_\theta \mathcal{L}(\theta_t)
$$

$$
\theta_{t+1} = \theta_t - \eta v_t
$$

典型参数：$\beta = 0.9$（保留 90% 的历史动量）。

**物理直觉**：将参数更新类比为小球在损失曲面上滚动——在平缓方向加速积累速度，在陡峭震荡的峡谷方向因惯性平均掉横向分量，从而沿谷底方向快速前进。

### 3.2 NAG（Nesterov Accelerated Gradient）

Momentum 的一个缺陷：使用当前位置 $\theta_t$ 的梯度，但此时已经"知道"自己要往哪里走了。NAG 先"预测"下一步位置，再计算梯度：

$$
v_t = \beta v_{t-1} + \nabla_\theta \mathcal{L}(\theta_t - \beta \eta v_{t-1})
$$

$$
\theta_{t+1} = \theta_t - \eta v_t
$$

NAG 使用"前瞻"梯度，在凸问题上有理论更优的收敛率 $O(1/t^2)$ vs 标准梯度下降的 $O(1/t)$。实践中通常比标准 Momentum 收敛更平滑，尤其在损失曲面曲率变化较快时。

---

## 4. 自适应学习率方法

峡谷地形的根本问题在于：不同参数方向的梯度尺度差异巨大，统一学习率无法兼顾。自适应方法为每个参数维护独立的学习率缩放因子。

### 4.1 AdaGrad

$$
G_t = G_{t-1} + (\nabla_\theta \mathcal{L}_t)^2 \quad \text{（逐元素平方累加）}
$$

$$
\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{G_t + \epsilon}} \odot \nabla_\theta \mathcal{L}_t
$$

- **优点**：历史梯度较大的参数自动缩小学习率，历史梯度小的参数保持较大学习率；适合**稀疏数据**（NLP 词嵌入）
- **缺点**：$G_t$ 单调递增，学习率随训练持续衰减趋向零，后期训练停止更新——不适合深度网络长时间训练

### 4.2 RMSProp

用**指数加权移动平均**替代累加和，解决 AdaGrad 学习率过早衰减的问题：

$$
v_t = \rho v_{t-1} + (1 - \rho)(\nabla_\theta \mathcal{L}_t)^2
$$

$$
\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{v_t + \epsilon}} \odot \nabla_\theta \mathcal{L}_t
$$

典型参数：$\rho = 0.9$，$\epsilon = 10^{-8}$（防止除零）。$v_t$ 近似当前梯度平方的局部均值，避免了历史信息积累过多导致学习率消亡。

### 4.3 Adam（Adaptive Moment Estimation）

Adam（**Kingma & Ba, 2015**）结合了 Momentum 的一阶动量与 RMSProp 的二阶动量：

**一阶矩估计**（梯度均值）：

$$
m_t = \beta_1 m_{t-1} + (1 - \beta_1) \nabla_\theta \mathcal{L}_t
$$

**二阶矩估计**（梯度方差）：

$$
v_t = \beta_2 v_{t-1} + (1 - \beta_2)(\nabla_\theta \mathcal{L}_t)^2
$$

**偏差修正**（Bias Correction）：初期 $m_0 = v_0 = 0$，导致估计偏向零，需要修正：

$$
\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}
$$

**参数更新**：

$$
\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t
$$

默认超参数：$\beta_1 = 0.9$，$\beta_2 = 0.999$，$\epsilon = 10^{-8}$，学习率 $\eta = 10^{-3}$。

**为什么 Adam 流行**：对超参数不敏感，收敛快，在大多数任务上"开箱即用"表现良好。

### 4.4 AdamW（权重衰减解耦）

原始 Adam 将 L2 正则化实现为梯度中的一项，但这与自适应学习率缩放耦合导致正则化强度不均匀。AdamW（**Loshchilov & Hutter, 2019**）将权重衰减直接作用于参数本身，与梯度更新解耦：

$$
\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t - \eta \lambda \theta_t
$$

后一项 $\eta \lambda \theta_t$ 直接缩减权重（权重衰减），不受梯度自适应缩放影响。AdamW 是目前 Transformer 训练的**标准选择**。

---

## 5. 学习率调度

学习率是最重要的超参数。使用**调度策略**（Learning Rate Schedule）在训练过程中动态调整，可以显著提升最终性能。

### 5.1 Warmup（预热）

大学习率在训练初期（参数随机初始化，梯度噪声大）容易导致不稳定。Warmup 策略从很小的学习率线性增大到目标值：

$$
\eta_t = \eta_{\max} \cdot \frac{t}{T_{\text{warmup}}}, \quad t \leq T_{\text{warmup}}
$$

Transformer 论文（2017）使用 4000 步 Warmup，现已成为大型模型训练的标配。

### 5.2 余弦退火（Cosine Annealing）

训练后期使用余弦函数平滑衰减学习率：

$$
\eta_t = \eta_{\min} + \frac{1}{2}(\eta_{\max} - \eta_{\min})\left(1 + \cos\frac{\pi t}{T}\right)
$$

- 衰减过程平滑，无突变
- 末期学习率接近零，有助于精细收敛
- 可与 Warmup 组合：先线性升温，再余弦衰减（**Cosine Schedule with Warmup**）

### 5.3 ReduceLROnPlateau

自适应调度：监控验证集损失，当连续 `patience` 个 epoch 不再改善时，将学习率乘以衰减因子 `factor`：

$$
\eta \leftarrow \eta \times \text{factor}, \quad \text{if } \mathcal{L}_{\text{val}} \text{ 停止下降}
$$

无需预先指定总步数，适合训练时长不固定的任务。

---

## 6. 正则化技术

正则化的目标是防止过拟合——模型在训练集表现优异但在测试集泛化差。

### 6.1 L2 正则化（权重衰减）

在损失函数中添加参数的 $\ell_2$ 范数惩罚项：

$$
\mathcal{L}_{\text{reg}} = \mathcal{L} + \frac{\lambda}{2} \|\theta\|^2
$$

梯度更新时增加一项 $\lambda \theta$，使权重趋近于零，防止个别权重过大主导预测。

### 6.2 L1 正则化

使用 $\ell_1$ 范数：

$$
\mathcal{L}_{\text{reg}} = \mathcal{L} + \lambda \|\theta\|_1
$$

L1 正则化会产生**稀疏权重**（许多权重精确为零），有特征选择效果，但不如 L2 平滑，深度学习中较少单独使用。

### 6.3 Dropout

**Srivastava et al., 2014**：训练时以概率 $p$ 随机将每个神经元的输出置零。

$$
\tilde{h}_i = \begin{cases} h_i / (1-p) & \text{以概率 } 1-p \\ 0 & \text{以概率 } p \end{cases}
$$

推理阶段停用 Dropout，不做随机丢弃（注意 $(1-p)$ 的缩放确保训练/推理期望一致）。

**为什么有效**：
1. 相当于训练了指数数量的子网络，推理时做集成（Ensemble）
2. 防止神经元之间形成"共适应"（Co-adaptation）——某个神经元不能依赖另一个神经元总是出现

典型丢弃率：全连接层 $p \in [0.3, 0.5]$，卷积层通常较低或不使用。

### 6.4 Batch Normalization（BN）

**Ioffe & Szegedy, 2015**：对每个 mini-batch 内的特征进行归一化，解决**内部协变量偏移**（Internal Covariate Shift）问题。

**训练阶段**（对 mini-batch 统计量归一化）：

$$
\mu_\mathcal{B} = \frac{1}{B}\sum_{i=1}^{B} x_i, \quad \sigma_\mathcal{B}^2 = \frac{1}{B}\sum_{i=1}^{B}(x_i - \mu_\mathcal{B})^2
$$

$$
\hat{x}_i = \frac{x_i - \mu_\mathcal{B}}{\sqrt{\sigma_\mathcal{B}^2 + \epsilon}}
$$

$$
y_i = \gamma \hat{x}_i + \beta
$$

其中 $\gamma$（缩放）和 $\beta$（平移）是可学习参数，使网络可以恢复任意分布。

**推理阶段**：不能使用当前批次统计量（批大小可能为 1）。使用训练阶段通过**指数移动平均**积累的全局统计量 $\mu_{\text{running}}$ 和 $\sigma_{\text{running}}^2$：

$$
\hat{x} = \frac{x - \mu_{\text{running}}}{\sqrt{\sigma_{\text{running}}^2 + \epsilon}}
$$

**BN 的优点**：允许使用更大学习率，对权重初始化不敏感，本身具有轻微正则化效果。**局限**：批大小较小时统计量不稳定，不适合 RNN（序列长度不定）。

### 6.5 Layer Normalization（LN）

对**同一样本的所有特征**归一化（而非跨样本），不依赖批大小，是 Transformer 的标准选择：

$$
\mu = \frac{1}{d}\sum_{j=1}^{d} x_j, \quad \sigma^2 = \frac{1}{d}\sum_{j=1}^{d}(x_j - \mu)^2
$$

$$
y = \gamma \cdot \frac{x - \mu}{\sqrt{\sigma^2 + \epsilon}} + \beta
$$

训练和推理阶段行为**完全一致**（无需维护运行统计量），适合变长序列和小批次场景。

---

## 7. 超参数调优实践

### 7.1 学习率是最重要的超参数

**学习率范围测试**（LR Range Test，**Smith 2017**）：从极小值线性增大学习率，记录对应损失，选取损失开始下降最快处的学习率。

经验法则：
- Adam/AdamW：$\eta \in [10^{-4}, 3 \times 10^{-3}]$，从 $10^{-3}$ 开始是合理起点
- SGD + Momentum：$\eta \in [10^{-2}, 0.1]$，配合 Warmup 和余弦退火
- 学习率过大：损失发散或剧烈震荡；学习率过小：收敛极慢，可能早期卡在平坦区

### 7.2 批大小的影响

| 批大小 | 优点 | 缺点 |
|--------|------|------|
| 小批次（8-64） | 梯度噪声强，正则化效果好，泛化通常更好 | GPU 利用率低，训练慢 |
| 大批次（1024+） | GPU 吞吐高，收敛步数少 | 可能收敛到尖锐极小值，泛化差；需要同步调整学习率 |

**线性缩放规则**：批大小增大 $k$ 倍，学习率应增大 $k$ 倍（同时延长 Warmup 步数）。

### 7.3 调参策略概要

1. **基准先行**：建立可复现的基准模型（小模型、少轮数），避免在错误基础上浪费资源
2. **一次只动一个参数**：控制变量，隔离影响
3. **学习率优先**：在固定其他参数之前，先用 LR Range Test 确定合理区间
4. **监控训练/验证曲线**：过拟合则加强正则化；欠拟合则增大模型容量或调高学习率
5. **使用自动化工具**：Bayesian Optimization（Optuna、Ray Tune）对超参数空间做高效搜索

---

## 参考文献

- Kingma, D. P., & Ba, J. (2015). Adam: A Method for Stochastic Optimization. *ICLR*.
- Loshchilov, I., & Hutter, F. (2019). Decoupled Weight Decay Regularization. *ICLR*.
- Ioffe, S., & Szegedy, C. (2015). Batch Normalization. *ICML*.
- Srivastava, N., et al. (2014). Dropout: A Simple Way to Prevent Neural Networks from Overfitting. *JMLR*.
- Ba, J. L., Kiros, J. R., & Hinton, G. E. (2016). Layer Normalization. *arXiv*.
- Smith, L. N. (2017). Cyclical Learning Rates for Training Neural Networks. *WACV*.
- He, K., et al. (2016). Deep Residual Learning for Image Recognition. *CVPR*.
