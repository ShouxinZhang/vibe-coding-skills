# 写入协议：事件驱动的实时记录

Agent Log 的写入**不等任务结束**。原因很简单：如果 agent 在第 47 步崩溃了，而日志只在第 50 步（任务结束）才写入，那前 47 步的所有状态更新都丢失了。下一个 agent 接手时面对的是一个残缺的世界观。

正确的写入策略：**每个触发事件立即写入，不做缓冲。**

---

## 一、触发事件与写入内容

### 事件清单

| 触发事件 | 写入目标 | 写入内容 | 优先级 |
|----------|----------|----------|--------|
| 任务开始 | `task_records.jsonl` | 新建 task_record（status=running） | P0 |
| 文件创建/修改/删除 | `workspace_state.jsonl` | 更新 files 列表 | P0 |
| 门禁运行完成 | `task_records.jsonl` | 更新 gate_results | P0 |
| 做出关键决策 | `task_records.jsonl` | 追加 decisions 条目 | P1 |
| 遇到未预期问题 | `known_issues.jsonl` | 新建 issue 条目 | P1 |
| 问题被解决 | `known_issues.jsonl` | 更新 status 为 resolved | P2 |
| 任务结束 | `task_records.jsonl` + `workspace_state.jsonl` | 更新 status、写入最终快照 | P0 |

P0 = 必须写入，P1 = 应当写入，P2 = 在时间允许时写入。

### 各事件的写入细节

#### 任务开始

任务开始时立即写入一条 `status=running` 的 task_record。这是"开始标记"——即使 agent 随后立即崩溃，下一个 agent 也能看到"上一个任务开始了但没有结束"。

```python
def on_task_start(task_id: str, prompt_hash: str, prompt_summary: str) -> None:
    record = {
        "task_id": task_id,
        "timestamp_start": now_iso(),
        "timestamp_end": None,
        "trigger": detect_trigger(),
        "prompt_hash": prompt_hash,
        "prompt_summary": prompt_summary,
        "status": "running",
        "exit_reason": None,
        "gate_results": {},
        "files_touched": [],
        "decisions": [],
        "errors": [],
        "unresolved": [],
        "context_loaded": get_loaded_context_summary(),
        "schema_version": CURRENT_SCHEMA_VERSION
    }
    append_record("task_records.jsonl", record)
```

#### 文件操作

每次文件操作后，更新 workspace_state 的 files 列表，同时在当前 task_record 的 `files_touched` 中追加。

```python
def on_file_op(path: str, op: str, task_id: str) -> None:
    # op: "create" | "modify" | "delete"
    # 1. 更新 workspace_state
    update_file_in_snapshot(path, op, task_id)
    # 2. 更新当前 task_record 的 files_touched
    append_to_task_field(task_id, "files_touched", {"path": path, "op": op})
```

**注意**：workspace_state 的更新不是追加新行，而是"读取最新快照 → 修改 → 写入新快照"。这涉及并发问题，详见 [data_model.md](./data_model.md) 的并发处理章节。

#### 门禁运行完成

每个门禁独立报告结果。

```python
def on_gate_complete(task_id: str, gate_name: str, status: str, duration_ms: int, reason: str = None) -> None:
    result = {
        "status": status,      # "pass" | "fail" | "skipped"
        "duration_ms": duration_ms
    }
    if reason:
        result["reason"] = reason
    update_task_field(task_id, f"gate_results.{gate_name}", result)
```

#### 任务结束

任务结束是写入的"关账"时刻。此时需要：

1. 更新 task_record 的 `status` 和 `timestamp_end`
2. 写入最终的 workspace_state 快照
3. 检查是否有 `unresolved` 条目需要升级为 known_issues

```python
def on_task_end(task_id: str, status: str, exit_reason: str) -> None:
    # 1. 更新 task_record
    update_task_field(task_id, "status", status)
    update_task_field(task_id, "timestamp_end", now_iso())
    update_task_field(task_id, "exit_reason", exit_reason)

    # 2. 写入最终快照
    snapshot = build_current_snapshot()
    append_record("workspace_state.jsonl", snapshot)

    # 3. 升级高严重性的 unresolved 为 known_issues
    task = load_task_by_id(task_id)
    for item in task.get("unresolved", []):
        if item.get("severity") in ("high", "critical"):
            promote_to_known_issue(item, task_id)
```

