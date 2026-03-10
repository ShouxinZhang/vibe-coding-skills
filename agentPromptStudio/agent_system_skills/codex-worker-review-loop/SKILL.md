---
name: codex-worker-review-loop
description: '用 TypeScript 和 Codex SDK 构建单线程 worker-reviewer 状态机。维护 plan.md 与 memory.md，让 worker 连续工作、让 reviewer 无状态审核并最多回退 20 轮。'
---

# Codex Worker Review Loop

这个技能用于快速搭建一个最小多 agent 原型：一个 worker 通过 Codex SDK 负责落地任务，一个 reviewer 通过 Codex SDK 负责审核并决定 `approve` 或 `rework`。

## 何时使用

1. 需要验证“人类退出第一轮审核”是否可行。
2. 需要一个单线程、可追溯、可重放的 worker-reviewer loop。
3. 需要把完整上下文沉淀到 Markdown，而不是把状态藏在一次会话里。

## 前提

- 本地 `node`、`npm` 可用
- 本机 `codex` CLI 可被 Codex SDK 调用，并已完成可用认证（例如 ChatGPT 登录态或 API key）
- 目标工作区在当前仓库内或一个可访问路径中

## 目录约定

- `.agent_cache/codex-worker-review-loop/<timestamp>-<slug>/plan.md`: 当前计划
- `.agent_cache/codex-worker-review-loop/<timestamp>-<slug>/memory.md`: 完整工作记忆
- `.agent_cache/codex-worker-review-loop/<timestamp>-<slug>/messages/worker-XX.md`: 每轮 worker 最新消息
- `.agent_cache/codex-worker-review-loop/<timestamp>-<slug>/messages/reviewer-XX.md`: 每轮 reviewer 意见
- `.agent_cache/codex-worker-review-loop/<timestamp>-<slug>/state.json`: 当前状态机快照

## 命令

### 1) 首次安装依赖

```bash
cd .agents/skills/codex-worker-review-loop
npm install
```

### 2) 运行一个最小 loop

```bash
npm --prefix .agents/skills/codex-worker-review-loop run loop -- \
  --task "为 reverse/java21-baseline 增加一次编译验证并总结结果" \
  --workspace-root /home/wudizhe001/Documents/GitHub/agent-game-j2me
```

### 3) 指定最大重做次数与模型

```bash
npm --prefix .agents/skills/codex-worker-review-loop run loop -- \
  --task "修复某个模块并自审" \
  --workspace-root /path/to/workspace \
  --max-reworks 20 \
  --worker-model gpt-5.4 \
  --reviewer-model gpt-5.4
```

## 状态机规则

- 单线程运行
- 默认初始化 `plan.md`
- worker 每轮读取完整 `memory.md`
- reviewer 每轮先读取 `plan.md` 与 worker 最新消息
- reviewer 可自主决定是否继续读取 `memory.md` 或其它文件
- reviewer 只输出：
  - `approve` 或 `rework`
  - 简短意见
  - 下一轮 worker 指令
- 最多重做 `20` 次

## 质量门禁

首次运行前，建议先执行：

```bash
python3 .agents/skills/typescript-quality-gate/scripts/typescript_gate.py \
  --module .agents/skills/codex-worker-review-loop \
  --install
```
