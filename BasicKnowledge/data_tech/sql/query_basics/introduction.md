# 查询基础：向数据提问的最小闭环

> 学 SQL 的第一步，不是记忆语法，而是建立一种稳定的提问习惯：我想看什么、筛掉什么、怎样统计、怎样把分散的事实重新连接起来。

---

## 一、本模块解决什么问题

很多人把 SQL 理解成一组命令：`SELECT`、`WHERE`、`GROUP BY`、`JOIN`。这没有错，但也不够。真正有业务价值的 SQL 查询，背后都对应一个更具体的问题：

- 过去 30 天，哪些用户最不活跃？
- 哪类事件最容易引发退款？
- 某个城市的订单增长，究竟来自客单价还是订单数？

因此，这个模块讲的不是“如何背语法”，而是“如何把业务问题翻译成查询动作”。

---

## 二、文件导览

| 文件 | 内容简介 |
|------|---------|
| [select_and_filter.md](./select_and_filter.md) | SELECT、WHERE、ORDER BY、LIMIT 的核心思维 |
| [aggregation_and_grouping.md](./aggregation_and_grouping.md) | 如何从单条事件上升到分组统计与时间聚合 |
| [joins_and_ctes.md](./joins_and_ctes.md) | 如何连接多张表，并用 CTE 组织复杂查询 |

---

## 三、三个常见误区

### 1. 语法会了，不代表问题问对了

同样一份数据，按天聚合和按周聚合，得到的结论可能完全不同。真正难的不是语法，而是粒度选择。

### 2. 把查询写出来，不代表结果可信

遗漏 `WHERE`、错误处理 `NULL`、错误使用 `LEFT JOIN`，都可能让结论失真。SQL 的危险在于：它往往能执行，但未必回答了你真正的问题。

### 3. 查询复杂，不等于分析深入

很多 SQL 很长，只是因为逻辑没有被拆清楚。CTE、清晰命名和合理分层，往往比堆叠技巧更重要。

---

## 四、建议阅读顺序

1. 先读 [select_and_filter.md](./select_and_filter.md)，建立“观察范围”的意识。
2. 再读 [aggregation_and_grouping.md](./aggregation_and_grouping.md)，理解“粒度”和“统计口径”。
3. 最后读 [joins_and_ctes.md](./joins_and_ctes.md)，掌握多表与复杂逻辑的组织方法。

如果你已经能写简单查询，建议直接从第三篇开始，反过来校正之前的写法习惯。

---

## 五、一个最小例子

```sql
SELECT city, COUNT(*) AS order_count
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY city
ORDER BY order_count DESC
LIMIT 10;
```

这条 SQL 同时完成了 5 件事：

- 选定分析对象：`orders`
- 定义时间范围：最近 30 天
- 指定统计口径：按城市分组
- 计算指标：订单数
- 设定输出优先级：从高到低展示前 10 名

这就是一个完整的数据提问闭环。

---

*最后更新：2026年3月*