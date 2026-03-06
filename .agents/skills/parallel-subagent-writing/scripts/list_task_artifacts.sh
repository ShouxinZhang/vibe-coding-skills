#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  list_task_artifacts.sh <task-slug> [agent-name] [--json] [--verify] [--quiet]

Examples:
  list_task_artifacts.sh agent_system_rewrite
  list_task_artifacts.sh agent_system_rewrite writer_examples --json
  list_task_artifacts.sh agent_system_rewrite --verify
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
verify_mode=0
quiet_mode=0
positionals=()

for arg in "$@"; do
  case "$arg" in
    --json)
      json_mode=1
      ;;
    --verify)
      verify_mode=1
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

if [[ ${#positionals[@]} -lt 1 || ${#positionals[@]} -gt 2 ]]; then
  usage
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
task_slug="${positionals[0]}"
agent_name="${positionals[1]:-}"

require_name "$task_slug" "task-slug"

task_dir="$repo_root/.agent_cache/$task_slug"
base_dir="$task_dir"
if [[ -n "$agent_name" ]]; then
  require_name "$agent_name" "agent-name"
  base_dir="$base_dir/$agent_name"
fi

if [[ ! -d "$base_dir" ]]; then
  echo "Error: path does not exist: $base_dir" >&2
  exit 1
fi

report_json="$(python3 - "$task_slug" "$task_dir" "$base_dir" "$agent_name" "$verify_mode" <<'PY'
import json
import os
import sys

task_slug = sys.argv[1]
task_dir = os.path.abspath(sys.argv[2])
base_dir = os.path.abspath(sys.argv[3])
agent_filter = sys.argv[4]
verify_mode = sys.argv[5] == "1"

deliverables_path = os.path.join(task_dir, "deliverables.json")
deliverables = None
contract_error = None

if os.path.exists(deliverables_path):
    try:
        with open(deliverables_path, "r", encoding="utf-8") as handle:
            deliverables = json.load(handle)
    except Exception as exc:
        contract_error = str(exc)

workspace_to_agent = {}
schema_warnings = []
schema_failures = []

if deliverables and not contract_error:
    agents = deliverables.get("agents")
    if not isinstance(agents, dict):
        schema_failures.append("deliverables.json must contain an object field 'agents'")
        agents = {}

    for name, config in agents.items():
        if not isinstance(config, dict):
            schema_failures.append(f"agent {name} config must be an object")
            continue

        workspace = str(config.get("workspace", name)).strip()
        if not workspace:
            schema_failures.append(f"agent {name} has an empty workspace value")
            workspace = name
        workspace_to_agent[workspace] = name

        if "interfaces" in config:
            schema_warnings.append(
                f"agent {name} uses deprecated interfaces field; move interface constraints into deliverables[].must_reference and deliverables[].must_not_duplicate_with"
            )

        items = config.get("deliverables")
        if not isinstance(items, list):
            schema_failures.append(f"agent {name} deliverables must be a list")
            continue

        if not items:
            schema_warnings.append(f"agent {name} has no deliverables declared")

        for index, item in enumerate(items):
            if not isinstance(item, dict):
                schema_failures.append(f"agent {name} deliverable #{index + 1} must be an object")
                continue

            source = str(item.get("source", "")).strip()
            target = str(item.get("target", "")).strip()

            if not source:
                schema_failures.append(
                    f"agent {name} deliverable #{index + 1} is missing a non-empty source; scaffold expects deliverables[].source/target entries"
                )
            if not target:
                schema_failures.append(
                    f"agent {name} deliverable #{index + 1} is missing a non-empty target"
                )

files = []
for root, _, filenames in os.walk(base_dir):
    filenames.sort()
    for filename in filenames:
        full_path = os.path.join(root, filename)
        rel_task = os.path.relpath(full_path, task_dir)
        rel_base = os.path.relpath(full_path, base_dir)
        stat = os.stat(full_path)
        workspace_name = rel_task.split(os.sep, 1)[0] if os.sep in rel_task else None
        agent_name = workspace_to_agent.get(workspace_name, workspace_name)
        if base_dir != task_dir and agent_filter:
            agent_name = agent_filter
        files.append({
            "path": full_path,
            "relative_to_task": rel_task,
            "relative_to_base": rel_base,
            "agent_name": agent_name,
            "size_bytes": stat.st_size,
            "modified_epoch": int(stat.st_mtime),
        })

declared_by_agent = {}
allow_new_files = {}
if deliverables:
    agents = deliverables.get("agents", {})
    for name, config in agents.items():
        declared = set()
        for item in config.get("deliverables", []):
            source = item.get("source", "").strip()
            if source:
                declared.add(source)
        declared_by_agent[name] = declared
        allow_new_files[name] = bool(config.get("allow_new_files", False))

verification = None
if verify_mode:
    warnings = []
    failures = []
    if not os.path.exists(deliverables_path):
        warnings.append("deliverables.json is missing")
    elif contract_error:
        failures.append(f"deliverables.json is not valid JSON: {contract_error}")
    else:
        warnings.extend(schema_warnings)
        failures.extend(schema_failures)
        contract_files = [
            os.path.join(task_dir, "brief.md"),
            os.path.join(task_dir, "outline.md"),
            os.path.join(task_dir, "deliverables.json"),
        ]
        for path in contract_files:
            if not os.path.exists(path):
                warnings.append(f"contract file missing: {os.path.basename(path)}")

        files_by_agent = {}
        for file_info in files:
            name = file_info["agent_name"]
            if not name or name.startswith("_"):
                continue
            files_by_agent.setdefault(name, []).append(file_info["relative_to_task"].split(os.sep, 1)[1])

        agent_names = set(declared_by_agent) | set(files_by_agent)
        if agent_filter:
            agent_names = {agent_filter}

        details = {}
        for name in sorted(agent_names):
            declared = declared_by_agent.get(name, set())
            actual = set(files_by_agent.get(name, []))
            missing = sorted(path for path in declared if path not in actual)
            unexpected = []
            if not allow_new_files.get(name, False):
                unexpected = sorted(path for path in actual if path not in declared)
            if missing:
                failures.append(f"agent {name} is missing declared files: {', '.join(missing)}")
            if unexpected:
                failures.append(f"agent {name} produced undeclared files: {', '.join(unexpected)}")
            if not declared and actual:
                warnings.append(f"agent {name} has files but no declared deliverables")
            details[name] = {
                "declared": sorted(declared),
                "actual": sorted(actual),
                "missing": missing,
                "unexpected": unexpected,
                "allow_new_files": allow_new_files.get(name, False),
            }

        verification = {
            "ok": not failures,
            "warnings": warnings,
            "failures": failures,
            "details": details,
        }

report = {
    "task_slug": task_slug,
    "task_dir": task_dir,
    "base_dir": base_dir,
    "agent_filter": agent_filter or None,
    "files": files,
    "verification": verification,
}

print(json.dumps(report, ensure_ascii=False, indent=2))
PY
)"

if [[ "$quiet_mode" -eq 1 ]]; then
  if [[ "$verify_mode" -eq 1 ]]; then
    python3 - <<'PY' "$report_json"
import json
import sys

report = json.loads(sys.argv[1])
verification = report.get("verification")
if verification and not verification.get("ok", True):
    raise SystemExit(1)
PY
  fi
  exit 0
fi

if [[ "$json_mode" -eq 1 ]]; then
  echo "$report_json"
  if [[ "$verify_mode" -eq 1 ]]; then
    python3 - <<'PY' "$report_json"
import json
import sys

report = json.loads(sys.argv[1])
verification = report.get("verification")
if verification and not verification.get("ok", True):
    raise SystemExit(1)
PY
  fi
  exit 0
fi

python3 - <<'PY' "$report_json" "$verify_mode"
import json
import sys

report = json.loads(sys.argv[1])
verify_mode = sys.argv[2] == "1"

for file_info in report["files"]:
    print(file_info["path"])

if verify_mode:
    verification = report.get("verification") or {}
    print(f"VERIFY_OK={str(verification.get('ok', True)).lower()}")
    for warning in verification.get("warnings", []):
        print(f"WARNING={warning}")
    for failure in verification.get("failures", []):
        print(f"FAILURE={failure}")
    if not verification.get("ok", True):
        raise SystemExit(1)
PY
