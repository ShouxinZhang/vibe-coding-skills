---
name: skill-authoring-meta
description: "Meta skill：用于创建与维护仓库技能本身。Use when: 新建技能、技能结构重构、技能验收。"
---

# Skill Authoring Meta

## 用途

用于创建和维护 `.agents/skills/*` 下的技能目录，统一采用“主入口 + references + scripts”的结构。

## 标准结构

- `SKILL.md`：技能主入口（用途、模块结构、使用方式、默认约束）
- `references/*.md`：模块化参考文档（规则、映射、清单、速览）
- `scripts/*.sh`：可执行脚本（构建、检查、脚手架）

## 刚性约束

- `scripts/` 内只放 `*.sh`，不放 `README.md`。
- `references/` 内放模块化 `*.md`，不要把所有内容堆到一个文件。
- 主 `SKILL.md` 只做入口和索引，不承载全部细节。

## 使用流程

1. 先阅读 `references/structure.md` 确认目标技能结构。
2. 使用 `scripts/scaffold_skill.sh` 生成骨架。
3. 在 `references/checklist.md` 按项完成验收。

## 子模块入口

- 结构规则：`./references/structure.md`
- 实践经验：`./references/practice-notes.md`
- 验收清单：`./references/checklist.md`
- 脚手架脚本：`./scripts/scaffold_skill.sh`
