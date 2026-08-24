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
    "github.ref == 'refs/heads/main' && (github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.publish))",
    "tools/write_distribution_manifest.py",
    "DICEBOUND_RELEASE_TOKEN",
    "GH_TOKEN: ${{ secrets.DICEBOUND_RELEASE_TOKEN }}",
    "gh api --method PUT",
    "contents/$manifestPath",
]:
    assert marker in source, f"generic release workflow is missing {marker!r}"

assert source.count("workflow_dispatch:") == 1
assert source.count("pull_request:") == 1
assert source.count("github.ref == 'refs/heads/main' && (github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.publish))") == 3
assert source.count("secrets.DICEBOUND_RELEASE_TOKEN") == 2
assert "paths-ignore:" in source and "distribution/latest.json" in source
assert "git push origin" not in source, "protected main must not be updated with the default checkout token"
assert "release/beta-" not in source
assert ".release/beta-" not in source

print("Generic release workflow source PASS: Version/Channel-derived PR validation, protected-main publication credential, release asset verification and Contents-API distribution update")
