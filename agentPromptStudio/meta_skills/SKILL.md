---
name: meta_skills
description: "Meta SKILL 集合：用于创建和维护各类 SKILL 本身。Use when: 新建技能、创建 CI 门禁技能、技能结构验收、技能重构。"
---

# Meta Skills

## 用途

本模块是"技能的技能"，提供创建不同类型 SKILL 的方法、结构规范和验收标准。

## 子技能索引

| 子技能 | 用途 | 入口 |
|---|---|---|
| skill-authoring-meta | 创建通用 SKILL | [skill-authoring-meta/SKILL.md](./skill-authoring-meta/SKILL.md) |
| ci-gate-skill | 创建 CI 门禁类 SKILL | [ci-gate-skill/SKILL.md](./ci-gate-skill/SKILL.md) |

## 如何选择子技能

- **通用 SKILL**（报告、分析、生成类）→ 使用 `skill-authoring-meta`
- **CI 门禁 SKILL**（pass/fail 信号、阻断流程类）→ 使用 `ci-gate-skill`

## 刚性约束

<!-- TODO: 补充跨子技能的公共约束 -->
