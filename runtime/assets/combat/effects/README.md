# Combat effect artwork

Canonical authored combat-proc artwork lives under one semantic folder per element.

## Folder contract

- Each elemental proc owns `runtime/assets/combat/effects/<element>/`.
- Do not add new proc PNGs loose at the `effects/` root.
- Runtime paths are registered centrally in `runtime/js/assets.js`; gameplay/VFX code consumes those semantic entries rather than hard-coded file paths.
- Artwork may be staged before its proc renderer is implemented, but staged art must be identified as such in `ASSET_INVENTORY.json`.

## Nature: Poison Vines — implemented

Nature uses eight transparent frames under `nature/`:

1. `nature/nature-poison-vines-01.png`
2. `nature/nature-poison-vines-02.png`
3. `nature/nature-poison-vines-03.png`
4. `nature/nature-poison-vines-04.png`
5. `nature/nature-poison-vines-05.png`
6. `nature/nature-poison-vines-06.png`
7. `nature/nature-poison-vines-07.png`
8. `nature/nature-poison-vines-08.png`

Runtime sequencing is owned by `runtime/js/combat/vfx.js`.

## Donut: Healing Rain of Donuts — implemented

Donut uses `donut/donut-proc-rain-spritesheet.png`. Runtime animation crops the authored spritesheet into falling donut particles.

## Gun — artwork staged, implementation pending

The approved no-arm Gun proc pack is staged under `gun/` for the future Gun element VFX implementation. The rejected arm variants are intentionally not present in the runtime repository.

The staged sequence is: gun appears at the attacker -> muzzle flash/smoke -> tracer/bullet travel -> casing -> target impact -> small blood splat.
