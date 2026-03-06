# Scripts Usage

## 目标

这份文档回答两个问题：

- 每个脚本什么时候用
- 每个脚本怎么串起来用

这些脚本的意义不是增加流程复杂度，而是把原本容易出错的重复动作脚本化：创建 sandbox、生成任务契约、生成绝对路径、枚举并校验产物、打包提升候选、清理缓存。

## 1. 创建任务工作区

脚本：`./scripts/scaffold_task_workspace.sh`

### 用途

- 创建任务级缓存区 `.agent_cache/<task-slug>/`
- 按需为多个 subagent 创建各自工作区
- 自动生成 `brief.md`、`outline.md`、`deliverables.json`

### 用法

```bash
./scripts/scaffold_task_workspace.sh <task-slug> [agent-name ...] [--json] [--quiet]
```

### 示例

```bash
./scripts/scaffold_task_workspace.sh agent_system_rewrite writer_background writer_examples writer_history
./scripts/scaffold_task_workspace.sh agent_system_rewrite writer_background writer_examples --json
```

### 输出

默认输出会包含：

- `TASK_DIR=...`
- `CONTRACT_FILE[brief]=...`
- `CONTRACT_FILE[outline]=...`
- `CONTRACT_FILE[deliverables]=...`
- `AGENT_DIR[writer_name]=...`

加 `--json` 时会输出机器可读 JSON；加 `--quiet` 时只执行创建动作不打印结果。

创建后，主 agent 应先填写：

- `brief.md`：统一世界观、术语、命名规则、全局约束
- `outline.md`：全局目录、文件关系、依赖和去重边界
- `deliverables.json`：每个 agent 的 `workspace`、`deliverables[].source`、`deliverables[].target`、`must_reference`、`must_not_duplicate_with`、`allow_new_files`

最小可执行的 `deliverables.json` 片段应类似：

```json
{
	"agents": {
		"writer_examples": {
			"workspace": "writer_examples",
			"allow_new_files": false,
			"deliverables": [
				{
					"source": "examples.md",
					"target": "BasicKnowledge/foo/examples.md",
					"must_reference": ["background.md"],
					"must_not_duplicate_with": ["overview.md"],
					"notes": "Write the examples section only"
				}
			]
		}
	}
}
```

`list_task_artifacts.sh --verify` 会把缺失的 `source`/`target` 当成 schema 错误，而不是等到产物写完后再报“undeclared files”。

## 2. 解析某个工作区的绝对路径

脚本：`./scripts/resolve_workspace_path.sh`

### 用途

- 获取某个 subagent 工作区的绝对路径
- 避免主 agent 手工拼路径

### 用法

```bash
./scripts/resolve_workspace_path.sh <task-slug> <agent-name> [--create] [--json] [--quiet]
```

### 示例

```bash
./scripts/resolve_workspace_path.sh agent_system_rewrite writer_examples
./scripts/resolve_workspace_path.sh agent_system_rewrite writer_outline --create --json
```

### 输出

默认标准输出就是该工作区的绝对路径，例如：

```text
/home/.../vibe-coding-skills/.agent_cache/agent_system_rewrite/writer_examples
```

加 `--json` 时会输出包含 `task_slug`、`agent_name`、`workspace_dir` 的 JSON；加 `--quiet` 时不打印结果。

## 3. 查看产物

脚本：`./scripts/list_task_artifacts.sh`

### 用途

- 列出整个任务区的全部产物
- 或只查看某个 subagent 工作区的产物
- 按 `deliverables.json` 校验缺失文件和越权新增文件
- 以 JSON 形式输出，便于主 agent 自动处理

### 用法

```bash
./scripts/list_task_artifacts.sh <task-slug> [agent-name] [--json] [--verify] [--quiet]
```

### 示例

```bash
./scripts/list_task_artifacts.sh agent_system_rewrite
./scripts/list_task_artifacts.sh agent_system_rewrite writer_examples --json
./scripts/list_task_artifacts.sh agent_system_rewrite --verify
```

### 输出

默认输出仍是排序后的文件路径列表。主 agent 可以据此决定读哪些文件、复制哪些内容、对哪些正式文件打 patch。

加 `--verify` 时，脚本会读取 `deliverables.json` 并报告：

- 契约 schema 是否完整，尤其是 `deliverables[].source/target` 是否为空
- 某个 agent 缺失了哪些已声明文件
- 某个 agent 在 `allow_new_files=false` 下新增了哪些未声明文件
- 是否缺少 `brief.md`、`outline.md`、`deliverables.json`

如果 agent 配置中仍使用旧的 `interfaces` 顶层字段，脚本会给出 warning，提示将接口约束迁移到 `deliverables[].must_reference` 与 `deliverables[].must_not_duplicate_with`。

