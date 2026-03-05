#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <skills_root> <skill_name>"
  echo "Example: $0 .agents/skills paperdraft-writing"
  exit 1
fi

skills_root="$1"
skill_name="$2"
skill_dir="$skills_root/$skill_name"

mkdir -p "$skill_dir/references" "$skill_dir/scripts"

cat > "$skill_dir/SKILL.md" <<'EOF'
---
name: REPLACE_SKILL_NAME
description: "REPLACE_DESCRIPTION"
---

# REPLACE_TITLE

## 用途

TODO

## 模块结构

- `SKILL.md`
- `references/`
- `scripts/`

## 使用方式

1. TODO
2. TODO

## 默认约束

- TODO

## 子模块入口

- `./references/index.md`
- `./scripts/build.sh`
EOF

cat > "$skill_dir/references/index.md" <<'EOF'
# References Index

- `boundaries.md`
- `workflow.md`
- `checklist.md`
EOF

cat > "$skill_dir/references/boundaries.md" <<'EOF'
# Boundaries

TODO
EOF

cat > "$skill_dir/references/workflow.md" <<'EOF'
# Workflow

TODO
EOF

cat > "$skill_dir/references/checklist.md" <<'EOF'
# Checklist

- TODO
EOF

cat > "$skill_dir/scripts/build.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "TODO: implement build script"
EOF

chmod +x "$skill_dir/scripts/build.sh"

echo "Scaffold created: $skill_dir"
