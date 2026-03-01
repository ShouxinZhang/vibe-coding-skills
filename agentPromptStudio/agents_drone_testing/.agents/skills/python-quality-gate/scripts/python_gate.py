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


def _run(cmd: list[str], cwd: Path) -> int:
    completed = subprocess.run(cmd, cwd=str(cwd), check=False)
    return completed.returncode


def _check_tool_installed(tool: str) -> bool:
    return shutil.which(tool) is not None


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

    print(f"Quality gate targets: {' '.join(targets)}")

    overall_status = 0

    if not args.skip_ruff:
        if not _check_tool_installed("ruff"):
            print("Ruff is not installed or not in PATH.", file=sys.stderr)
            overall_status = 1
        else:
            print("Running Ruff linter...")
            ruff_status = _run(["ruff", "check", *targets], cwd=root)
            overall_status = max(overall_status, ruff_status)

    if not args.skip_pyright:
        if not _check_tool_installed("pyright"):
            print("Pyright is not installed or not in PATH.", file=sys.stderr)
            overall_status = 1
        else:
            print("Running Pyright type checker...")
            pyright_status = _run(["pyright", *targets], cwd=root)
            overall_status = max(overall_status, pyright_status)

    if overall_status == 0:
        print("No errors found.")
        return 0

    print("Errors found. Please fix them before committing.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
