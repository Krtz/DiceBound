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
