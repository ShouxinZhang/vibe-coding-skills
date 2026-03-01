---
name: python-quality-gate
description: '通用 Python 开发门禁技能。统一执行 Ruff 与 Pyright，并支持多目录目标与自动发现。'
---

# Python Quality Gate Skill

这个技能用于统一执行 Python 质量门禁，默认一次性执行：
- `ruff check`
- `pyright`

## 何时使用

1. 提交代码前做质量门禁检查。
2. 新建模块后快速验证 lint 与类型检查。
3. 在 CI 前本地预检。

## 命令

### 1) 默认执行全部门禁

```bash
python3 .agents/skills/python-quality-gate/scripts/python_gate.py
```

### 2) 指定检测文件夹

```bash
python3 .agents/skills/python-quality-gate/scripts/python_gate.py --targets src sandbox
```

说明：
- `--targets` 支持一个或多个目录，例如 `--targets src` 或 `--targets src sandbox`。
- 默认同时执行 Ruff 和 Pyright，任一失败即返回非 0。

## 兼容入口

- 项目内可继续使用 `./check_errors.sh`，其已委托到本技能脚本。
