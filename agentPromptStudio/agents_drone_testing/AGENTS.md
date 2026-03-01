# AGENTS 指南（简洁版）

## 1. 语言与沟通
- 默认使用中文（zh-cn）。
- 输出优先给可运行结果，不只给方案。

## 2. 项目目标
- 当前主程序：`rl_shortest_path_game.py`
- 目标：训练 agent 在矩形网格内以尽量短路径到达 apple。
- 支持：`train`、`play`、`gui` 三种模式。

## 3. 文档入口（完整）
- 总体说明：`README.md`
- 设备信息：`docs/device/hardware.md`
- 代理技能目录：`.agents/skills/`
- 工作区文档技能：`.agents/skills/workspace-docs/SKILL.md`
- 执行日志技能：`.agents/skills/agent-logs/SKILL.md`
- 架构守卫技能：`.agents/skills/architecture-guard/SKILL.md`
- Python 门禁技能：`.agents/skills/python-quality-gate/SKILL.md`

## 4. 环境与运行
- 创建环境：`python3 -m venv .venv`
- 安装依赖：`.venv/bin/python -m pip install -r requirements.txt`
- GUI 启动：`.venv/bin/python rl_shortest_path_game.py --mode gui`
- 高并行训练：`.venv/bin/python rl_shortest_path_game.py --mode train --episodes 80000 --maximize-hardware`

## 5. 质量门禁（必须执行）
- 标准门禁命令：
	- `.venv/bin/python .agents/skills/python-quality-gate/scripts/python_gate.py`
- 通过标准：
	- `Ruff` 无错误
	- `Pyright` 无错误
- 若失败：先修复再继续功能开发或提交。

## 6. 架构与文档门禁（建议执行）
- 架构检查：
	- `.venv/bin/python .agents/skills/architecture-guard/scripts/architecture_guard.py check-all`
- 导出架构报告：
	- `.venv/bin/python .agents/skills/architecture-guard/scripts/architecture_guard.py report`
- 更新工作区文档（修改/新增文件后）：
	- `.venv/bin/python .agents/skills/workspace-docs/scripts/agent_docs.py set <path> -d "说明" -n "备注"`
	- `.venv/bin/python .agents/skills/workspace-docs/scripts/agent_docs.py export`

## 7. 执行日志门禁（必须执行）
- 目标：让 AGENTS 在每次任务中自动应用 `agent-logs` 技能，形成可审计闭环。
- 触发时机：
	- 接到用户任务并开始实际改动后，必须记录 1 条日志。
	- 完成代码改动并完成验证后，必须执行日志总览导出。
- 标准记录命令（推荐默认模板）：
	- `.venv/bin/python .agents/skills/agent-logs/scripts/agent_logs.py add --prompt "<用户原始prompt>" --summary "<上下文摘要与处理结果>" --git-op <yes|no> --git-detail "<git动作或未执行原因>" --isolated <yes|no> --backup <yes|no> --integrity-ok <yes|no> --consistency-ok <yes|no> --recoverability-ok <yes|no> --backup-note "<备份说明>" --auto-files`
- 日志导出命令（任务结束必须执行）：
	- `.venv/bin/python .agents/skills/agent-logs/scripts/agent_logs.py export`
- 日志落盘位置：
	- `docs/agent-logs/YYYY-MM-DD/log-xxxx-<HHMMSS>.md`
	- `docs/agent-logs/INDEX.md`
	- `docs/agent-logs/AGENT_LOGBOOK.md`
- 失败处理：
	- 若日志记录或导出失败，先修复日志流程，再继续后续开发或提交。

## 8. 提交前最小检查清单
- 程序可运行（至少一次 `train` 或 `gui` 启动）。
- Python 质量门禁已通过。
- README 与相关文档已同步。
- 执行日志已新增且已导出总览（`agent_logs.py add` + `agent_logs.py export`）。
- 若涉及架构调整，已输出 `docs/architecture/architecture_guard_report.md`。
