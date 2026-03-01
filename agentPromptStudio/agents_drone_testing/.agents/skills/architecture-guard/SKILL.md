---
name: architecture-guard
description: '可验证的架构与模块化守卫技能。提供架构标准机械检测、方法论清单、代码冗余检测与报告导出。'
---

# Architecture Guard Skill

这个技能用于把“架构原则”转化为可执行、可复验的机械检测。
目标是让工程从“经验约束”升级为“规则约束 + 报告证据”。

## 核心能力

1. **模块化架构检测**
- 检查分层依赖是否单向（例如 UI 不应直接依赖基础设施层）。
- 检查边界违规导入（可配置禁止导入规则）。

2. **方法论检查清单**
- 统一用例/边界/契约思维，帮助做架构评审。
- 输出可审阅报告，支持作为 PR 证据。

3. **代码冗余检测**
- 基于函数体归一化指纹，识别重复实现。
- 输出重复函数位置，指导抽象和 API 复用。

4. **报告导出**
- 生成 Markdown 报告到 `docs/architecture/architecture_guard_report.md`。

## 规则文件

默认规则文件：
`./.agents/skills/architecture-guard/rules/architecture_rules.json`

你可以在这里定义：
- 层定义与允许依赖
- 源码扫描根目录
- 禁止导入规则
- 冗余检测阈值

## 命令

### 1) 检查模块化

```bash
python3 .agents/skills/architecture-guard/scripts/architecture_guard.py check-modularity
```

### 2) 检查冗余

```bash
python3 .agents/skills/architecture-guard/scripts/architecture_guard.py check-redundancy
```

### 3) 全量检查

```bash
python3 .agents/skills/architecture-guard/scripts/architecture_guard.py check-all
```

### 4) 严格模式（发现问题即非 0 退出）

```bash
python3 .agents/skills/architecture-guard/scripts/architecture_guard.py check-all --strict
```

### 5) 导出报告

```bash
python3 .agents/skills/architecture-guard/scripts/architecture_guard.py report
```

## 方法论（简版）

1. **先边界后实现**
- 先定义层边界和 API 契约，再写业务代码。

2. **单向依赖优先**
- 高层依赖低层抽象，不反向耦合实现细节。

3. **抽象复用优先于复制粘贴**
- 重复逻辑被检测后，优先上提为服务或仓储 API。

4. **可观测性内建**
- 错误、日志、上下文在接口层统一输出。

5. **证据化治理**
- 每次架构调整都输出报告，避免“口头一致、代码分裂”。
