# 日志与文档：给知识基础设施补上时间维度

> SQL 擅长回答“现在有什么”，RAG 擅长回答“哪些内容相关”，而日志与版本系统回答的是另一个更底层的问题：这些事实与内容是如何一步步变成今天这个样子的。

---

## 一、为什么这个模块值得展开

在数据技术里，最容易被低估的不是存储容量，也不是检索速度，而是**变化本身**。

一份文档今天是正确的，明天可能已经过时；一张表上午有 100 条记录，晚上可能变成 103 条；一条制度上周有效，这周可能被新的规则替代。系统如果只能保存“当前状态”，却无法回答“何时变化、为何变化、变化影响了谁”，它就仍然只是存储系统，而不是成熟的知识基础设施。

因此，这个模块讨论三件事：

- **日志系统**：如何把变化记录成可追溯、可回放的数据
- **文档版本**：如何把知识状态组织成有历史的资产
- **治理机制**：如何让这些记录在长期积累后仍然可信、可检索、可迁移

---

## 二、这个模块解决什么问题

### 2.1 覆写很方便，但会抹平历史

很多系统默认只保留最新值。短期看起来整洁，长期却会带来一系列问题：

- 不知道某条结论是什么时候改掉的
- 不知道某份文档为什么从正确变成错误
- 不知道坏结果来自一次误改，还是一串持续退化的小改动
- 不知道应该回滚到哪个时间点才安全

### 2.2 没有变化记录，就没有可靠的责任链

知识系统真正稀缺的，不是“有内容”，而是“这份内容能不能被信任”。

信任需要回答：

- 谁写入了它
- 写入依据是什么
- 哪次更新引入了分歧
- 哪些下游索引、缓存、摘要已经消费了这次变化
- 如果要撤销，影响范围有多大

### 2.3 没有时间维度，知识就只是静态快照

制度会变，口径会变，人的观点也会变。数据技术不能只保存“内容”，还要保存**内容的演化轨迹**。日志、版本、索引、治理，本质上都在服务这件事。

---

## 三、模块定位

这个模块放在 `data_tech` 下，而不是放进 `agent_workflow/logging`，原因很直接：

- `agent_workflow/logging` 关注的是工作流里的 **Human Log / Agent Log** 设计
- 这里关注的是面向知识库、文档库、日志库、个人数据系统的**通用数据基础设施**

换句话说，这里不讨论“任务日志应该怎么写”，而讨论：

- 状态怎么演化
- 演化怎么存储
- 变化怎么被索引和召回
- 历史怎么服务今天的查询、检索和判断

它与现有模块形成分工：

- [../sql/introduction.md](../sql/introduction.md)：负责结构化事实如何被建模与查询
- [../rag/introduction.md](../rag/introduction.md)：负责非结构化内容如何被语义召回
- [../sql_and_rag.md](../sql_and_rag.md)：负责两者的边界与协作
- 本模块：负责事实与内容如何在时间中留下可靠轨迹

---

## 四、模块结构

| 文件 | 内容简介 |
|------|---------|
| [log_systems_engineering.md](./log_systems_engineering.md) | 日志系统工程：事件、顺序、回放、归档与同步 |
| [document_versioning_and_diff.md](./document_versioning_and_diff.md) | 文档版本与差异：快照、增量、结构化 diff 与语义 diff |
| [metadata_and_indexing.md](./metadata_and_indexing.md) | 元数据与索引：如何让日志和文档在长期积累后仍然可找、可过滤、可组合 |
| [data_quality_and_governance.md](./data_quality_and_governance.md) | 数据质量与治理：可信度、口径稳定性、审计与反腐烂机制 |
| [temporal_data_modeling.md](./temporal_data_modeling.md) | 时间数据建模：发生时间、记录时间、生效时间与历史关系 |
| [retrieval_and_resurfacing.md](./retrieval_and_resurfacing.md) | 检索与再唤醒：如何让旧记录在正确时机重新出现 |
| [privacy_and_portability.md](./privacy_and_portability.md) | 隐私与可移植性：本地优先、导出迁移与长期可读性 |

---

## 五、阅读路线

如果你的目标是理解“为什么知识基础设施必须管理变化”，建议按这个顺序阅读：

1. [log_systems_engineering.md](./log_systems_engineering.md)
2. [document_versioning_and_diff.md](./document_versioning_and_diff.md)
3. [temporal_data_modeling.md](./temporal_data_modeling.md)
4. [metadata_and_indexing.md](./metadata_and_indexing.md)
5. [retrieval_and_resurfacing.md](./retrieval_and_resurfacing.md)
6. [data_quality_and_governance.md](./data_quality_and_governance.md)
7. [privacy_and_portability.md](./privacy_and_portability.md)

如果你的目标是做一个个人知识库或日志系统，可以按工程顺序来读：

1. 先决定时间模型和版本模型
2. 再决定元数据和索引策略
3. 最后补齐治理、隐私和迁移能力

---

## 六、一个核心判断

很多团队一开始会优先做搜索框、问答入口、向量检索和可视化面板。这些都重要，但它们主要在优化“如何使用知识”。

日志系统、版本系统、治理系统优化的是更底层的事情：**让知识本身值得被信任。**

没有历史，知识只是当前文本。

有了历史，知识才开始成为基础设施。

---

*最后更新：2026年3月*