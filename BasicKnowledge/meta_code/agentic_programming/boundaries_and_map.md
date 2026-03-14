# Agent Programming 的边界与大地图

本文件是 `agentic_programming` 模块的总导航：梳理已有主干、标记扩展方向、给出完整分层地图。

**核心原则：** 与其他模块的主题冗余是允许的，关键在于视角——本模块始终站在"agent 作为编程语言对象如何被表达、组织和约束"这个问题上。

## 一、当前主干

| 层 | 文件 | 作用 |
|----|------|------|
| 基本单元 | [agent_as_variable.md](./agent_as_variable.md) | 把 agent 立为可编程变量单元 |
| 单元结构 | [agentic_data_structures.md](./agentic_data_structures.md) | 定义 agent 最小字段与结构 |
| 状态语义 | [state_context_and_identity.md](./state_context_and_identity.md) | 区分状态、上下文、身份、引用、生命周期 |
| 类型边界 | [agentic_type_system.md](./agentic_type_system.md) | 定义角色、能力、权限与生命周期约束 |
| 执行底座 | [agentic_runtime.md](./agentic_runtime.md) | 定义创建、调度、恢复、派生、回收 |
| 集合组织 | [agentic_collections.md](./agentic_collections.md) | 数组、栈、队列、堆、图在 agent 世界的映射 |
| 控制语义 | [agentic_control_flow.md](./agentic_control_flow.md) | `if / for / while / function / exception` 的 agent 控制语义 |
| 语言视角 | [agentic_language_design.md](./agentic_language_design.md) | 收束为语言表面设计视角 |

主干已从单点观点演化为一套语言骨架。

## 二、完整分层地图

| 层 | 代表主题 | 说明 |
|----|---------|------|
| **基础语义层** | 变量、数据结构、状态/上下文/身份 | 定义 agent 到底是什么 |
| **语言机制层** | 类型系统、集合、控制流、语言设计 | 定义 agent 程序怎样被表达 |
| **组织语义层** | 并行、通信、层级、抽象、继承/组合 | 定义多个 agent 如何形成更高阶结构 |
| **运行治理层** | runtime、预算、审计、测试、安全、人类接管、版本演化 | 定义结构如何长期运行而不失控 |

第一、二层对应当前主干；第三、四层是接下来的自然扩展。

## 三、组织语义层：第一圈扩展

语言骨架长到多 agent 协作时，以下五个主题会自然浮现：

| 主题 | 触发条件 | 核心问题 |
|------|---------|---------|
| **并行** | agent 集合 + 调度 → 多执行单元同时工作 | 并行语义、fan-out/fan-in、共享状态冲突、并发原语 |
| **通信** | 多 agent 协作 → 消息、协议、handoff | 消息模型、agent 接口、协议语义、事件通道 |
| **层级** | 任务复杂 → 管理者/执行者/子 agent 分层 | 控制权分配、父子关系、结果上收与命令下发 |
| **抽象** | 经验复用 → 模式沉淀为高层接口 | agent 模板、模式库、可复用编排片段、上层 DSL |
| **继承** | 类型增多 → 新角色从旧角色演化 | 角色/能力/权限/记忆的继承，与 composition 的边界 |

其中层级、抽象、继承值得额外注意：

- **层级**是大规模任务下的自然结构语义，不是附属特性。
- **抽象**是语言通往"标准库"和"高级接口层"的桥梁。
- **继承**在 agent 世界里比传统 OO 更危险——继承的不只是方法，还有权限、默认行为、记忆习惯、风险边界，需与 composition/delegation 一并设计。

## 四、运行治理层：外围扩展

| 主题 | 核心问题 |
|------|---------|
| 模块与包（Modules / Packages） | agent 程序如何拆包、依赖、版本化 |
| 协议与接口（Protocols / Interfaces） | agent 间的合同与对话规范 |
| 组合与委托（Composition / Delegation） | 新能力如何由旧能力拼装 |
| 资源与预算（Budget / Cost Semantics） | token、工具、时间、人工审核如何进入语言语义 |
| 观察与审计（Observability / Audit） | 执行轨迹的保留、查询与回放 |
| 验证与测试（Verification / Testing） | agent 程序如何被系统性测试 |
| 安全与沙箱（Security / Sandbox） | 权限、隔离、越权调用的正式约束 |
| 演化与版本（Evolution / Versioning） | agent 类型、规则和技能的升级路径 |
| 人类接管（Human Override） | 人在语言中的角色定位 |

## 五、跨模块视角区分

同一主题在不同模块中视角不同：

| 模块 | 写通信/并行时的重点 |
|------|------------------|
| [agent_system](../../agent_system/introduction.md) | 多 agent 协作、博弈、协议、系统行为 |
| [workflow](../auto/workflow/introduction.md) | 状态机、流程推进、自动化编排 |
| **agentic_programming** | 能力进入语言表面后如何被建模、声明和控制 |

## 六、使用指南

**新主题入图判断：**

1. 属于哪一层？（基础语义 / 语言机制 / 组织语义 / 运行治理）
2. 是主干的一部分，还是扩展圈？
3. 在 agentic programming 视角下，核心问题是什么？

**推荐阅读顺序：**

1. [agentic_language_design.md](./agentic_language_design.md) — 理解语言主轴
2. 本文件 — 把握版图与扩展方向
3. 按兴趣进入具体主题
