#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]

def run(*args):
    result=subprocess.run([sys.executable,*args],cwd=ROOT)
    if result.returncode:
        raise SystemExit(result.returncode)

def prepend_once(path,anchor,marker,entry):
    text=path.read_text(encoding='utf-8')
    if marker in text:
        return
    if anchor not in text:
        raise SystemExit(f'missing release-note anchor {anchor!r} in {path}')
    path.write_text(text.replace(anchor,entry+anchor,1),encoding='utf-8')

run('tools/set_project_version.py','--version','0.6.6.35','--channel','Beta')

prepend_once(
    ROOT/'CHANGELOG.md',
    '## Beta 0.6.6.34',
    '## Beta 0.6.6.35',
    '''## Beta 0.6.6.35

### Runtime / Core / Persistence subsystem facade and ownership (#354)
- Added `runtime/js/core/facade.js` as the ordinary public `DiceboundRuntime` boundary over focused Version, Platform, Storage, Save, active-run Checkpoint, Core State, Runtime Services and Memory Diagnostics internals. Deterministic gameplay RNG remains an explicit foundational dependency instead of being hidden by the facade.
- Routed ordinary career-state load/save and event-bus composition, checkpoint access, runtime-service construction, diagnostics and persistence collaboration through `DiceboundRuntime`; drained peer-global Runtime implementation dependencies from ordinary modules while retaining intrinsic bootstrap/version dependencies as focused internals.
- Added a permanent 12-case exact released-0.6.6.34 Runtime/Core/Persistence oracle plus facade and peer-boundary anti-shadow tests. Existing Core State, checkpoint, Memory Diagnostics, subsystem deterministic/oracle, browser/file/Edge and native release gates remain authoritative.
- Architecture-only: no gameplay balance, RNG order/state, save/checkpoint schema or timing, event ordering, platform fallback behavior or UI redesign is intended. Runtime graph is 87 modules (86 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 670,346 bytes / about 7,076 lines versus 670,604 bytes / 7,075 physical lines in released 0.6.6.34. This wave prioritizes ownership cohesion rather than raw monolith shrinkage.

'''
)

prepend_once(
    ROOT/'runtime/PATCH_NOTES.md',
    '# Unreleased — Beta 0.6.6.34',
    '# Unreleased — Beta 0.6.6.35',
    '''# Unreleased — Beta 0.6.6.35

## Beta 0.6.6.35 Runtime / Core / Persistence subsystem ownership (#354)
- `DiceboundRuntime` is now the ordinary public Runtime/Core/Persistence boundary over focused Version, Platform, Storage, Save, active-run Checkpoint, Core State, Runtime Services and Memory Diagnostics internals; deterministic gameplay RNG remains explicit and separate.
- Ordinary career-state load/save/event-bus composition, checkpoint access, runtime-service construction, diagnostics and persistence collaboration route through the facade. Direct Runtime implementation peers and stale manifest edges are drained from ordinary modules while focused bootstrap identity adapters retain their intrinsic Version dependency.
- A permanent 12-case exact released-0.6.6.34 Runtime oracle plus facade and peer-boundary anti-shadow guards freezes save backup/recovery, import/export, checkpoint/RNG continuation, career normalization, event bus, live runtime services, storage/platform diagnostics and non-mutating memory diagnostics.
- No gameplay balance, RNG order/state, save/checkpoint schema or timing, event ordering, platform fallback behavior or UI redesign is intended. Runtime graph is 87 modules (86 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 670,346 bytes / about 7,076 lines.

'''
)

run('tools/refresh_runtime_manifest.py','--version','0.6.6.35','--channel','Beta','--development-state','Unreleased','--notes','Runtime/Core/Persistence owner convergence for Beta 0.6.6.35.')
print('Runtime release materialized for Beta 0.6.6.35')
