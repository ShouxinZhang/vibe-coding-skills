# 生命：Agent 如何从工具变成持续存在的系统

## 模块定位

如果说 [foundations.md](../../foundations.md) 讨论的是 Agent 的形式化定义，[intelligence/introduction.md](../intelligence/introduction.md) 讨论的是 Agent 如何在约束下做对事，那么 Life 讨论的是另一个更底层的问题：**一个 Agent 如何持续存在，而不是只在单次调用里短暂起效。**

这个子模块关心的不是生物学意义的生命，而是工程意义上的生命性。一个系统一旦表现出边界、自我维持、资源循环、自我修复与环境耦合，它就开始呈现出某种"活性"。这也是 Agent 从一次性工具走向长期资产的分水岭。

---

## 为什么需要单独讨论生命

很多 Agent 工程只看单次任务成功率，而忽略跨时间的存续能力。结果往往是：

- 单次效果不错，但长期成本失控
- 角色和状态经常漂移，用户难以建立信任
- 失败后无法恢复，系统越来越脆弱

这说明问题不只是"能力够不够强"，而是"这个系统能不能持续活着"。Life 子模块正是为了解答这一层问题。

---

## 模块内容架构

| 文件 | 内容简介 |
|------|---------|
| [essence.md](./essence.md) | 生命等价物：把边界、代谢、适应、自我修复等生命特征映射为 Agent 世界中的工程结构 |
| [conditions.md](./conditions.md) | 最小生命性条件：持续边界、资源循环、自我修复、环境耦合四个必要条件 |

---

## 与其他模块的边界

- 与 [../intelligence/introduction.md](../intelligence/introduction.md) 的关系：Intelligence 回答"如何做对事"，Life 回答"如何持续在场"。
- 与 [../../memory/introduction.md](../../memory/introduction.md) 的关系：Memory 是生命性的关键基础设施，但这里讨论的是生命定义，不展开实现机制。
- 与 [../../agent_evolution/introduction.md](../../agent_evolution/introduction.md) 的关系：Evolution 讨论如何变强，Life 讨论在变强之前如何保持存在连续性。

---

## 建议阅读顺序

建议先读 [essence.md](./essence.md)，建立生命等价物的基本映射，再读 [conditions.md](./conditions.md)，理解一个 Agent 要具备生命感最低需要哪些条件。

如果你关心更宏观的本体问题，可以回到 [../introduction.md](../introduction.md)；如果你关心长期经验如何支撑生命连续性，可以继续阅读 [../../memory/introduction.md](../../memory/introduction.md)。