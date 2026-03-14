# Agentic Control Flow：把 if、for、while、function、exception 变成 Agent 执行语义

## 一、为什么 Agent Programming 不能只讲结构，还要讲控制流

定义了 agent、状态、类型、运行时之后，系统仍然缺少一件决定性的东西：执行语义。

程序之所以像程序，不只是因为它有变量和数据结构，还因为它知道什么时候分支、什么时候循环、什么时候调用、什么时候失败、失败后怎么办。控制流负责把静态结构变成动态行动。

对 agent 系统来说，这层更关键。因为 agent 不只是算一次，它会等待、判断、回环、交接、恢复，甚至让出控制权给人类或别的 agent。没有 control flow，agent 系统只能停留在“有很多节点的图”，很难成为真正可表达复杂行为的语言。

## 二、if：条件路由、门禁与策略分支

在传统语言里，`if` 的作用是根据条件选择路径。在 agent 世界里，它首先对应三类机制：

| 经典 `if` | Agentic 对应物 | 业务作用 |
|----------|----------------|---------|
| 条件判断 | Conditional Routing | 根据当前状态把任务送往不同 agent 或不同子图 |
| 守卫分支 | Gate / Guard | 在关键节点阻断错误继续传播 |
| 策略选择 | Policy Branch | 根据预算、风险、用户等级切换执行策略 |

因此，agentic `if` 不只是布尔判断，更像“谁获得下一步行动权”的裁决机制。

## 三、for：对 Agent 集合和任务集合做批量行动

`for` 在传统语言里表示遍历集合。在 agent 世界里，它的价值会更大，因为很多系统的核心能力就是“对一组执行单元做统一动作”。

Agentic `for` 最常见的三种形态是：

| 形态 | 含义 | 业务场景 |
|------|------|---------|
| 遍历 agent 池 | 对多个同类 agent 分发相似任务 | 并行调研、并行审查、冗余验证 |
| 遍历任务列表 | 把多个待办逐个处理 | 批量自动化、批量修复 |
| 遍历消息 / 文档分片 | 对大型输入做 map-reduce 式处理 | 长文档分析、证据收集 |

也就是说，agentic `for` 本质上会成为 fan-out、map-reduce、批量评估的语言级入口。

## 四、while：直到目标满足、预算耗尽或失败终止

`while` 的意义在 agent 世界里也会被放大。因为很多 agent 任务本来就不是执行一次，而是“做到某个条件成立为止”。

典型的 agentic `while` 包括：

- 直到拿到足够证据才停止检索
- 直到结果通过校验才停止修正
- 直到预算耗尽或达到最大轮次才停止迭代
- 直到人工批准才从等待状态恢复

这使得 agentic `while` 不只是循环，它本质上是“目标驱动迭代”的正式表达。

## 五、function：Skill、Subgraph 与 Agent Factory

传统函数的作用，是封装可复用动作。在 agent 系统里，这个角色会分裂成几层：

| 经典 `function` | Agentic 对应物 | 价值 |
|----------------|----------------|------|
| 普通函数 | Skill / Tool Wrapper | 封装可重复调用的局部能力 |
| 高阶函数 | Subgraph Builder | 封装一个可复用的执行片段 |
| 构造函数 | Agent Factory | 按类型、权限、上下文创建 agent 实例 |

因此，agentic `function` 不一定总是“输入数据，返回数据”。它也可能是“输入配置，返回一个 agent 句柄”或“输入状态，返回一个可继续运行的子图”。

这也是 agent 编程和传统函数式编程分岔的地方：返回值不再只是一段静态结果，也可能是一个还在活着的执行单元。

## 六、exception：失败恢复、回滚、人工接管

对 agent 系统来说，`exception` 不是附属能力，而是核心控制流。

因为 agent 系统的失败不是简单报错，而常常是：

- 模型输出不合格
- 工具调用失败
- 权限不足
- 上下文污染
- 外部依赖超时
- 某个子 agent 走偏

如果没有 agentic exception 语义，系统就只能整条链路重来，或者静默吞掉错误。两者都不适合生产。

因此，agentic `exception` 至少应包含：

| 异常语义 | 作用 |
|---------|------|
| Retry | 对短暂失败做有限重试 |
| Fallback | 切换到更保守的执行路径 |
| Rollback | 回退到上一个 checkpoint 或安全状态 |
| Escalation | 转人工接管或转给高权限 agent |
| Abort | 在风险过高时立即终止 |

## 七、LangGraph 当前已经走到了哪一步

以 `2026-03-12` 拉取的 LangGraph 仓库来看，它已经把一部分 agentic control flow 做成了工程现实，但还没有把它们完全提升成语言级原语。

从当前实现可以看到：

1. 条件路由已经很强。`StateGraph` 和 branching 支持条件边，说明 agentic `if` 已经有了稳定工程形态。
2. 循环也能做，但很多时候仍依赖宿主语言。仓库示例里可以看到 `for` 循环直接写在 `entrypoint` 或节点逻辑中，这说明 agentic `for/while` 还没有完全独立成语言层抽象。
3. 运行时恢复很强。checkpoint、thread、pending writes、interrupt 等机制已经把 exception/recovery 做成了重要能力。
4. `function` 这层更像 task、node、subgraph 的混合，而不是一套统一的 agentic function 语义。

这意味着 LangGraph 今天更接近“agentic runtime + graph control framework”，而不是完整 agentic programming language。它已经证明控制流可以被工程化，但还没有把这些控制流重写为一套统一语言。

## 八、为什么控制流会决定这门语言是否成立

从业务角度看，控制流层决定了三件事：

1. 系统是否能把复杂行为稳定复现，而不是靠 prompt 临场发挥。
2. 组织是否能把失败、恢复、升级、人工接管纳入正式流程。
3. 团队是否能把 agent 能力复用成可组合的执行模块，而不是一次性脚本。

如果只会画图，不会表达循环、调用、异常和恢复，那么系统本质上仍然是流程图工具；只有当这些语义被正式表达出来时，agent 编程才开始像编程语言。

## 九、下一步会往哪里长

未来的 agentic control flow 很可能会出现两层：

| 层 | 作用 |
|----|------|
| 声明层 | 用简洁语法描述路由、遍历、迭代、调用、异常 |
| 运行层 | 把这些语义编译到 checkpoint、scheduler、interrupt、recovery 之上 |

到那一步，`if / for / while / function / exception` 就不再只是 Python 或 TypeScript 的宿主语法，而会变成 agent 世界自己的控制语义。

延展阅读：[agentic_collections.md](./agentic_collections.md) 说明这些控制语义究竟在驱动哪些集合结构；实现底座见 [agentic_runtime.md](./agentic_runtime.md)。
