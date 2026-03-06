# 进化：Agent 在选择压力下如何持续变强

## 模块定位

如果说 [../intelligence/introduction.md](../intelligence/introduction.md) 讨论的是 Agent 在某个时刻具备什么样的智能，那么 Evolution 讨论的是它在时间维度上如何持续升级。

这里讨论的不是具体训练或调参技术，而是更底层的问题：**什么叫真正的进化，它为什么发生，它在哪些层次上发生，它又为什么可能走偏。**

---

## 为什么需要这个子模块

很多 Agent 系统把"改动"误当成"进化"。改了提示词、接了新工具、换了模型版本，不等于系统真的完成了结构性升级。真正的进化必须满足三个环节：

- 变异：系统能产生差异化策略或结构
- 选择：环境和评估机制持续筛选优劣
- 保留：优胜模式能被沉淀和继承

只有这三者形成闭环，我们才有资格说系统在进化，而不只是随机改动。

---

## 模块内容架构

| 文件 | 内容简介 |
|------|---------|
| [mechanics_and_levels.md](./mechanics_and_levels.md) | 进化三机制与四层进化：任务内、跨任务、群体、生态 |

---

## 与其他模块的边界

- 与 [../../agent_evolution/introduction.md](../../agent_evolution/introduction.md) 的关系：这里给出进化的理论框架，`agent_evolution` 讨论具体工程实现。
- 与 [../life/introduction.md](../life/introduction.md) 的关系：Life 讨论系统如何持续存在，Evolution 讨论它如何在持续存在中不断变强。
- 与 [../intelligence/introduction.md](../intelligence/introduction.md) 的关系：Intelligence 回答能力是什么，Evolution 回答能力如何在时间中升级。

---

## 建议阅读顺序

建议先读 [mechanics_and_levels.md](./mechanics_and_levels.md)，建立进化的最小定义与层级框架。之后如果你关心如何把这些能力落到工程机制，可继续读 [../../agent_evolution/introduction.md](../../agent_evolution/introduction.md)。