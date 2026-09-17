# DiceBound Architecture

This document describes the **current Git-era runtime architecture and maintenance contract**. It is intentionally about ownership and boundaries, not a release-by-release diary.

For the executable queue and exact current release checkpoint, use GitHub issues **#130** and **#84**. Live `main`, release metadata and newer issue/PR evidence always beat stale prose.

## Current verified baseline

As of Beta **0.6.7.6**:

- runtime graph: **92 modules = 91 focused/extracted modules + one Composition / Bootstrap / Tooling root**;
- public subsystem program: **12 / 12 complete**;
- `runtime/js/dicebound.js`: **4,882 lines / 384,022 bytes**;
- repeated named functions: **0**;
- duplicate top-level function declarations: **0**;
- `runtime/js/module-manifest.json` is the authoritative runtime load graph;
- browser/Edge and native WebView2 validation remain release gates.

The exact release provenance lives in #84 and `distribution/latest.json`; do not hard-code old hashes into architecture decisions.

## Source of truth

- Current game payload: `runtime/`
- Runtime load graph: `runtime/js/module-manifest.json`
- Runtime asset registry: `runtime/js/assets.js`
- Runtime art taxonomy/inventory: `runtime/assets/README.md` and `runtime/assets/ASSET_INVENTORY.json`
- Windows packaging/build source: `wrapper-source/`
- Lightweight installer/launcher source: `installer/`
- Current launcher channel: `distribution/latest.json`
- Immutable historical release evidence: `docs/releases/<version>/`

Generated EXEs, browser ZIPs, release bundles, runtime caches and user saves are outputs/data, not development source, and should not be committed to `main`.

## Runtime ownership model

The target is **12 public subsystem families + one explicit composition layer**.

| Responsibility | Public owner |
| --- | --- |
| Runtime / Core / Persistence | `DiceboundRuntime` |
| Board + Run Flow | `DiceboundRun` |
| Combat Engine | `DiceboundCombat` |
| Combat Presentation / VFX | `DiceboundCombatView` |
| Classes | `DiceboundClasses` |
| Pets / Companions | `DiceboundPets` |
| Equipment / Loot / Items | `DiceboundItems` |
| Merchant | `DiceboundMerchant` |
| Progression | `DiceboundProgression` |
| Powerups | `DiceboundPowerups` |
| Road Events | `DiceboundRoadEvents` |
| Camp / App Shell | `DiceboundCamp` |

`runtime/js/dicebound.js` is the explicit **Composition / Bootstrap / Tooling** root. It is not a thirteenth gameplay subsystem.

Focused internal modules may own narrower responsibilities behind those facades. Examples include Board movement/generation/presentation, Combat strike/turn/ultimate resolution, Pet lifecycle, Prestige, Merchant stock/transactions, equipment presentation and Road Dice. A facade is not required to be one giant implementation file.

## Composition root contract

`dicebound.js` may legitimately own:

- dependency/service wiring;
- top-level browser/native bootstrap;
- explicit lifecycle composition where multiple domains meet;
- narrow compatibility adapters whose remaining caller/reason is known;
- debug/tooling composition that genuinely spans domains.

It should **not** regain gameplay/presentation responsibilities already owned by a subsystem. New behavior belongs in the existing owner whenever one clearly exists.

## Maintenance rule: the issue chooses the responsibility slice

Broad archaeology is no longer the default workstream.

> **A real bug or feature chooses the coherent responsibility slice. Characterize that slice, clean stale ownership inside it, implement the requested behavior in the canonical owner, and protect it with deterministic/anti-return coverage.**

For a promoted issue:

1. freeze the released behavior that should remain;
2. identify the full coherent responsibility actually touched;
3. inspect that slice for historical wrappers, duplicate paths and misplaced monolith ownership;
4. establish one canonical path through the existing owner/facade;
5. implement the requested change there;
6. remove touched obsolete/shadow ownership;
7. add focused deterministic and anti-return coverage;
8. preserve unrelated RNG/order/save/checkpoint/gameplay behavior;
9. pass repository, Edge/browser and native WebView2 gates.

This is deliberately broader than “change one broken line,” but narrower than “refactor whatever looks old.”

Recent examples:

- 0.6.7.1 battle-background regression -> Combat View presentation slice;
- 0.6.7.2 Heavy Purse -> shared gold/economy policy;
- 0.6.7.3 2d6 hard lock -> complete Road Dice ownership (1d6/2d6/Fate/buttons/keyboard);
- 0.6.7.4 footprints -> Board Movement + Board Presentation traversal ownership;
- 0.6.7.5 Dodge -> generic incoming-combat/Dodge presentation;
- 0.6.7.6 Merchant revisit/rarity -> Merchant interaction + shared equipment-name presentation boundary.

## Anti-shadow acceptance rule

A responsibility is considered drained only when all are true:

1. authoritative implementation lives in the correct subsystem/internal owner;
2. ordinary callers route through that owner/facade or one justified composition adapter;
3. old live monolith implementation/wrapper/patch layers are removed;
4. validation prevents the shadow path from returning.

Thin compatibility aliases may remain only when their caller and reason are explicit.

