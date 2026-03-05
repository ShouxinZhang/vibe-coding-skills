# 数据模型：三种核心结构

Agent Log 的全部数据归结为三张表。不多不少——少了覆盖不了 agent 的决策需求，多了增加认知负荷和维护成本。

---

## 一、workspace_state（工作区状态快照）

### 职责

记录某个时刻工作区的完整面貌。agent 读取它后，不需要扫描文件系统就能知道"现在项目长什么样"。

### Schema

```json
{
  "snapshot_id": "snap-20260306-143207",
  "timestamp": "2026-03-06T14:32:07+08:00",
  "git_head": "a3f2c1d",
  "git_branch": "main",
  "git_dirty": false,
  "files": [
    {
      "path": "BasicKnowledge/agent_workflow/hooks.md",
      "status": "stable",
      "size_bytes": 4821,
      "last_modified": "2026-03-06T14:30:00+08:00",
      "last_agent_op": "create",
      "last_task_id": "task-0041"
    }
  ],
  "module_summary": {
    "BasicKnowledge/agent_workflow/": {
      "file_count": 6,
      "last_changed": "2026-03-06T14:30:00+08:00"
    }
  },
  "known_constraints": [
    "repository root 禁止新建代码文件",
    "ExamplesStudio/ 下的实验项目必须自包含"
  ],
  "schema_version": "1.2.0"
}
```

### 字段设计理由

**`snapshot_id`**：格式 `snap-YYYYMMDD-HHMMSS`。用时间戳而非 UUID，因为 agent 经常需要按时间排序和筛选。UUID 在这个场景下没有优势。

**`git_head` + `git_branch` + `git_dirty`**：三个字段联合描述 git 状态。`git_dirty` 单独拎出来，是因为 agent 最常问的问题是"有没有未提交的改动"，不需要去解析 diff。

**`files[].status`**：枚举值，不是自由文本。合法值：
- `stable`：文件存在且无待处理问题
- `modified`：被当前或最近任务修改，尚未确认稳定
- `conflicted`：存在合并冲突或门禁失败
- `pending_delete`：标记待删除但尚未执行

为什么不用 git status 的原始值？因为 git status 是面向人类的（`M`, `??`, `D`），语义模糊。agent 需要的是决策级别的状态，不是 diff 级别的。

**`files[].last_task_id`**：反向关联到 task_record，形成文件→任务的追溯链。

**`module_summary`**：聚合级别的视图。当工作区有几百个文件时，agent 不需要逐个扫描，看模块摘要就够了。

**`known_constraints`**：硬编码的规则列表。这里不存放"经验性建议"，只存放"违反就会失败"的硬约束。

### 字段关系图

```
workspace_state
  ├── files[].last_task_id  ──→  task_record.task_id
  ├── git_head              ──→  实际 git 仓库（可校验）
  └── known_constraints     ──→  手动维护 / 从 AGENTS.md 提取
```

---

## 二、task_record（任务执行记录）

### 职责

记录一次任务从开始到结束的全部执行轨迹。agent 读取它后，能知道"上一个 agent 做了什么、结果如何、有没有遗留问题"。

### Schema

```json
{
  "task_id": "task-0042",
  "timestamp_start": "2026-03-06T14:00:00+08:00",
  "timestamp_end": "2026-03-06T14:32:07+08:00",
  "trigger": "user_prompt",
  "prompt_hash": "sha256:a1b2c3d4e5f6...",
  "prompt_summary": "拆分 agent_log.md 为文件夹结构",
  "status": "completed",
  "exit_reason": "all_gates_passed",
  "gate_results": {
    "architecture-guard": {"status": "pass", "duration_ms": 1200},
    "workspace-integrity": {"status": "pass", "duration_ms": 800},
    "code-quality": {"status": "skipped", "reason": "no_code_files_changed"}
  },
  "files_touched": [
    {"path": "BasicKnowledge/agent_workflow/logging/agent_log/introduction.md", "op": "create"},
    {"path": "BasicKnowledge/agent_workflow/logging/agent_log.md", "op": "delete"}
  ],
  "decisions": [
    {
      "point": "存储格式选择",
      "options_considered": ["SQLite", "JSON Lines", "YAML"],
      "choice": "JSON Lines",
      "reason": "单文件、无依赖、人类可直接检查、git diff 友好"
    }
  ],
  "errors": [],
  "unresolved": [
    {
      "description": "lifecycle.md 中的自动归档脚本尚未实现",
      "severity": "low",
      "suggested_action": "下一次涉及 logging 模块时实现"
    }
  ],
  "context_loaded": {
    "workspace_state_snapshot": "snap-20260306-140000",
    "task_records_loaded": 5,
    "known_issues_loaded": 2
  },
  "schema_version": "1.2.0"
}
```

