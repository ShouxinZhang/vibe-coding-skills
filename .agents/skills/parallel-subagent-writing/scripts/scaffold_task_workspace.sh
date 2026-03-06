#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scaffold_task_workspace.sh <task-slug> [agent-name ...] [--json] [--quiet]

Examples:
  scaffold_task_workspace.sh agent_system_rewrite writer_background writer_examples
  scaffold_task_workspace.sh agent_system_rewrite writer_background writer_examples --json
  scaffold_task_workspace.sh sql_intro_refresh --quiet
EOF
}

require_name() {
  local value="$1"
  local label="$2"
  if [[ -z "$value" ]]; then
    echo "Error: ${label} cannot be empty" >&2
    exit 1
  fi
  if [[ ! "$value" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "Error: ${label} must match [A-Za-z0-9._-]+" >&2
    exit 1
  fi
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

json_mode=0
quiet_mode=0
positionals=()

for arg in "$@"; do
  case "$arg" in
    --json)
      json_mode=1
      ;;
    --quiet)
      quiet_mode=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      positionals+=("$arg")
      ;;
  esac
done

if [[ ${#positionals[@]} -lt 1 ]]; then
  usage
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
task_slug="${positionals[0]}"
require_name "$task_slug" "task-slug"

agent_names=()
if [[ ${#positionals[@]} -gt 1 ]]; then
  for agent_name in "${positionals[@]:1}"; do
    require_name "$agent_name" "agent-name"
    agent_names+=("$agent_name")
  done
fi

task_dir="$repo_root/.agent_cache/$task_slug"
mkdir -p "$task_dir"

for agent_name in "${agent_names[@]}"; do
  mkdir -p "$task_dir/$agent_name"
done

brief_file="$task_dir/brief.md"
outline_file="$task_dir/outline.md"
deliverables_file="$task_dir/deliverables.json"

if [[ ! -f "$brief_file" ]]; then
  cat > "$brief_file" <<EOF
# ${task_slug} Brief

## Goal

- Replace with the business outcome of this writing task.

## Audience

- Replace with the intended reader or consumer.

## Writing Style

- Replace with style constraints, tone, and quality bar.

## Shared Context

- Add the world model, terminology, naming rules, and global constraints shared by every subagent.

## Terminology

- List key terms that must stay consistent across files.

## Naming Rules

- Define file naming, heading style, and link conventions.

## Global Constraints

- Add non-negotiable rules, including what must not be changed or duplicated.
EOF
fi

if [[ ! -f "$outline_file" ]]; then
  cat > "$outline_file" <<EOF
# ${task_slug} Outline

## Global Structure

- Replace this section with the target directory tree or file list.

## File Relationships

| File | Purpose | Depends On | Must Not Duplicate |
|------|---------|------------|--------------------|
| example.md | Replace with a real file | related.md | another.md |

## Merge Notes

- Note the promotion order and any files that need cross-references.
EOF
fi

if [[ ! -f "$deliverables_file" ]]; then
  python3 - "$task_slug" "$task_dir" "${agent_names[@]}" <<'PY'
import json
import os
import sys

task_slug = sys.argv[1]
task_dir = sys.argv[2]
agent_names = sys.argv[3:]

data = {
    "schema_version": 1,
    "task_slug": task_slug,
    "task_dir": task_dir,
    "shared_context": {
        "brief_path": "brief.md",
        "outline_path": "outline.md",
        "summary": "Fill in the global writing context shared by all subagents.",
        "terminology": [],
        "naming_rules": [],
        "global_constraints": [],
    },
    "agents": {},
}

for agent_name in agent_names:
    data["agents"][agent_name] = {
        "workspace": agent_name,
        "allow_new_files": False,
        "shared_context": [
            "../brief.md",
            "../outline.md",
        ],
    "deliverables": [
      {
        "source": "",
        "target": "",
        "must_reference": [],
        "must_not_duplicate_with": [],
        "notes": "Replace with the candidate file and formal target path for this subagent.",
      }
    ],
    }

out_path = os.path.join(task_dir, "deliverables.json")
with open(out_path, "w", encoding="utf-8") as handle:
    json.dump(data, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
PY
fi

if [[ "$quiet_mode" -eq 1 ]]; then
  exit 0
fi

if [[ "$json_mode" -eq 1 ]]; then
  python3 - "$task_slug" "$task_dir" "$brief_file" "$outline_file" "$deliverables_file" "${agent_names[@]}" <<'PY'
import json
import sys

task_slug = sys.argv[1]
task_dir = sys.argv[2]
brief_file = sys.argv[3]
outline_file = sys.argv[4]
deliverables_file = sys.argv[5]
agent_names = sys.argv[6:]

print(json.dumps({
    "task_slug": task_slug,
    "task_dir": task_dir,
    "contract_files": {
        "brief": brief_file,
        "outline": outline_file,
        "deliverables": deliverables_file,
    },
    "agent_dirs": {name: f"{task_dir}/{name}" for name in agent_names},
}, ensure_ascii=False, indent=2))
PY
  exit 0
fi

echo "TASK_DIR=$task_dir"
echo "CONTRACT_FILE[brief]=$brief_file"
echo "CONTRACT_FILE[outline]=$outline_file"
echo "CONTRACT_FILE[deliverables]=$deliverables_file"

for agent_name in "${agent_names[@]}"; do
  echo "AGENT_DIR[$agent_name]=$task_dir/$agent_name"
done
