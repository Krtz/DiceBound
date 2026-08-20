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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--base-ref", default="origin/main")
    args = parser.parse_args()
    root = args.root.resolve()
    project = json.loads((root / PROJECT_PATH).read_text(encoding="utf-8"))
    candidate = str(project.get("version") or "")
    used = historical_versions(root, args.base_ref)
    errors = validate_candidate(candidate, used)
    if errors:
        for error in errors:
            print(f"PR VERSION ERROR: {error}")
        return 1
    print(f"PR version PASS: {candidate} is four-component and unused on {args.base_ref}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
