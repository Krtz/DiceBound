# Powerup Art Mapping

This document records the first generated powerup-art batch introduced after the Beta 0.6 recovery.

The runtime files live in `runtime/assets/ui/powerups/`. `runtime/js/assets.js` owns the asset paths and preloading; `runtime/js/dicebound.js` maps powerup names to the corresponding asset keys.

| Powerup(s) | Asset |
|---|---|
| Second Wind | `powerup-second-wind.png` |
| Field Alchemy | `powerup-field-alchemy.png` |
| Sharper Blade / Sharpened Steel | `powerup-sharper-blade.png` |
| Strong Brew / Quick Brew | `powerup-strong-brew.png` |
| Tempered Guard / Runic Ward | `powerup-tempered-guard.png` |
| Stout Heart | `powerup-stout-heart.png` |
| Spiked Armor | `powerup-spiked-armor.png` |
| Barbed Armor | `powerup-barbed-armor.png` |
| Faint Echo | `powerup-faint-echo.png` |
| Monster Notes | `powerup-monster-notes.png` |
| Lucky Pebble | `powerup-lucky-pebble.png` |
| Heavy Purse | `powerup-heavy-purse-worn.png` |
| Field Surgeon | `powerup-field-surgeon.png` |
| Executioner | `powerup-executioner.png` |
| Walking Fortress | `powerup-walking-fortress.png` |
| Worldheart | `powerup-worldheart.png` |
| Phoenix Feather | `powerup-phoenix-feather.png` |
| Fortune Broker | `powerup-fortune-broker.png` |
| Treasure Sense+ / Treasure Sense++ | `powerup-treasure-sense.png` |
| Scholar's Sigil / + / ++ | `powerup-scholars-sigil.png` |

The integration workflow validates that every registered `uiPowerups` path resolves to a real file and runs `node --check` against both modified JavaScript files before committing the runtime changes.
