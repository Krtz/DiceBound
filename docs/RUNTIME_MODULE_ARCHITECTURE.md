# DiceBound Runtime Module Architecture

Parent issue: #40 — break `runtime/js/dicebound.js` into smaller domain modules.

This document describes the **incremental migration architecture**. It is deliberately not a rewrite plan. The game must remain runnable and behavior-compatible after every extraction PR.

## Current runtime load graph

`runtime/index.html` currently loads the following scripts in order:

```text
version.js
assets.js
rng.js
native-http-host.js
wrapper-contract.js
platform.js
storage.js
save-system.js
core/run-checkpoint.js
core/state.js
core/runtime-services.js
core/memory-diagnostics.js
combat/effective-stats.js
combat/strike-policy.js
combat/enemy-policy.js
combat/targeting.js
combat/vfx.js
classes/registry.js
progression/class-unlock-rules.js
progression/class-unlock-feedback.js
pets/registry.js
board/registry.js
combat/enemies.js
items/rarities.js
items/equipment.js
progression/talents.js
progression/achievements.js
events/reward-policy.js
events/merchant-transaction.js
items/artifacts.js
items/loot.js
powerups/registry.js
powerups/borrowing.js
ui/camp.js
ui/class-chooser.js
dicebound.js
```

`version.js` is the first runtime module and the only browser-runtime owner of current Version/Channel literals. Infrastructure, save and the compatibility monolith consume its frozen identity API. `save-system.js` owns independent career and active-run envelopes plus their backup rotation. `core/run-checkpoint.js` owns JSON-safe active-run validation, RNG capture and storage coordination; the monolith currently composes its live state into that API at completed-tile boundaries. `core/state.js` owns career defaults, normalization, save/load coordination and the domain event bus. `core/runtime-services.js` creates explicit capability contracts without owning or copying live run data. `combat/effective-stats.js` owns extracted pure modifier calculations and live descriptors, beginning with the complete Berserker Ultimate/Rage path. `combat/targeting.js` owns the pure next-living-target resolver used to keep mechanical and DOM combat targets synchronized through chained kills. `combat/guardians.js` resolves each Board's miniboss/final guardian as one immutable identity spanning combat data and semantic battle/board artwork. `powerups/registry.js` consumes the runtime-service contract and authoritatively owns all 200 canonical Powerup definitions/effects. Explicit owners also cover classes and support tables, pets, boards, enemies, rarity/equipment metadata, achievements, the Legacy talent tree, Artifact selection and guardian/ordinary loot policy. `dicebound.js` temporarily retains active-run state, checkpoint composition wiring, Powerup choice/application orchestration, concrete item factories and presentation.

`progression/class-unlock-rules.js` owns observed unlock facts and dynamic eligibility. `progression/class-unlock-feedback.js` is the single player-facing feedback owner: it derives copy from the canonical class registry, accepts only successful canonical unlock events, persists the Camp-reveal queue, and does not infer unlocks by parsing UI text.

`events/merchant-transaction.js` owns the current Merchant visit's offer reservations, consumed-offer state and exclusive reward-choice transaction. Merchant rendering remains in the compatibility runtime for now, but it cannot rebuild stock or enter another Sovereign/Contract choice while that transaction owns input.

`core/memory-diagnostics.js` owns the bounded diagnostics time series, canonical export text and pure equivalent-state summaries. Its test-only live cycle adapter remains in the compatibility runtime because it deliberately exercises the final Camp/run/combat lifecycle; it uses one ordinary-enemy fixture per cycle, clears its temporary checkpoint, and reports evidence only rather than declaring a memory leak.

`ui/camp.js` owns Camp scene presentation, responsive layout and painted-object hit targets. `ui/class-chooser.js` owns the Class roster/detail destination, semantic artwork, safe locked-class inspection, Random chooser state and persistent dismissal chrome. Both receive domain data/actions through injected contracts; neither duplicates class registry, unlock, save or RNG policy. The monolith retains only a documented `renderClassChoices()` forwarding adapter for legacy lifecycle call sites and the `startNewGame()` composition hook that resolves the already-selected Random class exactly once.

The machine-readable source of truth for this order is `runtime/js/module-manifest.json`. Run `python tools/validate_runtime_architecture.py` after changing runtime module ownership or script ordering.

