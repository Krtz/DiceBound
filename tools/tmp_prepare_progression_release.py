from pathlib import Path

CHANGELOG=Path('CHANGELOG.md')
PATCH_NOTES=Path('runtime/PATCH_NOTES.md')

changelog=CHANGELOG.read_text(encoding='utf-8')
anchor="This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n"
entry="""## Beta 0.6.6.29

### Progression subsystem facade and ownership (#329)
- Added `runtime/js/progression/lifecycle.js` as the ordinary public `DiceboundProgression` boundary for Talent/Legacy progression, final Prestige reset coordination, Achievement policy and class-unlock orchestration while retaining the existing focused Talent registry, Prestige domain, Achievement registry and class-unlock rule/feedback modules.
- Routed Talent callers, Run finalization, Prestige Moon inspect/purchase/refund flows, Achievement/Trophy policy, Camp progression reveals and ordinary class unlock eligibility/commit/dynamic scans through the facade; retired the historical Talent/Legacy/Prestige, Achievement-gate/reward and class-unlock semantic shadows from `dicebound.js`.
- Added a permanent 30-case exact released-0.6.6.28 Progression oracle covering Talent prerequisites and run snapshots, Legacy awards, final Prestige reset/storage/checkpoint behavior, Prestige Moon RNG/state, Achievement completion/copy/gates/mastery/count and class-unlock commit behavior, plus focused anti-shadow and class-unlock transaction guards.
- Architecture-only: no Talent costs/effects, Legacy rates, Prestige conversion, Moon purchases/Forge design, Achievement conditions/rewards, class unlock thresholds, RNG, save/checkpoint semantics or gameplay balance changes are intended. Runtime graph is 79 modules (78 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 676,782 bytes / 7,025 physical lines versus 692,187 bytes / 7,136 lines in released 0.6.6.28.

"""
if '## Beta 0.6.6.29' in changelog:
    raise SystemExit('CHANGELOG already contains Beta 0.6.6.29')
if changelog.count(anchor)!=1:
    raise SystemExit('CHANGELOG anchor mismatch')
CHANGELOG.write_text(changelog.replace(anchor,anchor+entry,1),encoding='utf-8',newline='\n')

notes=PATCH_NOTES.read_text(encoding='utf-8')
notes_entry="""# Unreleased — Beta 0.6.6.29

## Beta 0.6.6.29 Progression subsystem ownership (#329)
- `DiceboundProgression` is now the ordinary public Progression boundary for Talent/Legacy, final Prestige reset, Prestige Moon state transactions, Achievement policy and class-unlock orchestration; the focused Talent, Prestige, Achievement and class-unlock modules remain authoritative specialist internals.
- Historical Talent/Legacy/final-Prestige implementations, layered Achievement gate/reward wrappers and class-unlock transaction/dynamic-scan shadows are drained from `dicebound.js`; Camp/Trophy/Moon/Run and ordinary callers now collaborate through the facade instead of rebuilding policy locally.
- A permanent 30-case released-0.6.6.28 output/state/RNG oracle freezes Talent snapshots and prerequisites, Legacy awards, Prestige reset and Moon behavior, Achievement copy/gates/mastery/count and class-unlock commit behavior. Focused ownership tests additionally prevent the retired monolith ladders and direct Moon state transaction path from returning.
- No progression balance, Talent effects/costs, Legacy rates, Prestige conversion, Moon Forge design, Achievement rewards, class unlock thresholds, RNG order/state, save/checkpoint behavior or UI redesign is intended. Runtime graph is 79 modules (78 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 676,782 bytes / 7,025 lines.

"""
if notes.startswith('# Unreleased — Beta 0.6.6.29'):
    raise SystemExit('PATCH_NOTES already contains Beta 0.6.6.29')
PATCH_NOTES.write_text(notes_entry+notes,encoding='utf-8',newline='\n')

print('0.6.6.29 release notes staged.')
