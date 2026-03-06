#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  prepare_promotion_bundle.sh <task-slug> [--json] [--quiet]

This script snapshots declared deliverables into a promotion bundle so the main agent can review and lift results into the formal repository.
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

bundle_json="$(python3 - "$task_slug" "$task_dir" <<'PY'
import json
import os
import shutil
import sys
from datetime import datetime

task_slug = sys.argv[1]
task_dir = os.path.abspath(sys.argv[2])
deliverables_path = os.path.join(task_dir, "deliverables.json")

if not os.path.exists(deliverables_path):
    raise SystemExit(f"Error: deliverables.json is missing: {deliverables_path}")

with open(deliverables_path, "r", encoding="utf-8") as handle:
    contract = json.load(handle)

agents = contract.get("agents")
if not isinstance(agents, dict):
    raise SystemExit("Error: deliverables.json must contain an object field 'agents'")

schema_failures = []
workspace_by_agent = {}
for agent_name, config in agents.items():
    if not isinstance(config, dict):
        schema_failures.append(f"agent {agent_name} config must be an object")
        continue

    workspace = str(config.get("workspace", agent_name)).strip()
    if not workspace:
        schema_failures.append(f"agent {agent_name} has an empty workspace value")
        workspace = agent_name
    workspace_by_agent[agent_name] = workspace

    items = config.get("deliverables")
    if not isinstance(items, list):
        schema_failures.append(f"agent {agent_name} deliverables must be a list")
        continue

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            schema_failures.append(f"agent {agent_name} deliverable #{index + 1} must be an object")
            continue

        source = str(item.get("source", "")).strip()
        target = str(item.get("target", "")).strip()
        if not source:
            schema_failures.append(
                f"agent {agent_name} deliverable #{index + 1} is missing a non-empty source"
            )
        if not target:
            schema_failures.append(
                f"agent {agent_name} deliverable #{index + 1} is missing a non-empty target"
            )

if schema_failures:
    raise SystemExit("Error: invalid deliverables.json\n- " + "\n- ".join(schema_failures))

timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
bundle_dir = os.path.join(task_dir, "_promotion_bundle", timestamp)
sources_dir = os.path.join(bundle_dir, "sources")
contract_dir = os.path.join(bundle_dir, "task_contract")
os.makedirs(sources_dir, exist_ok=True)
os.makedirs(contract_dir, exist_ok=True)

for name in ("brief.md", "outline.md", "deliverables.json"):
    source = os.path.join(task_dir, name)
    if os.path.exists(source):
        shutil.copy2(source, os.path.join(contract_dir, name))

entries = []
missing = []
for agent_name, config in agents.items():
    workspace_dir = os.path.join(task_dir, workspace_by_agent.get(agent_name, agent_name))
    for item in config.get("deliverables", []):
        source_rel = item.get("source", "").strip()
        target = item.get("target", "").strip()
        source_abs = os.path.join(workspace_dir, source_rel)
        if not os.path.exists(source_abs):
            missing.append({
                "agent_name": agent_name,
                "source": source_rel,
                "target": target,
            })
            continue
        dest_abs = os.path.join(sources_dir, agent_name, source_rel)
        os.makedirs(os.path.dirname(dest_abs), exist_ok=True)
        shutil.copy2(source_abs, dest_abs)
        entries.append({
            "agent_name": agent_name,
            "source": source_rel,
            "source_abs": source_abs,
            "target": target,
            "copied_to": dest_abs,
            "must_reference": item.get("must_reference", []),
            "must_not_duplicate_with": item.get("must_not_duplicate_with", []),
            "notes": item.get("notes", ""),
        })

manifest = {
    "schema_version": 1,
    "task_slug": task_slug,
    "task_dir": task_dir,
    "bundle_dir": bundle_dir,
    "shared_context": contract.get("shared_context", {}),
    "entries": entries,
    "missing": missing,
}

manifest_path = os.path.join(bundle_dir, "promotion_manifest.json")
with open(manifest_path, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, ensure_ascii=False, indent=2)
    handle.write("\n")

readme_path = os.path.join(bundle_dir, "README.md")
with open(readme_path, "w", encoding="utf-8") as handle:
    handle.write(f"# Promotion Bundle: {task_slug}\n\n")
    handle.write("## Shared Context\n\n")
    handle.write(f"- Brief: task_contract/brief.md\n")
    handle.write(f"- Outline: task_contract/outline.md\n")
    handle.write(f"- Deliverables: task_contract/deliverables.json\n\n")
    handle.write("## Entries\n\n")
    if entries:
        handle.write("| Agent | Source | Target | Must Reference | Must Not Duplicate |\n")
        handle.write("|------|--------|--------|----------------|--------------------|\n")
        for entry in entries:
            handle.write(
                f"| {entry['agent_name']} | {entry['source']} | {entry['target'] or '(unset)'} | "
                f"{', '.join(entry['must_reference']) or '-'} | "
                f"{', '.join(entry['must_not_duplicate_with']) or '-'} |\n"
            )
    else:
        handle.write("- No declared deliverables were copied into this bundle.\n")
    if missing:
        handle.write("\n## Missing Declared Sources\n\n")
        for item in missing:
            handle.write(
                f"- {item['agent_name']}: {item['source']} -> {item['target'] or '(unset)'}\n"
            )

print(json.dumps({
    "task_slug": task_slug,
    "bundle_dir": bundle_dir,
    "manifest_path": manifest_path,
    "readme_path": readme_path,
    "entry_count": len(entries),
    "missing_count": len(missing),
}, ensure_ascii=False, indent=2))
PY
)"

if [[ "$quiet_mode" -eq 1 ]]; then
  exit 0
fi

if [[ "$json_mode" -eq 1 ]]; then
  echo "$bundle_json"
  exit 0
fi

python3 - <<'PY' "$bundle_json"
import json
import sys

payload = json.loads(sys.argv[1])
print(f"BUNDLE_DIR={payload['bundle_dir']}")
print(f"MANIFEST={payload['manifest_path']}")
print(f"README={payload['readme_path']}")
print(f"ENTRY_COUNT={payload['entry_count']}")
print(f"MISSING_COUNT={payload['missing_count']}")
PY