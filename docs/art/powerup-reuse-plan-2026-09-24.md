# Powerup artwork reuse assessment — 2026-09-24

Compared Poor/Common/Uncommon effects and themes on origin/main d3c4958. Recommendations only: no runtime mappings changed. Preserve existing approved art; sharing does not require deleting distinct images already available. Names, rarity labels and descriptions remain essential to distinguish strength.

## Recommended additional Common reuse
| Common | Existing image | Reason |
| --- | --- | --- |
| Echoing Strike | runtime/assets/powerups/poor/faint-echo.png | Same generic Echo-chance family. |
| Long Stride | runtime/assets/powerups/shared/folded-road-map.png | Same extra-travel-tile mechanic; route imagery works for both. |
| Venom Edge | runtime/assets/powerups/shared/cheap-venom.png | Same poison-on-hit chance family; poison vial reads as weapon coating. |

Imported paths and source packs are recorded in import-2026-09-24.json.

## Other suitable families
- Sharper Blade / Sharpened Steel / Roadforged Edge: share sharper-blade.png for flat Attack.
- Toughness / Stout Heart / Giant Constitution: heart artwork is appropriate across max-HP upgrades; keep both existing heart designs, use stout-heart.png for Giant Constitution.
- Iron Skin / Tempered Guard / Roadplate: defensive family can share; prefer tempered-guard.png for Roadplate because the material/armour theme fits. Keep existing Iron Skin art.
- Treasure Sense / Treasure Sense+ / Treasure Sense++: existing shared treasure-sense.png. Ensure base Poor name is mapped too.
- Scholar's Sigil and its +/++ tiers: existing shared scholars-sigil.png.
- Faint Echo / Echoing Strike / Double Vision: same generic echo-family art is suitable; Double Vision's extra damage remains explicit in text.
- Keen Eye / Predatory Focus: new hawk-eye art can serve both generic critical-chance upgrades. Keep Cracked Scope distinct: its damaged physical object is meaningful.
- Weak Tonic / Strong Brew / Field Surgeon: a shared potion-healing motif is acceptable, but all have artwork already; retain them. Field Alchemy grants a potion rather than improving healing, so keep its icon distinct.
- Spiked Armor / Barbed Armor: same retaliation family can share, but preserve existing separate files.
- Pain Is Fuel / Blood Roar: future shared berserker rage artwork could serve both Attack/low-health damage upgrades.
- Arcane Resonance / Mana Fracture: future shared arcane-fracture/surge motif is suitable, with secondary elemental bonus conveyed in text.
- Open Palm Rhythm / Afterimage Kata: future shared monk afterimage-hand motif fits Echo/Dodge bonuses.
- Prism Lens / Elemental Relay: future shared prism motif fits elemental activation/power.

## Keep separate
- Scarlet Combustion vs Volcanic Temper: both Fireball activation, but painter vs berserker identity.
- Storm Kata vs Storm Croak vs Lightning Step: monk/frog/ninja identity should remain visually obvious.
- Void Channel vs Night's Hunger: caster channel vs vampire hunger.
- Glacial Shell vs generic ice: turtle-specific silhouette matters.
- Loaded Fate vs Obviously Loaded Dice: Luck gain is not choosing a movement roll; distinct icons avoid implying the same mechanic.
- Resolute Guard / Flowing Guard / Arcane Meditation / Benediction: different class actions and healing/charge triggers.
- Crimson Primer / Carmine Veins / Leeching Fang: keep painter tools distinct from blood anatomy and vampire fang even where Lifesteal overlaps.
- Verdant Arrowheads / Thorn Volley / Thorn Venom: may share visual vocabulary, but distinct bonuses/proc types merit derivatives rather than automatic identical images.
- Automated Workforce / Open All Hours / Deeper Circle / Orb Theory retain technology, coffee, summoning and orb identities.
- All other entries retain distinct identities unless a later art review establishes a clear compatible family. Do not share merely because one stat overlaps.

## New files in this pack
- keen-eye: keen-eye.png
- loaded-fate: loaded-fate.png
- merchants-friend: merchants-friend.png
- pocket-confetti: pocket-confetti.png
- crimson-primer: crimson-primer.png
- scarlet-combustion: scarlet-combustion.png
- glacial-shell: glacial-shell.png
- orb-theory: orb-theory.png

## Common coverage accounting
36 total Common definitions. Previously 9 had runtime artwork mappings.
3 additional Common reuse recommendations + 8 new artworks = 20 with an art plan/source, leaving 16 needing art:
Resolute Guard; Arcane Meditation; Flowing Guard; Pain Is Fuel; Iron Resonance; Verdant Arrowheads; Void Channel; Storm Kata; Volcanic Temper; Storm Croak; Night's Hunger; Lightning Step; Automated Workforce; Open All Hours; Benediction; Deeper Circle.

This is artwork availability/planning coverage, not shipped runtime coverage. New PNGs and reuse mappings still need integration and real-size UI checks. Built-in ImageGen used; original prompts remain in the local art-inbox source packs.

