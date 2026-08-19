# Powerup Art Mapping

This document records the first repository-owned powerup-art batch introduced after the Beta 0.6 recovery and its canonical post-#29 locations.

`runtime/js/assets.js` owns the current paths and rendered-choice mapping. Powerup art now lives under `runtime/assets/powerups/` by rarity/role rather than in generic UI folders.

| Powerup(s) | Canonical asset |
|---|---|
| Second Wind | `powerups/poor/second-wind.png` |
| Field Alchemy | `powerups/poor/field-alchemy.png` |
| Sharper Blade / Sharpened Steel | `powerups/poor/sharper-blade.png` |
| Faint Echo | `powerups/poor/faint-echo.png` |
| Monster Notes | `powerups/poor/monster-notes.png` |
| Lucky Pebble | `powerups/poor/lucky-pebble.png` |
| Heavy Purse | `powerups/poor/heavy-purse.png` |
| Spiked Armor | `powerups/poor/spiked-armor.png` |
| Quickdraw | `powerups/common/quickdraw.png` |
| Strong Brew / Quick Brew | `powerups/common/strong-brew.png` |
| Tempered Guard / Runic Ward | `powerups/common/tempered-guard.png` |
| Stout Heart | `powerups/common/stout-heart.png` |
| Barbed Armor | `powerups/common/barbed-armor.png` |
| Field Surgeon | `powerups/uncommon/field-surgeon.png` |
| Fortune Broker | `powerups/uncommon/fortune-broker.png` |
| Glass Needle | `powerups/rare/glass-needle.png` |
| Walking Fortress | `powerups/rare/walking-fortress.png` |
| Executioner | `powerups/epic/executioner.png` |
| Phoenix Feather | `powerups/epic/phoenix-feather.png` |
| Worldheart | `powerups/legendary/worldheart.png` |
| Treasure Sense+ / Treasure Sense++ | `powerups/shared/treasure-sense.png` |
| Scholar's Sigil / + / ++ | `powerups/shared/scholars-sigil.png` |

The earlier Beta-era Heavy Purse artwork is retained under `powerups/_legacy/` for provenance but is not returned by a live resolver.

Powerups without repository-owned artwork still use the runtime's emoji/text fallback. Their future home is documented in `runtime/assets/powerups/placeholders/README.md`; class-only art belongs in `powerups/class-specific/`.

Run `python tools/validate_asset_architecture.py` to verify that every canonical registry target and every rendered-name mapping resolves.
