# DiceBound Runtime Module Architecture

Parent issue: #40 — break `runtime/js/dicebound.js` into smaller domain modules.

This document describes the **incremental migration architecture**. It is deliberately not a rewrite plan. The game must remain runnable and behavior-compatible after every extraction PR.

## Current runtime load graph

`runtime/index.html` currently loads the following scripts in order:

```text
assets.js
rng.js
native-http-host.js
wrapper-contract.js
platform.js
storage.js
save-system.js
classes/registry.js
pets/registry.js
combat/enemies.js
items/rarities.js
progression/talents.js
items/artifacts.js
items/loot.js
dicebound.js
```

The platform/storage/save/RNG files are useful seams outside the recovered monolith. Explicit static owners now cover classes, pets, the ordinary-enemy pool, rarity metadata and the Legacy talent tree behind isolated clone APIs. Class tags are derived from the canonical class owner rather than duplicated. The item layer also owns Artifact slot selection in `items/artifacts.js` and guardian/ordinary loot policy in `items/loot.js`; `dicebound.js` temporarily retains the stateful mechanics, special-enemy definitions, concrete item factories and presentation/orchestration.

The machine-readable source of truth for this order is `runtime/js/module-manifest.json`. Run `python tools/validate_runtime_architecture.py` after changing runtime module ownership or script ordering.

## Dependency direction

Dependencies should point downward through stable services, never form cycles.

```text
assets ───────────────────────────────────────────────┐
rng ──────────────────────────────────────────────────┤
native-http-host -> wrapper-contract -> platform ─────┤
                                  \-> storage -> save ├-> gameplay domains -> UI -> main/bootstrap
platform ---------------------------------------> save ┘
```

Rules:

- gameplay may use `DiceboundPlatform`, `DiceboundStorage`, `DiceboundSave`, `DiceboundRng` and `DiceboundAssets`;
- gameplay must not reach directly into native/WebView2 host details;
- domain modules should not depend on UI modules;
- UI modules may consume domain state/services and render them;
- save/storage modules should serialize authoritative state supplied by gameplay rather than own gameplay rules;
- cross-domain calls should go through explicit exported APIs rather than ambient globals where practical;
- one public symbol/system gets one authoritative owner.

## Target ownership domains

The exact file count is intentionally flexible. Boundaries should follow responsibility and dependency, not arbitrary line-count targets.

```text
runtime/js/
├─ main.js                    eventual small composition root
├─ module-manifest.json       architecture/load-order contract
├─ assets.js
├─ core/
│  ├─ state.js
│  ├─ constants.js
│  └─ ...
├─ board/
├─ combat/
│  └─ enemies.js
├─ classes/
│  └─ registry.js
├─ items/
│  ├─ equipment.js
│  ├─ loot.js
│  ├─ artifacts.js
│  ├─ rarities.js
│  └─ consumables.js
├─ powerups/
├─ pets/
│  └─ registry.js
├─ progression/
│  └─ talents.js
├─ modes/
├─ save/
└─ ui/
```

The already-extracted platform/storage/save/RNG files may later move into subdirectories only if doing so provides value. Moving files merely to make the tree prettier is not a priority.

## Migration phases

### Phase 0 — map and guardrails

Phase 0 established these guardrails:

- Establish `module-manifest.json` as the machine-readable load/ownership map.
- Validate `index.html` script order against the manifest.
- Validate declared dependency order.
- Validate that public `window.Dicebound*` symbols have exactly one declared authoritative assignment.
- Report monolith size and repeated named function declarations as migration metrics.
- Keep current gameplay behavior unchanged.

### Phase 1 — low-risk extraction

Prefer pure/data-heavy regions first:

1. constants/config tables;
2. weighted loot/Artifact tables and selection helpers;
3. other pure helpers currently embedded in the monolith;
4. registries that do not directly own DOM or combat state.

