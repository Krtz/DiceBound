#!/usr/bin/env python3
"""Deterministic path-classification coverage for the PR version gate (#182)."""
from validate_pr_version import is_non_implementation_path, requires_new_version


def main() -> int:
    for path in [
        "README.md",
        "CHANGELOG.md",
        "docs/DESIGN_RULES.md",
        "distribution/latest.json",
        "tools/validate_pr_version.py",
        "tools/test_pr_version_gate.py",
    ]:
        assert is_non_implementation_path(path), f"expected maintenance path: {path}"

    for path in [
        "runtime/js/dicebound.js",
        "runtime/assets/combat/effects/donut/donut-proc-rain-spritesheet.png",
        "runtime/index.html",
        "wrapper-source/config/project.json",
        "wrapper-source/wrappers/webview2/native-go/main.go",
        "installer/main_v2.go",
        "tools/prepare_release.py",
        ".github/workflows/dicebound-release.yml",
    ]:
        assert not is_non_implementation_path(path), f"expected implementation path: {path}"

    assert not requires_new_version(["README.md", "distribution/latest.json"])
    assert not requires_new_version(["tools/validate_pr_version.py", "tools/test_pr_version_gate.py"])
    assert requires_new_version(["README.md", "runtime/js/dicebound.js"])
    assert requires_new_version(["distribution/latest.json", "installer/main_v2.go"])
    assert requires_new_version(["docs/moved-runtime.md", "runtime/js/removed.js"])
    print("PR version gate PASS: docs/verified metadata are exempt; runtime, wrapper, installer, workflow and release behavior remain strict")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
