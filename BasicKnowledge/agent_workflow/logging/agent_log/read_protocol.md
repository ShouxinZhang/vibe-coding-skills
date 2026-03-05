# 读取协议：任务启动时加载什么、怎么加载

Agent Log 的核心价值在于**被读取**。写了不读，等于没写。

每次任务启动时，pre-task Hook 执行标准加载流程，把 agent 从"对项目一无所知"变成"了解最近发生了什么"。本章展开讨论每一步的具体实现。

---

## 一、标准加载流程

```
[任务开始]
    │
    ▼
Step 1: 加载最新 workspace_state 快照
    │
    ▼
Step 2: 差异检测——快照 vs 实际文件系统
    │
    ▼
Step 3: 加载最近 N 条 task_record
    │
    ▼
Step 4: 加载 known_issues（仅 status=open）
    │
    ▼
Step 5: 构建上下文摘要，注入 agent 提示词
    │
    ▼
[开始执行任务]
```

### Step 1: 加载最新 workspace_state

从 `workspace_state.jsonl` 读取最后一行（最新快照）。

```python
def load_latest_snapshot(filepath: str) -> dict | None:
    """读取最新快照。文件为空或不存在时返回 None。"""
    last_line = None
    with open(filepath, "r") as f:
        for line in f:
            stripped = line.strip()
            if stripped:
                last_line = stripped
    if last_line is None:
        return None
    try:
        return json.loads(last_line)
    except json.JSONDecodeError:
        # 最后一行损坏，回退到倒数第二行
        return load_second_to_last(filepath)
```

**关键设计决策**：只加载最新快照，不加载历史快照。历史快照的用途在 lifecycle.md 的归档策略中讨论。

### Step 2: 差异检测

快照是上一次任务结束时的状态。但在两次任务之间，可能有人手动改了文件、git pull 了新代码、或者外部工具修改了工作区。

差异检测的目的：**发现快照与现实的不一致，防止 agent 基于失真数据做决策。**

```python
def detect_drift(snapshot: dict, workspace_root: str) -> list[dict]:
    """比对快照与实际文件系统，返回差异列表。"""
    drifts = []

    # 1. 检查 git HEAD 是否一致
    actual_head = run("git rev-parse --short HEAD")
    if actual_head != snapshot.get("git_head"):
        drifts.append({
            "type": "git_head_changed",
            "expected": snapshot["git_head"],
            "actual": actual_head,
            "severity": "high"
        })

    # 2. 检查快照中的文件是否仍然存在
    for file_entry in snapshot.get("files", []):
        path = os.path.join(workspace_root, file_entry["path"])
        if not os.path.exists(path):
            drifts.append({
                "type": "file_missing",
                "path": file_entry["path"],
                "severity": "high"
            })

    # 3. 检查是否有快照中未记录的新文件
    tracked_paths = {f["path"] for f in snapshot.get("files", [])}
    for actual_path in scan_workspace_files(workspace_root):
        if actual_path not in tracked_paths:
            drifts.append({
                "type": "untracked_file",
                "path": actual_path,
                "severity": "medium"
            })

    return drifts
```

**差异的处理策略**：

| severity | 含义 | 处理方式 |
|----------|------|----------|
| `high` | 快照严重失真 | 重建快照（扫描文件系统生成新快照），标记旧快照为 `invalidated` |
| `medium` | 有未追踪的变更 | 将差异信息追加到上下文，让 agent 自行判断 |
| `low` | 细微不一致（如文件大小变化） | 忽略，仅记录 |

**重建快照**是昂贵操作——需要遍历整个文件系统。但当 `high severity` 差异出现时，基于错误快照决策的风险远大于重建的开销。

### Step 3: 加载最近 N 条 task_record

默认 N=5。为什么是 5？

- 太少（1-2 条）：agent 只知道"刚刚发生了什么"，缺乏趋势感知
- 太多（20+ 条）：占用过多上下文窗口，且远期历史与当前任务的相关性衰减很快
- 5 条是经验值：覆盖了"最近一个工作会话"的典型任务量

