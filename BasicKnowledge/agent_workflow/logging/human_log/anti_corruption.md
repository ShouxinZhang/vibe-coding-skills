# 防腐烂

## 日志系统最大的敌人不是缺陷，是时间

一个刚建立的日志系统总是好的。字段定义清晰，摘要信息丰富，索引与文件同步。

三个月后，情况开始不一样。

半年后，日志系统可能已经名存实亡——文件还在生成，但内容越来越空洞，索引越来越不准确，格式越来越不一致。没有人刻意破坏它，它是自己烂掉的。

**防腐烂不是一次性设计，是持续运行的免疫系统。**

---

## 退化模式一：日志被跳过

### 症状

某些任务执行完毕后，没有生成对应的日志文件。AGENT_LOGBOOK.md 中缺少条目。INDEX.md 中的任务数量与实际不符。

### 原因

最常见的原因：任务被中断了（崩溃、超时、人为终止），`post-task` Hook 没有执行。

次常见的原因：有人在日志系统之外运行了 agent（直接调用，绕过了流水线），没有触发 Hook。

### 自动检测方法

**编号连续性检查**：全局编号应该是连续的。如果 AGENT_LOGBOOK.md 中出现 `#0041` 后面直接是 `#0043`，说明 `#0042` 被跳过了。

```
检测逻辑：
for i in range(1, max_id):
    if i not in logbook_ids:
        alert(f"缺失日志 #{i:04d}")
```

**时间线空洞检查**：如果 git log 显示某段时间有 commit，但对应日期目录下没有日志——说明有操作发生但未记录。

```
检测逻辑：
for commit in git_log:
    date = commit.date
    if not exists(f"docs/agent-logs/{date}/"):
        alert(f"{date} 有 git 活动但无日志")
```

### 预防手段

日志写入必须是任务完成的**前置条件**而非后置动作。

具体实现：`post-task` Hook 中，日志写入在"通知用户任务完成"之前执行。如果日志写入失败，任务状态标记为 `incomplete`，不标记为 `success`。

**日志未写入 = 任务未完成。** 这是定义，不是建议。

---

## 退化模式二：信息质量退化

### 症状

日志仍然在生成，字段仍然在填写，但内容越来越空洞。

典型退化轨迹：

```
第 1 周：summary 写 150 字，包含决策点和理由
第 4 周：summary 写 80 字，只有操作事实，没有理由
第 12 周：summary 写 30 字，"完成了 X 的修改"
第 24 周：summary 写 10 字，"已完成"
```

这是最隐蔽的退化。因为从格式上看，日志文件完全合规——所有字段都填了，文件名正确，索引同步。但信息价值趋近于零。

### 原因

- Agent 的 prompt 中没有强制要求 summary 质量
- 没有自动手段检测"摘要是否有意义"
- 相同结构的任务反复执行，agent 开始用模板化的 summary

### 自动检测方法

**字数下限检查**：summary 低于 30 字时触发告警。

```
检测逻辑：
if len(summary) < 30:
    alert("summary 字数过低，可能缺乏信息量")
```

**关键词缺失检查**：好的 summary 通常包含决策信号词（"因为"、"但是"、"选择"、"而非"、"尝试"、"发现"）。如果 summary 中完全不包含这类词汇，可能是纯操作列表。

```
检测逻辑：
decision_signals = ["因为", "但是", "选择", "而非", "尝试", "发现",
                    "决定", "原因", "替代", "妥协", "遗留"]
if not any(signal in summary for signal in decision_signals):
    warn("summary 可能缺少决策信息")
```

注意：这是启发式检测，会有误报。决策信号词不是必须出现的——有些简单任务确实不需要决策。但连续 5 条日志都没有任何决策信号，是可疑的。

**重复度检查**：连续 N 条日志的 summary 如果相似度过高（如编辑距离低于阈值），说明 agent 在用模板。

---

## 退化模式三：字段漂移

### 症状

