# 从事件到规律：聚合与分组

> 单条记录告诉你发生了什么，聚合告诉你反复发生了什么。业务分析真正关心的，通常不是一个点，而是一类模式。

---

## 一、为什么聚合是分析的起点

订单、点击、评论、打卡、阅读记录，这些原始数据都以“事件”的形式存在。事件足够真实，但也足够嘈杂。只有聚合以后，系统才开始显露出规律。

```sql
SELECT mood, COUNT(*) AS count
FROM daily_log
GROUP BY mood;
```

这条 SQL 做的不是算术，而是把“单条记录”提升成“按情绪分类的整体分布”。

---

## 二、GROUP BY 的本质是选择观察粒度

同一批订单，可以按城市、渠道、日期、用户类型来分组。你怎么分组，就决定你准备从哪个角度理解业务。

```sql
SELECT DATE(created_at) AS day, COUNT(*) AS order_count
FROM orders
GROUP BY DATE(created_at)
ORDER BY day;
```

这里选择的是“天”这个粒度。如果改成周或月，波动会被平滑，结论也会改变。粒度从来不是中立决定，而是分析口径的一部分。

---

## 三、常见聚合函数各自回答什么问题

| 函数 | 回答的问题 |
|------|-----------|
| `COUNT(*)` | 一共有多少条事件 |
| `SUM(amount)` | 总量是多少 |
| `AVG(score)` | 平均水平如何 |
| `MAX(value)` | 峰值在哪里 |
| `MIN(value)` | 底部在哪里 |

例如：

```sql
SELECT channel,
       COUNT(*) AS signup_count,
       AVG(cost) AS avg_cost,
       SUM(revenue) AS total_revenue
FROM campaign_events
GROUP BY channel;
```

这条 SQL 让你同时看到渠道规模、平均成本和总收入，是典型的经营分析视角。

---

## 四、HAVING：在分组之后继续筛选

`WHERE` 过滤行，`HAVING` 过滤组。这是很多初学者第一次写错的地方。

```sql
SELECT city, COUNT(*) AS order_count
FROM orders
GROUP BY city
HAVING COUNT(*) >= 100;
```

这条查询要表达的是：只保留订单数足够多的城市。它不是在过滤单条订单，而是在过滤聚合后的业务单元。

---

## 五、时间聚合最容易犯的错

时间分析中，最常见的误判来自口径不一致：

- 把创建时间和支付时间混着用
- 把自然月和最近 30 天混为一谈
- 忽略时区，导致日切点错位

```sql
SELECT DATE_TRUNC('month', paid_at) AS month,
       SUM(amount) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY DATE_TRUNC('month', paid_at)
ORDER BY month;
```

这种写法的重点不只在函数本身，而在于：你必须先定义“收入归属到哪个时间点”。是下单时间、支付时间，还是完成履约时间？不同答案，对经营判断影响很大。

---

*最后更新：2026年3月*