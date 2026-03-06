#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  resolve_workspace_path.sh <task-slug> <agent-name> [--create] [--json] [--quiet]

Examples:
  resolve_workspace_path.sh agent_system_rewrite writer_examples
  resolve_workspace_path.sh agent_system_rewrite writer_examples --create --json
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

create_mode=0
json_mode=0
quiet_mode=0
positionals=()

for arg in "$@"; do
  case "$arg" in
    --create)
      create_mode=1
      ;;
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

if [[ ${#positionals[@]} -ne 2 ]]; then
  usage
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
task_slug="${positionals[0]}"
agent_name="${positionals[1]}"

require_name "$task_slug" "task-slug"
require_name "$agent_name" "agent-name"

workspace_dir="$repo_root/.agent_cache/$task_slug/$agent_name"

if [[ "$create_mode" -eq 1 ]]; then
  mkdir -p "$workspace_dir"
fi

if [[ ! -d "$workspace_dir" ]]; then
  echo "Error: workspace does not exist: $workspace_dir" >&2
  echo "Hint: run scaffold_task_workspace.sh or pass --create" >&2
  exit 1
fi

if [[ "$quiet_mode" -eq 1 ]]; then
  exit 0
fi

if [[ "$json_mode" -eq 1 ]]; then
  python3 - "$task_slug" "$agent_name" "$workspace_dir" <<'PY'
import json
import sys

print(json.dumps({
    "task_slug": sys.argv[1],
    "agent_name": sys.argv[2],
    "workspace_dir": sys.argv[3],
}, ensure_ascii=False, indent=2))
PY
  exit 0
fi

echo "$workspace_dir"