不同时期的日志格式不一致。早期的日志有 11 个标准字段，后来某些字段开始被遗漏或替换。

```
第 1 周日志：gate_results 记录每个门禁的详细状态
第 8 周日志：gate_results 只写 "all pass"
第 16 周日志：gate_results 字段消失，被 "检查结果" 替代
```

### 原因

- Agent 的上下文窗口有限，如果字段规范没有在每次任务中被加载，agent 可能凭"记忆"填写，导致偏移
- 多个不同的 agent（不同的 prompt、不同的模型）轮流执行任务，各自对字段的理解不同
- 字段规范本身被修改了，但旧日志没有迁移

### 自动检测方法

**字段完整性检查**：每条日志必须包含全部 11 个必选字段。缺一个就报错。

```
检测逻辑：
required = {"timestamp", "prompt", "summary", "files_modified",
            "git_op", "gate_results", "isolated", "backup",
            "integrity_ok", "recoverability_ok", "error"}
for log in new_logs:
    missing = required - log.fields
    if missing:
        alert(f"日志 {log.id} 缺少字段: {missing}")
```

**字段类型检查**：每个字段的值类型是否符合规范。比如 `isolated` 应该是 `yes/no` 加说明，如果填了一段自然语言描述——字段漂移了。

**跨期一致性审计**：每月抽样对比当月第一条和最后一条日志的格式，如果字段名称或结构有差异，触发审计。

### 预防手段

**Schema 验证**：每次写入日志时，用 schema 验证文件结构。不通过则拒绝写入。

schema 不需要复杂——一个检查必选字段是否存在、值是否非空的脚本就够了。关键不是 schema 多严格，而是**每次都执行**。

```yaml
# human_log_schema.yaml
required_fields:
  - name: timestamp
    pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$"
  - name: prompt
    min_length: 1
  - name: summary
    min_length: 30
  - name: files_modified
    type: list
  - name: gate_results
    type: object
  - name: isolated
    allowed_prefix: ["yes", "no"]
  - name: backup
    allowed_prefix: ["yes", "no", "partial"]
  - name: integrity_ok
    allowed_prefix: ["yes", "no"]
  - name: recoverability_ok
    allowed_prefix: ["yes", "no"]
  - name: error
    nullable: true
```

---

## 退化模式四：索引失同步

### 症状

INDEX.md 或 AGENT_LOGBOOK.md 中的条目与实际日志文件不一致。

具体表现：
- 索引中有条目，但链接指向的文件不存在（幽灵条目）
- 日志文件存在，但索引中没有对应条目（遗漏条目）
- 索引中的摘要与日志文件中的 summary 不一致（摘要偏移）
- 索引中的状态标记（✅/⚠️/❌）与日志内容不一致（状态偏移）

### 原因

- 日志写入和索引更新不是原子操作——写入了日志但索引更新失败
- 有人手动修改了日志文件但没有更新索引
- 归档操作移动了日志文件但没有更新链接

### 自动检测方法

**双向链接检查**：

```
正向：INDEX.md 中每个链接 → 目标文件是否存在？
反向：每个日志文件 → INDEX.md 中是否有对应条目？

不一致 → 报错
```

这个检查应该在每次日志写入后执行。不能等到人类发现链接 404 了才知道索引坏了。

**摘要一致性检查**：INDEX.md 中的导航摘要是日志 summary 的缩略版。检查导航摘要是否是 summary 的子集或合理缩略——如果完全不相关，说明偏移了。

### 预防手段

**索引重建能力**：即使索引完全损坏，也能从日志文件重建。

```
重建逻辑：
1. 扫描所有 docs/agent-logs/YYYY-MM-DD/ 目录下的 .md 文件
2. 从每个文件提取 timestamp、全局编号、summary 第一句
3. 按时间排序，重建 INDEX.md 和 AGENT_LOGBOOK.md
```

索引不是权威来源，日志文件才是。索引是日志文件的派生物——如果两者不一致，以日志文件为准，重建索引。

---

## 退化模式五：日志与实际操作不一致