The first Phase 1 extraction moved Artifact and guardian-loot policy into item modules. Subsequent registry checkpoints moved canonical classes and talents, then pets, the ordinary-enemy pool and rarity metadata into domain owners. Byte-identical class tags are now derived from canonical class data instead of maintained twice. Clone APIs intentionally feed the monolith's existing read-only compatibility proxies, preserving harmless patch-era mutation attempts without exposing mutable authoritative module state. Concrete stateful mechanics, special-enemy definitions, item factories and presentation chains remain temporarily in the monolith. These modules are independent and have no circular dependency.

### Phase 2 — self-contained gameplay domains

Extract one domain per PR where practical:

- powerups;
- equipment/loot;
- pets;
- achievements/progression;
- class registry and class-specific mechanics.

First preserve existing behavior mechanically. Cleanup/redesign comes after an extracted module has deterministic tests.

### Phase 3 — board and combat

Board and combat have broad dependency surfaces and should move only after lower-level systems have stable APIs.

Separate:

- state transitions/rules;
- enemy/guardian definitions;
- damage/status calculations;
- board generation/movement/tile resolution;
- rendering hooks.

### Phase 4 — UI ownership

Move direct DOM/rendering responsibilities into explicit UI modules. Gameplay domains should expose state/events rather than manipulate unrelated panels.

Likely UI domains:

- campsite;
- board;
- combat;
- character/stats/equipment;
- modals/choices;
- achievements/talents/info/options.

### Phase 5 — composition root and monolith retirement

When domain ownership has moved out:

- `main.js` becomes the small composition root;
- it wires platform/storage/assets/state/domains/UI and starts the application;
- obsolete patch wrappers and duplicate definitions are removed;
- `dicebound.js` becomes a tiny temporary compatibility layer, then disappears;
- issue #31 can remove legacy asset compatibility mirrors once no monolith fallback paths remain.

## Extraction PR contract

Every extraction PR should answer:

1. **What responsibility moved?**
2. **What file/module owns it now?**
3. **What dependencies does that module require?**
4. **What public API/symbol does it expose?**
5. **What old authoritative definition was removed?**
6. **What behavior-preservation checks were run?**
7. **Can this PR be reverted independently?**

Do not leave two live implementations with a comment saying the later one wins. A completed extraction means the new module is the one authoritative implementation.

## Validation

Run:

```text
python tools/validate_runtime_architecture.py
python tools/validate_asset_architecture.py
python tools/refresh_runtime_manifest.py
node tools/test_artifacts_module.js
node tools/test_loot_module.js
node tools/test_class_registry.js
node tools/test_talent_registry.js
node tools/test_static_registries.js
```

`validate_runtime_architecture.py` intentionally has two classes of findings:

- **errors**: missing files, load-order drift, invalid dependency order, duplicate declared public-global ownership;
- **advisories**: existing repeated named functions inside the compatibility monolith. Those are migration debt and should trend downward as extraction proceeds.

Future extraction PRs should add focused tests for pure logic as soon as it becomes independently callable.

## Coordination with other issues

- #33/#35 save/resume should consume the modular state/save boundaries rather than create another parallel persistence path.
- #22 Artifact weighting was completed as a separate isolated balance PR after Artifact ownership moved out of the monolith.
- #3 guardian-loot tuning now has isolated policy tables/helpers in `items/loot.js`; future tuning must remain separate from the behavior-preserving extraction.
- #28 Gloves and #25 character panel become easier once equipment ownership is explicit.
- #38 pack identity becomes easier once board model and board rendering have a clean boundary.
- #31 compatibility-mirror removal belongs near the end of this migration, not at the beginning.

## Success measure

The goal is not simply “fewer lines in `dicebound.js`.” The real success criteria are:

- clear ownership;
- explicit dependencies;
- independently testable logic;
- smaller review surfaces;
- fewer merge conflicts;
- no accidental last-definition-wins behavior;
- browser and native runtime behavior preserved throughout the migration.
