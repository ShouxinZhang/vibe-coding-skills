# 深度学习的数学基础

> 本文是 `BasicKnowledge/deep_learning/` 系列的数学基础篇。深度学习的每一个核心操作——前向传播、反向传播、参数优化——都建立在严密的数学体系之上。本文系统梳理三大数学支柱：**线性代数**、**微积分与自动微分**、**概率与统计**。

---

## 目录

1. [线性代数](#一线性代数)
   - 向量与矩阵
   - 矩阵运算
   - 特征值分解
   - 奇异值分解（SVD）
2. [微积分与自动微分](#二微积分与自动微分)
   - 偏导数与梯度
   - 链式法则
   - 梯度的几何意义
   - 计算图与自动微分
3. [概率与统计](#三概率与统计)
   - 概率分布
   - 最大似然估计（MLE）
   - KL 散度
   - 贝叶斯基础

---

## 一、线性代数

线性代数是深度学习的**语言**。神经网络中的数据以张量（Tensor）形式流动，每一次前向传播本质上都是一系列矩阵运算。

### 1.1 向量与矩阵

**列向量** $\mathbf{x} \in \mathbb{R}^n$ 表示一个 $n$ 维数据点（如一张展平的图片或一个词嵌入）：

$$\mathbf{x} = \begin{bmatrix} x_1 \\ x_2 \\ \vdots \\ x_n \end{bmatrix}$$

**矩阵** $\mathbf{W} \in \mathbb{R}^{m \times n}$ 表示一个线性变换，将 $n$ 维输入映射到 $m$ 维输出。在全连接层中，权重矩阵 $\mathbf{W}$ 和偏置向量 $\mathbf{b}$ 共同定义层的线性变换：

$$\mathbf{z} = \mathbf{W}\mathbf{x} + \mathbf{b}$$

**直觉解释**：矩阵乘法在几何上是对空间的线性变换——旋转、缩放、剪切，但不包括非线性变形。这正是为什么神经网络需要**激活函数**：如果没有非线性，多层线性变换等价于单层线性变换。

### 1.2 矩阵运算

#### 矩阵乘法

给定 $\mathbf{A} \in \mathbb{R}^{m \times k}$，$\mathbf{B} \in \mathbb{R}^{k \times n}$，其乘积 $\mathbf{C} = \mathbf{A}\mathbf{B} \in \mathbb{R}^{m \times n}$，元素定义为：

$$C_{ij} = \sum_{l=1}^{k} A_{il} \cdot B_{lj}$$

注意：矩阵乘法**不满足交换律**（$\mathbf{AB} \neq \mathbf{BA}$），但满足结合律。

#### Hadamard 积（逐元素乘法）

$$(\mathbf{A} \odot \mathbf{B})_{ij} = A_{ij} \cdot B_{ij}$$

在反向传播计算梯度时，逐元素乘法频繁出现。

#### 转置

$(\mathbf{AB})^\top = \mathbf{B}^\top \mathbf{A}^\top$，转置会颠倒乘法顺序。这一性质在推导反向传播梯度公式时至关重要。

#### 范数

向量的 $L_2$ 范数（欧氏距离）：

$$\|\mathbf{x}\|_2 = \sqrt{\sum_{i=1}^{n} x_i^2}$$

正则化中常用 $L_1$ 范数 $\|\mathbf{w}\|_1 = \sum|w_i|$（产生稀疏解）和 $L_2$ 范数 $\|\mathbf{w}\|_2^2$（防止权重过大）。

### 1.3 特征值分解（Eigendecomposition）

对于方阵 $\mathbf{A} \in \mathbb{R}^{n \times n}$，若存在非零向量 $\mathbf{v}$ 和标量 $\lambda$ 满足：

$$\mathbf{A}\mathbf{v} = \lambda\mathbf{v}$$

则称 $\lambda$ 为**特征值**，$\mathbf{v}$ 为对应的**特征向量**。对于实对称矩阵 $\mathbf{A} = \mathbf{A}^\top$，特征分解为：

$$\mathbf{A} = \mathbf{Q}\boldsymbol{\Lambda}\mathbf{Q}^\top$$

其中 $\mathbf{Q}$ 的列为正交特征向量，$\boldsymbol{\Lambda} = \text{diag}(\lambda_1, \ldots, \lambda_n)$。

**在深度学习中的意义**：
- Hessian 矩阵（二阶导数矩阵）的特征值决定了损失曲面的曲率，影响优化轨迹。
- 特征值过大意味着方向梯度陡峭，容易发生**梯度爆炸**；特征值接近零意味着方向平坦，容易陷入**鞍点**。

### 1.4 奇异值分解（SVD）

任意矩阵 $\mathbf{A} \in \mathbb{R}^{m \times n}$ 都可以分解为：

$$\mathbf{A} = \mathbf{U}\boldsymbol{\Sigma}\mathbf{V}^\top$$

其中 $\mathbf{U} \in \mathbb{R}^{m \times m}$ 和 $\mathbf{V} \in \mathbb{R}^{n \times n}$ 是正交矩阵，$\boldsymbol{\Sigma} \in \mathbb{R}^{m \times n}$ 是对角矩阵，对角元素 $\sigma_1 \geq \sigma_2 \geq \cdots \geq 0$ 称为**奇异值**。

**在深度学习中的意义**：
- **权重初始化**：使用 SVD 分析权重矩阵的奇异值分布，可以诊断梯度流动是否健康；
- **模型压缩**：低秩分解用 $r \ll \min(m,n)$ 个奇异值近似权重矩阵，大幅减少参数量（如 LoRA 技术）；
- **批归一化**与**谱归一化**都隐含对奇异值的控制。

---

## 二、微积分与自动微分

神经网络的训练本质是**优化问题**：通过调整参数最小化损失函数。微积分提供了计算梯度的工具，自动微分则使这一过程在任意复杂的计算图上都能高效执行。

### 2.1 偏导数与梯度

对于多元函数 $f: \mathbb{R}^n \to \mathbb{R}$，函数对第 $i$ 个变量的**偏导数**定义为：

$$\frac{\partial f}{\partial x_i} = \lim_{\epsilon \to 0} \frac{f(x_1, \ldots, x_i + \epsilon, \ldots, x_n) - f(\mathbf{x})}{\epsilon}$$

**梯度**是所有偏导数组成的向量：

$$\nabla_{\mathbf{x}} f = \left[\frac{\partial f}{\partial x_1}, \frac{\partial f}{\partial x_2}, \ldots, \frac{\partial f}{\partial x_n}\right]^\top$$

梯度是一个向量场，在每个点指向函数值增长最快的方向，其模长表示该方向的增长速率。

### 2.2 链式法则（Chain Rule）

链式法则是反向传播的数学核心。对于复合函数 $y = f(g(x))$：

$$\frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx}, \quad u = g(x)$$

延伸到多变量情形：若 $z = f(x, y)$，而 $x = g(t)$，$y = h(t)$，则：

$$\frac{dz}{dt} = \frac{\partial z}{\partial x} \cdot \frac{dx}{dt} + \frac{\partial z}{\partial y} \cdot \frac{dy}{dt}$$

**在神经网络中的展开**：设网络有 $L$ 层，对参数 $\mathbf{W}^{(l)}$ 的梯度为：

$$\frac{\partial L}{\partial \mathbf{W}^{(l)}} = \frac{\partial L}{\partial \mathbf{a}^{(L)}} \cdot \frac{\partial \mathbf{a}^{(L)}}{\partial \mathbf{a}^{(L-1)}} \cdots \frac{\partial \mathbf{a}^{(l+1)}}{\partial \mathbf{a}^{(l)}} \cdot \frac{\partial \mathbf{a}^{(l)}}{\partial \mathbf{W}^{(l)}}$$

这一连乘结构在深层网络中导致**梯度消失**（各因子 $<1$ 时乘积趋近零）或**梯度爆炸**（各因子 $>1$ 时乘积趋近无穷）问题。

### 2.3 梯度的几何意义

在参数空间中，梯度 $\nabla L(\theta)$ 是损失函数曲面在当前点的**最陡上升方向**。梯度下降更新规则：

$$\theta \leftarrow \theta - \eta \cdot \nabla_\theta L(\theta)$$

其中 $\eta > 0$ 是学习率。几何上，这相当于在损失曲面上朝"最陡下坡"方向移动一小步。

- **学习率过大**：在陡峭区域跨步过大，可能越过极小值甚至发散；
- **学习率过小**：收敛缓慢，且容易陷入局部极小值或鞍点；
- **自适应学习率**（如 Adam）：根据历史梯度自动调整各参数维度的步长。

### 2.4 计算图与自动微分

**计算图（Computational Graph）** 是深度学习框架（PyTorch、TensorFlow）的核心数据结构，将数值计算表示为有向无环图（DAG）：

- **节点**：操作（加法、乘法、激活函数）；
- **边**：数据流（张量）。

以 $L = (wx + b - y)^2$ 为例，其计算图为：

```
x → [乘 w] → z1 → [加 b] → z2 → [减 y] → z3 → [平方] → L
      ↑                ↑                  ↑
      w                b                  y
```

**自动微分（Automatic Differentiation, AD）** 分为两种模式：

- **前向模式（Forward Mode）**：从输入到输出同步计算导数，适用于输入维度远小于输出维度的情形；
- **反向模式（Reverse Mode）**：从输出到输入逆序计算导数，即**反向传播（Backpropagation）**的本质。对于神经网络（一个标量损失对大量参数求导），反向模式仅需一次前向传播 + 一次反向传播即可计算所有梯度，时间复杂度与前向传播相同。

PyTorch 的 `autograd` 引擎在前向传播时动态构建计算图，调用 `.backward()` 时沿图反向遍历积累梯度，这也是"动态图"框架的核心优势。

---

## 三、概率与统计

深度学习的目标往往是**学习数据的概率分布**。损失函数的选择、模型的解释以及生成模型的设计都依赖概率论基础。

### 3.1 概率分布

**概率质量函数（PMF）** 用于离散随机变量：$P(X = x_i) = p_i$，满足 $\sum_i p_i = 1$。

**概率密度函数（PDF）** 用于连续随机变量：$p(x) \geq 0$，$\int_{-\infty}^{+\infty} p(x)\, dx = 1$。

**Softmax 函数**将神经网络的原始输出（logits）转换为合法的离散概率分布：

$$\text{softmax}(\mathbf{z})_i = \frac{e^{z_i}}{\sum_{j=1}^{K} e^{z_j}}$$

**高斯分布**（正态分布）是深度学习中最常用的先验与噪声模型：

$$p(x \mid \mu, \sigma^2) = \frac{1}{\sqrt{2\pi\sigma^2}} \exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)$$

当优化均方误差（MSE）损失时，隐含假设是预测误差服从以零为均值的高斯分布。

### 3.2 最大似然估计（MLE）

给定 $N$ 个独立同分布（i.i.d.）样本 $\mathcal{D} = \{x_1, x_2, \ldots, x_N\}$，**似然函数**衡量在参数 $\theta$ 下观测到当前数据集的概率：

$$L(\theta) = \prod_{i=1}^{N} p(x_i \mid \theta)$$

由于连乘在数值上不稳定，通常转化为**对数似然**（log-likelihood）：

$$\ell(\theta) = \sum_{i=1}^{N} \log p(x_i \mid \theta)$$

**最大似然估计**求使对数似然最大的参数：

$$\hat{\theta}_{\text{MLE}} = \argmax_{\theta} \sum_{i=1}^{N} \log p(x_i \mid \theta)$$

**与交叉熵损失的联系**：对于分类任务，最小化交叉熵损失等价于对参数进行最大似然估计。设真实标签 $y$ 的独热编码为 $\mathbf{q}$，模型预测分布为 $\hat{\mathbf{p}}$，则交叉熵损失：

$$\mathcal{L}_{\text{CE}} = -\sum_{k=1}^{K} q_k \log \hat{p}_k = -\log \hat{p}_{y}$$

即负对数似然（NLL），与 MLE 完全等价。

### 3.3 KL 散度（Kullback–Leibler Divergence）

KL 散度衡量两个概率分布 $P$ 和 $Q$ 之间的"差异程度"：

$$D_{\text{KL}}(P \| Q) = \sum_x P(x) \log \frac{P(x)}{Q(x)} = \mathbb{E}_{x \sim P}\left[\log \frac{P(x)}{Q(x)}\right]$$

**性质**：
- $D_{\text{KL}}(P \| Q) \geq 0$，当且仅当 $P = Q$ 时取等（Gibbs 不等式）；
- **非对称**：$D_{\text{KL}}(P \| Q) \neq D_{\text{KL}}(Q \| P)$，因此不是严格意义上的"距离"。

**在深度学习中的应用**：

- **变分自编码器（VAE）**：损失函数由重构损失和 KL 散度正则项组成：
  $$\mathcal{L}_{\text{VAE}} = \underbrace{\mathbb{E}_{q_\phi(\mathbf{z}|\mathbf{x})}[\log p_\theta(\mathbf{x}|\mathbf{z})]}_{\text{重构损失}} - \underbrace{D_{\text{KL}}(q_\phi(\mathbf{z}|\mathbf{x}) \| p(\mathbf{z}))}_{\text{正则项}}$$

- **知识蒸馏**：教师模型分布 $P$ 与学生模型分布 $Q$ 之间的 KL 散度作为损失；
- **强化学习（PPO）**：限制策略更新前后的 KL 散度以保证训练稳定性。

### 3.4 贝叶斯基础

**贝叶斯定理**提供了将先验知识与观测数据结合的框架：

$$P(\theta \mid \mathcal{D}) = \frac{P(\mathcal{D} \mid \theta) \cdot P(\theta)}{P(\mathcal{D})}$$

其中：
- $P(\theta)$：**先验分布**，在观测数据之前对参数的信念；
- $P(\mathcal{D} \mid \theta)$：**似然**，给定参数观测到数据的概率；
- $P(\theta \mid \mathcal{D})$：**后验分布**，综合先验和数据后的信念；
- $P(\mathcal{D}) = \int P(\mathcal{D} \mid \theta) P(\theta)\, d\theta$：**边际似然**（证据），用于归一化。

**最大后验估计（MAP）** 是 MLE 的贝叶斯扩展：

$$\hat{\theta}_{\text{MAP}} = \argmax_{\theta} \log P(\mathcal{D} \mid \theta) + \log P(\theta)$$

当先验 $P(\theta) = \mathcal{N}(0, \sigma^2 \mathbf{I})$ 时，$\log P(\theta) \propto -\|\theta\|_2^2$，MAP 等价于带 **$L_2$ 正则化**的 MLE。可见，权重衰减（Weight Decay）并非经验性技巧，而是高斯先验的贝叶斯解释。

**贝叶斯深度学习**的目标是维护参数的完整后验分布而非点估计，以量化模型的**不确定性（Uncertainty）**。这在自动驾驶、医疗诊断等高风险场景中尤为重要，相关方法包括：蒙特卡洛 Dropout、深度集成（Deep Ensemble）、变分推断等。

---

## 四、数学与神经网络的对应关系总结

| 数学概念 | 神经网络中的对应 |
|---------|---------------|
| 矩阵乘法 $\mathbf{W}\mathbf{x}$ | 全连接层的线性变换 |
| 梯度 $\nabla_\theta L$ | 参数更新方向 |
| 链式法则 | 反向传播算法 |
| 特征值/奇异值分解 | 权重初始化、模型压缩（LoRA） |
| 最大似然估计 | 交叉熵损失函数 |
| KL 散度 | VAE 正则项、知识蒸馏、PPO |
| 高斯分布先验 | $L_2$ 正则化（权重衰减） |
| 自动微分（计算图） | PyTorch `autograd` 引擎 |
| 概率分布 | Softmax 输出层、生成模型 |

---

*建议阅读顺序：本文 → [neural_networks.md](./neural_networks.md)（将上述数学落实到具体网络结构）→ [optimization.md](./optimization.md)（梯度下降的工程实践）。*
