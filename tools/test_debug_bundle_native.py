#!/usr/bin/env python3
from pathlib import Path

root=Path(__file__).resolve().parents[1]
native=(root/"wrapper-source/wrappers/webview2/native-go/main.go").read_text(encoding="utf-8")
host=(root/"runtime/js/native-http-host.js").read_text(encoding="utf-8")
platform=(root/"runtime/js/platform.js").read_text(encoding="utf-8")
contract=(root/"runtime/js/wrapper-contract.js").read_text(encoding="utf-8")
builder=(root/"wrapper-source/tools/build_launcher.py").read_text(encoding="utf-8")

for marker in [
    "type debugBundleRequest struct",
    'IncludeSave bool `json:"includeSave"`',
    'zipBytes(zw,"diagnostics/runtime-report.json"',
    'zipBytes(zw,"diagnostics/native-context.json"',
    'zipFileIfPresent(zw,"build/build-info.json"',
    'zipFileIfPresent(zw,"build/build-manifest.json"',
    'zipFileIfPresent(zw,"logs/native-wrapper.log"',
    '"releaseSourceSHA":releaseSourceSHA',
    '"webView2BootstrapMode":webViewBootstrapMode',
    'mux.HandleFunc("/__dicebound/platform/export-debug-bundle"',
]:
    assert marker in native, f"native debug bundle contract missing {marker!r}"

include_start=native.index("    if req.IncludeSave {")
include_end=native.index("    if err:=zw.Close()", include_start)
save_copy=native.index('zipFileIfPresent(zw,"save/"+filepath.Base(src),src)')
assert include_start < save_copy < include_end, "save files may only be copied inside explicit IncludeSave branch"
assert "Save files are excluded unless the player explicitly opts in from Options." in native
assert 'exportDebugBundle(payload)' in host and "/__dicebound/platform/export-debug-bundle" in host
assert 'exportDebugBundle: "sync-or-async"' in contract
assert "debugBundle:!!native?.exportDebugBundle" in platform
assert "function exportDebugBundle(payload)" in platform
assert "-X main.releaseSourceSHA=" in builder
assert "RELEASE_SOURCE_SHA" in builder

print("Native debug bundle contract PASS: real ZIP, provenance/log/build metadata, and save files gated by explicit opt-in")
