from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]

def run(*args):
    subprocess.run([sys.executable,*args],cwd=ROOT,check=True)

run('tools/set_project_version.py','--version','0.6.6.36','--channel','Beta')

changelog=ROOT/'CHANGELOG.md'
changelog_text=changelog.read_text(encoding='utf-8')
heading="""## Beta 0.6.6.36

### Camp / App Shell subsystem ownership (#356)
- Converged Camp entry, career-meta refresh and HUD orchestration behind the existing public `DiceboundCamp` boundary, with focused `runtime/js/ui/camp-shell.js` lifecycle/order policy installed internally rather than exposed as a peer subsystem API.
- Drained the historical `openStartScreen`, `updateMetaUI` and `updateHUD` wrapper ladders from `dicebound.js`; one explicit composition adapter per surface now invokes Camp-owned policy while Run, Classes, Progression, Pets, Combat View, Items and Runtime remain authoritative collaborators.
- Added a permanent 13-case exact released-0.6.6.35 Camp/App-Shell oracle plus exact orchestration-order and anti-shadow ownership guards. Local-file Camp startup, Info/Edge/file, active-run checkpoint and every neighboring subsystem oracle remain authoritative.
- Architecture-only: no gameplay balance, RNG order/state, save/checkpoint semantics, class/Pet/progression behavior or UI redesign is intended. Runtime graph is 88 modules (87 extracted/internal + one compatibility/composition monolith); the characterization-bearing candidate `dicebound.js` is 678,304 bytes / 7,158 lines versus 679,024 bytes / 7,167 lines at the locked pre-convergence characterization checkpoint. This completes the planned 12/12 public subsystem-owner architecture.

"""
anchor='## Beta 0.6.6.35\n'
if '## Beta 0.6.6.36\n' not in changelog_text:
    if anchor not in changelog_text:
        raise SystemExit('CHANGELOG Beta 0.6.6.35 anchor missing')
    changelog.write_text(changelog_text.replace(anchor,heading+anchor,1),encoding='utf-8',newline='\n')

notes=ROOT/'runtime/PATCH_NOTES.md'
notes_text=notes.read_text(encoding='utf-8')
section="""# Unreleased — Beta 0.6.6.36

## Beta 0.6.6.36 Camp / App Shell subsystem ownership (#356)
- `DiceboundCamp` is now the ordinary public Camp/App-Shell boundary for Camp entry, meta refresh and HUD orchestration; focused `ui/camp-shell.js` remains hidden behind the facade while `ui/camp.js` keeps DOM/layout/stage ownership.
- Historical `openStartScreen`, `updateMetaUI` and `updateHUD` shadow ladders are drained. One final composition adapter per surface preserves exact shipped ordering while Run checkpoints, Classes/Invoker, Progression, Pets, Combat View, Items and Runtime remain separately owned collaborators.
- A permanent 13-case exact released-0.6.6.35 Camp/App-Shell oracle plus exact order/anti-shadow guards freezes Camp entry, meta refresh, HUD synchronization and zero-gameplay-RNG behavior. Local-file Camp startup, Info/Edge/file, checkpoint and all neighboring subsystem suites remain authoritative.
- No gameplay balance, RNG order/state, save/checkpoint semantics, class/Pet/progression behavior or UI redesign is intended. Runtime graph is 88 modules (87 extracted/internal + one compatibility/composition monolith); the characterization-bearing candidate `dicebound.js` is 678,304 bytes / 7,158 lines. This release completes the planned 12/12 public subsystem-owner architecture.

"""
if not notes_text.startswith('# Unreleased — Beta 0.6.6.36\n'):
    notes.write_text(section+notes_text,encoding='utf-8',newline='\n')

run('tools/refresh_runtime_manifest.py','--version','0.6.6.36','--channel','Beta','--development-state','Unreleased')
print('Beta 0.6.6.36 Camp/App-Shell release stamp materialized')
