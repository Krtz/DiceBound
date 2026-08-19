# Asset Architecture Migration — Issue #29

## Why this exists

The recovered Beta 0.6 runtime grew organically across folders such as `ui/icons`, `ui/class-art`, `class-markers`, `enemies/portraits`, `camp/objects` and `pets/portraits`. Those paths described *where an image happened to be used* more often than *what the asset actually was*. That made replacement art error-prone and gave future categories such as Gloves, Random Class or a Hell demon no obvious home.

Issue #29 establishes a semantic source of truth under `runtime/assets/`.

## Canonical ownership

- `characters/classes/{campsite,battle,markers}` — class-specific presentation by context.
- `characters/pets/portraits` — current companion portraits; `markers/` is reserved separately.
- `characters/random-class/` — dedicated future Random Class art (#18).
- `enemies/normal/` — normal-enemy battle/marker art.
- `enemies/minibosses/` — miniboss battle/marker art.
- `enemies/bosses/` — final-boss battle/marker art.
- `enemies/secret-bosses/` — secret-boss battle/marker art.
- `equipment/<slot>/` — equipment art by slot, including `gloves/` before #28 is implemented.
- `powerups/<rarity>/` — rarity-owned powerup art; `shared/` is for deliberate multi-tier families and `class-specific/` for class-only art.
- `camp/` — campsite background, interactions, decorations and mode-toggle art.
- `board/` — board backgrounds, events/locations/generic tile art and board effects.
- `combat/` — combat-only effects, statuses and UI.
- `ui/` — cross-system application UI only.
- `installer/` — launcher/installer icons and future splash art (#23).
- `audio/` — packaged music/SFX and optional custom override location.

The detailed naming/folder rules live in `runtime/assets/README.md`; the machine-readable current inventory lives in `runtime/assets/ASSET_INVENTORY.json`.

## Future/placeholder homes created now

The migration deliberately creates tracked homes even when no final image exists. README files describe current fallback behavior and expected naming. Known examples include:

- Random Class campsite and marker art (#18).
- Hell demon states (#20).
- Gloves (#28).
- Missing/duplicate equipment and character art (#13).
- Dedicated miniboss/boss/secret-boss board markers.
- Combat status icons.
- Board location/generic tile art.
- Installer/launcher splash art (#23).
- Remaining powerups that still use emoji/text fallback.

## Compatibility mirrors

The ideal end state contains only semantic asset paths. The recovered Beta 0.6 `dicebound.js`, however, is still a ~1.38 MB monolith with direct/fallback path strings embedded in historical layers. Deleting every old path immediately would violate the more important #29 requirement: **every current pointer must continue to resolve**.

For that reason, these old roots remain as read-only mirrors:

- `assets/enemies/portraits/`
- `assets/camp/backgrounds/`
- `assets/camp/objects/`
- `assets/pets/portraits/`
- `assets/ui/backgrounds/`
- `assets/ui/class-art/`
- `assets/ui/class-markers/`
- `assets/ui/icon/`
- `assets/ui/icons/`
- `assets/sounds/`

They are compatibility infrastructure, not asset ownership. **Never add new artwork there.** New/replacement art belongs only in the semantic tree and should be mapped through `runtime/js/assets.js`.

A later cleanup can remove each mirror after the old monolith fallback is extracted/refactored. Keeping that work separate makes #29 behavior-preserving rather than a risky gameplay-bundle rewrite disguised as a folder rename.

## Powerup art bridge

Powerup definitions are closure-owned inside the recovered monolith. `runtime/js/assets.js` therefore owns a small rendered-choice bridge: known powerup names map to canonical registry keys and their `.choice-icon` nodes are decorated from the semantic asset registry. This allows current and future art changes to stay outside the monolith while preserving gameplay behavior.

The current mapping covers 28 rendered names/tiers with 22 canonical art assets. Related tiers intentionally share art where appropriate.

## Build metadata

The exact shipped Beta 0.6 `build-info.json` and `build-manifest.json` are archived under `docs/releases/beta-0.6/`.

Current Git development is marked `Unreleased` and intentionally has no copied/stale Beta 0.6 payload hash. Before packaging:

```text
python tools/validate_asset_architecture.py
python tools/refresh_runtime_manifest.py
python tools/validate_asset_architecture.py
```

The refresh step materializes a content-derived build identity from the complete checkout.

## Validation contract

`tools/validate_asset_architecture.py` checks:

- JavaScript syntax for `assets.js` and `dicebound.js`.
- Asset registry version and expected family counts.
- Every registry/preload path exists and is non-empty.
- 25 class images in each of campsite/battle/marker contexts.
- 13 pet portraits.
- 3 normal enemy, 6 miniboss, 6 boss and 3 secret-boss battle images.
- all six board backgrounds.
- 22 canonical powerup art entries and 28 rendered-name mappings.
- every implemented/placeholder path recorded in `ASSET_INVENTORY.json`.
- every known direct historical asset literal in `dicebound.js` is classified and concrete file pointers still resolve.
- all ten compatibility roots physically exist.
- known future art homes exist.
- Unreleased versus materialized build-metadata consistency.

## Visual testing limitation

The migration's static/reference audit can be run deterministically. A real visual/native smoke test should still inspect Campsite, board, combat, equipment and powerup choices on a supported desktop environment. The development sandbox used while preparing #29 could not honestly complete a headless Chromium local-runtime visual test, so no visual pass is claimed from that environment.
