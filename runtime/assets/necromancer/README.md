# Necromancer art pack — issue #473

Source: https://github.com/Krtz/DiceBound/issues/473

23 finished transparent PNG assets: all 9 required and all 14 named recommended/optional assets. Created on a dedicated branch from main at 7a5e77d. No gameplay wiring or existing asset replacements.

## Required (9)
- `player-necromancer.png`
- `class-necromancer.png`
- `summon-skeleton-warrior.png`
- `icon-grave-coil.png`
- `icon-summon-skeleton.png`
- `icon-army-of-the-dead.png`
- `effect-bone-shrapnel.png`
- `summon-spectral-skeleton.png`
- `icon-grave-count.png`

## Recommended / optional (14)
- `summon-skeleton-mage.png`
- `summon-skeleton-guardian.png`
- `summon-skeleton-rogue.png`
- `summon-skeleton-archer.png`
- `summon-skeleton-priest.png`
- `effect-necromancy-cast.png`
- `effect-summon-circle.png`
- `effect-grave-burst.png`
- `effect-soul-burst.png`
- `effect-undead-death-burst.png`
- `player-necromancer-cast.png`
- `portrait-necromancer.png`
- `portrait-necromancer-closeup.png`
- `class-necromancer-icon.png`

## Direction and technical handoff
- Right-facing player-side battle silhouettes; ivory bones, violet eyes, plum cloth and maintained silver equipment distinguish allied summons from the enemy Skeleton family.
- Original 1254 x 1254 PNG exports retained without alpha-destructive conversion. Transparent backgrounds and antialiased alpha verified; see inventory.json for dimensions, sampled alpha and SHA-256.
- No baked text, UI, scene backgrounds, or animation sheets.
- Reviewed against existing DiceBound class and enemy artwork. Runtime integration and in-game verification belong to the gameplay branch.
- All assets explicitly named in issue #473 are present; none remain missing.

## Generation provenance
Generated with the built-in ImageGen tool. required-prompts.json and optional-prompts.json preserve per-asset subjects and original output locations; STYLE.txt contains the shared style suffix.
Required prompt: "Create finished game asset {slug}. {subject} {STYLE}"
Optional prompt: "Create a separate finished game asset {slug}. {reference instruction when used} {subject} {STYLE}"
Reference instruction: "Use reference only for matching character identity, palette and rendering; change role or pose as described."
Optional summons referenced summon-skeleton-warrior.png. Optional Necromancer pose/portraits/class icon referenced player-necromancer.png. VFX had no image reference.

