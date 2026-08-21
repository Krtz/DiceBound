# DiceBound equipment-base design catalogue

This folder is the working design source for issue #83.

Every `## Item Name` entry is a proposed **equipment base identity**. The values here are design candidates until Axel reviews that specific item, especially before art is commissioned or runtime implementation begins.

Axel's reviewed/edited entry always wins over an older first-pass suggestion.

## Catalogue structure

The normal slot files (`weapon.md`, `offhand.md`, `chest.md`, `boots.md`, `legs.md`, `hat.md`, `ring.md`, `amulet.md`) contain the main first-pass equipment-base catalogue.

`source-inspired-loot-expansion.md` is an additional **large candidate pool** inspired by recognizable RuneScape material/equipment progression and Diablo II's dense mundane base-item vocabulary. Entries there count as geartodo candidates, but are deliberately easier to browse as a separate expansion list instead of making every slot file enormous. When one is selected for art/runtime work, review its exact identity first and copy/refine it into the normal slot file if useful.

`runescape-weapon-expansion.md` is the **expanded RuneScape weapon catalogue**. It adds the weapon breadth missing from the first pass: full melee weapon forms, shortbow/shieldbow/composite-bow ladders, crossbow and 2H-crossbow ladders, thrown weapons, elemental/battle/mystic/limitless staves, wands, magic books/orbs, Necromancy siphon/conduit ideas, and an iconic high-tier reference pool.

`runescape-quest-fun-oddity-weapons.md` is deliberately **uncurated**. Quest weapons, joke weapons, holiday rewards, props, toys, obsolete/discontinued weapons, weird wieldable tools, banners, trophies and other nonsense all belong there even if we never implement most of them. It is an inspiration museum, not a shipping list.

Some source-inspired names are prototype/reference language. Generic historical/fantasy terms can remain where appropriate; anything that feels too specifically tied to another IP should be renamed/originalized under #93 before a public/commercial release.

## Fields

### `family`
Broad form/category shared with related equipment, using lowercase hyphenated names where useful.

Examples: `full-plate`, `t-shirt`, `longbow`, `shield`, `bloodbound`.

### `material`
Physical/magical construction where useful. Empty is allowed.

### `weight`
`light`, `medium`, `heavy`, `very-heavy`, or empty where the concept does not need a weight classification.

### `tags`
Additional lowercase semantic/theme tags. Multiword tags use hyphens.

A `cool` tag is only a semantic/theme tag. It does **not** grant the Cool stat.

### `eligibility`
Minimum ordinary rarity or other entry condition. `rare+` means Rare and higher ordinary rarity.

Special Artifact/Omega/set generation is conceptually separate from the base and may use a broader base pool; see `docs/GAMEPLAY_VOCABULARY.md`.

### `intrinsic`
Guaranteed mechanics belonging to this base identity, outside the ordinary rolled-affix/stat point budget.

Use the numeric conventions in `docs/GAMEPLAY_VOCABULARY.md`:
- `+5 Attack` = flat Attack;
- `+5% Attack` = percentage Attack;
- `+2% Dodge`, `+1% Crit`, `+3% Echo` = percentage-point chance additions;
- `+1% Metal proc chance` = percentage-point elemental proc chance;
- `+2 Thorns` = two flat retaliatory damage;
- `+100 Cool` = the special Cool stat, reserved for explicitly special gear rather than ordinary equipment bases.

## Design rules

- All classes can equip all otherwise-valid gear. Gear does not need to be useful to every class.
- Mana on a non-Mana class simply does nothing.
- Different art identities may have identical Intrinsics.
- Some visual families deliberately share mechanics; studded/barbed/spiked equipment is a natural place for Thorns.
- **Cool is a very special stat. Do not grant Cool to normal gear. Jean Jacket is currently the only equipment base allowed to have a Cool intrinsic.**
- Bases are intentionally **not equally strong**. This creates a late-game chase for better bases under the same desirable Artifact/set effect and rolled affixes.
- Do not normalize every base into the same hidden point budget.
- These first-pass values are allowed to be uneven. Review and real playtesting happen later.
- Empty metadata fields are fine if no useful value exists.

## Art workflow

Before requesting art for a specific item, review/update that item's entry here. The current entry at art-request time becomes the intended design direction for that equipment identity.
