# DiceBound runtime asset architecture

This directory is organized by **gameplay role and rendering context**, not by file format. New artwork should have one obvious home. `runtime/js/assets.js` is the authoritative runtime registry for implemented art; `ASSET_INVENTORY.json` is the machine-readable inventory companion.

## Rules

1. Put a character/entity in the folder for its role (`classes`, `pets`, `normal`, `minibosses`, `bosses`, `secret-bosses`).
2. Keep visual contexts separate: `battle`, `campsite`, `markers`/`board-markers`. If one image is temporarily shared, the registry documents that reuse; the folder taxonomy still preserves the future destination.
3. Equipment is organized by slot. `equipment/gloves/` exists now for the special-only slot planned in #28 even though no glove item exists yet.
4. Powerups go by current runtime rarity. Multi-tier families that deliberately share one image live in `powerups/shared/`; class-locked art belongs in `powerups/class-specific/`.
5. Camp interactions are not generic UI art. Board event art is not generic UI art. Enemies do not live under UI merely because they appear in a card.
6. Empty/future categories stay tracked through README files explaining the current fallback and expected filenames.
7. **Do not add new art to any compatibility mirror.** New/current artwork goes only into the semantic hierarchy below.
8. Any asset move must run `python tools/validate_asset_architecture.py` plus JavaScript syntax validation before merge.

## Canonical top-level map

- `characters/` — class campsite/battle/marker art; pet portraits/markers; Random Class future art.
- `enemies/` — normal enemies, minibosses, final bosses and secret bosses, each separated by rendering context.
- `equipment/` — item art by slot plus sets/special/placeholder documentation.
- `powerups/` — powerup art by rarity, shared tier families and class-specific art.
- `camp/` — campsite background, interactions, mode toggles and decorations.
- `board/` — road backgrounds, tile/event/location art and board effects.
- `combat/` — combat-only effects, statuses and UI.
- `ui/` — genuinely cross-system application UI only.
- `installer/` — launcher/installer icons, splash art and future presentation assets.
- `audio/` — music, packaged SFX and optional custom overrides.

## Read-only recovered-runtime compatibility mirrors

The recovered Beta 0.6 gameplay bundle is still a large monolith and contains historical fallback/direct strings. To satisfy the rule that **every existing asset pointer continues to resolve**, these old path families are kept as read-only mirrors while all authoritative registry mappings point at the semantic folders:

- `enemies/portraits/`
- `camp/backgrounds/`
- `camp/objects/`
- `pets/portraits/`
- `ui/backgrounds/`
- `ui/class-art/`
- `ui/class-markers/`
- `ui/icon/`
- `ui/icons/`
- `sounds/`

They are compatibility infrastructure, **not places to add art**. `ASSET_INVENTORY.json` records each mirror and its canonical destination. A later monolith-extraction cleanup can remove them once the corresponding fallback strings no longer exist.

Historical Beta 0.6 release records under `docs/releases/beta-0.6/` describe the original packaged layout and are intentionally not rewritten to pretend this architecture existed in that release.
