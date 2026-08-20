#!/usr/bin/env python3
from prepare_release import current_notes, derive
from validate_pr_version import validate_candidate


spec, notes = derive("0.6.2.1", "Beta", 2, "- Four-component versions.\n")
assert spec == {
    "format": 2,
    "version": "0.6.2.1",
    "channel": "Beta",
    "tag": "beta-0.6.2.1",
    "title": "DiceBound Beta 0.6.2.1",
    "asset": "DiceBound.exe",
    "artifactLabel": "DiceBound-Beta-0.6.2.1",
    "saveSchemaVersion": 2,
    "prerelease": True,
}
assert notes == "# DiceBound Beta 0.6.2.1\n\n- Four-component versions.\n"
assert current_notes("# Unreleased — development\n\n- New work.\n\n---\n\n# Beta 0.6.1\n") == "- New work."
assert validate_candidate("0.6.2.1", {"0.6.1"}) == []
assert "already been used" in validate_candidate("0.6.2.1", {"0.6.2.1"})[0]
assert "four numeric components" in validate_candidate("0.6.2", {"0.6.1"})[0]

print("Generic release identity PASS: derived tag/title/spec/notes and per-PR uniqueness policy")
