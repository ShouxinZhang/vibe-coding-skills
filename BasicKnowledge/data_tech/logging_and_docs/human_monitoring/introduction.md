# Human Monitoring：让人类低成本看懂并接手系统

## 一、为什么“人工监控”需要独立成层

自动化系统越强，越不能把人类的职责理解成“盯着执行细节”。真正有业务价值的，不是让人随时看全量日志，而是让人只在关键时刻看见最关键的信号，并在需要时快速接手。

这意味着人工监控不是底层日志的附属视图，而是一层独立设计：它要把原始执行痕迹压缩成摘要、异常模式、风险等级和接管入口，让人类在低注意力成本下仍然保有判断力。

因此，这个子模块聚焦的不是“系统记了什么”，而是“人类如何以最少认知成本理解系统现在值得不值得介入”。

## 二、这个子模块解决什么问题

很多系统的监控面做得很满，却仍然不可用。原因通常不是数据太少，而是信号太散：负责人大量看不懂细节，执行者拿不到足够上下文，真正高风险的异常淹没在无数普通报错里。

当系统需要人工接手时，问题会更严重。人类拿到的往往不是高密度接管包，而是一堆原始日志、一条不完整的时间线和若干模糊状态，于是接管前最贵的成本变成重新理解发生了什么。

这个子模块要解决的，正是这种“可见但不可判断、可接管但接不住”的问题。

## 三、内容索引

| 文件 | 内容简介 |
|------|---------|
| [monitoring_surfaces_and_alerts.md](./monitoring_surfaces_and_alerts.md) | 监控面与告警：人类该看什么、哪些异常值得介入、怎样降低盯盘成本 |
| [human_takeover_and_audit.md](./human_takeover_and_audit.md) | 人工接管与审计：如何让人类快速接手系统，并在事后还原责任链 |

## 四、与上层和下层的关系

这个子模块的下层基础，仍然来自上级目录里的通用数据骨架，尤其依赖：

- [../data_quality_and_governance.md](../data_quality_and_governance.md)
- [../privacy_and_portability.md](../privacy_and_portability.md)
- [../document_versioning_and_diff.md](../document_versioning_and_diff.md)
- [../metadata_and_indexing.md](../metadata_and_indexing.md)

与此同时，它和自主运行子模块天然互补。系统先要具备连续运行和检查点，人工监控才能基于稳定状态工作；而一旦自主链路偏航，人类又必须通过监控面和接管包进入系统。对应入口见 [../agent_autonomy/introduction.md](../agent_autonomy/introduction.md)。

## 五、推荐阅读顺序

建议先读 [monitoring_surfaces_and_alerts.md](./monitoring_surfaces_and_alerts.md)，先把“人到底该看什么”这件事看清楚，再读 [human_takeover_and_audit.md](./human_takeover_and_audit.md)，理解真正的人工接手需要哪些数据准备。

如果你的目标是做长期可运营的自动系统，这两个文件不应该被当成“最后再补的面板问题”，而应该被视为自动化可信度本身的一部分。
