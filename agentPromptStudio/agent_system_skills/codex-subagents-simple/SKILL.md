---
name: codex-subagents-simple
description: '用 Codex SDK 启动多个并行 subagents。由 primary agent 预先分配 owned paths、阅读文件和验收标准，让 subagents 以 gpt-5.4 + high + danger-full-access 执行并回传改动、检查和风险。'
---

# Codex Subagents Simple

这个技能用于把一个较大的任务拆成多个可并行推进的子任务，由 primary agent 明确分配文件边界，再让多个 subagents 直接执行。

## 何时使用

1. 一个任务可以自然拆成多个子任务，并且每个子任务有清晰的 `ownedPaths`。
2. 需要通过并行 subagents 提升推进速度，而不是维持单线程 worker loop。
3. 需要每个 subagent 回传统一结果：`改了什么`、`跑了什么检查`、`还有什么风险`。

## 原则

- primary agent 先拆任务，再运行脚本。
- 每个 subagent 必须拿到明确的：
  - `mission`
  - `ownedPaths`
  - `readFiles`
  - `acceptanceCriteria`
- subagent 使用 `danger-full-access` 执行，但默认只应修改自己负责的 `ownedPaths`。
- 脚本会回收实际文件改动，并标记越界写入风险。

## 前提

- 本地 `node`、`npm` 可用
- 本机 `codex` CLI 可被 `@openai/codex-sdk` 调用，并已可用
- 目标工作区在当前仓库内或一个可访问路径中

## 命令

### 1) 首次安装依赖

```bash
npm --prefix .agents/skills/codex-subagents-simple install
```

### 2) 运行并行 subagents

```bash
npm --prefix .agents/skills/codex-subagents-simple run subagents -- \
  --spec /abs/path/to/subagents-spec.json \
  --workspace-root /abs/path/to/workspace
```

### 3) 控制模型与并发度

```bash
npm --prefix .agents/skills/codex-subagents-simple run subagents -- \
  --spec /abs/path/to/subagents-spec.json \
  --workspace-root /abs/path/to/workspace \
  --model gpt-5.4 \
  --reasoning-effort high \
  --max-parallel 3
```

## Spec 结构

```json
{
  "task": "修复 reverse/java21-baseline 的一组问题",
  "acceptanceCriteria": [
    "相关模块完成修改",
    "每个 subagent 都返回改动、检查和风险"
  ],
  "sharedContextFiles": [
    "README.md",
    "reverse/java21-baseline/README.md"
  ],
  "subagents": [
    {
      "name": "entry-chain",
      "mission": "修复入口链和启动流程",
      "ownedPaths": [
        "reverse/java21-baseline/src/manual/GameMIDlet.java",
        "reverse/java21-baseline/src/manual/ba.java"
      ],
      "readFiles": [
        "reverse/java21-baseline/src/generated-all/GameMIDlet.java",
        "reverse/java21-baseline/src/generated-all/ba.java"
      ],
      "extraInstructions": [
        "优先保留现有模块边界",
        "先跑最小编译检查再结束"
      ]
    }
  ]
}
```

## 输出

- 默认输出到 `.agent_cache/codex-subagents-simple/<timestamp>-<slug>/`
- `spec.normalized.json`: 标准化后的执行 spec
- `agents/<name>.json`: 每个 subagent 的结构化结果
- `summary.md`: 汇总结果

## 质量门禁

首次运行前，建议先执行：

```bash
python3 .agents/skills/typescript-quality-gate/scripts/typescript_gate.py \
  --module .agents/skills/codex-subagents-simple \
  --install
```
