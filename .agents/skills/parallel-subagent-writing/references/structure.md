# Structure

## 目标

把并行写作任务拆成两层边界：

- 任务级缓存区：`.agent_cache/<task-slug>/`
- Agent 级工作区：`.agent_cache/<task-slug>/<agent-name>/`

这里的边界只用于隔离，不用于强制目录分层。每个 subagent 可以在自己的工作区内自由创建文件和子目录。

## 推荐结构

```text
.agent_cache/
  <task-slug>/
    <agent-name-1>/
    <agent-name-2>/
    <agent-name-3>/
```

## 刚性约束

- `.agent_cache/` 视为运行期缓存区，不承载正式内容。
- 一个 subagent 只操作自己被分配的工作区。
- 正式内容的最终落地由主 agent 完成。
- 可重复的路径创建、路径解析、产物列举、清理动作，优先交给脚本执行。

## 非目标

- 不预设 `sources/`、`drafts/`、`merged/` 等内部层级。
- 不让多个 subagent 直接写正式模块。
- 不要求子 agent 只返回文本而不落盘。