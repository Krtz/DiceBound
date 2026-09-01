# DiceBound Architecture

This document describes the Git-era source layout beginning with the recovered Beta 0.6 baseline.

## Source of truth

- Current game payload: `runtime/`
- Runtime asset registry: `runtime/js/assets.js`
- Runtime art taxonomy/inventory: `runtime/assets/README.md` and `runtime/assets/ASSET_INVENTORY.json`
- Windows packaging/build source: `wrapper-source/`
- Lightweight installer/launcher source: `installer/`
- Immutable historical release evidence: `docs/releases/<version>/`

Generated EXEs, browser ZIPs, release bundles, runtime caches and user saves are outputs/data, not development source, and should not be committed to `main`.

## Runtime

```text
runtime/
├─ index.html
├─ css/
├─ js/
│  ├─ assets.js              authoritative current asset registry
│  └─ dicebound.js           recovered main game bundle
├─ assets/
│  ├─ characters/
│  ├─ enemies/
│  ├─ equipment/
│  ├─ powerups/
│  ├─ camp/
│  ├─ board/
│  ├─ combat/
│  ├─ ui/
│  ├─ installer/
│  └─ audio/
├─ build-info.json
├─ build-manifest.json
├─ PATCH_NOTES.md
└─ TODO.md
```

### Asset ownership

Issue #29 established a role/context-based asset architecture. Art is no longer conceptually owned by a generic `ui/icons` bucket merely because it is drawn inside UI.

Examples:
- class campsite/battle/marker images have separate contexts;
- normal enemies, minibosses, bosses and secret bosses have separate homes;
- guardian battle art and future board-marker art are distinct roles;
- equipment is organized by slot, including the future special-only `gloves/` slot;
- powerups are organized by rarity/shared/class-specific role;
- camp interactions, mode toggles, board events and installer art have their own domains.

Future/unimplemented contexts are represented by tracked README files that describe expected filenames and current fallbacks. This prevents new artwork from recreating ambiguous catch-all directories.

### Compatibility mirrors

The recovered Beta 0.6 `dicebound.js` remains a large monolith and still contains some direct/fallback historical asset path strings. To preserve the requirement that every existing pointer remains valid, those old path families are retained as **read-only compatibility mirrors** while `assets.js` points current runtime ownership at the granular semantic paths.

The mirrors and canonical destinations are enumerated in `runtime/assets/ASSET_INVENTORY.json`. New artwork must never be added to a compatibility mirror. A later monolith-extraction cleanup can remove each mirror once its old fallback strings are eliminated.

### Asset validation

Run:

```text
python tools/validate_asset_architecture.py
```

The audit syntax-checks the core JavaScript, loads/evaluates the asset registry, checks expected class/pet/enemy/powerup families, verifies every registry/preload target exists, validates placeholder homes, classifies historical monolith literals, and confirms compatibility mirrors keep those literals resolvable.

### Combat presentation ownership

`runtime/js/combat/vfx.js` is the authoritative owner for authored combat-effect DOM presentation. It resolves the canonical Nature Poison Vines frame sequence and Donut Rain overlay, manages their bounded DOM lifetime, and scopes suppression of Nature's retired generic burst to the real authored Nature proc. The compatibility monolith supplies only live combat-local accessors and installs the existing post-resolution hooks; combat mechanics retain targets, damage, turns and RNG ownership.

### Camp presentation ownership

`runtime/js/ui/camp.js` is the authoritative Camp presentation owner. It builds the semantic Camp scene, owns its desktop stage and mobile/grid fallback styles, renders current class/pet/progression presentation supplied by live domain owners, and owns the complete authored 16:9 stage: the wide/compact/short-wide anchor table, stage fitting, object art, and painted-object hit targets. Progression decides whether Trophy/Talent/Prestige have been earned; Camp alone creates/removes their semantic controls and bindings. The compatibility monolith supplies a narrow configured view model and action callbacks only; it retains class, pet, progression, save, mode and gameplay ownership. `events/reward-policy.js` and the shared stylesheet have no Camp layout role. New Camp placement or art work belongs in `ui/camp.js`, not in another late monolith style patch.

### Class chooser presentation ownership

`runtime/js/ui/class-chooser.js` is the authoritative Class destination opened from Camp. It owns roster/detail rendering, locked-but-safe inspection, semantic class artwork, Random selection state and the persistent top-right Done control. The canonical class registry, unlock policy, selected-class persistence and RNG remain in their existing domain owners and are supplied through a narrow configuration contract. `dicebound.js` retains only the `renderClassChoices()` lifecycle forwarding adapter for existing start/unlock/prestige callers plus the `startNewGame()` composition hook that asks the chooser to resolve Random exactly once; it no longer owns a Class grid, card styling or historical chooser wrapper chain.

### Pet chooser presentation ownership

`runtime/js/ui/pet-chooser.js` is the authoritative Companion destination. It owns the responsive roster surface, semantic pet portrait presentation, locked/current state copy, cookie-feeding controls when outside a run, and the persistent top-right Done control. The pet registry, unlock/bond state, switching restrictions, saves, pet damage and combat bonuses remain authoritative in their existing runtime domains and are supplied through a narrow configuration contract. `dicebound.js` retains only a `renderPetCollection()` lifecycle forwarding adapter for legacy callers; the old chooser override chain, Camp-only duplicate chooser and mutation-observer art patch are removed.

### Achievements / Trophy presentation ownership

