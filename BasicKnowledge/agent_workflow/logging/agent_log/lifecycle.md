# 生命周期管理：增长、蒸馏与灾难恢复

Agent Log 会无限增长。不加控制，几个月后 `.agent-log/` 目录会膨胀到影响 agent 的加载速度和上下文预算。本章讨论如何让日志在长期运行中保持健康。

---

## 一、数据增长曲线

### 典型增长模型

假设：
- 每天运行 20 个任务
- 每个 task_record 平均 2KB（含 decisions、files_touched）
- workspace_state 每次快照 5KB（小型项目）
- known_issues 平均每周新增 2 条，每条 0.5KB

| 时间跨度 | task_records | workspace_state | known_issues | 总计 |
|----------|-------------|-----------------|-------------|------|
| 1 周 | 280KB | 700KB | 1KB | ~1MB |
| 1 月 | 1.2MB | 3MB | 4KB | ~4.2MB |
| 6 月 | 7.2MB | 18MB | 24KB | ~25MB |
| 1 年 | 14.4MB | 36MB | 48KB | ~50MB |

workspace_state 是增长的主体——每次快照都是全量记录。task_records 其次。known_issues 几乎可以忽略。

### 什么时候开始出问题

- **加载延迟**：当 `task_records.jsonl` 超过 5MB 时，全量扫描开始出现可感知的延迟（>500ms）
- **上下文膨胀**：最近 5 条 task_record + 最新快照的 token 占用超过 5K tokens 时，开始挤压 agent 的工作空间
- **git 负担**：`.agent-log/` 中的大文件让 `git status` 和 `git diff` 变慢

---

## 二、清理策略

### 分层保留规则

```
热层（Hot）：最近 7 天
  └── 保留全部原始数据，不压缩不删除

温层（Warm）：7-30 天
  └── task_records: 保留完整记录
  └── workspace_state: 只保留每天最后一个快照，其余删除

冷层（Cold）：30-180 天
  └── task_records: 压缩为摘要格式（去掉 files_touched 等大字段）
  └── workspace_state: 只保留每周一个快照
  └── 文件移至 archive/ 子目录

冰层（Frozen）：> 180 天
  └── 执行记忆蒸馏（见下一章节），原始数据删除
```

### 清理的执行方式

清理不是手动操作——它应该是一个可触发的 Hook，绑定到 `post-task` 或独立的 `maintenance` 事件。

```python
def cleanup_agent_log(log_dir: str) -> dict:
    """执行分层清理。返回清理摘要。"""
    summary = {"archived": 0, "compressed": 0, "deleted": 0}
    now = datetime.now()

    # 1. 处理 workspace_state：删除温层中的冗余快照
    snapshots = load_records(f"{log_dir}/workspace_state.jsonl")
    keep = []
    for snap in snapshots:
        age = now - parse_time(snap["timestamp"])
        if age.days <= 7:
            keep.append(snap)  # 热层：全部保留
        elif age.days <= 30:
            if is_last_of_day(snap, snapshots):
                keep.append(snap)  # 温层：只保每天最后一个
            else:
                summary["deleted"] += 1
        elif age.days <= 180:
            if is_last_of_week(snap, snapshots):
                keep.append(snap)  # 冷层：只保每周一个
            else:
                summary["deleted"] += 1
        else:
            summary["deleted"] += 1  # 冰层：删除原始快照

    overwrite_jsonl(f"{log_dir}/workspace_state.jsonl", keep)

    # 2. 处理 task_records：冷层压缩
    tasks = load_records(f"{log_dir}/task_records.jsonl")
    active = []
    archived = []
    for task in tasks:
        age = now - parse_time(task["timestamp_start"])
        if age.days <= 30:
            active.append(task)
        elif age.days <= 180:
            archived.append(compress_task_record(task))
            summary["compressed"] += 1
        else:
            # 冰层：蒸馏后丢弃（蒸馏在别处执行）
            summary["deleted"] += 1

    overwrite_jsonl(f"{log_dir}/task_records.jsonl", active)
    append_records(f"{log_dir}/archive/task_records_compressed.jsonl", archived)
    summary["archived"] = len(archived)

    # 3. 处理 known_issues：归档已解决的
    issues = load_records(f"{log_dir}/known_issues.jsonl")
    open_issues = [i for i in issues if i["status"] == "open"]
    resolved = [i for i in issues if i["status"] == "resolved"]
    overwrite_jsonl(f"{log_dir}/known_issues.jsonl", open_issues)
    append_records(f"{log_dir}/archive/known_issues_resolved.jsonl", resolved)

    return summary
```

### 压缩 task_record 的具体做法

