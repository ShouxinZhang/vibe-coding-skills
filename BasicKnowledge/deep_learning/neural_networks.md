# 神经网络基础

> 这一页不再承担全部正文，而是作为神经网络子模块的总入口。重点不是把所有公式堆在一页里，而是先把一条主线讲清楚：为什么会发明神经网络，它到底突破了什么旧边界。

---

## 一、先看核心问题

神经网络不是因为“大家突然想模仿大脑”才出现的，而是因为线性模型很快就碰到了天花板。

在线性回归、逻辑回归、感知机这些早期模型里，核心形式几乎都可以写成：

$$
z = \mathbf{w}^T\mathbf{x} + b
$$

它们简单、稳定、可解释，也在很多任务上有效。但它们有一个结构性限制：不管参数怎么调，本质上都还是线性划分。只要真实规律需要“拐弯”、需要多层组合、需要复杂交互，单纯线性模型就会显得不够用。

神经网络解决的不是“把线性模型再写复杂一点”，而是通过非线性激活和多层组合，把模型从线性世界拉出来。

---

## 二、阅读顺序

如果你第一次系统学这一部分，建议按下面顺序读：

| 文件 | 内容简介 |
|------|---------|
| [neural_networks/introduction.md](./neural_networks/introduction.md) | 整个子模块的背景、历史脉络和阅读路径 |
| [neural_networks/fundamentals.md](./neural_networks/fundamentals.md) | 线性模型为什么不够、神经元和多层网络到底多了什么 |
| [neural_networks/activation_functions.md](./neural_networks/activation_functions.md) | 激活函数为什么是神经网络真正的突破口 |
| [neural_networks/loss_functions.md](./neural_networks/loss_functions.md) | 模型怎样把“错了多少”变成可优化的信号 |
| [neural_networks/backpropagation.md](./neural_networks/backpropagation.md) | 反向传播为什么让深层网络终于可训练 |
| [neural_networks/weight_initialization.md](./neural_networks/weight_initialization.md) | 初始化为什么决定训练开局是否稳定 |
| [neural_networks/training_challenges.md](./neural_networks/training_challenges.md) | 梯度消失、梯度爆炸、死亡 ReLU 等常见训练难题 |

---

## 三、这部分到底要建立什么直觉

学神经网络时，最容易掉进一个坑：记住了一堆术语和公式，但并不知道这些东西为什么会先后出现。

这一组文章想建立的是三层直觉：

1. 线性模型为什么不够。
2. 激活函数为什么比“多堆几层”更关键。
3. 神经网络为什么不是只有结构设计，还必须配套损失函数、反向传播、初始化和训练稳定性。

如果这三层直觉建立起来，后面的 CNN、RNN、Transformer 都会更容易理解，因为它们不是凭空冒出来的新发明，而是在这条基础链路上继续演化。

---

## 四、和上层模块的关系

这一页对应的是 [introduction.md](./introduction.md) 下面的“神经网络基础”部分。

- 如果你还没补过线性代数、微积分和概率论，先看 [math_foundations.md](./math_foundations.md)。
- 如果你已经理解了这一组内容，再去看 [cnn/introduction.md](./cnn/introduction.md)、[rnn_lstm/introduction.md](./rnn_lstm/introduction.md) 和 [optimization.md](./optimization.md) 会顺很多。

---

## 五、一个总判断

神经网络的历史，不只是模型变得越来越大，而是机器学习从“手工设计规则”走向“自动学习表示”的历史。

理解这一点，比先背公式更重要。

- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press. Chapter 6–8.
- He, K., et al. (2015). Delving Deep into Rectifiers. *ICCV*.
- Glorot, X., & Bengio, Y. (2010). Understanding the difficulty of training deep feedforward neural networks. *AISTATS*.
