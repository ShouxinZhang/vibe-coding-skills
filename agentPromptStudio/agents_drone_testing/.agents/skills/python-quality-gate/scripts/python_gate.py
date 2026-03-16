#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


COMMON_TARGET_DIRS = ("src", "sandbox", "app", "apps", "lib", "tests")


def _project_root() -> Path:
    script_dir = Path(__file__).resolve().parent
    return script_dir.parent.parent.parent.parent


def _discover_targets(project_root: Path) -> list[str]:
    targets = [name for name in COMMON_TARGET_DIRS if (project_root / name).is_dir()]
    return targets if targets else ["."]


def _venv_bin_dir(project_root: Path) -> Path:
    return project_root / ".venv" / "bin"


def _resolve_tool(tool: str, project_root: Path) -> str | None:
    global_tool = shutil.which(tool)
    if global_tool:
        return global_tool

    local_candidates = [
        _venv_bin_dir(project_root) / tool,
        project_root / "node_modules" / ".bin" / tool,
    ]
    for candidate in local_candidates:
        if candidate.is_file():
            return str(candidate)

    return None


def _resolve_pythonpath(project_root: Path) -> str | None:
    for name in ("python", "python3"):
        candidate = _venv_bin_dir(project_root) / name
        if candidate.is_file():
            return str(candidate)
    return None


def _run(cmd: list[str], cwd: Path) -> int:
    completed = subprocess.run(cmd, cwd=str(cwd), check=False)
    return completed.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Run generic Python quality gates (Ruff + Pyright).")
    parser.add_argument(
        "--targets",
        nargs="+",
        help="Directories/files to check. If omitted, auto-discover common Python source folders.",
    )
    parser.add_argument("--skip-ruff", action="store_true", help="Skip Ruff linting.")
    parser.add_argument("--skip-pyright", action="store_true", help="Skip Pyright type checking.")
    args = parser.parse_args()

    if args.skip_ruff and args.skip_pyright:
        print("No checks selected: both Ruff and Pyright are skipped.", file=sys.stderr)
        return 2

    root = _project_root()
    targets = args.targets if args.targets else _discover_targets(root)
    ruff_cmd = _resolve_tool("ruff", root)
    pyright_cmd = _resolve_tool("pyright", root)
    pythonpath = _resolve_pythonpath(root)

    print(f"Quality gate targets: {' '.join(targets)}")

    overall_status = 0

    if not args.skip_ruff:
        if not ruff_cmd:
            print("Ruff is not installed or not in PATH.", file=sys.stderr)
            overall_status = 1
        else:
            print(f"Running Ruff linter with: {ruff_cmd}")
            ruff_status = _run([ruff_cmd, "check", *targets], cwd=root)
            overall_status = max(overall_status, ruff_status)

    if not args.skip_pyright:
        if not pyright_cmd:
            print("Pyright is not installed or not in PATH.", file=sys.stderr)
            overall_status = 1
        else:
            pyright_args = [pyright_cmd]
            if pythonpath:
                pyright_args.extend(["--pythonpath", pythonpath])
            pyright_args.extend(targets)
            print(
                "Running Pyright type checker"
                + (f" with project interpreter: {pythonpath}" if pythonpath else "...")
            )
            pyright_status = _run(pyright_args, cwd=root)
            overall_status = max(overall_status, pyright_status)

    if overall_status == 0:
        print("No errors found.")
        return 0

    print("Errors found. Please fix them before committing.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
