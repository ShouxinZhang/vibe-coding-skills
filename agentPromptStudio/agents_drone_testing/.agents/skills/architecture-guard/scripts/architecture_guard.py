from __future__ import annotations

import argparse
import ast
import io
import json
import keyword
import tokenize
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Iterable

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = SKILL_DIR.parent.parent.parent
DEFAULT_RULES_PATH = SKILL_DIR / "rules" / "architecture_rules.json"
REPORT_PATH = PROJECT_ROOT / "docs" / "architecture" / "architecture_guard_report.md"


@dataclass(frozen=True)
class Issue:
    kind: str
    file: str
    line: int
    message: str


@dataclass(frozen=True)
class FunctionFingerprint:
    file: str
    line: int
    name: str
    lines: int
    digest: str


def _load_rules(rules_path: Path) -> dict:
    return json.loads(rules_path.read_text(encoding="utf-8"))


def _collect_python_files(source_roots: list[str]) -> list[Path]:
    files: list[Path] = []
    for root in source_roots:
        base = PROJECT_ROOT / root
        if not base.exists():
            continue
        files.extend(sorted(base.rglob("*.py")))
    return files


def _to_rel(path: Path) -> str:
    return path.relative_to(PROJECT_ROOT).as_posix()


def _match_any(rel: str, patterns: list[str]) -> bool:
    p = PurePosixPath(rel)
    return any(p.match(pattern) for pattern in patterns)


def _layer_of(rel: str, rules: dict) -> str | None:
    for layer in rules.get("layers", []):
        patterns = layer.get("patterns", [])
        if _match_any(rel, patterns):
            return str(layer.get("name"))
    return None


def _build_layer_allow_map(rules: dict) -> dict[str, set[str]]:
    data: dict[str, set[str]] = {}
    for layer in rules.get("layers", []):
        name = str(layer.get("name"))
        allowed = set(str(x) for x in layer.get("allowImportLayers", []))
        data[name] = allowed
    return data


def _module_name_for_file(path: Path, source_roots: list[str]) -> str | None:
    rel = _to_rel(path)
    for root in source_roots:
        root_prefix = f"{root}/"
        if not rel.startswith(root_prefix):
            continue
        body = rel[len(root_prefix) :]
        if not body.endswith(".py"):
            return None
        module = body[:-3].replace("/", ".")
        if module.endswith(".__init__"):
            module = module[: -len(".__init__")]
        return module
    return None


def _build_module_index(files: list[Path], source_roots: list[str]) -> dict[str, Path]:
    index: dict[str, Path] = {}
    for path in files:
        module = _module_name_for_file(path, source_roots)
        if not module:
            continue
        index[module] = path
        index[f"src.{module}"] = path
    return index


def _resolve_module(module: str, module_index: dict[str, Path]) -> Path | None:
    if module in module_index:
        return module_index[module]
    if module.startswith("src.") and module[4:] in module_index:
        return module_index[module[4:]]
    parts = module.split(".")
    while parts:
        candidate = ".".join(parts)
        if candidate in module_index:
            return module_index[candidate]
        parts.pop()
    return None


def _read_ast(path: Path) -> ast.AST | None:
    try:
        return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except Exception:
        return None


def _current_module(path: Path, source_roots: list[str]) -> str:
    return _module_name_for_file(path, source_roots) or ""


def _resolve_relative(from_node: ast.ImportFrom, current_module: str) -> str:
    level = from_node.level
    module = from_node.module or ""
    if level <= 0:
        return module
    parts = current_module.split(".") if current_module else []
    if parts:
        parts = parts[: max(0, len(parts) - level)]
    prefix = ".".join(parts)
    if prefix and module:
        return f"{prefix}.{module}"
    if prefix:
        return prefix
    return module


def _imports_of(path: Path, source_roots: list[str], module_index: dict[str, Path]) -> list[tuple[str, int, Path]]:
    tree = _read_ast(path)
    if tree is None:
        return []

    imports: list[tuple[str, int, Path]] = []
    current_module = _current_module(path, source_roots)

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                target = alias.name
                target_path = _resolve_module(target, module_index)
                if target_path is not None:
                    imports.append((target, node.lineno, target_path))
        elif isinstance(node, ast.ImportFrom):
            base = _resolve_relative(node, current_module)
            for alias in node.names:
                if alias.name == "*":
                    target = base
                    target_path = _resolve_module(target, module_index)
                    if target_path is not None:
                        imports.append((target, node.lineno, target_path))
                    continue
                candidates = []
                if base:
                    candidates.append(f"{base}.{alias.name}")
                    candidates.append(base)
                else:
                    candidates.append(alias.name)
                for target in candidates:
                    target_path = _resolve_module(target, module_index)
                    if target_path is not None:
                        imports.append((target, node.lineno, target_path))
                        break
    return imports


