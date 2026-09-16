#!/usr/bin/env python3
"""Regression coverage for version-owned release-note selection."""
from __future__ import annotations

import tempfile
from pathlib import Path

from prepare_release import release_notes


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "runtime" / "release-notes").mkdir(parents=True)
    (root / "runtime" / "PATCH_NOTES.md").write_text(
        "# Unreleased — Beta 0.6.6.39\n\nLegacy fallback notes.\n",
        encoding="utf-8",
    )
    versioned = root / "runtime" / "release-notes" / "0.6.7.0.md"
    versioned.write_text("Canonical 0.6.7.0 notes.\n", encoding="utf-8")

    assert release_notes(root, "0.6.7.0") == "Canonical 0.6.7.0 notes."
    versioned.unlink()
    assert release_notes(root, "0.6.7.0") == "Legacy fallback notes."

print("Release notes PASS: version-owned notes override legacy PATCH_NOTES with fallback preserved")
