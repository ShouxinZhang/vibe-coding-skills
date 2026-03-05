# 卷积神经网络（CNN）

> 本文从"为什么需要 CNN"出发，系统介绍卷积的数学定义、CNN 的核心组件、经典架构演进，并着重讲解工程实践中的感受野计算与参数量分析。

---

## 一、为什么需要 CNN

### 1.1 全连接网络处理图像的瓶颈

对一张 $224 \times 224 \times 3$ 的彩色图像，直接展平后输入向量维度高达 $224 \times 224 \times 3 = 150{,}528$。若第一层有 $1{,}000$ 个神经元，仅这一层的权重参数就达 $\approx 1.5 \times 10^8$，极易过拟合，计算开销也难以承受。

### 1.2 图像的两个基本假设

**假设一：平移不变性（Translation Invariance）**

同一个物体特征（如猫的眼睛）出现在图像不同位置时，应当被同等识别。全连接网络为图像每个位置单独分配权重，无法共享这一特性；而卷积核通过在整幅图像上滑动，天然具备平移不变性。

**假设二：局部性（Locality）**

图像中，像素的语义通常只与邻近像素相关——边缘、纹理由相邻像素的对比决定，而与千像素之外的区域相关性很弱。CNN 以小尺寸卷积核（如 $3\times3$）捕捉局部特征，符合这一先验。

这两个假设共同促成了 CNN 的两大优势：**参数共享**（减少参数量）和**局部连通**（利用空间结构），使得 CNN 在图像任务上远优于全连接网络。

---

## 二、卷积操作的数学定义

### 2.1 离散卷积

设输入特征图为 $\mathbf{X} \in \mathbb{R}^{H \times W}$，卷积核为 $\mathbf{K} \in \mathbb{R}^{k \times k}$，则卷积（实际实现中为互相关，cross-correlation）操作定义为：

$$(\mathbf{X} \star \mathbf{K})[i, j] = \sum_{u=0}^{k-1}\sum_{v=0}^{k-1} \mathbf{K}[u, v] \cdot \mathbf{X}[i+u,\, j+v]$$

对于多通道输入（输入通道数 $C_{\text{in}}$）和多个卷积核（输出通道数 $C_{\text{out}}$）：

$$\mathbf{Y}[c_{\text{out}}, i, j] = \sum_{c_{\text{in}}=0}^{C_{\text{in}}-1}\sum_{u=0}^{k-1}\sum_{v=0}^{k-1} \mathbf{K}[c_{\text{out}}, c_{\text{in}}, u, v] \cdot \mathbf{X}[c_{\text{in}}, i+u, j+v] + b[c_{\text{out}}]$$

**注意**：深度学习框架实现的是"互相关"而非严格数学意义上的"卷积"（卷积需要翻转核），但由于卷积核通过学习获得，翻转与否不影响结果，业界统一沿用"卷积"这一术语。

### 2.2 感受野（Receptive Field）

感受野是指输出特征图上某一位置的值所对应的输入图像区域大小。深层神经元的感受野由所有前序层的卷积核累积决定：

**简单堆叠（无池化）时的感受野递推公式：**

$$RF_l = RF_{l-1} + (k_l - 1) \cdot \prod_{i=1}^{l-1} s_i$$

其中 $k_l$ 为第 $l$ 层卷积核尺寸，$s_i$ 为第 $i$ 层步长（stride）。

**例**：两层 $3\times3$、stride=1 的卷积堆叠，感受野为 $1 + (3-1) + (3-1) = 5$，与一层 $5\times5$ 卷积等效，但参数量仅为后者的 $\frac{2 \times 3^2}{5^2} = 72\%$，且拥有更深的非线性。这是 VGG 力推小核的核心理由。

---

## 三、CNN 的核心组件

### 3.1 卷积层

**填充（Padding）**

- `valid`（无填充）：输出尺寸缩小。输出大小 $H_{\text{out}} = H - k + 1$。
- `same`（零填充）：填充 $p = \lfloor k/2 \rfloor$，保持输出尺寸与输入相同。

**步长（Stride）$s$**

步长控制卷积核滑动步幅：

$$H_{\text{out}} = \left\lfloor \frac{H + 2p - k}{s} \right\rfloor + 1$$

步长 $> 1$ 可以对特征图进行下采样，替代部分池化操作（如 ResNet 中 stride=2 的卷积）。

**空洞卷积（Dilated/Atrous Convolution）**，膨胀率 $d$

在卷积核元素之间插入 $(d-1)$ 个空洞，有效核尺寸扩展为 $k_{\text{eff}} = k + (k-1)(d-1)$，在不增加参数量的前提下大幅扩大感受野。公式：

$$H_{\text{out}} = \left\lfloor \frac{H + 2p - d(k-1) - 1}{s} \right\rfloor + 1$$

空洞卷积在语义分割（DeepLab 系列）中被广泛使用。

**参数量计算**

单个卷积层的参数（含偏置）：

$$\text{Params} = C_{\text{out}} \times \left(C_{\text{in}} \times k \times k + 1\right)$$

