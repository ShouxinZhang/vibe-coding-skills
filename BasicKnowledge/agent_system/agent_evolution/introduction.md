# Agent Evolution：Agent 的自我进化能力

## 模块定义

Agent Evolution 关注单个或多 Agent 系统如何在任务执行过程中持续增强能力。它不只讨论静态能力配置，而是研究 Agent 如何通过上下文学习（In-Context Learning）、持续学习（Continual Learning）、子 Agent 创造（Subagent Creation）与自举提升（Bootstrapping）形成可复用的能力增长曲线。

与 `agent_system` 聚焦协作博弈不同，本子模块聚焦"能力如何变强"；与 `agent_workflow` 聚焦流程自动化不同，本子模块聚焦"执行体如何升级"。

---

## 为什么需要 Agent Evolution

传统 Agent 常被视为一次性配置的软件组件：给定提示词、工具和流程后长期保持稳定行为。这种方式在短任务中有效，但在复杂业务中会出现三个问题：

1. 新场景适配速度慢，无法快速利用任务内反馈。
2. 能力迁移弱，历史经验难以跨任务复用。
3. 系统扩展成本高，复杂任务只能靠人工拆分。

Agent Evolution 的目标是把 Agent 从"静态执行器"升级为"动态学习体"，让系统在业务变化中保持迭代速度与稳定性。

---

## 模块内容架构

| 文件 | 内容简介 |
|------|---------|
| [context_learning.md](./context_learning.md) | 上下文学习：在不更新参数的前提下，通过示例与上下文结构快速适配新任务 |
| [continual_learning.md](./continual_learning.md) | 持续学习：跨任务增量学习与抗遗忘机制，保证能力长期可积累 |
| [subagent_creation.md](./subagent_creation.md) | 创造 Subagents：把复杂目标分解为可管理的子能力网络 |
| [bootstrapping.md](./bootstrapping.md) | 自举提升：以 Agent 自产数据与反思机制驱动性能迭代 |

---

## 发展脉络

**阶段一：提示词驱动适配（Prompt-era）**。核心能力是上下文学习，强调任务内快速适配，优点是零训练成本，缺点是稳定性受上下文质量影响。

**阶段二：反馈驱动迭代（Feedback-era）**。系统加入持续学习机制，通过回放与评估降低遗忘，提高跨任务一致性。

**阶段三：结构化扩展（Architecture-era）**。通过子 Agent 创造形成层级化能力分工，使复杂任务可并行推进并具备故障隔离。

**阶段四：自举闭环（Bootstrapping-era）**。系统从执行、评估、反思中自生成训练样本与策略，形成低人工干预的长期优化循环。

---

## 建议学习路线

建议按以下顺序阅读：

1. 先读 [context_learning.md](./context_learning.md) 理解快速适配的最低成本路径。
2. 再读 [continual_learning.md](./continual_learning.md) 建立跨任务能力积累思路。
3. 然后读 [subagent_creation.md](./subagent_creation.md) 掌握复杂任务的组织扩展方法。
4. 最后读 [bootstrapping.md](./bootstrapping.md) 理解如何把前述机制闭环为长期自我提升系统。
