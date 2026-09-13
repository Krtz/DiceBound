#!/usr/bin/env python3
from pathlib import Path

patch=Path('runtime/PATCH_NOTES.md')
text=patch.read_text(encoding='utf-8')
block='''# Unreleased — Beta 0.6.6.26

## Beta 0.6.6.26 Road Events subsystem facade (#324)
- Added the public `DiceboundRoadEvents` facade over focused Treasure and interactive lifecycle internals for Slots, Wheel, Blessing, Mystic, Bloodwell and Gambler; Board + Run remains arrival/routing-only.
- Drained the migrated Road Event lifecycle, patch-wrapper chains, event-local transient state and destination listeners from `dicebound.js`; Treasure retains its exact 0.6 Memory Cache ordering and hidden Bloodmage entry still delegates to Combat.
- Added a permanent 46-case released-0.6.6.25 characterization oracle plus facade, Treasure and anti-shadow guards. Exact observable state, tile/cookie effects, RNG call counts and final RNG state are frozen, including the shipped Slot animation RNG quirk.
- Architecture-only: no event odds/reward values, Board placement, Powerup/Items behavior, Combat behavior, checkpoint/save schema or UI redesign is intended. Runtime graph is 74 modules (73 extracted + one compatibility monolith); normalized `dicebound.js` is 709,513 bytes / 7,267 lines, down from 739,724 bytes / 7,426 lines in released 0.6.6.25.

'''
if not text.startswith('# Unreleased — Beta 0.6.6.26'):
    patch.write_text(block+text,encoding='utf-8')

changelog=Path('CHANGELOG.md')
c=changelog.read_text(encoding='utf-8')
marker='This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n'
section='''
## Beta 0.6.6.26

### Road Events subsystem facade (#324)
- Added `runtime/js/events/facade.js` as the single ordinary public `DiceboundRoadEvents` boundary, backed by focused Treasure and interactive lifecycle internals rather than duplicated implementations.
- Routed Slots, Wheel, Treasure, Blessing, Mystic, Bloodwell and Gambler through the subsystem facade while keeping Board + Run responsible only for arrival/routing and leaving Powerups, Items and Combat as separate collaborators.
- Removed migrated Road Event lifecycle implementations, patch-era wrapper chains, event-local transient state/listeners and stale Slot/Wheel overrides from `dicebound.js`; preserved Merchant ownership after explicitly guarding the extraction boundary.
- Added a permanent 46-case exact released-0.6.6.25 Road Events oracle covering output/state/RNG behavior, plus facade/Treasure/anti-shadow tests. The shipped Slot animation RNG consumption remains deliberately frozen.
- Architecture measurement: runtime graph 71 → 74 modules (70 → 73 extracted/internal plus one monolith); normalized `dicebound.js` 739,724 → 709,513 bytes and 7,426 → 7,267 lines. No event balance, reward odds, Board placement, save/checkpoint, Powerup/Items or Combat behavior change is intended.
'''
if '\n## Beta 0.6.6.26\n' not in c:
    if marker not in c:
        raise SystemExit('CHANGELOG insertion marker missing')
    changelog.write_text(c.replace(marker,marker+section,1),encoding='utf-8')
print('Road Events 0.6.6.26 release notes staged.')
