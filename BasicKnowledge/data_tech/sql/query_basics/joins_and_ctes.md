# 把事实重新连接起来：JOIN 与 CTE

> 现实世界的大多数问题，都无法靠一张表回答。用户、订单、支付、商品、日志，它们被分开保存，正是为了让系统更稳定；而 JOIN 和 CTE 的任务，是在查询时把这些分散事实重新组织成答案。

---

## 一、为什么数据总是被拆开存

如果把用户信息、订单信息、商品信息全塞进一张表，短期看似方便，长期一定会出现冗余、冲突和维护失控。因此，结构化系统往往选择把不同实体拆开存储。

拆开之后，就需要在查询时重新连接。

```sql
SELECT o.id, u.name, o.total_amount
FROM orders o
JOIN users u ON o.user_id = u.id;
```

这条 SQL 的业务意义很直接：订单表告诉你发生了交易，用户表告诉你交易属于谁。JOIN 让两个事实在查询时合流。

---

## 二、最常见的三种 JOIN

| 类型 | 业务含义 |
|------|---------|
| `INNER JOIN` | 只保留双方都存在的记录 |
| `LEFT JOIN` | 保留左表全部记录，右表能补充则补充 |
| `FULL JOIN` | 保留双方全部记录，常用于对账和异常排查 |

例如找出“有用户但还没有下过单的人”：

```sql
SELECT u.id, u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

这里 `LEFT JOIN` 的作用不是技巧，而是业务表达：我要以用户为全集，看哪些用户还没有对应订单。

---

## 三、JOIN 最容易出错的地方

### 1. 连接条件不完整

少写一个条件，结果集就可能被无意放大，形成重复行。

### 2. 不知道自己要以谁为“主表”

以用户为主表和以订单为主表，得到的业务结论完全不同。主表决定了你把谁当成全集。

### 3. 聚合前就被重复行污染

多表连接后，如果明细被放大，再做 `COUNT` 或 `SUM`，最终结果往往会高得离谱。这类错误最危险，因为 SQL 可以正常执行，报表却悄悄失真。

---

## 四、CTE：给复杂逻辑取名字

CTE（Common Table Expression）通常写成 `WITH ... AS (...)`。它最大的价值不是炫技，而是把复杂查询拆成几个可读的中间步骤。

```sql
WITH paid_orders AS (
    SELECT id, user_id, total_amount
    FROM orders
    WHERE status = 'paid'
),
top_users AS (
    SELECT user_id, SUM(total_amount) AS total_spent
    FROM paid_orders
    GROUP BY user_id
)
SELECT *
FROM top_users
ORDER BY total_spent DESC
LIMIT 10;
```

这段 SQL 比一口气嵌套到底更容易审查。因为每个阶段都被命名了：先定义有效订单，再聚合用户消费，最后取头部用户。

---

## 五、复杂 SQL 的一个原则

当查询开始变复杂时，不要问“还能不能再压缩一行”，而要问：

1. 每一步逻辑是否有独立业务意义？
2. 中间结果是否可以单独解释？
3. 最终结果是否可能因为 JOIN 重复而失真？

如果这三点都清楚，SQL 即使长一点，也依然是可信的。

---

*最后更新：2026年3月*