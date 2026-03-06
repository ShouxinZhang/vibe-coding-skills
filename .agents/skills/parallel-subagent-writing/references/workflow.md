# Workflow

## 工作流总览

1. 主 agent 使用 `scripts/scaffold_task_workspace.sh` 创建任务缓存区，并生成 `brief.md`、`outline.md`、`deliverables.json`。
2. 主 agent 填写共享上下文、术语、命名规则、文件关系与每个 agent 的 deliverables。
3. 主 agent 使用 `scripts/resolve_workspace_path.sh` 为每个 subagent 获取绝对工作区路径。
4. 主 agent 在 prompt 中注入该绝对路径，并显式传达 `Shared Context` 与 `Interfaces`。
5. subagent 在各自工作区内写文件，但内容必须服从任务契约。
6. 主 agent 使用 `scripts/list_task_artifacts.sh --verify` 查看各工作区产物与契约符合度。
7. 主 agent 使用 `scripts/prepare_promotion_bundle.sh` 生成 promotion bundle，集中审阅可提升内容。
8. 主 agent 读取候选文件，执行复制、摘取、`apply_patch`，把成果提升到正式模块。
9. 任务完成后，按需使用 `scripts/cleanup_task_workspace.sh` 清理缓存。

如果需要每个脚本的输入、输出和命令示例，继续阅读 `scripts.md`。

## 责任边界

### 子 Agent 负责

- 在指定工作区内写出候选内容
- 遵守 `brief.md`、`outline.md` 与 `deliverables.json` 中的共享上下文和接口约束
- 只在自己被分配的 deliverables 范围内扩写
- 不直接修改正式模块

### 主 Agent 负责

- 创建和分配工作区
- 填写和维护任务契约文件
- 收敛各工作区结果
- 决定哪些内容进入正式仓库
- 对正式文件执行最终 patch

## Prompt 约定

推荐 prompt 至少包含五段：

```text
## Workspace
<由脚本生成的绝对路径>

## Shared Context
<来自 brief.md / deliverables.json 的统一世界观、术语、命名规则、全局约束>

## Deliverable
<本 agent 负责的内容范围>

## Interfaces
<这篇文件必须引用谁、不能与谁重复、目标正式路径是什么>

## Constraints
- 只能在上述 workspace 内创建或修改文件
- 不要直接修改正式模块
- 优先把内容落成文件，不要只在回复中粘贴正文
```

## 何时不要并行

- 多个文件强依赖同一份尚未成型的大纲
- 任务本身只有一个小文件
- 最终内容高度耦合，拆分后反而增加合并成本