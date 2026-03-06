# 结构化记忆：个人数据系统为什么需要 SQL 骨架

> 如果说 RAG 更像联想记忆，那么 SQL 更像账本式记忆。个人数据系统真正有用，往往不是因为它存了很多内容，而是因为其中一部分关键事实被稳定地结构化了。

---

## 一、什么叫“结构化记忆”

结构化记忆不是把一切都表格化，而是把那些需要长期追踪、精确比较、可重复查询的事实抽出来，用表来保存。

例如：

- 阅读记录
- 消费流水
- 情绪打卡
- 习惯执行情况
- 项目里程碑

这些信息的共同点是：它们都带有明确时间点、状态和值，适合被长期累计和比较。

---

## 二、为什么个人系统尤其适合 SQL

对于个人场景，SQL 有几个实际优势：

- SQLite 足够轻量，本地就能运行
- 结构清晰，几年后仍然容易读懂
- 适合做时间线、统计报表和回顾
- 能与向量检索共存，各管一部分问题

这意味着，一个人不需要复杂云架构，也可以拥有属于自己的可查询事实层。

---

## 三、一个简单的数据骨架

```sql
CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY,
    recorded_at TIMESTAMP NOT NULL,
    mood_score INTEGER,
    note TEXT
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE journal_entry_tags (
    entry_id INTEGER NOT NULL REFERENCES journal_entries(id),
    tag_id INTEGER NOT NULL REFERENCES tags(id),
    PRIMARY KEY (entry_id, tag_id)
);
```

这个骨架已经足以支持很多问题：

- 过去 90 天情绪变化如何
- 哪些标签最常与低分情绪同时出现
- 某类主题在一年中出现频率如何变化

---

## 四、结构化记忆与语义记忆的分工

在个人系统里，最稳妥的做法通常不是二选一，而是分层：

- SQL 存结构化事实：时间、标签、数值、状态
- 向量库存长文本语义：笔记、日记、对话、灵感碎片

这样做的好处是：

- 精确统计交给 SQL
- 模糊回忆交给 RAG
- 最终由应用层或 LLM 汇总两边结果

---

## 五、个人数据主权的一个现实优势

当关键事实掌握在本地 SQL 里，你对自己的数据就有更强主权：

- 格式可迁移
- 查询可审计
- 存储成本低
- 不必完全依赖第三方云平台定义你的历史

这不是怀旧式数据库观念，而是在 AI 时代重新争取个人数据解释权的一种基础设施选择。

---

*最后更新：2026年3月*