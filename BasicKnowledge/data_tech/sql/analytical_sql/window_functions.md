# 窗口函数：既看整体，也不丢明细

> 传统聚合会把很多细节压扁。窗口函数的价值在于，你可以一边保留每一行原始记录，一边让这行记录知道自己在整个群体中的位置。

---

## 一、为什么窗口函数重要

如果只用 `GROUP BY`，你通常要在“明细”和“汇总”之间二选一。窗口函数打破了这种取舍。

```sql
SELECT user_id,
       created_at,
       amount,
       SUM(amount) OVER (PARTITION BY user_id) AS total_amount
FROM orders;
```

这条 SQL 保留了每一笔订单，同时让每一行都知道该用户的总消费额。业务上，这意味着你可以在同一张结果表里同时做个体观察和整体比较。

---

## 二、最常见的三类窗口计算

### 排名

```sql
SELECT user_id,
       total_amount,
       RANK() OVER (ORDER BY total_amount DESC) AS rank_no
FROM user_summary;
```

这类写法适合头部用户、头部商品、头部渠道识别。

### 前后对比

```sql
SELECT user_id,
       month,
       revenue,
       LAG(revenue) OVER (PARTITION BY user_id ORDER BY month) AS prev_revenue
FROM monthly_revenue;
```

`LAG` 和 `LEAD` 特别适合做环比、阶段差值和行为序列分析。

### 累计值

```sql
SELECT created_at,
       amount,
       SUM(amount) OVER (
           ORDER BY created_at
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS cumulative_amount
FROM orders;
```

累计计算适合营收曲线、积分进度和库存消耗等场景。

---

## 三、窗口函数回答的是“相对位置”问题

窗口函数最有价值的，不只是帮你算出一个数，而是帮助你回答相对问题：

- 这笔订单处在该用户消费序列的第几步？
- 这个月收入相对上个月是增长还是下滑？
- 这个渠道在所有渠道里处在什么分位？

当业务开始关心“比较”而不是“单点数值”时，窗口函数几乎不可避免。

---

## 四、两个常见误区

1. 忘记 `PARTITION BY`，导致本该分组计算的结果变成全表计算。
2. 忘记 `ORDER BY`，导致前后关系或累计关系根本不成立。

窗口函数最怕的不是语法错误，而是逻辑边界写错但查询仍然能执行。

---

## 五、一个管理视角

窗口函数的本质，是让每条记录拥有上下文。对业务来说，这意味着系统不只是在存事件，而是在帮你理解每个事件在整体局势中的意义。

---

*最后更新：2026年3月*