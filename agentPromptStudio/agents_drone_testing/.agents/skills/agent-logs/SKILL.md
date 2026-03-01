---
name: agent-logs
description: '面向 agents 的执行日志技能。记录时间、用户原始 prompt、上下文摘要、文件改动、git 操作、模块化隔离与备份检查信息。'
---

# Agent Logs Skill

这个技能用于记录 agent 执行过程的关键审计信息，便于回溯、复盘和交接。

日志主存储为 Markdown 文件，直接落地在仓库根目录：`docs/agent-logs/`。
并按天做分区（文件夹分层），作为一个小型日志数仓。

## 记录要点

1. 时间（通过 Linux `date` 命令获取）
2. 用户完整原始 prompt（不截断）
3. LLM 执行上下文精简总结
4. 改动文件列表
5. 是否执行 git 操作
6. 是否模块化隔离
7. 是否执行备份，以及备份三特性检查

## 备份三特性定义

这里默认采用以下三项检查：

1. `integrity_ok`：备份数据完整性通过（如校验和）
2. `consistency_ok`：备份数据一致性通过（逻辑一致）
3. `recoverability_ok`：备份可恢复性通过（可演练恢复）

## 命令用法

所有操作通过脚本完成：
`python3 .agents/skills/agent-logs/scripts/agent_logs.py <command> ...`

## 存储位置

- 分区目录：`docs/agent-logs/YYYY-MM-DD/`
- 单条日志：`docs/agent-logs/YYYY-MM-DD/log-xxxx-<HHMMSS>.md`
- 索引文件：`docs/agent-logs/INDEX.md`
- 分区索引：`docs/agent-logs/YYYY-MM-DD/INDEX.md`
- 总览导出：`docs/agent-logs/AGENT_LOGBOOK.md`

### 1. 新增日志

```bash
python3 .agents/skills/agent-logs/scripts/agent_logs.py add \
  --prompt "用户完整原始prompt" \
  --summary "本次LLM上下文摘要" \
  --git-op yes \
  --git-detail "执行了 git add 和 git commit" \
  --isolated yes \
  --backup yes \
  --integrity-ok yes \
  --consistency-ok yes \
  --recoverability-ok no \
  --backup-note "未做恢复演练" \
  --auto-files
```

说明：
- `--auto-files`：自动抓取当前 git 变更文件（已跟踪变更+未跟踪文件）
- 也可用 `--files` 手工传入文件列表

### 2. 查看单条日志

```bash
python3 .agents/skills/agent-logs/scripts/agent_logs.py get 1
```

### 3. 列出最近日志

```bash
python3 .agents/skills/agent-logs/scripts/agent_logs.py list --limit 20
```

### 4. 导出 Markdown 总览

```bash
python3 .agents/skills/agent-logs/scripts/agent_logs.py export
```

默认导出到：`docs/agent-logs/AGENT_LOGBOOK.md`