```python
def compress_task_record(task: dict) -> dict:
    """将完整 task_record 压缩为摘要格式。"""
    return {
        "task_id": task["task_id"],
        "timestamp_start": task["timestamp_start"],
        "prompt_summary": task.get("prompt_summary", ""),
        "status": task["status"],
        "exit_reason": task.get("exit_reason"),
        "file_count": len(task.get("files_touched", [])),
        "decision_count": len(task.get("decisions", [])),
        "had_errors": len(task.get("errors", [])) > 0,
        "unresolved_count": len(task.get("unresolved", [])),
        "compressed": True,
        "schema_version": task.get("schema_version")
    }
```

压缩后的记录只有原始记录的 10-20% 大小，但保留了足够的信息供 agent 判断"历史上发生了大致什么事"。

---

## 三、记忆蒸馏：从历史中提取高价值摘要

### 概念

当原始日志超过 180 天，逐条保留已无意义——agent 不会去读 6 个月前某个任务的具体 gate_results。但这些历史中可能包含有价值的模式和教训。

**记忆蒸馏**就是把大量历史记录浓缩为少量高价值的洞察，以极低的 token 成本提供给 agent。

### 蒸馏的输入和输出

```
输入：180 天的完整 task_records（可能有 3000+ 条）
输出：一份 distilled_memory.md 文件，不超过 2000 字
```

### 蒸馏内容的三个维度

**1. 模式**：重复出现的行为模式

```markdown
## 模式
- 涉及 ExamplesStudio/ 的任务，门禁失败率最高（38%），主要原因是依赖未声明
- 文档类任务几乎不会触发门禁失败（失败率 < 2%）
- 连续 3 个以上任务修改同一文件时，第 3 个任务的冲突概率显著上升
```

**2. 教训**：从错误中提炼的规则

```markdown
## 教训
- architecture-guard 对 .md 文件的 cross-module 检测会误报：遇到时直接跳过，不要尝试修复代码
- 重构任务不要一次性修改超过 10 个文件：拆分为多个子任务更安全
- known_issues 中 status=open 超过 30 天的问题，大概率是 design_limitation 而非 bug
```

**3. 基线**：正常运行的统计指标

```markdown
## 基线
- 平均任务时长：8 分钟
- 平均每任务修改文件数：3.2
- 门禁平均通过率：87%
- 每月平均新增 known_issues：6 条，解决 4 条
```

### 蒸馏的执行方式

蒸馏本身是一个由 LLM 执行的任务——把历史数据喂给 LLM，让它提取模式和教训。

```python
def distill_memory(archive_dir: str, output_path: str) -> None:
    """执行记忆蒸馏。"""
    # 1. 加载归档数据
    archived_tasks = load_records(f"{archive_dir}/task_records_compressed.jsonl")
    resolved_issues = load_records(f"{archive_dir}/known_issues_resolved.jsonl")

    # 2. 统计计算（不需要 LLM）
    stats = compute_statistics(archived_tasks)

    # 3. LLM 提取模式和教训
    prompt = f"""
    以下是过去 6 个月的任务执行摘要（{len(archived_tasks)} 条）和已解决问题（{len(resolved_issues)} 条）。
    请提取：
    1. 重复出现的行为模式（最多 5 条）
    2. 从错误中提炼的规则（最多 5 条）
    3. 正常运行的统计基线

    任务数据：
    {json.dumps(archived_tasks[-100:], ensure_ascii=False)}

    已解决问题：
    {json.dumps(resolved_issues, ensure_ascii=False)}

    统计数据：
    {json.dumps(stats, ensure_ascii=False)}
    """
    distilled = llm_call(prompt)

    # 4. 写入蒸馏文件
    with open(output_path, "w") as f:
        f.write(f"# 记忆蒸馏 — 生成于 {now_iso()}\n\n")
        f.write(f"> 来源：{len(archived_tasks)} 条归档任务，{len(resolved_issues)} 条已解决问题\n\n")
        f.write(distilled)
```

### 蒸馏文件的加载

蒸馏文件体积小（< 2KB），在每次任务启动时**始终加载**，不受压缩级别影响。它是 agent 的"长期记忆"。

```python
def load_distilled_memory(log_dir: str) -> str | None:
    """加载记忆蒸馏文件。"""
    path = f"{log_dir}/distilled_memory.md"
    if os.path.exists(path):
        with open(path, "r") as f:
            return f.read()
    return None
```

---

## 四、与 Git 版本控制的关系

### .agent-log/ 应该被 git 追踪吗？

**推荐：追踪，但有选择地。**

```gitignore
# .gitignore
.agent-log/archive/          # 归档数据不追踪——体积大，变化快
.agent-log/*.tmp.*           # 临时文件不追踪
.agent-log/workspace_state.jsonl  # 快照变化太频繁，不追踪

# 以下文件追踪
# .agent-log/task_records.jsonl   ← 追踪：审计价值高
# .agent-log/known_issues.jsonl   ← 追踪：团队共享
# .agent-log/distilled_memory.md  ← 追踪：长期记忆
```

### 理由

