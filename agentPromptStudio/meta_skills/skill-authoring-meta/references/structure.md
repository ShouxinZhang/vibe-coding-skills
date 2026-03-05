# 结构规则

目标技能目录模板：

```text
.agents/skills/<skill-name>/
  SKILL.md
  references/
    index.md
    ...  # 模块化 md 文档
  scripts/
    *.sh
```

## 主入口 `SKILL.md` 必含项

- Frontmatter：`name`、`description`
- 用途
- 模块结构
- 使用方式
- 默认约束
- 子模块入口（明确到具体文件）

## references 设计建议

- `index.md`：索引
- `boundaries.md`：目录边界/文件职责
- `workflow.md`：执行流程
- `checklist.md`：验收项

## scripts 设计建议

- 每个脚本只做一件事
- 统一 shebang：`#!/usr/bin/env bash`
- 统一安全选项：`set -euo pipefail`
- 提供相对路径定位，避免依赖调用目录
- 路径层级：`scripts/` 到 repo root 标准为 4 层 `..`（`.agents/skills/<name>/scripts/`）
- 启动后台进程时必须 `trap cleanup EXIT`
- 产出物统一写到 `<project>/output/<skill>/` 子目录
- 依赖外部 CLI 工具时用 `npx -y <pkg>` 自动安装
