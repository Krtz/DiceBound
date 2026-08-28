#!/usr/bin/env python3
"""Enforce one unused four-component DiceBound version per PR."""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from dicebound_version import require_current_version


ROOT = Path(__file__).resolve().parents[1]
PROJECT_PATH = "wrapper-source/config/project.json"
NON_IMPLEMENTATION_PATHS = frozenset({
    "distribution/latest.json",
    "tools/validate_pr_version.py",
    "tools/test_pr_version_gate.py",
})


def normalize_path(path: str) -> str:
    return str(path).replace("\\", "/").lstrip("./")


def is_non_implementation_path(path: str) -> bool:
    """Return whether a changed path is incapable of changing a shipped build."""
    normalized = normalize_path(path)
    return (
        normalized in NON_IMPLEMENTATION_PATHS
        or normalized.startswith("docs/")
        or normalized.endswith(".md")
    )


def requires_new_version(paths: list[str]) -> bool:
    """Fail closed: any path outside the small metadata/docs allowlist is implementation."""
    return any(not is_non_implementation_path(path) for path in paths)


def validate_candidate(candidate: str, historical_versions: set[str]) -> list[str]:
    errors: list[str] = []
    try:
        candidate = require_current_version(candidate)
    except ValueError as exc:
        return [str(exc)]
    if candidate in historical_versions:
        errors.append(f"DiceBound version {candidate} has already been used on the base branch")
    return errors


def git(root: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=root, text=True, encoding="utf-8").strip()


def historical_versions(root: Path, base_ref: str) -> set[str]:
    versions: set[str] = set()
    commits = git(root, "log", "--format=%H", base_ref, "--", PROJECT_PATH).splitlines()
    for commit in commits:
        try:
            value = json.loads(git(root, "show", f"{commit}:{PROJECT_PATH}"))
            versions.add(str(value.get("version") or ""))
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            continue
    return versions


def changed_paths(root: Path, base_ref: str) -> list[str]:
    # Do not treat a runtime deletion or rename as documentation just because
    # its destination happens to be non-runtime. Disabling rename detection
    # reports both sides and therefore keeps the gate fail-closed.
    output = git(root, "diff", "--name-only", "--no-renames", f"{base_ref}...HEAD")
    return [normalize_path(path) for path in output.splitlines() if path.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--base-ref", default="origin/main")
    args = parser.parse_args()
    root = args.root.resolve()
    project = json.loads((root / PROJECT_PATH).read_text(encoding="utf-8"))
    candidate = str(project.get("version") or "")
    paths = changed_paths(root, args.base_ref)
    if not requires_new_version(paths):
        rendered = ", ".join(paths) or "no changed files"
        print(f"PR version PASS: verified metadata/documentation maintenance does not require a new DiceBound version ({rendered})")
        return 0
    used = historical_versions(root, args.base_ref)
    errors = validate_candidate(candidate, used)
    if errors:
        for error in errors:
            print(f"PR VERSION ERROR: {error}")
        return 1
    print(f"PR version PASS: {candidate} is four-component and unused on {args.base_ref}; implementation paths require this gate")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