```python
def load_recent_tasks(filepath: str, n: int = 5) -> list[dict]:
    """加载最近 N 条任务记录。"""
    records = load_records(filepath)
    return records[-n:]
```

### Step 4: 加载 known_issues

只加载 `status=open` 的条目。已解决的问题不需要占用上下文。

```python
def load_open_issues(filepath: str) -> list[dict]:
    """加载所有未解决的问题。"""
    records = load_records(filepath)
    return [r for r in records if r.get("status") == "open"]
```

### Step 5: 构建上下文摘要

将以上数据整合为一段结构化文本，注入 agent 的系统提示词。

```python
def build_context_summary(snapshot, drifts, recent_tasks, open_issues) -> str:
    parts = []

    parts.append("## 工作区状态")
    parts.append(f"- Git HEAD: {snapshot['git_head']} ({snapshot['git_branch']})")
    parts.append(f"- 文件数: {len(snapshot.get('files', []))}")
    parts.append(f"- 脏状态: {'是' if snapshot.get('git_dirty') else '否'}")

    if drifts:
        parts.append(f"\n## ⚠️ 快照与实际状态存在 {len(drifts)} 处差异")
        for d in drifts:
            parts.append(f"- [{d['severity']}] {d['type']}: {d.get('path', d.get('expected', ''))}")

    if recent_tasks:
        parts.append(f"\n## 最近 {len(recent_tasks)} 条任务")
        for t in recent_tasks:
            parts.append(f"- {t['task_id']}: {t.get('prompt_summary', '无摘要')} [{t['status']}]")

    if open_issues:
        parts.append(f"\n## 已知问题（{len(open_issues)} 条未解决）")
        for issue in open_issues:
            parts.append(f"- {issue['issue_id']}: {issue['description']}")
            if issue.get("workaround"):
                parts.append(f"  → 绕过方案: {issue['workaround']}")

    return "\n".join(parts)
```

---

## 二、上下文窗口的容量限制

### 问题

Agent 的上下文窗口是有限的。典型的 LLM 上下文窗口在 128K-200K tokens。系统提示词、用户 prompt、工具定义已经占去一大块。留给 Agent Log 的空间可能只有 10K-30K tokens。

当日志积累到一定量时，不可能全量加载。

### 摘要压缩策略

当上下文预算不足时，按以下优先级逐级压缩：

**Level 0: 全量加载（总量 < 预算）**
不做任何压缩。

**Level 1: 减少 task_record 数量**
从 5 条减少到 3 条，再到 1 条。

**Level 2: 精简 workspace_state**
去掉 `files` 列表的详细条目，只保留 `module_summary`。

```python
def compress_snapshot(snapshot: dict) -> dict:
    """Level 2 压缩：去掉文件级细节，保留模块级摘要。"""
    compressed = {
        "snapshot_id": snapshot["snapshot_id"],
        "git_head": snapshot["git_head"],
        "git_branch": snapshot["git_branch"],
        "git_dirty": snapshot.get("git_dirty"),
        "module_summary": snapshot.get("module_summary", {}),
        "known_constraints": snapshot.get("known_constraints", []),
        "file_count": len(snapshot.get("files", []))
    }
    return compressed
```

**Level 3: task_record 只保留摘要字段**
去掉 `files_touched`、`gate_results` 的详细内容，只保留 `task_id`、`prompt_summary`、`status`、`unresolved`。

**Level 4: 极端压缩——纯文本摘要**
把所有结构化数据压缩为一段 300 字以内的自然语言摘要。这是最后手段——丢失了可查询性，但至少保留了 agent 的基本情境感知。

```python
COMPRESSION_LEVELS = [
    {"max_tasks": 5, "snapshot": "full",       "issues": "full"},
    {"max_tasks": 3, "snapshot": "full",       "issues": "full"},
    {"max_tasks": 1, "snapshot": "compressed", "issues": "full"},
    {"max_tasks": 1, "snapshot": "compressed", "issues": "summary"},
    {"max_tasks": 0, "snapshot": "none",       "issues": "none",  "text_summary": True},
]

def select_compression_level(budget_tokens: int, data_tokens: int) -> int:
    """根据预算选择压缩级别。"""
    for level, config in enumerate(COMPRESSION_LEVELS):
        estimated = estimate_tokens(config, data_tokens)
        if estimated <= budget_tokens:
            return level
    return len(COMPRESSION_LEVELS) - 1  # 最极端的压缩
```

