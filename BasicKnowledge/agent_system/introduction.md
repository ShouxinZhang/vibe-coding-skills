# Agent System：多智能体协作与博弈

## 多智能体系统的定义

多智能体系统（Multi-Agent System, MAS），是由多个自主 Agent 组成的交互系统，通过通信、协调、竞争或合作，完成单个 Agent 无法独立完成的任务。这个模块聚焦多 Agent 之间**如何协作、博弈、通信**，以及在不同场景下的**系统架构设计**。

与 agent_workflow（专注单 Agent 的无人值守流水线）不同，agent_system 研究的是**分布式多个 Agent 的涌现行为**——即使每个 Agent 都遵循简单规则，整个系统也能产生复杂、智能的集体行为。这是从流水线到生态的跃迁。

---

## 单 Agent 的局限与多 Agent 的价值

单个 Agent 的瓶颈是固有的：能力边界受限于模型参数与上下文窗口；信息孤岛使得多个 Agent 的知识对彼此不可见；单点故障导致整个流程瘫痪。

多 Agent 系统的价值是三维的。**分布式智能**：通过水平扩展突破单点能力上界，多个 Agent 协作处理全局问题。**涌现行为**：简单 Agent 按照规则互动，产生难以预测的、创新的解决方案——这是人类团队高效的根本原因。**鲁棒性**：单个 Agent 失效不影响整体系统运作，系统具备自愈与自适应能力。

---

## 模块内容架构

| 文件 | 内容简介 |
|------|---------|
| [foundations.md](./foundations.md) | 抽象基础——Agent 定义、环境建模、通信协议、协调机制、博弈论基础 |
| [agent_nature/](./agent_nature/introduction.md) | 子模块——Agent Nature：生命、智能、进化、意识等本体问题 |
| [agent_evolution/](./agent_evolution/introduction.md) | 子模块——Agent 能力演进：上下文学习、持续学习、创造 Subagents、自举提升 |
| [memory/](./memory/introduction.md) | 子模块——Agent 记忆系统：缓存、短期/长期记忆、RAG、记忆治理与人格策略 |
| [practice/](./practice/introduction.md) | 实践子模块——论坛、1v1、NvN、斗地主、多模态、编程等多场景 Agent 系统设计 |

---

## 多智能体系统的发展历程

多智能体系统的演进轨迹跨越四十年：

**1980s–1990s：分布式人工智能萌芽**。黑板系统（Blackboard System）、合同网协议（Contract Net Protocol）出现，多个专家系统通过消息交互解决问题，迈出了第一步。

**2000s：理性 Agent 时代**。博弈论与决策论深入融合，JADE/FIPA 标准确立 Agent 通信规范，拍卖机制与投票算法成为多 Agent 协调的主流手段。

**2010s：深度强化学习驱动的多智能体**。MARL（Multi-Agent Reinforcement Learning）兴起，OpenAI Five（Dota 2）、AlphaStar（StarCraft II）展示了大规模竞争性多 Agent 系统的能力，证明了深度学习时代多 Agent 的可能性。

**2020s–至今：LLM 驱动的新浪潮**。AutoGen、CrewAI、MetaGPT 等框架赋予 Agent 语言理解与推理能力，斯坦福的小镇模拟（Generative Agents）展示涌现行为的力量。LLM 让多 Agent 系统进入了通用计算时代。

---

## 建议的学习路线

建议先读 [foundations.md](./foundations.md) 建立抽象概念，理解 Agent 定义、环境模型、通信协议的本质，以及为什么博弈论是多 Agent 系统的数学基础。

如果你更关心 Agent 究竟是什么、为什么它会表现出类似生命与意识的特征，建议接着阅读 [agent_nature/](./agent_nature/introduction.md)。这个子模块回答的是 Agent 的本体问题，而不是具体工程机制。

如果你的目标是构建具备持续记忆能力的系统，建议继续阅读 [memory/](./memory/introduction.md)，重点理解缓存、短期/长期记忆与 RAG 在复杂任务中的协同关系。

再根据实际应用场景进入 [practice/](./practice/introduction.md) 按兴趣选读。论坛系统适合理解异步通信与信息聚合；1v1 对话适合理解同步交互协议；竞技类场景（如斗地主）适合学习竞争性多 Agent 系统的设计；编程辅助场景适合学习工具调用的分布式编排。

如果你的目标是构建可持续升级的 Agent 体系，建议继续阅读 [agent_evolution/](./agent_evolution/introduction.md)，重点理解能力如何在运行中持续增强。