例：$\text{Conv}(3 \to 64, k=3)$ 的参数量为 $64 \times (3 \times 9 + 1) = 1{,}792$。

### 3.2 池化层

池化层通过聚合局部区域减小特征图尺寸，提升空间不变性，降低后续计算量。

**最大池化（Max Pooling）**

$$y_{i,j} = \max_{(u,v) \in \mathcal{R}_{i,j}} x_{u,v}$$

保留局部最强响应，常用于捕捉"是否存在某特征"的信息；对噪声鲁棒。

**平均池化（Average Pooling）**

$$y_{i,j} = \frac{1}{|\mathcal{R}_{i,j}|}\sum_{(u,v) \in \mathcal{R}_{i,j}} x_{u,v}$$

保留局部平均信息；全局平均池化（Global Average Pooling, GAP）常用于替代全连接层作为分类头，大幅减少参数量并提升正则化效果（ResNet、MobileNet 均采用此策略）。

### 3.3 批归一化层（Batch Normalization, BN）

BN 由 Ioffe & Szegedy（2015）提出，在每个 mini-batch 上对特征进行归一化：

$$\hat{x}_i = \frac{x_i - \mu_{\mathcal{B}}}{\sqrt{\sigma_{\mathcal{B}}^2 + \epsilon}}$$

$$y_i = \gamma \hat{x}_i + \beta$$

其中 $\mu_{\mathcal{B}}$、$\sigma_{\mathcal{B}}^2$ 为 batch 均值与方差，$\gamma$、$\beta$ 为可学习的缩放与平移参数，$\epsilon$ 为数值稳定常数（通常取 $10^{-5}$）。

**作用**：
- 将每层输入拉回近似零均值单位方差，远离激活函数饱和区，缓解梯度消失。
- 具有轻微正则化效果，可减少对 Dropout 的依赖。
- 允许使用更大学习率，加速收敛。

**注意**：推理时使用训练阶段统计的滑动均值与方差（而非当前 batch），需注意训练/推理模式切换（`model.train()` / `model.eval()`）。

---

## 四、经典架构演进

### 4.1 LeNet（1998）

由 Yann LeCun 提出，用于手写数字识别（MNIST），开创了卷积 + 池化 + 全连接的基本范式。网络仅 6 万参数，验证了端到端学习的可行性，但受限于数据量和计算能力，未能在更复杂任务上大规模推广。

### 4.2 AlexNet（2012）

ILSVRC 2012 冠军，Top-5 错误率从 $26\%$ 骤降至 $15.3\%$，开启深度学习时代。关键创新：
- **ReLU 激活**：取代 Sigmoid，缓解梯度消失，加速训练。
- **Dropout**：在全连接层以 $p=0.5$ 随机失活神经元，正则化。
- **数据增强 + GPU 并行**：2 块 GTX 580 训练 5–6 天。

### 4.3 VGGNet（2014）

由牛津 VGG 团队提出，核心思想：**用堆叠的小核（$3\times3$）替代大核**。如前所述，两层 $3\times3$ = 一层 $5\times5$ 的感受野，但参数量更少、非线性更多。VGG-16 拥有 $1.38 \times 10^8$ 参数，结构简洁，至今仍是迁移学习和特征提取的常用骨干。

### 4.4 ResNet（2015）——残差连接

何恺明等人发现，随着网络深度增加，训练误差（而非仅测试误差）反而升高——**退化问题（Degradation）**，与梯度消失不完全相同。

**解决方案：残差块（Residual Block）**

$$H(\mathbf{x}) = F(\mathbf{x}) + \mathbf{x}$$

其中 $F(\mathbf{x})$ 是若干卷积层学习的残差，$\mathbf{x}$ 是跳连接（Skip Connection）直接传递的输入。网络只需学习残差 $F(\mathbf{x}) = H(\mathbf{x}) - \mathbf{x}$，学习目标更简单。

**深层变体——Bottleneck 结构**（ResNet-50/101/152 使用）：

用 $1\times1 \to 3\times3 \to 1\times1$ 三层卷积替代两层 $3\times3$，"先降维、再卷积、再升维"，减少计算量约 $3\times$。

**等效理解**：残差连接相当于为梯度提供了一条"高速公路"，无论深度多大，梯度都能直接流回浅层，从根本上解决了深层网络的训练问题。ResNet-152 在 ImageNet 上达到 $<5\%$ 的 Top-5 错误率，深度达 $152$ 层。

### 4.5 EfficientNet（2019）

Google Brain 的 Tan & Le 提出**复合缩放（Compound Scaling）**：同时对网络的宽度（通道数）、深度（层数）、分辨率（输入尺寸）按固定比例缩放，而非单独调一个维度。

复合缩放系数：

$$\text{depth} \propto \alpha^\phi, \quad \text{width} \propto \beta^\phi, \quad \text{resolution} \propto \gamma^\phi$$

约束条件：$\alpha \cdot \beta^2 \cdot \gamma^2 \approx 2$（使 FLOPS 约增大 $2^\phi$ 倍）。