---

## 二、写入的原子性

### 问题

如果 agent 在写入过程中崩溃——写了一半的 JSON 行、更新了 task_record 但没更新 workspace_state——日志文件会进入不一致状态。

### JSON Lines 的天然优势

JSON Lines 格式的写入原子性依赖于操作系统的文件追加语义：

- 单次 `write()` 系统调用，写入内容不超过 `PIPE_BUF`（Linux 4096 字节），追加是原子的
- 一行 JSON 要么完整写入，要么根本没写入
- 即使进程崩溃，已写入的行不会被破坏——最坏情况是最后一行不完整

因此，基本策略是：**每次写入操作对应一次 `write()` 调用，写入一整行。**

```python
def append_record(filepath: str, record: dict) -> None:
    """原子追加一条记录。"""
    line = json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
    encoded = line.encode("utf-8")

    if len(encoded) >= 4096:
        # 超过原子写入保证的大小——需要特殊处理
        append_large_record(filepath, record)
        return

    with open(filepath, "ab") as f:  # 二进制追加模式
        f.write(encoded)
```

### 大记录的处理

当单条记录超过 4KB 时（通常是 `files_touched` 列表很长的 task_record），原子追加不再保证。

解决方案：**写入临时文件 → 原子重命名**。

```python
def append_large_record(filepath: str, record: dict) -> None:
    """大记录的安全写入：先写临时文件，再追加到目标。"""
    line = json.dumps(record, ensure_ascii=False) + "\n"

    # 写入临时文件
    tmp_path = filepath + f".tmp.{os.getpid()}"
    with open(tmp_path, "w") as f:
        f.write(line)
        f.flush()
        os.fsync(f.fileno())  # 确保写入磁盘

    # 追加到目标文件（使用文件锁）
    with open(filepath, "a") as target:
        fcntl.flock(target, fcntl.LOCK_EX)
        try:
            with open(tmp_path, "r") as src:
                target.write(src.read())
        finally:
            fcntl.flock(target, fcntl.LOCK_UN)

    os.remove(tmp_path)
```

### 跨文件一致性

一次事件可能需要同时更新多个文件（如任务结束时更新 task_records 和 workspace_state）。这两个写入不是原子的——可能写了 task_records 但没写 workspace_state。

**不追求跨文件原子性。** 理由：

1. 代价太高——需要自制事务日志或引入 SQLite，违背了"简单为王"的原则
2. 后果可控——下一个 agent 在 Step 2（差异检测）中会发现不一致并修复
3. 每个文件内部是自洽的——不会出现"半条记录"

如果对一致性要求极高，答案不是在 JSON Lines 上叠加复杂机制，而是迁移到 SQLite。

---

## 三、写入频率控制

### 问题

"每个事件立即写入"在理论上最安全，但在实践中有代价：

- 每次写入都是一次磁盘 I/O
- 短时间内大量文件操作（如批量创建 10 个文件）会产生 10 次写入
- workspace_state 的更新涉及"读取 → 修改 → 写入"，频繁操作会增加并发冲突概率

### 分级写入策略

不同事件的写入紧迫度不同：

| 事件类型 | 写入策略 | 最大延迟 |
|----------|----------|----------|
| 任务开始/结束 | 立即写入 | 0 |
| 门禁结果 | 立即写入 | 0 |
| 错误发生 | 立即写入 | 0 |
| 单个文件操作 | 立即写入 | 0 |
| 批量文件操作（连续 > 3 个） | 合并写入 | 2 秒 |
| 决策记录 | 延迟写入 | 5 秒 |
| known_issues 更新 | 延迟写入 | 5 秒 |

### 合并写入的实现

```python
class BatchWriter:
    """合并短时间内的多次文件操作事件为一次写入。"""

    def __init__(self, flush_interval_sec: float = 2.0):
        self.buffer: list[dict] = []
        self.flush_interval = flush_interval_sec
        self.last_flush = time.time()

    def add(self, event: dict) -> None:
        self.buffer.append(event)
        # 立即触发条件：缓冲区已满 或 超时
        if len(self.buffer) >= 10 or self._should_flush():
            self.flush()

    def _should_flush(self) -> bool:
        return time.time() - self.last_flush >= self.flush_interval

    def flush(self) -> None:
        if not self.buffer:
            return
        # 将所有缓冲事件合并为一次快照更新
        merged = merge_file_events(self.buffer)
        update_workspace_state(merged)
        self.buffer.clear()
        self.last_flush = time.time()

    def force_flush(self) -> None:
        """任务结束时强制刷新。"""
        self.flush()
```

