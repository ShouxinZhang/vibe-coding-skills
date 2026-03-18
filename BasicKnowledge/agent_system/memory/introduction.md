# Agent 记忆系统：从上下文到持续智能

## 模块定位

记忆系统（Memory System）是 Agent 从"一次性回答机器"走向"持续学习系统"的基础设施。它解决的不是单次推理能力，而是跨步骤、跨任务、跨周期的认知连续性问题。

在业务场景里，真正昂贵的不是一次推理，而是重复试错、上下文丢失、经验无法复用。记忆模块的价值是让 Agent 能够复盘、继承、优化，从而把同样的人力投入转化为更稳定的交付质量与更快的迭代速度。

---

## 为什么需要独立记忆模块

无记忆或弱记忆的 Agent 往往会出现三类问题：

1. 当前任务里频繁"失忆"，重复读取和重复决策，拉高延迟与 token 成本。
2. 任务结束后经验流失，下次遇到同类问题仍从零开始。
3. 长流程执行缺少可审计轨迹，遇到异常难以恢复，团队对系统信任度下降。

因此，记忆需要被设计为独立模块，而不是散落在提示词或临时上下文里的隐式机制。

---

## 模块内容架构

| 文件 | 内容简介 |
|------|---------|
| [cache_and_short_term.md](./cache_and_short_term.md) | 缓存与短期记忆：高频信息复用与任务级状态保持 |
| [long_term_and_rag.md](./long_term_and_rag.md) | 长期记忆与 RAG：跨任务知识沉淀、检索与注入 |
| [mechanical_memory.md](./mechanical_memory.md) | 机械记忆：todo、plan、draft 等结构化执行状态 |
| [working_memory_transfer.md](./working_memory_transfer.md) | 工作记忆迁移：任务暂停、切换与恢复时的预热、跳级检索与状态重建 |
| [memory_agents.md](./memory_agents.md) | 记忆管理 Agent：记录者与监控者的职责边界 |
| [personas.md](./personas.md) | 人格系统：基于记忆切片的行为策略与风格控制 |
| [collaborative_memory/](./collaborative_memory/introduction.md) | 协同记忆：多 Agent 场景下的共享知识库、冲突治理与集体学习 |

---

## 记忆系统的演进阶段

**阶段一：上下文即全部记忆**。系统仅依赖会话窗口，适合短问答，不适合复杂交付。

**阶段二：引入缓存与任务状态**。开始保存热点信息和任务中间态，显著减少重复工作。

**阶段三：长期记忆与检索增强**。通过结构化存储和向量检索，把历史经验变成可调用资产。

**阶段四：记忆自治管理**。由记录者和监控者 Agent 主动维护记忆质量，支持多人格差异化执行。

---

## 建议阅读顺序

1. 先读 [cache_and_short_term.md](./cache_and_short_term.md)，建立"快读快写"层的性能认知。
2. 再读 [mechanical_memory.md](./mechanical_memory.md)，理解 todo/plan/draft 如何支撑可恢复执行。
3. 再读 [working_memory_transfer.md](./working_memory_transfer.md)，理解短期记忆、机械记忆与长期检索之间如何完成跨时间段恢复。
4. 然后读 [long_term_and_rag.md](./long_term_and_rag.md)，掌握经验沉淀与召回机制。
5. 接着读 [memory_agents.md](./memory_agents.md)，理解记忆治理如何从人工走向自治。
6. 再读 [collaborative_memory/](./collaborative_memory/introduction.md)，理解多 Agent 如何共享、同步并共同沉淀记忆。
7. 最后读 [personas.md](./personas.md)，将记忆能力映射到业务风格与组织分工。
