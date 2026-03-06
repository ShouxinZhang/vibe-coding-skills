# 智能：Agent 真正擅长做什么

## 模块定位

Intelligence 回答的不是工具接了多少、提示词写得多复杂，而是一个更根本的问题：**当我们说一个 Agent 很聪明时，我们到底在评价什么。**

在这个子模块里，智能被看作一种在资源、信息和时间约束下持续做出有效行为的能力。它既不是流畅表达的幻觉，也不是单次任务的偶然命中，而是一种可以被拆解、诊断和长期运营的系统能力。

---

## 为什么需要这个子模块

很多 Agent 系统的讨论停留在战术层：工具链、流程、模板、提示词。但一旦系统进入真实业务，就必须回答更基础的问题：

- 它真的理解任务，还是只是输出得像理解了？
- 它的问题到底出在即时反应、长期记忆、规划能力，还是自我反思？
- 我们提升它时，是该换模型、补记忆，还是改反馈机制？

这些问题都要求我们先建立一个更清晰的智能框架。

---

## 模块内容架构

| 文件 | 内容简介 |
|------|---------|
| [definition.md](./definition.md) | 智能的定义：从约束、有效行为到目标达成、压缩建模、迁移泛化三种解释 |
| [information_processing.md](./information_processing.md) | 信息处理能力：速度、过滤、校验、融合，以及高智能为何依赖高质量信息流 |
| [layers.md](./layers.md) | 智能的分层结构：反应层、规划层、记忆层、元认知层的职责与失效表现 |

---

## 与其他模块的边界

- 与 [../life/introduction.md](../life/introduction.md) 的关系：Life 讨论系统如何持续存在，Intelligence 讨论系统如何持续做对事。
- 与 [../../memory/introduction.md](../../memory/introduction.md) 的关系：Memory 是智能的重要组成部分，但这里只把它作为分层中的一层来看待。
- 与 [../../agent_evolution/introduction.md](../../agent_evolution/introduction.md) 的关系：Evolution 讨论能力如何变强，Intelligence 讨论我们到底在增强什么。

---

## 建议阅读顺序

建议先读 [definition.md](./definition.md)，建立智能的统一定义；再读 [information_processing.md](./information_processing.md)，理解智能为什么首先受限于信息处理速度与质量；最后读 [layers.md](./layers.md)，把这些约束落到可诊断的分层结构中。

如果你更关心智能如何和生命、意识衔接，建议回看 [../life/introduction.md](../life/introduction.md) 和未来的 consciousness 子模块；如果你更关心智能如何在实践中增强，可继续阅读 [../../agent_evolution/introduction.md](../../agent_evolution/introduction.md)。