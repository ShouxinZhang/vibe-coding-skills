# 神经网络基础

> 本文面向有一定数学基础（线性代数、微积分）的读者，系统介绍神经网络的核心原理，从单个神经元到多层感知机，再到反向传播算法，力求在直觉与严格公式之间保持平衡。

---

## 一、神经元模型

人工神经元是对生物神经元的数学抽象。给定输入向量 $\mathbf{x} \in \mathbb{R}^n$，神经元完成两步计算：

**第一步：加权求和（线性变换）**

$$z = \mathbf{w}^T\mathbf{x} + b = \sum_{i=1}^{n} w_i x_i + b$$

其中 $\mathbf{w} \in \mathbb{R}^n$ 是权重向量，$b \in \mathbb{R}$ 是偏置项。

**第二步：激活函数（非线性变换）**

$$a = \sigma(z)$$

激活函数 $\sigma$ 引入非线性，使网络能够拟合复杂函数。若没有激活函数，任意深度的网络退化为一个线性变换，表达能力等价于单层网络。

---

## 二、常用激活函数

### 2.1 Sigmoid

$$\sigma(z) = \frac{1}{1 + e^{-z}}$$

- **值域**：$(0, 1)$，常用于二分类输出层，将输出解释为概率。
- **导数**：$\sigma'(z) = \sigma(z)(1 - \sigma(z))$，最大值仅为 $0.25$。
- **优点**：输出有概率语义，平滑可微。
- **缺点**：存在饱和区（$|z|$ 较大时梯度趋近于 $0$），导致梯度消失；输出非零中心（均值约 $0.5$），影响梯度更新效率。

### 2.2 Tanh（双曲正切）

$$\tanh(z) = \frac{e^z - e^{-z}}{e^z + e^{-z}}$$

- **值域**：$(-1, 1)$，零中心化，比 Sigmoid 更适合隐藏层。
- **导数**：$\tanh'(z) = 1 - \tanh^2(z)$，最大值为 $1$。
- **优点**：零中心，梯度更新方向更准确；比 Sigmoid 梯度更强。
- **缺点**：仍存在饱和区，深层网络中仍有梯度消失风险。

### 2.3 ReLU（Rectified Linear Unit）

$$\text{ReLU}(z) = \max(0, z)$$

- **导数**：$z > 0$ 时为 $1$，$z \le 0$ 时为 $0$。
- **优点**：计算极简，不存在正区间的饱和问题；实践中收敛速度比 Sigmoid/Tanh 快约 $6\times$。
- **缺点**：**死亡 ReLU 问题**——若某神经元输入持续为负，梯度恒为 $0$，该神经元永久停止学习。通常由于学习率过大或权重初始化不当导致。

### 2.4 GELU（Gaussian Error Linear Unit）

$$\text{GELU}(z) = z \cdot \Phi(z) = z \cdot \frac{1}{2}\left[1 + \text{erf}\left(\frac{z}{\sqrt{2}}\right)\right]$$

其中 $\Phi(z)$ 是标准正态分布的累积分布函数。常用近似：

$$\text{GELU}(z) \approx 0.5z\left(1 + \tanh\left(\sqrt{\frac{2}{\pi}}\left(z + 0.044715z^3\right)\right)\right)$$

- **直觉**：GELU 可以理解为对输入的"随机门控"——输入越大，通过的概率越高，且过渡平滑，无硬截断。
- **优点**：在 Transformer（BERT、GPT 系列）中表现优异，平滑可微，梯度信息丰富。
- **缺点**：计算量略高于 ReLU；相比 ReLU 在某些 CNN 场景未必有明显优势。

### 激活函数对比

| 激活函数 | 值域 | 零中心 | 饱和问题 | 典型使用场景 |
|----------|------|--------|----------|-------------|
| Sigmoid  | $(0,1)$ | 否 | 有 | 二分类输出层 |
| Tanh     | $(-1,1)$ | 是 | 有 | RNN 隐藏层 |
| ReLU     | $[0,+\infty)$ | 否 | 无（正区间）| CNN、MLP 隐藏层 |
| GELU     | $\approx(-0.17,+\infty)$ | 近似 | 无 | Transformer 隐藏层 |

---

## 三、多层感知机（MLP）：前向传播

MLP 由多个全连接层堆叠而成。设网络共 $L$ 层，第 $l$ 层有 $n_l$ 个神经元。

**单层前向传播（矩阵形式）：**

$$\mathbf{z}^{[l]} = \mathbf{W}^{[l]} \mathbf{a}^{[l-1]} + \mathbf{b}^{[l]}$$

$$\mathbf{a}^{[l]} = \sigma^{[l]}\!\left(\mathbf{z}^{[l]}\right)$$