### 字段设计理由

**`trigger`**：枚举值，说明任务的触发源。合法值：
- `user_prompt`：人类直接下达指令
- `scheduled`：定时触发（如每日构建）
- `hook_triggered`：由另一个 Hook 触发的连锁任务
- `retry`：上一次失败后的自动重试

**`prompt_hash`** 而非 `prompt_text`：原始 prompt 可能包含敏感信息或极长内容。存 hash 用于关联和去重，不存原文。需要原文时去 Human Log 查。

**`prompt_summary`**：一句话摘要，agent 可用于快速判断"上一个任务大概是做什么的"。

**`exit_reason`**：为什么结束。合法值：
- `all_gates_passed`：正常完成
- `gate_failed`：门禁未通过
- `error`：执行出错
- `timeout`：超时
- `user_abort`：人类中断

**`decisions`**：这是 task_record 中最有价值的字段。详见 [write_protocol.md](./write_protocol.md) 中关于决策记录标准的讨论。

**`context_loaded`**：记录本次任务启动时加载了哪些历史数据。这是一个"元数据的元数据"——agent 可以通过它判断上一次任务的上下文基础是否充分。

**`unresolved`**：明确标注未完成的事项。比 "TODO" 注释强得多——它有 severity 和 suggested_action，下一个 agent 可以直接按优先级排序。

### 字段关系图

```
task_record
  ├── files_touched[].path     ──→  workspace_state.files[].path
  ├── context_loaded.snapshot  ──→  workspace_state.snapshot_id
  ├── unresolved               ──→  可能升级为 known_issues 条目
  └── gate_results             ──→  门禁系统（外部）
```

---

## 三、known_issues（已知问题表）

### 职责

全局共享的"坑列表"。一个 agent 踩过的坑，后续所有 agent 都应该知道，不需要重新发现。

### Schema

```json
{
  "issue_id": "issue-007",
  "discovered_at": "2026-03-05T09:11:00+08:00",
  "discovered_by_task": "task-0038",
  "category": "tooling_bug",
  "description": "architecture-guard 在检测 .md 文件时误报跨模块引用",
  "impact": "agent 会误认为 .md 文件违反了模块隔离规则，导致门禁失败",
  "workaround": "对 .md 文件跳过 cross-module import 检测",
  "root_cause": "guard 的 import 检测正则没有排除 markdown 链接语法",
  "status": "open",
  "resolved_at": null,
  "resolved_by_task": null,
  "resolution": null,
  "schema_version": "1.2.0"
}
```

### 字段设计理由

**`category`**：分类便于 agent 做选择性加载。合法值：
- `tooling_bug`：工具链自身的 bug
- `env_constraint`：环境限制（OS、依赖版本等）
- `design_limitation`：当前设计的已知局限
- `data_corruption`：数据损坏相关

**`impact`**：不只描述现象，还要说明"这会导致什么后果"。agent 需要知道后果才能评估严重程度。

**`workaround` vs `resolution`**：绕过方案和根治方案分开存。有 workaround 代表"可以继续工作但问题没解决"，有 resolution 代表"问题已消除"。

**`discovered_by_task` / `resolved_by_task`**：双向关联到 task_record，形成完整的问题生命周期链。

---

## 四、存储格式选型

### JSON Lines vs SQLite vs 其他

| 格式 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **JSON Lines** | 无依赖、追加写入、git diff 友好、人类可直接读 | 查询需全量扫描、无索引、并发写入需额外处理 | 小规模项目（< 1000 条记录） |
| **SQLite** | 原生支持查询/索引/事务、并发安全（WAL 模式） | 二进制文件 git 不友好、需要驱动库 | 大规模项目或多 agent 并行场景 |
| **YAML** | 人类最可读 | 解析慢、格式脆弱（缩进敏感）、不利于追加 | 不推荐 |
| **Markdown 表格** | 无依赖、与文档集成 | 极难程序化解析、无法存复杂结构 | 不推荐 |

### 推荐策略

**默认选 JSON Lines**。理由：

1. Agent Workflow 的典型规模是每天几十条记录，不是几百万条。全量扫描的代价可以接受。
2. JSON Lines 文件可以直接用 `git diff` 审查，SQLite 不行。
3. 不需要额外安装任何驱动或运行时依赖。
4. 每行一条 JSON 记录，追加写入天然是原子的（单行写入要么成功要么不成功）。