## Dependency direction

Dependencies should point downward through stable services, never form cycles.

```text
version ─────────────────────────────────────────────────┐
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
- any runtime module reading `DiceboundVersion` must declare `version` in its manifest dependencies; the version-identity validator enforces this dynamically as code moves.
- runtime-service objects are composition-only capabilities: they are never copied into run state or serialized into saves.

## Powerup runtime-service contract

Issue #65's inventory found six capabilities in the canonical 200-entry registry:

- a reset-safe live player-state port;
- authoritative gold reward calculation plus Nightmare-state query;
- the established healing pipeline;
- pure clamp rules;
- the canonical element-ID vocabulary;
- current-class Perfected Signature application/description.

`DiceboundRuntimeServices.createPowerupServices()` validates and freezes those ports. Its player proxy resolves the current player object on every access, so a reset/replaced run cannot leave Powerup closures attached to stale state. `DiceboundPowerupRegistry.createRegistry(services)` owns the definitions/effects, while `describe(powerup, services)` is the first live descriptor query. The registry has no RNG, board, DOM, UI-layout or save-service dependency. UI choice/application orchestration remains in the monolith for a later presentation extraction.

## Effective-stat and description ownership

`DiceboundEffectiveStats` is a DOM-free calculation/descriptor owner. Combat calls it for Berserker's 280% base Ultimate formula, multiplicative class-Ultimate/Ultimate-damage/all-damage modifiers and Rage scaling; the tooltip and active-run trait panel call the same API for current values. Gold rewards, Current Run Buffs and Info → Stats likewise share its Gold multiplier/snapshot API, including Nightmare/Hell's reward reduction. These descriptors therefore report live values without duplicating mechanic constants. Other mutable descriptions should migrate through equivalent authoritative queries as their mechanic domains are extracted.

## Target ownership domains

The exact file count is intentionally flexible. Boundaries should follow responsibility and dependency, not arbitrary line-count targets.

```text
runtime/js/
├─ main.js                    eventual small composition root
├─ module-manifest.json       architecture/load-order contract
├─ version.js                 authoritative browser Version/Channel identity
├─ assets.js
├─ core/
│  ├─ state.js                 career defaults/normalization and event bus
│  ├─ run-checkpoint.js        active-run validation/RNG/storage service
│  ├─ constants.js
│  └─ ...
├─ board/
│  └─ registry.js
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
│  ├─ talents.js
│  └─ achievements.js
├─ modes/
├─ save/
└─ ui/
   ├─ camp.js                 Camp presentation/layout/hit targets
   └─ class-chooser.js        Class roster/detail, Random and Done chrome
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

The first Phase 1 extraction moved Artifact and guardian-loot policy into item modules. Subsequent checkpoints moved canonical classes, talents, pets, enemies, rarities, boards, equipment metadata, achievements and class support tables. The equipment owner now also owns deterministic ordinary-item construction and normalization; the monolith supplies its current compatibility tables and runtime RNG/identity inputs through an explicit injected contract. The next checkpoint established the explicit runtime-service boundary and moved all 200 canonical Powerup definitions/effects through it. Concrete special-item factories and presentation chains remain temporarily in the monolith. These modules have explicit load-order dependencies and no circular dependency.

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
node tools/test_content_registries.js
node tools/test_core_state.js
node tools/test_run_checkpoint.js
node tools/test_version_identity.js
node tools/smoke_run_resume_browser.js
# After building wrapper-source/release/DiceBound.exe:
node tools/smoke_run_resume_native.js
python tools/validate_version_identity.py --version 0.6.3.0 --channel Beta
python tools/test_version_identity_validator.py
```

`validate_runtime_architecture.py` intentionally has two classes of findings:

- **errors**: missing files, load-order drift, invalid dependency order, duplicate declared public-global ownership;
- **advisories**: existing repeated named functions inside the compatibility monolith. Those are migration debt and should trend downward as extraction proceeds.

Future extraction PRs should add focused tests for pure logic as soon as it becomes independently callable.

## Coordination with other issues

- #35 now extends the existing save-service boundary with `core/run-checkpoint.js`, a separate versioned active-run envelope and stable-state composition. Future extraction should move the remaining snapshot adapter fields out of the monolith as board/player/run state gain authoritative owners.
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