def check_modularity(rules: dict) -> list[Issue]:
    source_roots = [str(x) for x in rules.get("sourceRoots", ["src"])]
    files = _collect_python_files(source_roots)
    module_index = _build_module_index(files, source_roots)
    allow_map = _build_layer_allow_map(rules)

    issues: list[Issue] = []

    for file in files:
        rel = _to_rel(file)
        src_layer = _layer_of(rel, rules)

        imports = _imports_of(file, source_roots, module_index)
        for imported_module, line, target_path in imports:
            dst_rel = _to_rel(target_path)
            dst_layer = _layer_of(dst_rel, rules)

            if src_layer and dst_layer and src_layer != dst_layer:
                allowed = allow_map.get(src_layer, set())
                if dst_layer not in allowed:
                    issues.append(
                        Issue(
                            kind="layer-violation",
                            file=rel,
                            line=line,
                            message=(
                                f"{src_layer} -> {dst_layer} not allowed: import {imported_module}"
                            ),
                        )
                    )

        for rule in rules.get("forbiddenImports", []):
            from_patterns = [str(x) for x in rule.get("fromPatterns", [])]
            if not _match_any(rel, from_patterns):
                continue
            prefixes = [str(x) for x in rule.get("forbiddenModulePrefixes", [])]
            reason = str(rule.get("reason", ""))
            for imported_module, line, _target_path in imports:
                if any(imported_module == p or imported_module.startswith(f"{p}.") for p in prefixes):
                    issues.append(
                        Issue(
                            kind="forbidden-import",
                            file=rel,
                            line=line,
                            message=f"forbidden import {imported_module}; reason: {reason}",
                        )
                    )

    return issues


def _normalize_code(code: str) -> str:
    out: list[str] = []
    stream = io.StringIO(code)
    for token in tokenize.generate_tokens(stream.readline):
        tok_type = token.type
        tok_str = token.string
        if tok_type == tokenize.NAME:
            if keyword.iskeyword(tok_str):
                out.append(tok_str)
            else:
                out.append("<ID>")
        elif tok_type == tokenize.NUMBER:
            out.append("<NUM>")
        elif tok_type == tokenize.STRING:
            out.append("<STR>")
        elif tok_type in {tokenize.NEWLINE, tokenize.NL, tokenize.INDENT, tokenize.DEDENT}:
            continue
        elif tok_type == tokenize.ENDMARKER:
            continue
        else:
            out.append(tok_str)
    return " ".join(out)


def _func_fingerprints(files: list[Path], min_lines: int, ignore_private: bool) -> list[FunctionFingerprint]:
    fps: list[FunctionFingerprint] = []
    for path in files:
        text = path.read_text(encoding="utf-8")
        tree = _read_ast(path)
        if tree is None:
            continue

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            name = node.name
            if ignore_private and name.startswith("_"):
                continue
            end_lineno = getattr(node, "end_lineno", node.lineno)
            lines = int(end_lineno) - int(node.lineno) + 1
            if lines < min_lines:
                continue
            segment = ast.get_source_segment(text, node)
            if not segment:
                continue
            normalized = _normalize_code(segment)
            digest = str(hash(normalized))
            fps.append(
                FunctionFingerprint(
                    file=_to_rel(path),
                    line=int(node.lineno),
                    name=name,
                    lines=lines,
                    digest=digest,
                )
            )
    return fps


