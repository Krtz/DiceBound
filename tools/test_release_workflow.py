#!/usr/bin/env python3
from pathlib import Path


root = Path(__file__).resolve().parents[1]
workflow = root / ".github/workflows/dicebound-release.yml"
source = workflow.read_text(encoding="utf-8")

assert not (root / ".github/workflows/beta-0.6.1-release.yml").exists()
assert "0.6.1" not in source, "generic workflow contains a hard-coded historical release version"
for marker in [
    "tools/prepare_release.py",
    "tools/validate_pr_version.py",
    "steps.release.outputs.version",
    "steps.release.outputs.channel",
    "steps.release.outputs.tag",
    "steps.release.outputs.title",
    "steps.release.outputs.artifact_label",
    "steps.release.outputs.spec_path",
    "steps.release.outputs.notes_path",
    "inputs.publish && github.ref == 'refs/heads/main'",
    "tools/write_distribution_manifest.py",
]:
    assert marker in source, f"generic release workflow is missing {marker!r}"

assert source.count("workflow_dispatch:") == 1
assert source.count("pull_request:") == 1
assert "release/beta-" not in source
assert ".release/beta-" not in source

print("Generic release workflow source PASS: Version/Channel-derived build, artifact, tag, notes and distribution path")
