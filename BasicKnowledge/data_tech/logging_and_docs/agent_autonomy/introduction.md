# Agent Autonomy：让系统连续跑下去

## 一、为什么要把“自主运行”单独拆出来

日志与文档的底层骨架解决的是“系统如何留下历史”，但 Agent 真正开始长期工作时，新的问题会立刻出现：状态如何继承、失败如何恢复、旧记录如何在下一轮继续发挥作用。

这些问题已经不只是通用记录问题，而是明确的运行问题。它们直接决定一个 Agent 是一次性执行器，还是能跨轮次、跨天、跨版本稳定推进任务的连续系统。因此，“自主运行”值得从顶层模块里单独拆成子模块。

这个子模块关注三类最核心的能力：第一，如何维持当前状态和工作记忆的连续性；第二，如何通过检查点、回放和恢复机制避免整条链路重来；第三，如何让旧记录在新的运行轮次里继续被正确唤醒，而不是沉没成仓库噪音。

## 二、这个子模块解决什么问题

很多自动系统在首次执行时表现不错，但一旦任务跨越更长时间尺度，就会暴露共同缺陷：上一轮踩过的坑，这一轮还会再踩；中断之后只能整条链路重跑；旧记录虽然保留下来，却无法在关键时刻重新进入当前决策。

这些问题表面看是“Agent 偶尔不稳定”，更深一层其实是连续性基础设施不足。系统没有明确区分当前状态、历史痕迹、工作记忆和可复用资产，也没有把可恢复的阶段结果冻结为检查点，于是每一轮执行都像重新开局。

## 三、内容索引

| 文件 | 内容简介 |
|------|---------|
| [autonomous_agent_continuity.md](./autonomous_agent_continuity.md) | Agent 自主运行连续性：状态继承、工作记忆、检查点与清理机制的最小骨架 |
| [replay_checkpoint_and_recovery.md](./replay_checkpoint_and_recovery.md) | 回放、检查点与恢复：失败后如何精确续跑，而不是整条链路从零再来 |

## 四、与上层和下层的关系

往下，这个子模块建立在上级目录里的底层骨架之上，尤其依赖这些文章：

- [../log_systems_engineering.md](../log_systems_engineering.md)
- [../temporal_data_modeling.md](../temporal_data_modeling.md)
- [../metadata_and_indexing.md](../metadata_and_indexing.md)
- [../retrieval_and_resurfacing.md](../retrieval_and_resurfacing.md)

往上，它会与人工监控子模块形成配对关系：系统先要能连续运行，才谈得上低成本监控；而一旦连续运行出现偏航，又必须把接管入口交给人类。对应入口见 [../human_monitoring/introduction.md](../human_monitoring/introduction.md)。

## 五、推荐阅读顺序

建议先读 [autonomous_agent_continuity.md](./autonomous_agent_continuity.md)，先把连续运行的核心问题看清楚，再读 [replay_checkpoint_and_recovery.md](./replay_checkpoint_and_recovery.md)，理解失败后为什么不能只靠“再跑一次”。

如果你的目标是设计可长期运行的 Agent 系统，这两个文件和上层的时间、日志、索引文章应该一起读。它们共同回答的是：系统如何在时间中不丢失自己。