EfficientNet-B7 在 ImageNet Top-1 准确率达 $84.3\%$，参数量仅为 GPipe 的 $8.4\times$ 少，开创了模型缩放的系统性方法论。

---

## 五、特征图的直觉理解

CNN 不同深度的特征图具有明确的语义层次：

| 层级 | 特征语义 | 典型内容 |
|------|----------|----------|
| 浅层（第 1–2 层）| 低级特征 | 边缘、颜色梯度、角点、纹理方向 |
| 中层（第 3–4 层）| 中级特征 | 纹理组合、局部形状（眼睛轮廓、轮毂） |
| 深层（第 5 层+）| 高级语义 | 物体部件（人脸、车窗）、类别语义 |

**可视化验证**：Zeiler & Fergus（2014）通过反卷积网络（Deconvnet）可视化了 AlexNet 各层激活，确认了这一层次结构——这是理解深度特征的经典实验，也为"迁移学习浅层特征具有通用性"提供了直接依据。

**迁移学习的价值**：正因浅/中层特征通用（边缘在任何图像识别任务中都有意义），预训练模型的浅层权重可以"迁移"到新任务，仅微调深层语义层，大幅减少数据需求。

---

## 六、CNN 工程要点

### 6.1 感受野计算（多层通用公式）

对于第 $l$ 层输出，其感受野大小为：

$$RF_0 = 1$$

$$RF_l = RF_{l-1} + (k_l - 1) \times \prod_{i=1}^{l-1} s_i$$

**示例**：VGG 块（3 层 $3\times3$，stride=1，后接 $2\times2$ MaxPool stride=2）

- 第 1 层卷积后：$RF = 1 + (3-1) = 3$
- 第 2 层卷积后：$RF = 3 + (3-1) \times 1 = 5$
- 第 3 层卷积后：$RF = 5 + (3-1) \times 1 = 7$
- 池化后（等效步长累积）：影响后续层的 stride 乘子

大感受野对分类等需要全局理解的任务至关重要；小感受野适合检测细小目标。**感受野不足**是 CNN 在大范围依赖任务（如长程序列推理）上的固有局限，也是 Transformer 崛起的原因之一。

### 6.2 参数量与 FLOPs 计算

**卷积层参数量**：

$$\text{Params}_{\text{conv}} = C_{\text{out}} \times (C_{\text{in}} \times k \times k + 1)$$

**卷积层 FLOPs**（乘法-加法操作数，通常以 MACs 计）：

$$\text{MACs} = C_{\text{out}} \times C_{\text{in}} \times k^2 \times H_{\text{out}} \times W_{\text{out}}$$

**全连接层参数量**：

$$\text{Params}_{\text{fc}} = n_{\text{in}} \times n_{\text{out}} + n_{\text{out}}$$

**实用参考**：ResNet-50 约 $2.5 \times 10^7$ 参数，$4.1 \times 10^9$ MACs；EfficientNet-B0 约 $5.3 \times 10^6$ 参数，$3.9 \times 10^8$ MACs。轻量化模型（MobileNet、ShuffleNet）通过深度可分离卷积（Depthwise Separable Convolution）将参数量和 FLOPs 同时压缩 $8\times$ 左右。

### 6.3 深度可分离卷积（补充）

将标准卷积拆分为两步：

1. **逐通道卷积（Depthwise Convolution）**：每个输入通道独立卷积，参数量 $C_{\text{in}} \times k^2$。
2. **逐点卷积（Pointwise Convolution，$1\times1$）**：混合通道信息，参数量 $C_{\text{in}} \times C_{\text{out}}$。

总参数比标准卷积减少为原来的 $\frac{1}{C_{\text{out}}} + \frac{1}{k^2}$ 倍，是移动端模型的核心设计模式。

---

## 七、小结

CNN 的成功源于对**图像先验**的显式编码：平移不变性通过参数共享实现，局部性通过局部连通实现。从 LeNet 到 EfficientNet，架构演进的主线是：**更深 + 更宽 + 更大感受野 + 更高效**。残差连接解决了深层训练的根本障碍，批归一化稳定了训练过程，小核堆叠在参数效率上实现了精妙平衡。

理解这些组件的数学本质和工程权衡，是设计和调试任何视觉模型的基础。

---

## 延伸阅读

- LeCun, Y., et al. (1998). Gradient-based learning applied to document recognition. *IEEE*.
- Krizhevsky, A., et al. (2012). ImageNet Classification with Deep CNNs (AlexNet). *NeurIPS*.
- Simonyan, K., & Zisserman, A. (2014). Very Deep CNNs for Large-Scale Image Recognition (VGGNet). *ICLR 2015*.
- He, K., et al. (2016). Deep Residual Learning for Image Recognition (ResNet). *CVPR*.
- Tan, M., & Le, Q.V. (2019). EfficientNet: Rethinking Model Scaling for CNNs. *ICML*.
- Zeiler, M.D., & Fergus, R. (2014). Visualizing and Understanding CNNs. *ECCV*.
