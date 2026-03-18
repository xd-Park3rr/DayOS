#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from common import append_log, load_event, normalize_repo_path, resolve_repo_root, runtime_path


def append_unique_error(repo_root: Path, signature: str, error_text: str) -> None:
    log_file = repo_root / runtime_path("errors.log")
    log_file.parent.mkdir(parents=True, exist_ok=True)
    existing = log_file.read_text(encoding="utf-8") if log_file.exists() else ""
    if signature in existing and error_text[:200] in existing:
        return
    append_log(repo_root, runtime_path("errors.log"), f"{signature}: {error_text[:300]}\n")


def validate_json(path: Path) -> None:
    json.loads(path.read_text(encoding="utf-8"))


def validate_python(path: Path, repo_root: Path) -> tuple[int, str]:
    result = subprocess.run(
        [sys.executable, "-m", "py_compile", str(path)],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode, (result.stdout + result.stderr).strip()


def run_dayos_tsc(app_root: Path) -> tuple[int, str]:
    result = subprocess.run(
        ["npx", "tsc", "--noEmit", "--project", "tsconfig.json"],
        cwd=app_root,
        capture_output=True,
        text=True,
        check=False,
        timeout=120,
    )
    return result.returncode, (result.stdout + result.stderr).strip()


def main() -> None:
    event = load_event()
    repo_root = resolve_repo_root(event)
    tool_input = event.get("tool_input") or {}
    relative_path = normalize_repo_path(
        tool_input.get("file_path") or tool_input.get("path"),
        repo_root,
    )
    if not relative_path:
        return

    target_path = repo_root / relative_path
    if not target_path.exists():
        return

    if target_path.suffix == ".json":
        try:
            validate_json(target_path)
        except json.JSONDecodeError as exc:
            append_unique_error(repo_root, f"JSON [{relative_path}]", str(exc))
            print(f"JSON error in {relative_path}: {exc}", file=os.sys.stderr)
            raise SystemExit(2)

    if relative_path.startswith(".claude/hooks/") and target_path.suffix == ".py":
        exit_code, output = validate_python(target_path, repo_root)
        if exit_code != 0:
            append_unique_error(repo_root, f"PY [{relative_path}]", output)
            print(f"Python error in {relative_path}:\n{output[:400]}", file=os.sys.stderr)
            raise SystemExit(2)

    if relative_path.startswith("mobile/") and target_path.suffix in {".ts", ".tsx"}:
        app_root = repo_root / "dayos"
        if (app_root / "tsconfig.json").exists():
            try:
                exit_code, output = run_dayos_tsc(app_root)
            except subprocess.TimeoutExpired:
                output = "TypeScript check timed out after 120s."
                append_unique_error(repo_root, "TSC [dayos]", output)
                print(output, file=os.sys.stderr)
                raise SystemExit(2)

            if exit_code != 0:
                append_unique_error(repo_root, "TSC [dayos]", output)
                print(f"TSC error in dayos:\n{output[:400]}", file=os.sys.stderr)
                raise SystemExit(2)


if __name__ == "__main__":
    main()
