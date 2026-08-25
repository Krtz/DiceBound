from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
VERSION = "0.6.3.12"


def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)


index = ROOT / "runtime" / "index.html"
text = index.read_text(encoding="utf-8")

old_html = '<html lang="en">'
new_html = '<html lang="en" class="db-booting">'
if old_html not in text:
    raise SystemExit("Expected unguarded <html> tag not found")
text = text.replace(old_html, new_html, 1)

link = '<link rel="stylesheet" href="css/dicebound.css">'
boot_style = '''<style id="db-boot-gate">
  html.db-booting body{background:#050912}
  html.db-booting .app,
  html.db-booting #startOverlay{visibility:hidden!important}
</style>'''
if link not in text:
    raise SystemExit("Stylesheet link not found")
text = text.replace(link, link + "\n" + boot_style, 1)

rules_start = '    <div class="rules" style="display:none">'
heirloom_start = '    <div class="heirloom-line" id="startHeirloom">'
start = text.find(rules_start)
end = text.find(heirloom_start, start)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("Legacy hidden rules block boundaries not found")
text = text[:start] + text[end:]

bundle = '<script src="js/dicebound.js"></script>'
reveal = '<script id="db-boot-reveal">document.documentElement.classList.remove("db-booting");</script>'
if bundle not in text or reveal in text:
    raise SystemExit("Unexpected runtime bundle/reveal state")
text = text.replace(bundle, bundle + "\n" + reveal, 1)
index.write_text(text, encoding="utf-8")

# Human-facing notes.
changelog = ROOT / "CHANGELOG.md"
ct = changelog.read_text(encoding="utf-8")
old = "## Unreleased — Beta 0.6.3.11"
new = """## Unreleased — Beta 0.6.3.12

### Startup bootstrap cleanup (#138)
- Prevented the historical start/class-selection scaffold and underlying run UI from painting before the current full-screen Camp finishes synchronous construction.
- Removed the unreferenced hidden Alpha rules block from the bootstrap DOM while preserving compatibility IDs still used by the current Camp runtime.

## Beta 0.6.3.11"""
if old not in ct:
    raise SystemExit("Expected CHANGELOG 0.6.3.11 heading not found")
changelog.write_text(ct.replace(old, new, 1), encoding="utf-8")

notes = ROOT / "runtime" / "PATCH_NOTES.md"
nt = notes.read_text(encoding="utf-8")
old = "# Unreleased — Beta 0.6.3.11"
new = """# Unreleased — Beta 0.6.3.12

## Startup cleanup (#138)
- The obsolete Alpha-era class-selection screen no longer flashes for a moment while the modern Camp is being constructed.
- DiceBound now keeps the bootstrap UI invisible through first paint and reveals it immediately after runtime initialization, with no artificial loading delay.
- Removed an unused hidden block of old Alpha rules text from the startup DOM.

---

# Beta 0.6.3.11"""
if old not in nt:
    raise SystemExit("Expected PATCH_NOTES 0.6.3.11 heading not found")
notes.write_text(nt.replace(old, new, 1), encoding="utf-8")

run("python", "tools/set_project_version.py", "--version", VERSION, "--channel", "Beta")
run("python", "tools/refresh_runtime_manifest.py", "--version", VERSION, "--channel", "Beta", "--development-state", "Unreleased")

# Focused invariants before producing the clean handoff commit.
final = index.read_text(encoding="utf-8")
assert '<html lang="en" class="db-booting">' in final
assert 'id="db-boot-gate"' in final
assert 'id="db-boot-reveal"' in final
assert 'Welcome to <b>Alpha v1</b>' in final  # compatibility scaffold still exists but can no longer paint during boot
assert '<div class="rules" style="display:none">' not in final
assert final.index('id="db-boot-gate"') < final.index('<body>')
assert final.index('js/dicebound.js') < final.index('id="db-boot-reveal"')

run("python", "tools/validate_version_identity.py", "--version", VERSION, "--channel", "Beta")
run("python", "tools/validate_runtime_architecture.py")
run("python", "tools/validate_asset_architecture.py")

# Do not carry disposable materializer plumbing into the generated tree.
run("git", "rm", "-f", ".github/workflows/tmp-startup-gate.yml", "tools/tmp_startup_gate.py")
run("git", "add", "-A")
run("git", "commit", "-m", "Beta 0.6.3.12: hide legacy bootstrap UI")
run("git", "tag", "-f", "tmp-startup-gated-0.6.3.12")
run("git", "push", "origin", "refs/tags/tmp-startup-gated-0.6.3.12", "--force")