### 症状

这是最危险的退化。日志声称 agent 做了 X，但实际上 agent 做的是 Y，或者根本没做。

```
日志记录：files_modified 列出 "[修改] gate.md"
实际情况：gate.md 的 git diff 显示没有任何修改
```

```
日志记录：gate_results: architecture-guard: PASS
实际情况：architecture-guard 根本没有运行
```

### 原因

- Agent 在写日志时"预测性填写"——还没执行操作就先把日志写好了，然后操作失败但日志没更新
- Agent 的 summary 基于"计划做什么"而非"实际做了什么"
- 门禁被配置为总是返回 PASS（mock 模式没有关闭）

### 自动检测方法

**文件修改验证**：将 `files_modified` 列表与 `git diff` 对比。日志声称修改的文件，diff 中应该有对应。

```
检测逻辑：
claimed_files = parse_files_modified(log)
actual_files = git_diff(before_sha, after_sha)

# 日志声称修改但 diff 中没有
phantom = claimed_files - actual_files
if phantom:
    alert(f"日志声称修改了 {phantom}，但实际无变化")

# diff 中有修改但日志没记录
hidden = actual_files - claimed_files
if hidden:
    alert(f"实际修改了 {hidden}，但日志未记录")
```

**门禁结果验证**：每个门禁运行时应该独立产生一个结果文件（或输出日志）。将人类日志中的 `gate_results` 与门禁的独立输出对比。

```
检测逻辑：
for gate_name, claimed_result in log.gate_results.items():
    actual_result = read_gate_output(gate_name, log.task_id)
    if claimed_result != actual_result:
        alert(f"门禁 {gate_name}: 日志记录 {claimed_result}，实际 {actual_result}")
```

**时间戳合理性检查**：日志的 timestamp 应该在任务实际执行的时间范围内。如果日志时间戳比 git commit 时间早了一个小时——说明日志是预填的。

### 预防手段

**日志写入必须基于实际结果，不允许预填**。

技术实现：字段值不由 agent 手动填写，而是由工具链自动采集。`files_modified` 从 git diff 提取，`gate_results` 从门禁输出提取，`timestamp` 从系统时钟获取。agent 只负责写 `summary`——这是唯一需要"创作"的字段。

其他字段的值应该是**采集得到的事实，不是 agent 陈述的主张。**

---

## 防腐烂检查的执行频率

| 检查项 | 执行频率 | 执行方式 |
|--------|---------|---------|
| 编号连续性 | 每次日志写入后 | post-task Hook |
| 字段完整性 | 每次日志写入后 | post-task Hook |
| Schema 验证 | 每次日志写入后 | post-task Hook |
| 索引双向链接 | 每次日志写入后 | post-task Hook |
| summary 字数 | 每次日志写入后 | post-task Hook |
| 文件修改验证 | 每次日志写入后 | post-task Hook |
| 门禁结果验证 | 每次日志写入后 | post-task Hook |
| summary 决策信号词 | 每周一次 | 定时任务 |
| summary 重复度 | 每周一次 | 定时任务 |
| 跨期格式一致性 | 每月一次 | 定时任务 |
| 时间线空洞 | 每周一次 | 定时任务 |

**核心原则：实时检查防止单点故障，周期检查发现趋势性退化。**

---

## 防腐烂不是负担，是信任基础

人类审阅日志时，第一件事不是阅读内容，而是**判断日志是否可信**。

如果一条日志的 files_modified 与 git diff 不符，人类对整条日志的信任归零——即使 summary 写得再好也没用。

如果连续三条日志的 summary 都是"已完成"，人类对整个日志系统的信任归零——因为它显然不在认真记录。

**防腐烂机制保护的不是日志系统本身，是人类对日志系统的信任。** 一旦信任丧失，日志系统就不会再被阅读，归档的努力全部浪费。

保持信任的代价很小：每次写入时多跑几个检查脚本。失去信任的代价很大：重建一个被忽视的日志系统，等于从零开始。
