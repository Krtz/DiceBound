# DiceBound design rules

These durable rules apply to new destinations, gameplay changes and refactors of existing systems.

## Persistent dismissal

Every full-screen, modal or independently scrollable destination must provide a
clearly labelled Done, Back or Exit control in persistent top-right chrome.
It must remain available at wide, compact and short-wide viewport sizes. A
dismissal control is not ordinary scrollable content and must not depend on a
late z-index override.

## Responsive destinations

UI must remain usable after resize while open. Layouts should preserve safe
areas, keep essential controls visible, and use a dedicated responsive owner
instead of scattered compatibility style patches.

## Ownership and semantics

Presentation owners render semantic IDs, selected authored art and hit targets.
Domain owners retain mechanics, data, persistence, RNG and progression policy.
Do not duplicate computed values or make UI text the source of gameplay truth.

## Runtime architecture and responsibility ownership

DiceBound targets **12 coherent public gameplay subsystem families plus one explicit
Composition / Bootstrap / Tooling root**:

1. Runtime / Core / Persistence — `DiceboundRuntime`
2. Board + Run Flow — `DiceboundRun`
3. Combat Engine — `DiceboundCombat`
4. Combat Presentation / VFX — `DiceboundCombatView`
5. Classes — `DiceboundClasses`
6. Pets / Companions — `DiceboundPets`
7. Equipment / Loot / Items — `DiceboundItems`
8. Merchant — `DiceboundMerchant`
9. Progression — `DiceboundProgression`
10. Powerups — `DiceboundPowerups`
11. Road Events — `DiceboundRoadEvents`
12. Camp / App Shell — `DiceboundCamp`

`runtime/js/dicebound.js` is the Composition / Bootstrap / Tooling root, not a
thirteenth gameplay subsystem. It may own dependency/service wiring, top-level
browser/native bootstrap, explicit compatibility adapters and debug/tooling
composition. New gameplay or presentation logic belongs in the existing
authoritative subsystem whenever one already owns that responsibility.

A facade is a public ownership boundary, not a requirement that all internals
live in one file. Focused internal modules are encouraged where they improve
cohesion.

### Feature/bug-driven maintenance rule

Broad monolith archaeology is not a default workstream. A real bug, feature or
playtest observation chooses the coherent responsibility slice to inspect.

For that slice:

1. freeze released behavior that should remain;
2. identify the complete responsibility actually touched;
3. inspect it for stale wrappers, shadow implementations or misplaced ownership;
4. converge touched behavior on the established canonical owner/facade;
5. implement the approved player-facing change there;
6. remove touched obsolete ownership instead of stacking another production patch;
7. add deterministic and anti-return coverage where appropriate;
8. preserve unrelated gameplay, exact RNG draw count/order/final state,
   action/event ordering, rounding/target semantics and current save/checkpoint
   behavior unless the active issue deliberately changes them;
9. pass repository validation plus browser/Edge and native WebView2 release gates.

Do not launch unrelated source surgery merely to reduce `dicebound.js`. Equally,
do not knowingly leave duplicate touched ownership in place when the canonical
owner is clear.

### Anti-shadow acceptance rule

A responsibility is considered drained from an old path only when:

1. the authoritative implementation lives in the correct owner;
2. ordinary callers route through that owner/facade or one justified composition adapter;
3. superseded live implementation/wrapper/patch layers are removed; and
4. validation prevents the shadow path from silently returning.

Historical-layer reports and old helper names are inspection evidence, not an
automatic cleanup queue.

## Canonical-function changes

Whenever behavior is added or changed, update or rewrite the affected
authoritative function or owner implementation so the new behavior is expressed
directly in that canonical implementation. Do not add another patch wrapper,
predecessor capture, replacement layer, version generation or compatibility
function when the existing function can be changed instead.

If older behavior must remain, fold that behavior into the canonical function in
its current owner and protect the final composed behavior with focused tests.
Temporary test monkey-patches are allowed only when they are scoped and restored;
they are not a substitute for production ownership.

## Progression and secrets

Locked content must remain understandable without exposing secret content ahead
of its intended reveal. New progression options should use the authoritative
achievement/unlock policy rather than a UI-only eligibility check.

Historical Beta saves are disposable unless Axel explicitly requests compatibility.
That does not permit accidental drift in current-schema persistence, active-run
checkpoints or transaction atomicity.

## Branch lifecycle

Feature, refactor, release and temporary working branches are disposable once
their work is safely merged. After a merge and any required post-merge release
or reconciliation step has succeeded, delete the merged branch and any obsolete
candidate/materializer branches that no longer contain unique unmerged work.
Never delete `main`, an active PR branch, a protected ref, or a branch that still
contains unique work needed by a follow-up.