其中：
- $\mathbf{W}^{[l]} \in \mathbb{R}^{n_l \times n_{l-1}}$：权重矩阵
- $\mathbf{b}^{[l]} \in \mathbb{R}^{n_l}$：偏置向量
- $\mathbf{a}^{[0]} = \mathbf{x}$：网络输入

**完整前向传播（批量形式）：**

设批量大小为 $m$，输入矩阵 $\mathbf{X} \in \mathbb{R}^{n_0 \times m}$：

$$\mathbf{Z}^{[l]} = \mathbf{W}^{[l]} \mathbf{A}^{[l-1]} + \mathbf{b}^{[l]} \cdot \mathbf{1}^T$$

$$\mathbf{A}^{[l]} = \sigma^{[l]}\!\left(\mathbf{Z}^{[l]}\right)$$

最终输出 $\hat{\mathbf{Y}} = \mathbf{A}^{[L]}$。

**网络的通用近似能力**：根据 Cybenko（1989）的通用近似定理，只要隐藏层足够宽，含一个隐藏层的 MLP 可以以任意精度近似任意连续函数。然而深度（层数）比宽度更"高效"——深层网络可以用指数级更少的参数实现相同的表达能力。

---

## 四、损失函数

损失函数量化预测与真实标签的差距，是优化的目标。

### 4.1 均方误差（MSE）

用于**回归任务**：

$$\mathcal{L}_{\text{MSE}} = \frac{1}{m}\sum_{i=1}^{m}\left(\hat{y}^{(i)} - y^{(i)}\right)^2$$

- 对离群点敏感（平方放大异常值影响）。
- 梯度线性：预测越偏，梯度越大，有利于快速收敛到正确方向。

### 4.2 二元交叉熵（Binary Cross-Entropy）

用于**二分类任务**，配合 Sigmoid 输出层：

$$\mathcal{L}_{\text{BCE}} = -\frac{1}{m}\sum_{i=1}^{m}\left[y^{(i)}\log\hat{y}^{(i)} + (1 - y^{(i)})\log(1 - \hat{y}^{(i)})\right]$$

### 4.3 多类交叉熵（Categorical Cross-Entropy）

用于**多分类任务**，配合 Softmax 输出层：

$$\mathcal{L}_{\text{CE}} = -\frac{1}{m}\sum_{i=1}^{m}\sum_{k=1}^{K} y_k^{(i)}\log\hat{y}_k^{(i)}$$

其中 $K$ 为类别数，$y_k^{(i)} \in \{0,1\}$ 为 one-hot 标签。

**为什么分类用交叉熵而非 MSE？** 交叉熵来自最大似然估计，其梯度形式更简洁（Softmax + 交叉熵的组合梯度为 $\hat{y} - y$），且对错误预测惩罚更强，有助于加速学习。

---

## 五、反向传播算法

反向传播（Backpropagation）本质是**链式法则在计算图上的高效应用**，用于计算损失对每个参数的梯度。

### 5.1 链式法则基础

设 $\mathcal{L}$ 是关于参数 $\theta$ 的复合函数，若 $\mathcal{L}$ 通过中间变量 $z$ 依赖于 $\theta$：

$$\frac{\partial \mathcal{L}}{\partial \theta} = \frac{\partial \mathcal{L}}{\partial z} \cdot \frac{\partial z}{\partial \theta}$$

### 5.2 计算图视角

将前向传播的每一步视为计算图的一个节点。反向传播时，**梯度从输出层向输入层流动**，每经过一个节点，梯度乘以该节点的局部偏导。

### 5.3 完整推导（以两层网络为例）

前向传播：
$$z^{[1]} = \mathbf{W}^{[1]}\mathbf{x} + \mathbf{b}^{[1]}, \quad \mathbf{a}^{[1]} = \sigma(z^{[1]})$$
$$z^{[2]} = \mathbf{W}^{[2]}\mathbf{a}^{[1]} + \mathbf{b}^{[2]}, \quad \hat{y} = \sigma(z^{[2]})$$

记 $\delta^{[l]} = \frac{\partial \mathcal{L}}{\partial \mathbf{z}^{[l]}}$（误差信号），反向传播步骤：

**输出层误差（以交叉熵+Sigmoid 为例）：**

$$\delta^{[2]} = \hat{y} - y$$

**隐藏层误差（递推）：**

$$\delta^{[l]} = \left(\mathbf{W}^{[l+1]T} \delta^{[l+1]}\right) \odot \sigma'\!\left(\mathbf{z}^{[l]}\right)$$

其中 $\odot$ 为逐元素乘积（Hadamard 积）。

**参数梯度：**

$$\frac{\partial \mathcal{L}}{\partial \mathbf{W}^{[l]}} = \delta^{[l]} \mathbf{a}^{[l-1]T}, \qquad \frac{\partial \mathcal{L}}{\partial \mathbf{b}^{[l]}} = \delta^{[l]}$$