## Historical-layer census

`docs/HISTORICAL_LAYER_CENSUS.md` remains useful diagnostic/history evidence from the post-owner cleanup era.

A high census score means **inspect**, not “automatically extract.” Old names, predecessor captures and low-reference helpers are not bugs by themselves. Use census evidence when a real issue enters that slice, or when concrete architectural evidence justifies a focused cleanup issue.

## Board and Run ownership

Board/Run behavior is split into focused owners behind `DiceboundRun`, including:

- board registry/generation;
- Board movement and traversal history;
- Board presentation metadata;
- tile dispatch;
- Board transitions;
- fresh-run lifecycle;
- terminal completion;
- canonical Road Dice (`runtime/js/run/dice.js`).

Road Dice owns 1d6/2d6/Fate/roll controls/road-key invocation and movement handoff. Board Movement owns actual road traversal. Do not turn Road Dice into a generic future input subsystem.

## Combat ownership

`DiceboundCombat` owns mechanics/resolution. Focused modules cover attack, strike, Guard, turn, Ultimate, Mana/Occult, healing, Pet turns, targeting, encounter lifecycle, victory/reward and related policies.

`DiceboundCombatView` owns battle presentation/VFX. Presentation may reflect semantic combat facts but must not silently become a second mechanics engine.

When adding animation/art, prefer stable semantic IDs and resolved attacker/target facts rather than parsing display text or adding monster-name DOM hacks in the composition root.

## Items / equipment ownership

`DiceboundItems` is the public Items boundary. Focused modules own equipment identities, generation, rarity policy, loot, Artifact factories, consumables and operations.

`runtime/js/ui/equipment-heirlooms.js` owns player-facing equipment/Heirloom presentation. Shared rarity/name markup should be reused by other UIs such as Merchant rather than reimplemented locally.

New slots or authored item effects must use semantic item/slot/effect identities rather than display-name parsing.

## Progression ownership

`DiceboundProgression` owns progression-facing semantics such as class unlock resolution, achievements/Talents integration and Prestige collaboration.

`runtime/js/progression/prestige.js` owns Prestige currency/purchases/held bonuses. `runtime/js/ui/prestige-moon.js` owns Moon presentation. Future Moon Forge/Echo Crucible work must extend these owners instead of creating a parallel Prestige shop/economy.

## Camp and destination UI

`DiceboundCamp` is the public Camp/App-Shell owner. Focused UI owners handle destinations such as:

- Camp scene;
- Class chooser;
- Pet chooser;
- Achievements/Trophy;
- Info/Guide;
- Options;
- Talent tree;
- Prestige Moon;
- equipment/Heirloom presentation;
- Merchant presentation.

Gameplay state remains authoritative in its domain owner; UI should consume semantic state/actions rather than duplicate rules.

## Assets

Issue #29 established the role/context-based asset architecture.

Examples:

- class campsite/battle/marker contexts are separate;
- ordinary enemies, minibosses, bosses and secret bosses have semantic homes;
- guardian battle art and board markers are distinct roles;
- equipment is organized by slot/context;
- powerups are organized by rarity/shared/class-specific role;
- Camp interactions, mode toggles, Board events, Combat VFX and installer art have their own domains.

Compatibility mirrors exist only where historical runtime pointers still require them. **New assets must not be added to compatibility mirrors.** `runtime/assets/ASSET_INVENTORY.json` and `python tools/validate_asset_architecture.py` are the authority.

## Persistence policy

Current save/checkpoint behavior must not drift accidentally.

Historical Beta-save compatibility is **not automatically required**. Old Beta saves are disposable unless Axel explicitly requests compatibility for a change. That does not mean current-schema persistence can be broken: current save, checkpoint, backup, resume and recovery semantics remain release contracts.

## Determinism / behavior preservation

Unless the active issue deliberately changes behavior, preserve:

- exact gameplay values;
- RNG draw count/order/final state;
- action/event ordering;
- target and rounding semantics;
- current save/checkpoint behavior;
- class/Pet/powerup/unlock/mode rules;
- accepted player-facing behavior.

Never weaken deterministic/browser/native/release tests simply to make a change green.

## Version / build identity

Runtime identity is centralized through `runtime/js/version.js` and project metadata. Content-derived build metadata is generated/validated; stale release hashes must never be copied forward after source changes.

For runtime-bearing changes, use a new unique four-component Beta version and the release workflow described in `docs/RELEASE_PROCESS.md`.

## Native wrapper

The primary desktop target is the Windows WebView2 wrapper. CI stages Microsoft's official signed x64 `WebView2Loader.dll`, builds the native release and validates it before publication.

The browser build remains a first-class secondary target and GitHub Pages is useful for direct browser/mobile playtesting.

## Related durable references

- #84 — START HERE / exact released checkpoint
- #130 — executable player-facing queue
- #40 — architecture umbrella/contract
- #209 — live subsystem census
- `docs/DEVELOPMENT.md` — development rules
- `docs/RELEASE_PROCESS.md` — release pipeline
- `docs/DESIGN_RULES.md` — UI/design constraints
