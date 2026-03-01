---
name: workspace-docs
description: '管理和读取工作区目录文档。使用该技能可了解文件/目录用途、读取 agent 专用备注，或在创建/修改文件后更新文档。'
---

# Workspace Docs Management

这个技能提供了一个基于 SQLite 的工具，用于记录和查询项目中各文件与目录的用途，以及 agent 专用备注。

## When to use this skill?
1. **Exploring the project**: 当你不清楚某个文件的作用，或想在修改前了解注意事项时使用。
2. **After modifying/creating files**: 当你新建文件或对现有文件做了重要重构后，你 **MUST** 使用该技能更新文档。

## How to use (Execution)
所有操作都通过运行 [agent_docs.py](./scripts/agent_docs.py) 脚本完成。

### 1. Query Documentation (Read)
想了解 `src/db.py` 的作用：
`python3 .agents/skills/workspace-docs/scripts/agent_docs.py get "src/db.py"`

### 2. Update/Add Documentation (Create/Update)
在创建或修改文件后，记录对应文档信息：
`python3 .agents/skills/workspace-docs/scripts/agent_docs.py set "src/new_file.py" -d "Short description" -n "Notes for the Agent"`

### 3. Export Global Documentation (Export)
生成完整的 Markdown 总览（根目录下的 `WORKSPACE_MAP.md`）：
`python3 .agents/skills/workspace-docs/scripts/agent_docs.py export`

### 4. Scan Workspace (Scan)
扫描工作区中未文档化的文件，并将其加入数据库：
`python3 .agents/skills/workspace-docs/scripts/agent_docs.py scan`
