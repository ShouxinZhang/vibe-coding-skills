# 时间序列分析：业务不是静止的

> 单日数据通常只是一张快照。真正对管理有用的，往往是连续时间上的变化：什么时候开始增长，什么时候突然下滑，波动是偶然还是趋势。

---

## 一、时间是最常见的业务坐标轴

营收、活跃、复购、投诉、库存、响应时长，这些指标几乎都要放到时间轴上看。因为管理真正关心的是变化，而不是某个孤立时刻的值。

```sql
SELECT DATE_TRUNC('day', paid_at) AS day,
       SUM(amount) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY DATE_TRUNC('day', paid_at)
ORDER BY day;
```

这条 SQL 看起来简单，但已经完成了时间序列分析的最小闭环：定义时间口径、确定指标、按顺序呈现。

---

## 二、时间分析最关键的是口径一致

同一个“收入”指标，可能对应不同时间字段：

- 下单时间
- 支付时间
- 发货时间
- 完成履约时间

不同口径会对应不同的管理问题。比如现金流分析更关心支付时间，履约效率分析更关心发货时间。如果口径没有先讲清，后续所有趋势图都可能误导决策。

---

## 三、同比、环比和移动平均

### 环比

```sql
WITH monthly_revenue AS (
    SELECT DATE_TRUNC('month', paid_at) AS month,
           SUM(amount) AS revenue
    FROM orders
    WHERE status = 'paid'
    GROUP BY DATE_TRUNC('month', paid_at)
)
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue
FROM monthly_revenue;
```

环比适合看短期运营动作是否生效。

### 同比

同比强调和去年同周期比较，适合季节性明显的业务。

### 移动平均

移动平均的价值在于抹平噪声，让你更容易看清趋势方向，而不是被单日波动牵着走。

---

## 四、时间序列分析最容易误导人的地方

1. 把自然月和最近 30 天混着比较。
2. 忽略节假日和大促等外部冲击。
3. 把异常峰值误判成长期趋势。

时间分析永远不是“把图画出来”就结束，而是要结合业务背景解释为什么会发生这些波动。

---

## 五、时间序列的业务价值

时间分析之所以重要，是因为管理动作几乎总是面向未来，而未来判断只能基于历史变化轨迹。SQL 在这里提供的不是预测模型，而是一条足够可信的事实时间线。

---

*最后更新：2026年3月*