`runtime/js/ui/achievements.js` is the authoritative Trophy destination. It owns the responsive hierarchy surface, group and hero-mastery card composition, secret-safe presentation, persisted group disclosure, scrolling and the persistent top-right Done control. `runtime/js/progression/achievements.js` remains the semantic achievement-registry owner; completion rules, class/powerup eligibility, save state, progression and rewards stay in existing domain owners and enter the UI through a narrow configured contract. `dicebound.js` retains only `renderAchievements()` as a lifecycle forwarding adapter plus the state/milestone callbacks required by the UI; the historical popup markup, card/group styles and renderer/patch chain are retired.

### Info / Roadkeeper's Guide presentation ownership

`runtime/js/ui/info-guide.js` is the authoritative Info destination. It owns the responsive Guide, Stats, Elements and Save surface; player-facing guide composition; current class/element presentation; lifetime-stat and Artifact-set rendering; save-transfer controls; scrolling; and persistent top-right Done chrome. Rules, class unlocks, runtime counters, effective Gold calculation, Artifact data and import/export mechanics remain in their existing owners and enter the UI through narrow callbacks. `dicebound.js` retains only forwarding adapters plus the save/state callbacks; static popup markup, shared Info CSS, direct listeners and the superseded final renderer layers are retired.

### Equipment / Heirloom presentation ownership

`runtime/js/ui/equipment-heirlooms.js` is the authoritative player-facing equipment and Heirloom presentation owner. It renders the HUD equipment grid, semantic authored-equipment art, loot card, Impossible Road set card, Camp chest Heirloom summary/storage, and end-of-run binding/storage surfaces. The equipment identity registry, ordinary point budget, rarity rules, generated item factories, Artifact policy, storage capacity, save persistence, item transactions and combat effects remain in their existing domain owners. `dicebound.js` supplies narrow state/action callbacks and only forwards the historical `renderEquipment()`, `openLoot()` and `renderEndGear()` lifecycle entry points; superseded renderer/wrapper/style chains are retired rather than left active underneath the new owner.

### Options / settings presentation ownership

`runtime/js/ui/options.js` is the authoritative Options destination and top-action owner. It renders the responsive options surface, audio controls, native save-folder affordance, permanent-progress reset entry point, and persistent top-right Done chrome. Audio state, volume/sound-pack persistence, native platform integration, reset confirmation and save mechanics remain in their existing runtime/domain owners and enter the surface through narrow callbacks. `dicebound.js` retains only those callbacks, the semantic Camp Options adapter and refresh forwarding; the legacy overlay renderer, direct listeners and options styles are retired rather than left active under the new owner.

### Talent constellation presentation ownership

`runtime/js/ui/talent-tree.js` is the authoritative Talent destination. It owns the full-screen constellation surface, authored node/connector geometry, responsive HUD and persistent top-right Done control, Fit Tree, cursor-focused wheel zoom and drag-to-pan behavior. The Talent registry, ranks, prerequisites, purchase rules, Prestige calculations, save state and gameplay effects remain in their existing progression/runtime owners and are supplied through a narrow configuration contract. `dicebound.js` retains only the documented `renderTalents()`, `openTalentTree()` and `closeTalentTree()` lifecycle adapters plus the domain purchase callback; the historical radial renderers, fixed-layout patches, zoom handlers and shared Talent CSS are removed.

### Prestige Moon ownership

`runtime/js/progression/prestige.js` is the authoritative non-UI owner for Prestige currency normalization, earned/spent/unspent accounting, persisted five-random-stat bundles, derived held-currency bonuses, permanent totals and the free Refund All transaction. `runtime/js/ui/prestige-moon.js` is the authoritative full-screen Moon presentation owner: it renders the lunar destination, the live held-bonus tooltip, data-driven upgrade nodes and persistent top-right Back chrome. The compatibility monolith retains only a Camp-opening lifecycle adapter plus the existing reset composition callback, persistence and injected RNG source. The Moon Forge is deliberately represented as a semantic cost-TBD node until a real balance value is approved; no hidden magic cost exists in UI code.

## Build identity

The exact shipped Beta 0.6 build identity is preserved under `docs/releases/beta-0.6/`.

Current Git development is explicitly marked `Unreleased` and intentionally carries no fake/stale release hash. Before packaging a development tree, run:

```text
python tools/refresh_runtime_manifest.py
python tools/validate_asset_architecture.py
```

The refresh tool materializes content-derived build counts/hashes from the complete checked-out runtime. Do not copy old Beta 0.6 hashes forward after source changes.

## Native wrapper

```text
wrapper-source/
├─ assets/
├─ config/project.json
├─ launcher/windows/
├─ tools/build_launcher.py
├─ vendor/webview2/
└─ wrappers/webview2/native-go/
```

The primary desktop target is the native Windows WebView2 wrapper. The browser build is a secondary direct-launch target.

To recreate a native development payload, validate/materialize `runtime/`, copy it to `wrapper-source/dist/browser/`, then run:

```text
python wrapper-source/tools/build_launcher.py
```

The recovered Beta 0.6 package did not vendor Microsoft's signed x64 `WebView2Loader.dll`; production/signing work is tracked separately.

## Saves and runtime data

User saves belong under `%LOCALAPPDATA%\Dicebound\saves` in the native application. Disposable frontend/WebView2 cache data belongs under the runtime-cache area. Neither belongs in Git.

Save schema changes are migrations. Never silently invalidate existing career/progression data without an explicit migration or an intentional documented reset.

## Development direction

The repository still contains a recovered monolithic game bundle. Refactors should remain incremental and behavior-preserving. Move ownership outward into explicit registries/modules with deterministic validation rather than rewriting gameplay merely to make the tree prettier.