def check_redundancy(rules: dict) -> list[Issue]:
    source_roots = [str(x) for x in rules.get("sourceRoots", ["src"])]
    files = _collect_python_files(source_roots)
    red = rules.get("redundancy", {})
    min_lines = int(red.get("minFunctionLines", 6))
    ignore_private = bool(red.get("ignorePrivate", False))

    fps = _func_fingerprints(files, min_lines=min_lines, ignore_private=ignore_private)
    buckets: dict[str, list[FunctionFingerprint]] = {}
    for fp in fps:
        buckets.setdefault(fp.digest, []).append(fp)

    issues: list[Issue] = []
    for group in buckets.values():
        if len(group) <= 1:
            continue
        group_sorted = sorted(group, key=lambda x: (x.file, x.line))
        head = group_sorted[0]
        others = ", ".join(f"{x.file}:{x.line}({x.name})" for x in group_sorted[1:])
        issues.append(
            Issue(
                kind="redundant-code",
                file=head.file,
                line=head.line,
                message=f"function {head.name} duplicates with: {others}",
            )
        )

    return issues


def _print_issues(title: str, issues: Iterable[Issue]) -> None:
    items = list(issues)
    print(f"[{title}] count={len(items)}")
    for issue in items:
        print(f"- {issue.kind} {issue.file}:{issue.line} {issue.message}")


def _run_all(rules: dict) -> tuple[list[Issue], list[Issue]]:
    modular_issues = check_modularity(rules)
    redundancy_issues = check_redundancy(rules)
    return modular_issues, redundancy_issues


def export_report(rules: dict) -> Path:
    modular_issues, redundancy_issues = _run_all(rules)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with REPORT_PATH.open("w", encoding="utf-8") as f:
        f.write("# Architecture Guard Report\n\n")
        f.write(
            "> Auto-generated by `.agents/skills/architecture-guard/scripts/architecture_guard.py report`.\n\n"
        )
        f.write(f"- Modular issues: {len(modular_issues)}\n")
        f.write(f"- Redundancy issues: {len(redundancy_issues)}\n\n")

        f.write("## Modular Issues\n\n")
        if not modular_issues:
            f.write("- None\n\n")
        else:
            for issue in modular_issues:
                f.write(f"- `{issue.kind}` `{issue.file}:{issue.line}`: {issue.message}\n")
            f.write("\n")

        f.write("## Redundancy Issues\n\n")
        if not redundancy_issues:
            f.write("- None\n")
        else:
            for issue in redundancy_issues:
                f.write(f"- `{issue.kind}` `{issue.file}:{issue.line}`: {issue.message}\n")

    return REPORT_PATH


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Architecture modularity and redundancy guard")
    parser.add_argument(
        "--rules",
        default=str(DEFAULT_RULES_PATH),
        help="Path to architecture rules json",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with code 1 when any issue exists",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)
    parser_mod = subparsers.add_parser("check-modularity", help="Check layer/import boundary violations")
    parser_mod.add_argument(
        "--strict",
        dest="strict_sub",
        action="store_true",
        help="Exit with code 1 when any issue exists",
    )

    parser_red = subparsers.add_parser("check-redundancy", help="Check duplicated function implementations")
    parser_red.add_argument(
        "--strict",
        dest="strict_sub",
        action="store_true",
        help="Exit with code 1 when any issue exists",
    )

    parser_all = subparsers.add_parser("check-all", help="Run modularity and redundancy checks")
    parser_all.add_argument(
        "--strict",
        dest="strict_sub",
        action="store_true",
        help="Exit with code 1 when any issue exists",
    )

    subparsers.add_parser("report", help="Generate markdown report")
    return parser


def _maybe_exit_strict(strict: bool, issues_count: int) -> int:
    if strict and issues_count > 0:
        return 1
    return 0


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    rules_path = Path(args.rules)
    if not rules_path.is_absolute():
        rules_path = (PROJECT_ROOT / rules_path).resolve()
    rules = _load_rules(rules_path)
    strict = bool(getattr(args, "strict", False) or getattr(args, "strict_sub", False))

    if args.command == "check-modularity":
        issues = check_modularity(rules)
        _print_issues("modularity", issues)
        raise SystemExit(_maybe_exit_strict(strict, len(issues)))

    if args.command == "check-redundancy":
        issues = check_redundancy(rules)
        _print_issues("redundancy", issues)
        raise SystemExit(_maybe_exit_strict(strict, len(issues)))

    if args.command == "check-all":
        modular_issues, redundancy_issues = _run_all(rules)
        _print_issues("modularity", modular_issues)
        _print_issues("redundancy", redundancy_issues)
        total = len(modular_issues) + len(redundancy_issues)
        raise SystemExit(_maybe_exit_strict(strict, total))

    if args.command == "report":
        path = export_report(rules)
        print(f"report exported: {path}")
        return


if __name__ == "__main__":
    main()