加 `--json` 时，输出为完整 JSON 报告，包含文件元数据和校验结果。

`--verify` 发现失败项时会以非零状态退出，便于主 agent 把它当作轻量门禁。

## 4. 生成 promotion bundle

脚本：`./scripts/prepare_promotion_bundle.sh`

### 用途

- 根据 `deliverables.json` 收拢已声明的候选文件
- 把待提升文件复制到一个独立 bundle 中集中审阅
- 输出 `promotion_manifest.json` 和 `README.md`，减少主 agent 手工收敛成本

### 用法

```bash
./scripts/prepare_promotion_bundle.sh <task-slug> [--json] [--quiet]
```

### 示例

```bash
./scripts/prepare_promotion_bundle.sh agent_system_rewrite
./scripts/prepare_promotion_bundle.sh agent_system_rewrite --json
```

### 输出

默认输出会包含：

- `BUNDLE_DIR=...`
- `MANIFEST=...`
- `README=...`
- `ENTRY_COUNT=...`
- `MISSING_COUNT=...`

bundle 目录中会包含：

- `task_contract/`：`brief.md`、`outline.md`、`deliverables.json` 的快照
- `sources/`：按 agent 分类拷贝的候选文件
- `promotion_manifest.json`：每个候选文件的源路径、目标路径、接口约束、备注
- `README.md`：供主 agent 快速审阅的汇总

如果 `deliverables.json` 缺少非空的 `source` 或 `target`，脚本会直接失败，而不是生成一个空 bundle。

## 5. 清理任务缓存

脚本：`./scripts/cleanup_task_workspace.sh`

### 用途

- 在任务完成后清理某个任务缓存区
- 不是硬删除，而是归档到 `.agent_cache/_trash/`

### 用法

```bash
./scripts/cleanup_task_workspace.sh <task-slug> [--json] [--quiet]
```

### 示例

```bash
./scripts/cleanup_task_workspace.sh agent_system_rewrite
./scripts/cleanup_task_workspace.sh agent_system_rewrite --json
```

### 输出

默认输出为归档后的新路径，例如：

```text
/home/.../vibe-coding-skills/.agent_cache/_trash/20260307-010220-agent_system_rewrite
```

加 `--json` 时会输出 `task_slug` 和 `archive_dir` 的 JSON；加 `--quiet` 时不打印结果。

## 最小串联示例

下面是一条最常见的主 agent 操作链：

```bash
./scripts/scaffold_task_workspace.sh agent_system_rewrite writer_background writer_examples
./scripts/resolve_workspace_path.sh agent_system_rewrite writer_background
./scripts/resolve_workspace_path.sh agent_system_rewrite writer_examples
./scripts/list_task_artifacts.sh agent_system_rewrite --verify
./scripts/prepare_promotion_bundle.sh agent_system_rewrite
./scripts/cleanup_task_workspace.sh agent_system_rewrite
```

对应的业务动作是：

1. 建任务区和契约文件
2. 补齐共享上下文以及 `deliverables[].source/target`
3. 先跑一次 `--verify`，确认契约 schema 合法
4. 取工作区绝对路径
5. 把路径和契约信息发给 subagent
6. 子 agent 落盘后再次校验产物
7. 生成 promotion bundle
8. 主 agent 提升结果到正式模块后归档缓存

## 推荐 prompt 注入方式

主 agent 拿到路径后，建议这样注入给 subagent：

```text
## Workspace
/abs/path/to/.agent_cache/agent_system_rewrite/writer_examples

## Shared Context
- 术语统一使用“经典例子”“对照案例”“应用价值”
- 文件命名使用下划线英文名
- 必须遵守 ../brief.md 与 ../outline.md 的写法

## Deliverable
围绕“为什么需要经典例子”产出通俗素材，目标正式路径见 deliverables.json。

## Interfaces
- 必须引用 background.md
- 不能重复 examples_overview.md 的定义部分

## Constraints
- 只能在上述 workspace 内创建或修改文件
- 不要直接修改正式模块
- 优先把内容写成文件，不要只在回复中粘贴正文
```

## 常见错误

- 还没创建任务区，就先解析路径
- 让多个 subagent 共用同一个 agent-name
- 产物已经写出来了，但主 agent 没有先跑 `--verify` 就直接猜路径读取
- 只写了 prompt，没有同步更新 `deliverables.json` 里的目标文件和接口边界
- 没有先跑 promotion bundle，就直接从多个工作区手工拷贝内容
- 任务结束后直接丢弃缓存，没有经过主 agent 的收敛提升