**当以下条件出现时，迁移到 SQLite**：
- 记录总量超过 5000 条
- 存在多 agent 同时写入同一日志文件的场景
- 需要复杂查询（如"找到最近 30 天所有门禁失败的任务"）

### 文件布局（JSON Lines 模式）

```
.agent-log/
  ├── workspace_state.jsonl      ← 每行一条快照
  ├── task_records.jsonl          ← 每行一条任务记录
  ├── known_issues.jsonl          ← 每行一条已知问题
  └── archive/                    ← 归档目录
        ├── task_records_2026-02.jsonl
        └── task_records_2026-01.jsonl
```

---

## 五、并发场景处理

### 问题

全自动化流水线可能有多个 agent 同时运行——一个在执行任务，一个在运行门禁，一个在做定时清理。它们可能同时读写 Agent Log。

### JSON Lines 的并发策略

JSON Lines 的追加写入在 POSIX 系统上是原子的（单次 `write()` 调用写入小于 `PIPE_BUF` 字节时保证原子性，Linux 上 `PIPE_BUF` = 4096 字节）。只要单条记录不超过 4KB，追加写入不会交错。

**读写冲突处理**：

```python
# 写入：追加模式，无需加锁（单条记录 < 4KB）
def append_record(filepath: str, record: dict) -> None:
    line = json.dumps(record, ensure_ascii=False) + "\n"
    assert len(line.encode("utf-8")) < 4096, "记录过大，需要分拆或切换 SQLite"
    with open(filepath, "a") as f:
        f.write(line)

# 读取：逐行解析，跳过可能的不完整尾行
def load_records(filepath: str) -> list[dict]:
    records = []
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                # 尾行可能是写入中途的残片，跳过
                continue
    return records
```

**workspace_state 的特殊处理**：

workspace_state 不是追加模式——agent 需要读取最新快照并更新它。这里追加模式不够用，需要"读取最新 → 修改 → 写入新行"的流程。多 agent 同时更新时可能产生分叉快照。

解决方案：**乐观锁**。每条快照带 `prev_snapshot_id` 字段。写入新快照时，检查当前最新快照的 ID 是否等于自己读取时的 ID。不等则说明有并发修改，需要合并或重试。

```python
def update_workspace_state(filepath: str, new_state: dict, expected_prev: str) -> bool:
    records = load_records(filepath)
    latest = records[-1] if records else None
    actual_prev = latest["snapshot_id"] if latest else None

    if actual_prev != expected_prev:
        # 并发冲突：另一个 agent 已经更新了快照
        return False  # 调用方决定合并策略或重试

    new_state["prev_snapshot_id"] = expected_prev
    append_record(filepath, new_state)
    return True
```

### SQLite 的并发策略

如果已迁移到 SQLite，使用 WAL（Write-Ahead Logging）模式：

```sql
PRAGMA journal_mode=WAL;
```

WAL 模式下，多个读取者可以和一个写入者并发工作。多写入者仍然串行，但 SQLite 的锁等待时间在 Agent Workflow 的负载下通常可以忽略。

---

## 六、Schema 演进策略

每条记录都带 `schema_version` 字段。当需要加新字段时：

### 规则

1. **新增字段只能是可选的**。旧记录不含新字段，读取时用默认值填充。
2. **永不删除字段**。已弃用的字段标注为 deprecated，读取时忽略。
3. **永不修改字段的语义**。如果语义变了，创建新字段。

### 版本号策略

使用语义化版本 `MAJOR.MINOR.PATCH`：

- `PATCH`：修复字段描述或文档，不影响解析
- `MINOR`：新增可选字段
- `MAJOR`：破坏性变更（不兼容旧记录）——**尽量避免**

### 向后兼容的读取方式

```python
def load_task_record(raw: dict) -> dict:
    version = raw.get("schema_version", "1.0.0")
    major = int(version.split(".")[0])

    if major > CURRENT_MAJOR:
        raise IncompatibleSchemaError(f"需要升级读取器：记录版本 {version}")

    # 用默认值填充新版本的可选字段
    raw.setdefault("exit_reason", "unknown")
    raw.setdefault("context_loaded", {})
    raw.setdefault("unresolved", [])

    return raw
```

### 迁移脚本

当 `MAJOR` 版本升级不可避免时，提供迁移脚本：

```bash
# .agent-log/migrations/v1_to_v2.py
# 读取所有 v1 记录，转换为 v2 格式，写入新文件
python .agent-log/migrations/v1_to_v2.py \
    --input task_records.jsonl \
    --output task_records_v2.jsonl
```

迁移脚本必须是幂等的——运行两次的结果和运行一次相同。
