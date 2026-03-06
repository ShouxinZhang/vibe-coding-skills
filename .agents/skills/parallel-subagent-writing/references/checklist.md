# Checklist

## 任务开始前

- 已确定 task slug
- 已确定每个 subagent 的 agent name
- 已运行 `scripts/scaffold_task_workspace.sh`
- 已补齐 `brief.md`、`outline.md`、`deliverables.json`
- 已为每个 subagent 生成绝对 workspace 路径
- 已明确哪些内容由主 agent 最终提升到正式模块

## 任务进行中

- 每个 subagent 只写自己的工作区
- 每个 subagent 都拿到了 `Shared Context` 与 `Interfaces`
- `deliverables.json` 已声明目标正式路径、引用关系和去重边界
- 没有 subagent 直接修改正式模块
- 产物以文件形式保存在工作区，而不是只返回文本

## 任务完成后

- 已用 `scripts/list_task_artifacts.sh --verify` 查看产物与契约符合度
- 已抽查关键文件内容
- 已用 `scripts/prepare_promotion_bundle.sh` 生成 promotion bundle
- 已将最终结果通过复制或 `apply_patch` 提升到正式位置
- 如无保留必要，已按需清理 `.agent_cache/` 中的任务目录

## 验收信号

- 主 agent 不需要手工拼接工作区路径
- subagent 不需要自行推导 cwd 或绝对路径
- 主 agent 不需要手工比对哪些文件缺失、哪些文件越权新增
- 共享上下文、文件接口、目标正式路径都可在任务契约中直接定位
- sandbox 隔离存在，但内部结构仍保持自由
- 正式仓库只保留收敛后的结果，不保留无用缓存