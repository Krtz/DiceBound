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
    "DICEBOUND_RELEASE_APP_ID",
    "DICEBOUND_RELEASE_APP_PRIVATE_KEY",
    "actions/create-github-app-token@v3",
    "id: manifest_app_token",
    "app-id: ${{ secrets.DICEBOUND_RELEASE_APP_ID }}",
    "private-key: ${{ secrets.DICEBOUND_RELEASE_APP_PRIVATE_KEY }}",
    "owner: Krtz",
    "repositories: DiceBound",
    "permission-contents: write",
    "Verify protected-main manifest App token access",
    "installation/repositories?per_page=100",
    "DiceBound manifest App token installation does not include Krtz/DiceBound.",
    "repos/Krtz/DiceBound/contents/distribution/latest.json?ref=main",
    "DiceBound manifest App token cannot read distribution/latest.json.",
    "GH_TOKEN: ${{ steps.manifest_app_token.outputs.token }}",
    "gh api --method PUT",
    "contents/$manifestPath",
    "Published distribution/latest.json differs from the verified local manifest.",
]:
    assert marker in source, f"generic release workflow is missing {marker!r}"

assert source.count("workflow_dispatch:") == 1
assert source.count("pull_request:") == 1
assert source.count("github.ref == 'refs/heads/main' && (github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.publish))") == 5
assert source.count("secrets.DICEBOUND_RELEASE_APP_ID") == 2
assert source.count("secrets.DICEBOUND_RELEASE_APP_PRIVATE_KEY") == 2
assert "DICEBOUND_RELEASE_TOKEN" not in source
assert source.count("steps.manifest_app_token.outputs.token") == 2
publish_if = "github.ref == 'refs/heads/main' && (github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.publish))"
assert f"""- name: Mint protected-main manifest App token
        id: manifest_app_token
        if: {publish_if}
        uses: actions/create-github-app-token@v3""" in source
assert f"""- name: Verify protected-main manifest App token access
        if: {publish_if}
        shell: pwsh
        env:
          GH_TOKEN: ${{{{ steps.manifest_app_token.outputs.token }}}}""" in source
assert f"""- name: Point launcher manifest at verified release
        if: {publish_if}
        shell: pwsh
        env:
          GH_TOKEN: ${{{{ steps.manifest_app_token.outputs.token }}}}""" in source
assert "paths-ignore:" in source and "distribution/latest.json" in source
assert "git push origin" not in source, "protected main must not be updated with the default checkout token"
assert "release/beta-" not in source
assert ".release/beta-" not in source

print("Generic release workflow source PASS: Version/Channel-derived PR validation, main-only GitHub App manifest-token preflight, release asset verification and Contents-API distribution update with remote reconciliation")
