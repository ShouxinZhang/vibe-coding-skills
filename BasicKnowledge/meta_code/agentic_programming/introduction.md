# Agent Programming：把 Agent 当作新变量

## 一、为什么需要单独讨论 Agent Programming

过去的编程语言，默认操作对象是数据与过程。变量保存值，函数消费输入，对象封装状态与方法。到了 LLM 时代，很多系统开始把一个能读上下文、能调用工具、能保存记忆、能持续执行的 agent 塞进原有抽象里，结果就是概念错位。

如果把 agent 只当作一次函数调用，那么记忆、身份、权限、上下文窗口、失败恢复这些关键能力都只能以零散补丁的方式附着在外面。系统可以暂时跑起来，但很难稳定扩展，也难以被复用、调试和治理。

`agentic_programming` 讨论的正是这个缺口：当 agent 成为新的基本计算单元时，编程抽象应该如何上移。它不再只问“prompt 怎么写”或“workflow 怎么画”，而是问“agent 在语言层面究竟是什么，它应该如何被声明、引用、存储、传递、约束、组织和调度”。

## 二、这个模块解决什么问题

今天大量 agent 系统仍停留在工程拼装阶段。人们会谈 prompt、memory、tool use、workflow、handoff，但这些名词通常属于不同层，缺少统一的数据与语义底座。结果是：

- 系统能演示，但不能稳定复现。
- agent 能工作，但不能像变量或对象那样被可靠组合。
- 状态、上下文、权限、集合结构和生命周期混在一起，导致恢复、迁移、审计和治理都变得困难。

这个模块的业务价值，是把 agent 从“会做事的黑箱”变成“可被编程、可被治理、可被组合的结构单元”。这一步一旦成立，后续的 agent 类型系统、agent 运行时、agent 编程语言才有真正的基础。

## 三、内容索引

| 文件 | 内容简介 |
|------|---------|
| [agent_as_variable.md](./agent_as_variable.md) | 论证为什么 agent 更接近带身份与状态的变量，而不是一次性的函数调用 |
| [agentic_data_structures.md](./agentic_data_structures.md) | 给出 agent 编程里的最小结构字段，说明每个字段解决什么业务问题 |
| [state_context_and_identity.md](./state_context_and_identity.md) | 拆开状态、上下文、身份、引用与生命周期，正式化“值与地址”的类比 |
| [agentic_type_system.md](./agentic_type_system.md) | 讨论如何给 agent 定义角色、能力、权限和生命周期边界，让组合在运行前就有契约 |
| [agentic_runtime.md](./agentic_runtime.md) | 讨论如何让 agent 在系统里被创建、调度、挂起、恢复、派生和回收 |
| [agentic_collections.md](./agentic_collections.md) | 把数组、栈、队列、堆、图等经典集合翻译成 agent 世界的组织方式 |
| [agentic_control_flow.md](./agentic_control_flow.md) | 把 `if / for / while / function / exception` 翻译成 agent 世界的执行语义 |
| [agentic_language_design.md](./agentic_language_design.md) | 把前面的变量、类型、运行时、集合和控制流收束成一套语言设计视角 |
| [organizational_semantics.md](./organizational_semantics.md) | 把并行、通信、层级、抽象、继承放在同一篇里讲清楚，并给出 game/social MVP 例子 |
| [boundaries_and_map.md](./boundaries_and_map.md) | 给整个模块画出大地图，把并行、通信、层级、抽象、继承以及更多候选主题放回同一版图 |

## 四、从脚本、对象到 Agent：编程抽象的继续上移

第一阶段，编程处理的是指令。核心问题是“按顺序执行什么”。汇编和早期过程式语言解决的是机器控制问题。

第二阶段，编程处理的是结构化数据与模块化过程。变量、函数、对象、模块逐渐成为稳定抽象。核心问题变成“如何让复杂系统可维护、可复用、可组合”。

第三阶段，云服务与 API 把很多能力外包给外部系统。程序不再只操作本地内存，也操作远端状态、队列、数据库和服务契约。工程重心开始从“算法本身”转向“系统编排”。

第四阶段，agent 出现后，系统开始直接操作“具有局部自主性、可读上下文、可积累记忆、可调用工具”的执行单元。2023 到 2026 年的工程实践已经表明，传统变量和对象抽象不足以完整描述这一层能力。新的语言部件迟早会出现，只是今天还没有统一名字和稳定范式。

这一阶段不会只产生一个新名词，而会逐步长出一整套新基础设施：先有变量级抽象，再有数据结构，再有状态语义，再有类型系统，再有运行时，接着就会自然长出 collections、control flow、组织语义，最后逼近 language design，并要求一张更大的边界地图。只有当这些层一起出现，agent 编程才会像一门语言，而不是一堆框架习惯。

## 五、阅读建议

如果你最关心这个观点是否站得住，先读 [agent_as_variable.md](./agent_as_variable.md)。它负责把“agent 不是函数，而更像变量”的核心命题立住。

如果你更关心系统到底要存哪些字段，再读 [agentic_data_structures.md](./agentic_data_structures.md)。它会把 agent 从抽象口号压缩成一个最小数据模型。

如果你最关心“value 和 address”类比如何被正式化，接着读 [state_context_and_identity.md](./state_context_and_identity.md)。它会说明状态、上下文和身份分别处在哪一层，以及为什么它们不能混在一起。

如果你开始关心“哪些 agent 能安全地连在一起、谁该拥有何种权限、哪些实例根本不该被混用”，继续读 [agentic_type_system.md](./agentic_type_system.md)。

如果你关心“系统怎样长期托管这些 agent，而不是每次都像临时脚本一样重来”，再读 [agentic_runtime.md](./agentic_runtime.md)。

如果你已经在思考“数组、栈、队列、堆、图在 agent 世界里分别对应什么”，继续读 [agentic_collections.md](./agentic_collections.md)。

如果你进一步关心“`if / for / while / function / exception` 到底如何变成 agentic 执行语义”，再读 [agentic_control_flow.md](./agentic_control_flow.md)。

如果你开始真正关心“这些部件加起来到底会形成怎样的语言表面”，再读 [agentic_language_design.md](./agentic_language_design.md)。

如果你现在更想把多 agent 的第一圈组织问题一次性看清，再读 [organizational_semantics.md](./organizational_semantics.md)。它把并行、通信、层级、抽象、继承放在同一篇里，并用一个 game MVP 和一个社交产品 MVP 来落地。

如果你发现自己开始不断想到并行、通信、层级、抽象、继承，以及更多还没命名清楚的主题，最后读 [boundaries_and_map.md](./boundaries_and_map.md)。它负责把这些自然长出来的问题先整理成一张总图，而不是急着把每一个都单独展开。

前置阅读建议：[Meta Code 总览](../introduction.md) 说明为什么 LLM 时代真正稀缺的是抽象与约束设计；延展阅读可参考 [Context Engineering](../auto/context_engineering/introduction.md)，理解上下文为何只是更大结构中的一个字段，而不是全部。