追踪 `task_records.jsonl`：这是 agent 的执行历史，有审计价值。`git blame` 可以精确定位到每次任务写入。

追踪 `known_issues.jsonl`：多 agent 或多分支协作时，issue 表应该被共享。

不追踪 `workspace_state.jsonl`：快照每次任务都变，产生大量无意义的 diff。而且快照可以从文件系统重建——丢了也不怕。

不追踪 `archive/`：归档数据动辄几十 MB，放进 git 会严重膨胀仓库体积。

### 分支与合并

多分支开发时，`known_issues.jsonl` 可能产生合并冲突（两个分支各自新增了 issue）。JSON Lines 格式在这种情况下的合并策略：

```bash
# JSON Lines 的合并冲突解决：两个分支的新行都保留
# 因为每行是独立记录，不存在行内冲突——保留双方新增的行即可
git checkout --theirs .agent-log/known_issues.jsonl  # 不要这样做
# 正确做法：手动合并，保留两边的新行
```

---

## 五、灾难恢复

### 场景一：Agent Log 文件损坏

最常见的原因是进程崩溃导致最后一行 JSON 不完整。

```python
def repair_jsonl(filepath: str) -> int:
    """修复损坏的 JSONL 文件。返回丢弃的行数。"""
    valid_lines = []
    discarded = 0

    with open(filepath, "r") as f:
        for line in f:
            stripped = line.strip()
            if not stripped:
                continue
            try:
                json.loads(stripped)
                valid_lines.append(line)
            except json.JSONDecodeError:
                discarded += 1

    # 备份原文件
    backup_path = filepath + f".damaged.{now_compact()}"
    shutil.copy2(filepath, backup_path)

    # 写入修复后的文件
    with open(filepath, "w") as f:
        f.writelines(valid_lines)

    return discarded
```

### 场景二：Agent Log 整个目录丢失

可能原因：意外删除、git reset --hard、磁盘故障。

**恢复策略（优先级从高到低）**：

1. **从 git 历史恢复**（如果被追踪）
   ```bash
   git checkout HEAD -- .agent-log/task_records.jsonl
   git checkout HEAD -- .agent-log/known_issues.jsonl
   ```

2. **从文件系统重建 workspace_state**
   workspace_state 可以通过扫描文件系统 + 读取 git 状态来重建。损失的是历史快照和 `last_task_id` 等关联信息。
   ```python
   def rebuild_workspace_state(workspace_root: str) -> dict:
       return {
           "snapshot_id": f"snap-rebuilt-{now_compact()}",
           "timestamp": now_iso(),
           "git_head": run("git rev-parse --short HEAD"),
           "git_branch": run("git branch --show-current"),
           "git_dirty": run("git status --porcelain") != "",
           "files": scan_all_files(workspace_root),
           "module_summary": build_module_summary(workspace_root),
           "known_constraints": [],  # 需要从 AGENTS.md 或其他来源手动恢复
           "rebuilt": True,  # 标记这是重建的快照
           "schema_version": CURRENT_SCHEMA_VERSION
       }
   ```

3. **从 distilled_memory.md 恢复长期记忆**
   如果蒸馏文件仍在（或被 git 追踪），agent 至少保留了长期教训。

4. **冷启动——从零开始**
   最坏情况：所有数据丢失。agent 回到"对项目一无所知"的状态。这不是灾难——只是退化为一个没有历史记忆的新 agent。工作流仍然可以运行，只是前几轮任务质量会下降。

### 场景三：数据不一致但未损坏

例如：task_records 记录了某个任务修改了文件 A，但 workspace_state 中文件 A 的 `last_task_id` 指向另一个任务。

这类不一致通常是并发写入或中途崩溃造成的。处理方式：

**不主动修复历史数据。** 只确保最新快照是正确的（通过 Step 2 的差异检测）。历史数据中的不一致不影响 agent 的决策——agent 只关心"现在的状态是什么"，不关心"历史记录之间是否完美一致"。

---

## 六、清理策略的自动化调度

清理不应该依赖人类记得去运行。推荐的调度策略：

```json
{
  "cleanup_schedule": {
    "trigger": "post-task",
    "frequency": "every_10_tasks",
    "conditions": {
      "min_records_before_cleanup": 50,
      "min_age_before_archive_days": 30
    },
    "actions": [
      "cleanup_agent_log",
      "check_distill_needed"
    ]
  },
  "distill_schedule": {
    "trigger": "cleanup",
    "conditions": {
      "archive_records_count_gt": 500,
      "last_distill_age_days_gt": 30
    },
    "actions": [
      "distill_memory"
    ]
  }
}
```

**`every_10_tasks`**：不是每次任务都清理——那太频繁了。也不是每月一次——那间隔太长。每 10 个任务检查一次是合理的平衡。

**`check_distill_needed`**：只是检查是否需要蒸馏，不是每次都执行。蒸馏需要调用 LLM，有成本，不应频繁触发。
