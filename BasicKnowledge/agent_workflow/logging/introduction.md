# 日志记录：两种受众，两套体系

## 一个根本性的区分

"日志"这个词在 Agent Workflow 里被混用了太多次，导致系统设计时经常出现错位——为人类设计的日志被 agent 当作上下文读取，为 agent 设计的结构化数据被人类当作审计报告看。

两者的目的完全不同，应该彻底分开。

---

## 两种日志的对比

| | 人类日志（Human Log） | Agent 日志（Agent Log） |
|---|---|---|
| **受众** | 人类审阅者 | 下一个执行任务的 agent |
| **目的** | 审计、溯源、事故还原 | 上下文传递、避免重复错误、感知工作区历史 |
| **格式** | Markdown，叙事性强 | 结构化（JSON / SQLite），机器可直接解析 |
| **写入时机** | 任务结束后，关账动作 | 任务执行过程中，实时更新 |
| **读取时机** | 人类按需查阅 | 每次任务开始时 agent 主动加载 |
| **核心内容** | 做了什么、为什么、结果如何 | 当前工作区状态、已知限制、上次操作结论 |
| **腐烂风险** | 被跳过不写 | 字段不更新导致 agent 读到过时状态 |

---

## 为什么不能合并

有人会想：既然都是日志，写一份不就好了？

不行，原因有两个：

**1. 格式冲突**  
人类最需要的是叙事性的摘要——"为什么这样做"比"做了什么"更重要。agent 最需要的是精确的结构化字段——模糊的自然语言会让 agent 误读上下文。把两者混在一起，要么摘要太机械（人类读不下去），要么结构太松散（agent 无法可靠解析）。

**2. 更新频率不同**  
Agent 日志需要在任务执行过程中实时更新，每次工具调用之后都可能有新状态需要记录。人类日志是任务完成后的"总结陈述"，频繁更新反而会降低可读性。

---

## 本模块的章节结构

- **[human_log/](./human_log/introduction.md)**：为人类审阅设计的任务日志（已拆分为独立文件夹）
  - [introduction.md](./human_log/introduction.md)：定位与概述
  - [field_specification.md](./human_log/field_specification.md)：字段规范
  - [writing_craft.md](./human_log/writing_craft.md)：写作技艺
  - [storage_architecture.md](./human_log/storage_architecture.md)：存储架构
  - [anti_corruption.md](./human_log/anti_corruption.md)：防腐烂机制
- **[agent_log/](./agent_log/)**：为 agent 内部消费设计的状态日志——数据模型、读写协议、生命周期管理
  - [introduction.md](./agent_log/introduction.md)：定位与引言
  - [data_model.md](./agent_log/data_model.md)：三种核心数据结构的深入设计
  - [read_protocol.md](./agent_log/read_protocol.md)：任务启动时的加载流程与上下文压缩
  - [write_protocol.md](./agent_log/write_protocol.md)：事件驱动的实时写入机制
  - [lifecycle.md](./agent_log/lifecycle.md)：增长控制、记忆蒸馏与灾难恢复
