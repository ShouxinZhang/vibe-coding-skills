---
name: parallel-subagent-writing
description: "并行子 Agent 写作技能：将多文件写作任务分解为独立模块，用 runSubagent（全权限）在 .agent_cache 任务区域内并行创作；通过 brief.md、outline.md、deliverables.json 约束共享上下文与接口，再由主 Agent 收敛提升。Use when: 需要同时生成多个 md 文件、重构并拆分现有文档、批量创建模块骨架。"
---

# 并行子 Agent 写作技能

## 用途

当任务需要**同时写多个文件**时，使用 `runSubagent`（全工具权限）并行分发写作，但**不要让子 Agent 直接修改正式内容**。  
更合适的模式是：让子 Agent 在 `.agent_cache/` 的任务区域内创作，并且共享同一份任务契约，由主 Agent 最后统一读取、筛选、验证、打包并提升到正式文件。  
本技能把可重复的动作脚本化，包括：创建任务工作区与契约模板、解析绝对路径、列出产物并校验、生成 promotion bundle、清理缓存。

## 标准结构

- `SKILL.md`：入口、适用范围、脚本索引
- `references/structure.md`：sandbox 边界模型
- `references/workflow.md`：主 agent 与 subagent 的协作流程
- `references/checklist.md`：任务开始前、进行中、完成后的检查项
- `references/scripts.md`：脚本逐个说明、输入输出、典型命令与串联示例
- `scripts/*.sh`：工作区脚手架、路径解析、产物列举、缓存清理

## 任务契约文件

`scaffold_task_workspace.sh` 会在任务根目录自动生成三份契约文件：

- `brief.md`：任务目标、受众、文风、共享上下文、术语、命名规则、全局约束
- `outline.md`：全局目录结构、文件关系、依赖与去重边界
- `deliverables.json`：每个 agent 的工作区、候选文件 `source`、正式目标 `target`、引用/去重约束、允许新增文件与备注

这些文件的作用是把并行写作从“自由散稿”升级为“共享合同下的并行生产”。

## 何时使用

- 将一个大的 `.md` 文件拆分为多个子文件
- 新建一个含多篇文章的知识模块
- 批量生成多个模块的骨架（如 `introduction.md` + 子文档）
- 任何需要并行产出多个候选文件的写作任务

## 核心原则

- 子 Agent 负责在 sandbox 内产出候选内容，不直接改正式文件
- 子 Agent 必须遵守 `brief.md`、`outline.md` 与 `deliverables.json` 的共享上下文和接口约束
- 主 Agent 负责分配工作区、读取产物、收敛结果并提升到正式模块
- sandbox 只划定边界，不强制内部目录分层
- 能脚本化的操作优先脚本化，不靠人工手拼路径、人工比对产物或手管缓存

## 脚本入口

- `./scripts/scaffold_task_workspace.sh`：创建 `.agent_cache/<task>/<agent>/` 工作区，并生成 `brief.md`、`outline.md`、`deliverables.json`
- `./scripts/resolve_workspace_path.sh`：返回某个 agent 工作区的绝对路径
- `./scripts/list_task_artifacts.sh`：列出任务或单个 agent 工作区内的产物文件，支持 `--json` 与 `--verify`
- `./scripts/prepare_promotion_bundle.sh`：根据 `deliverables.json` 收拢已声明产物，生成 promotion bundle 与 manifest
- `./scripts/cleanup_task_workspace.sh`：把任务缓存区归档到 `.agent_cache/_trash/`

具体用法、输入输出和示例命令见 `./references/scripts.md`。

## 使用流程

1. 先读 `./references/structure.md`，确认 sandbox 边界模型。
2. 运行 `./scripts/scaffold_task_workspace.sh` 创建任务区、各 subagent 工作区与三份任务契约。
3. 在 `brief.md`、`outline.md`、`deliverables.json` 中补齐共享上下文，并把每个候选产物声明为 `deliverables[].source/target`。
4. 用 `./scripts/resolve_workspace_path.sh` 把绝对路径注入到 subagent prompt，并明确 `Shared Context` 与 `Interfaces`。
5. 在分发 subagent 之前，先跑一次 `./scripts/list_task_artifacts.sh --verify`，确认契约字段完整且 schema 合法。
6. subagent 在自己的工作区内创作，但必须遵守任务契约。
7. 主 agent 再次运行 `./scripts/list_task_artifacts.sh --verify` 查看产物与契约符合度，再读取关键文件。
8. 运行 `./scripts/prepare_promotion_bundle.sh` 生成 promotion bundle，集中审阅待提升结果。
9. 主 agent 复制、摘取、`apply_patch`，把结果提升到正式模块。
10. 任务结束后，按需运行 `./scripts/cleanup_task_workspace.sh` 清理缓存。

## 参考文档

- 结构规则：`./references/structure.md`
- 协作流程：`./references/workflow.md`
- 验收清单：`./references/checklist.md`
- 脚本说明：`./references/scripts.md`

## Anti-patterns

- 用 `search_subagent` / Explore agent 只读探索，再由主 agent 串行补写全部文件
- 让多个 subagent 直接写正式模块
- 不定义 `outline.md` 与 `deliverables.json` 就直接并行写
- 只把正文贴在回复里，不在 sandbox 落盘
- 明明可以脚本化的路径创建、路径解析、产物枚举、契约校验、提升打包，却仍靠人工处理

详细规范和具体约束放在 `references/` 与 `scripts/` 中维护，避免主入口堆砌细节。
