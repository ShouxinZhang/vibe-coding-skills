#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  cleanup_task_workspace.sh <task-slug> [--json] [--quiet]

This script archives the task workspace into .agent_cache/_trash/ instead of deleting it permanently.
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

if [[ ${#positionals[@]} -ne 1 ]]; then
  usage
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
task_slug="${positionals[0]}"
require_name "$task_slug" "task-slug"

task_dir="$repo_root/.agent_cache/$task_slug"
if [[ ! -d "$task_dir" ]]; then
  echo "Error: task workspace does not exist: $task_dir" >&2
  exit 1
fi

trash_root="$repo_root/.agent_cache/_trash"
timestamp="$(date +%Y%m%d-%H%M%S)"
archive_dir="$trash_root/${timestamp}-${task_slug}"

mkdir -p "$trash_root"
mv "$task_dir" "$archive_dir"

if [[ "$quiet_mode" -eq 1 ]]; then
  exit 0
fi

if [[ "$json_mode" -eq 1 ]]; then
  python3 - "$task_slug" "$archive_dir" <<'PY'
import json
import sys

print(json.dumps({
    "task_slug": sys.argv[1],
    "archive_dir": sys.argv[2],
}, ensure_ascii=False, indent=2))
PY
  exit 0
fi

echo "$archive_dir"
