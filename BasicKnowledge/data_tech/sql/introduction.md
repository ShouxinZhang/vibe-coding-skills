# SQL：把现实压缩成可计算的秩序

> SQL 不只是一门查询语言。它是一种把现实拆成实体、关系、规则与时间序列的方法。语法会被工具替代，但这种结构化思维不会。

---

## 一、为什么这个模块值得展开

表格是人类最古老也最稳定的信息组织形式之一。账本、名册、排班表、库存表，本质上都在回答同一个问题：**如何把复杂现实压缩成稳定结构。**

SQL 把这种直觉形式化了：

- 表（Table）定义一类事物
- 行（Row）记录一个具体实例
- 列（Column）刻画这个实例的关键属性
- 约束（Constraint）声明这个世界允许什么、不允许什么

因此，SQL 的价值从来不只是“查数据”。它真正服务的业务结果有三类：

- **记录**：把关键事实留存为可以追溯的结构
- **分析**：从海量事件里提取规律、风险与机会
- **协作**：让产品、运营、工程、AI 系统共享同一套事实骨架

---

## 二、模块结构

这一部分已经扩展成 4 个子目录，分别覆盖查询、建模、分析和 AI 时代的新应用：

| 文件 | 内容简介 |
|------|---------|
| [query_basics/introduction.md](./query_basics/introduction.md) | 查询基础：如何用 SELECT、聚合、JOIN 和 CTE 向数据提问 |
| [schema_design/introduction.md](./schema_design/introduction.md) | 表结构设计：如何把业务对象、关系、约束落成稳定 schema |
| [analytical_sql/introduction.md](./analytical_sql/introduction.md) | 分析型 SQL：如何做趋势、窗口、漏斗、留存等决策分析 |
| [sql_in_ai_era/introduction.md](./sql_in_ai_era/introduction.md) | SQL 在 LLM、Agent 与个人数据系统中的新角色 |
| [../sql_and_rag.md](../sql_and_rag.md) | 相关专题：SQL 与 RAG 的边界、协作与取舍 |

---

## 三、SQL 的四层能力

### 1. 查询：我想看什么

```sql
SELECT date, mood
FROM daily_log
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

这条语句的业务含义并不复杂：从全部记录里，筛出最近 7 天，并按时间倒序给我看。看似只是语法，实际上是在定义观察范围、排序优先级和信息粒度。

### 2. 聚合：我想知道规律是什么

```sql
SELECT mood, COUNT(*) AS count
FROM daily_log
GROUP BY mood
ORDER BY count DESC;
```

当你写 `GROUP BY`，你已经不再关心单个事件，而是在选择一个理解世界的维度。按情绪分组、按周分组、按城市分组，得到的不是同一个故事。

### 3. 建模：我准备如何描述这个世界

```sql
CREATE TABLE growth_log (
    id          INTEGER PRIMARY KEY,
    recorded_at TIMESTAMP NOT NULL,
    type_id     INTEGER NOT NULL,
    quantity    NUMERIC,
    note        TEXT
);
```

SQL 写得是否优雅，往往取决于写 SQL 之前的表设计是否清晰。实体边界模糊，后续所有查询都会变得别扭；关系建得混乱，后续所有分析都会带着噪声。

### 4. 连接现代 AI：如何把结构化事实喂给智能系统

Text-to-SQL、Agent、个人数据库、混合检索，这些新场景没有让 SQL 过时，反而放大了它的作用。因为 AI 很擅长生成语言，但要想可靠执行任务，仍然需要一层**精确、可审计、可回滚**的事实存储。

---

## 四、阅读路线

如果你的目标是尽快把 SQL 用起来，建议按业务目标来读：

1. 想会写查询：先读 [query_basics/introduction.md](./query_basics/introduction.md)
2. 想把表设计对：再读 [schema_design/introduction.md](./schema_design/introduction.md)
3. 想做分析与报表：继续读 [analytical_sql/introduction.md](./analytical_sql/introduction.md)
4. 想把 SQL 接到 LLM 或 Agent：最后读 [sql_in_ai_era/introduction.md](./sql_in_ai_era/introduction.md)

如果你的目标是建立“SQL 思维”，顺序则相反地更偏基础设施：**先建模，再查询，再分析，再连接 AI。**

---

## 五、一个核心判断

SQL 的门槛确实在下降。今天，LLM 可以替你写出不少查询语句。但真正稀缺的，不再是记住多少语法，而是下面这些判断力：

- 哪些事实应该被结构化保存
- 哪些字段必须被约束
- 哪个粒度最适合分析问题
- 哪些问题该交给 SQL，哪些该交给 RAG 或其他系统

换句话说，SQL 作为“语法”的价值在被自动化削弱，SQL 作为“结构化思维”的价值却在继续上升。

---

*最后更新：2026年3月*
