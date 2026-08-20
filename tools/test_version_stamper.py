#!/usr/bin/env python3
from set_project_version import stamp_runtime_index


source = """<!doctype html>
<title>Dicebound: Beta v0.6.2.2</title>
<h1>Dicebound: Beta v0.6.2.2</h1>
<p>Beta v0.6.2.2 · an arbitrary per-PR summary that the stamper must preserve.</p>
"""
stamped = stamp_runtime_index(source, "0.6.2.3", "Beta")
assert "<title>Dicebound: Beta v0.6.2.3</title>" in stamped
assert "<h1>Dicebound: Beta v0.6.2.3</h1>" in stamped
assert "<p>Beta v0.6.2.3 · an arbitrary per-PR summary that the stamper must preserve.</p>" in stamped

historical = source.replace("0.6.2.2", "0.6.1")
assert "Beta v0.6.2.3 · an arbitrary" in stamp_runtime_index(historical, "0.6.2.3", "Beta")

try:
    stamp_runtime_index(source.replace("<p>Beta v0.6.2.2 · an arbitrary per-PR summary that the stamper must preserve.</p>", ""), "0.6.2.3", "Beta")
except SystemExit as exc:
    assert "runtime subtitle" in str(exc)
else:
    raise AssertionError("missing subtitle did not fail closed")

print("Version stamper PASS: generic release subtitle preservation and fail-closed matching")