### 安全兜底

无论写入策略如何优化，**任务结束时必须执行一次全量刷新**：

```python
# 在 on_task_end 的开头
batch_writer.force_flush()
```

这确保任务结束后，所有待写入的状态都已经持久化。

---

## 四、decisions 记录的写作标准

### 什么算"关键决策"

task_record 中的 `decisions` 字段是最有价值的信息之一——下一个 agent 不只想知道"做了什么"，还想知道"为什么这样做"。

但不是所有选择都需要记录。Agent 在一次任务中可能做出几十上百个微决策（用 for 循环还是 map？变量命名用驼峰还是下划线？），全部记录是不现实的。

**判断标准：这个决策如果做错了，会影响到后续任务吗？**

| 记录 ✓ | 不记录 ✗ |
|--------|----------|
| 选择了 JSON Lines 而非 SQLite 作为存储格式 | 选择了用 `json.dumps` 而非 `orjson.dumps` |
| 决定把 agent_log.md 拆分为文件夹结构 | 决定先写 introduction 再写 data_model |
| 在两种架构方案中选了 A 方案 | 在两种等价的变量命名中选了其一 |
| 跳过了某个门禁检查（附原因） | 运行了所有门禁且全部通过 |
| 发现了一个 workaround 并采用了它 | 走了一条没有障碍的正常路径 |

### 决策记录的格式

每条决策必须包含三个字段：

```json
{
  "point": "面临的选择是什么",
  "options_considered": ["方案A", "方案B", "方案C"],
  "choice": "选了哪个",
  "reason": "为什么选这个（一句话，不写论文）"
}
```

**`options_considered` 的意义**：不只记录"选了什么"，还要记录"放弃了什么"。如果后续 agent 发现当前方案有问题，可以直接查看被放弃的替代方案，而不是从零开始探索。

### 反模式

以下是常见的无效决策记录：

```json
// ✗ 太模糊，没有可操作的信息
{
  "point": "选择了合适的方案",
  "choice": "最好的那个",
  "reason": "因为它最合适"
}

// ✗ 不是决策，是动作描述
{
  "point": "创建了 introduction.md",
  "choice": "创建文件",
  "reason": "需要一个引言文件"
}

// ✗ 太细节，不影响后续任务
{
  "point": "JSON 缩进选择",
  "choice": "2 空格",
  "reason": "看起来更整齐"
}
```

### 决策密度参考

一个典型的 30 分钟任务，关键决策通常在 1-5 个之间。如果超过 10 个，要么是任务太复杂需要拆分，要么是记录标准太松需要收紧。如果是 0 个，要么是一个纯机械执行的任务（正常），要么是 agent 遗漏了记录（需要检查）。

---

## 五、更新已有记录 vs 追加新记录

JSON Lines 是追加友好的，但"更新已有记录"在追加模式下很别扭——不能原地修改某一行。

### 策略：追加覆盖

对于 task_record 的更新（如添加 gate_results、更新 status），采用"追加覆盖"策略：

```python
# 不修改原有行。追加一条新行，带相同 task_id 和更新后的字段。
# 读取时，同一 task_id 的多条记录合并，后面的覆盖前面的。

def merge_task_records(records: list[dict]) -> dict:
    """合并同一 task_id 的多条记录。"""
    merged = {}
    for r in records:
        tid = r["task_id"]
        if tid not in merged:
            merged[tid] = r.copy()
        else:
            # 后写入的字段覆盖先写入的
            for key, value in r.items():
                if value is not None:
                    if isinstance(value, list) and isinstance(merged[tid].get(key), list):
                        merged[tid][key].extend(value)  # 列表追加
                    else:
                        merged[tid][key] = value  # 标量覆盖
    return merged
```

这种方式牺牲了存储效率（同一任务会有多行），但换取了写入的安全性——每次写入都是独立的追加，不触碰已有数据。

空间问题通过 lifecycle.md 中的压缩策略解决。
