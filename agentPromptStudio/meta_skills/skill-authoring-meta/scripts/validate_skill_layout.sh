#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <skill_dir>"
  echo "Example: $0 .agents/skills/paperdraft-writing"
  exit 1
fi

skill_dir="$1"

fail() {
  echo "[FAIL] $1"
  exit 1
}

[[ -f "$skill_dir/SKILL.md" ]] || fail "Missing SKILL.md"
[[ -d "$skill_dir/references" ]] || fail "Missing references/"
[[ -d "$skill_dir/scripts" ]] || fail "Missing scripts/"

ref_count=$(find "$skill_dir/references" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
[[ "$ref_count" -ge 2 ]] || fail "references/ requires at least 2 markdown files"

non_sh_count=$(find "$skill_dir/scripts" -maxdepth 1 -type f ! -name '*.sh' | wc -l | tr -d ' ')
[[ "$non_sh_count" -eq 0 ]] || fail "scripts/ contains non-.sh files"

if grep -q 'references/README.md\|scripts/README.md' "$skill_dir/SKILL.md"; then
  fail "SKILL.md still references README.md in references/scripts"
fi

# Check description has "Use when:" trigger
if ! head -5 "$skill_dir/SKILL.md" | grep -qi 'Use when'; then
  echo "[WARN] description in SKILL.md frontmatter lacks 'Use when:' trigger"
fi

# Check scripts have trap cleanup if they use background processes
for script in "$skill_dir/scripts/"*.sh; do
  if grep -q '&$\|& *$' "$script" 2>/dev/null && ! grep -q 'trap.*EXIT' "$script" 2>/dev/null; then
    echo "[WARN] $script starts background process but has no 'trap cleanup EXIT'"
  fi
done

echo "[PASS] Skill layout looks good: $skill_dir"