**参数更新（梯度下降）：**

$$\mathbf{W}^{[l]} \leftarrow \mathbf{W}^{[l]} - \alpha \frac{\partial \mathcal{L}}{\partial \mathbf{W}^{[l]}}$$

其中 $\alpha$ 为学习率。

### 5.4 梯度流动直觉

梯度在反向传播时会经过激活函数的导数连乘。若激活函数在饱和区（如 Sigmoid 的导数趋近于 $0$），梯度连乘后会指数级缩小——这正是**梯度消失**的根源。

---

## 六、权重初始化

权重初始化策略对训练稳定性至关重要。若初始化不当，前向传播的激活值或反向传播的梯度会在层数增加时指数级缩放。

### 6.1 全零初始化的致命缺陷

若所有权重初始化为零，则同层所有神经元的梯度完全相同，网络无法打破对称性，实际上退化为单个神经元。**权重必须随机初始化以打破对称性。**

### 6.2 Xavier 初始化（Glorot 初始化）

适用于 Sigmoid / Tanh 激活函数，目标是保持前向与反向传播中激活值方差不变：

$$W \sim \mathcal{U}\!\left(-\sqrt{\frac{6}{n_{\text{in}} + n_{\text{out}}}},\ \sqrt{\frac{6}{n_{\text{in}} + n_{\text{out}}}}\right)$$

或正态版：

$$W \sim \mathcal{N}\!\left(0,\ \frac{2}{n_{\text{in}} + n_{\text{out}}}\right)$$

其中 $n_{\text{in}}$ 为该层输入维度，$n_{\text{out}}$ 为输出维度。

**推导思路**：若希望每层输出方差等于输入方差，权重方差应满足 $\text{Var}(w) = \frac{1}{n_{\text{in}}}$；若同时考虑反向传播，则取前后层的调和平均，即 $\frac{2}{n_{\text{in}} + n_{\text{out}}}$。

### 6.3 He 初始化（Kaiming 初始化）

由 Kaiming He（2015）针对 ReLU 激活函数提出。ReLU 将一半的激活值置为零，方差相当于减半，因此需要补偿：

$$W \sim \mathcal{N}\!\left(0,\ \frac{2}{n_{\text{in}}}\right)$$

**直觉**：ReLU 使有效的"信号通道"减半，初始化时需要将方差翻倍以维持信号强度。PyTorch 和 TensorFlow 中，He 初始化是含 ReLU 网络的默认推荐。

---

## 七、实践注意事项

### 7.1 梯度消失问题

**现象**：深层网络训练时，靠近输入层的参数梯度趋近于零，几乎不更新，浅层特征无法学习。

**根源**：反向传播时梯度经过激活函数导数的连乘，Sigmoid/Tanh 的导数上界分别为 $0.25$ 和 $1$，多层连乘后迅速衰减。

**解决方案**：
1. **换用 ReLU 族激活函数**：正区间导数恒为 $1$，不会导致梯度衰减。
2. **残差连接（ResNet）**：提供梯度的直接通路，绕过激活函数，见 CNN 笔记。
3. **批归一化（BatchNorm）**：将每层输入归一化到接近零均值单位方差，避免激活值落入饱和区。
4. **梯度裁剪（Gradient Clipping）**：在 RNN 等场景常用，将梯度范数限制在阈值以内。

### 7.2 梯度爆炸问题

**现象**：梯度在反向传播中指数级增大，导致权重更新过大，损失函数发散（NaN）。

**根源**：权重矩阵的谱范数大于 $1$ 时，梯度连乘后指数膨胀。

**解决方案**：
1. **梯度裁剪**：$\hat{g} = g \cdot \min\!\left(1, \frac{\theta_{\max}}{\|g\|}\right)$
2. **权重正则化**（L2/权重衰减）：约束权重幅度。
3. **适当的权重初始化**：Xavier/He 初始化可降低初始风险。

### 7.3 其他工程建议

- **学习率调度**：使用余弦退火（Cosine Annealing）或 Warm-up + 衰减策略，避免后期震荡。
- **批量大小影响**：较小批量引入噪声（有利于泛化但不稳定），较大批量梯度更准确但泛化能力略下降，建议配合学习率线性缩放规则（Linear Scaling Rule）调整。
- **数值稳定性**：计算 Softmax 时应先减去最大值防止溢出：$\text{Softmax}(z_k) = \frac{e^{z_k - z_{\max}}}{\sum_j e^{z_j - z_{\max}}}$。

---

## 延伸阅读

- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press. Chapter 6–8.
- He, K., et al. (2015). Delving Deep into Rectifiers. *ICCV*.
- Glorot, X., & Bengio, Y. (2010). Understanding the difficulty of training deep feedforward neural networks. *AISTATS*.