---

## 三、选择性加载策略

不是所有历史都与当前任务相关。一个文档写作任务不需要知道三天前的代码质量门禁结果。

### 基于任务类型的加载配置

```json
{
  "task_profiles": {
    "documentation": {
      "load_tasks": 3,
      "load_issues_categories": ["design_limitation"],
      "snapshot_detail": "module_summary_only",
      "reason": "文档任务关心项目结构，不关心代码级别的变更细节"
    },
    "code_change": {
      "load_tasks": 5,
      "load_issues_categories": ["tooling_bug", "env_constraint"],
      "snapshot_detail": "full",
      "reason": "代码变更需要知道完整的文件状态和工具链问题"
    },
    "refactor": {
      "load_tasks": 10,
      "load_issues_categories": ["design_limitation", "tooling_bug"],
      "snapshot_detail": "full",
      "reason": "重构需要更长的历史视角来理解设计演进"
    },
    "hotfix": {
      "load_tasks": 2,
      "load_issues_categories": ["tooling_bug", "env_constraint", "data_corruption"],
      "snapshot_detail": "full",
      "reason": "修复任务需要完整的当前状态但不需要长历史"
    }
  }
}
```

### 任务类型检测

agent 如何知道当前任务属于哪个 profile？

```python
def detect_task_profile(prompt: str) -> str:
    """根据用户 prompt 推断任务类型。基于关键词匹配 + LLM 分类。"""
    # 快速路径：关键词匹配
    keywords = {
        "documentation": ["文档", "撰写", "README", "引言", "章节"],
        "code_change": ["实现", "添加功能", "创建", "修改代码"],
        "refactor": ["重构", "拆分", "优化结构", "迁移"],
        "hotfix": ["修复", "bug", "紧急", "回滚"]
    }
    for profile, words in keywords.items():
        if any(w in prompt for w in words):
            return profile

    # 慢速路径：交给 LLM 分类（花费一次额外调用）
    return llm_classify_task_type(prompt)
```

---

## 四、快照与文件系统的差异修复

差异检测发现问题后，不能只报告——需要修复。

### 自动修复策略

```python
def repair_drift(drifts: list[dict], workspace_root: str) -> dict:
    """根据差异类型执行修复。返回修复结果摘要。"""
    result = {"repaired": [], "needs_manual": []}

    for drift in drifts:
        if drift["type"] == "git_head_changed":
            # 不能自动修复——git HEAD 变更可能是有意的
            # 重建快照是正确的响应
            result["needs_manual"].append(drift)

        elif drift["type"] == "file_missing":
            # 文件被外部删除——从快照中移除该文件条目
            result["repaired"].append({
                "action": "removed_from_snapshot",
                "path": drift["path"]
            })

        elif drift["type"] == "untracked_file":
            # 新文件出现——添加到快照
            result["repaired"].append({
                "action": "added_to_snapshot",
                "path": drift["path"],
                "status": "stable"
            })

    return result
```

### 什么时候触发全量重建

以下情况应直接放弃修补，执行全量重建：

1. `high severity` 差异超过 3 条
2. git HEAD 向后回退了（force push 或 reset）
3. 快照文件本身损坏或为空
4. 上一次快照的时间戳与当前时间差超过 7 天（说明长时间没有 agent 运行，快照严重过时）

```python
def should_rebuild(drifts: list[dict], snapshot: dict) -> bool:
    high_count = sum(1 for d in drifts if d["severity"] == "high")
    if high_count > 3:
        return True

    age_days = (now() - parse_time(snapshot["timestamp"])).days
    if age_days > 7:
        return True

    return False
```

全量重建的代价是一次完整的文件系统扫描，但它消除了所有累积的差异，是最可靠的修复手段。
