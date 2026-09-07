# DiceBound equipment-base design catalogue

This folder is the working design source for issue #83.

Every `## Item Name` entry is a proposed **equipment base identity**. The values here are design candidates until Axel reviews that specific item, especially before art is commissioned or runtime implementation begins.

Axel's reviewed/edited entry always wins over an older first-pass suggestion.

## Catalogue structure

The slot files are now the **single pending-candidate source of truth**:

- `weapon.md` — every pending Weapon reference/candidate in one editable list;
- `offhand.md` — every pending Offhand reference/candidate, including shields, defenders, books, caster focuses/sources, mojos/phylacteries and quivers where they function as the secondary equipment identity;
- `chest.md`, `boots.md`, `legs.md`, `hat.md`, `ring.md`, `amulet.md` — the corresponding pending slot catalogues;
- `gloves.md`, `belt.md`, and `back.md` — preserved future-slot/backburner candidates only; these files do **not** mean those runtime slots are approved;
- `back.md` specifically owns capes, cloaks, wings, backpacks, back banners, trophy rigs and other rear-worn/back-mounted equipment concepts;
- `created-gear.md` — gear whose first modular art asset already exists.

The former `source-inspired-loot-expansion.md`, `runescape-weapon-expansion.md`, and `runescape-quest-fun-oddity-weapons.md` pools were consolidated into the appropriate slot files. There should no longer be a second hidden reference catalogue to check before choosing art.

When art is created and accepted for a pending item, move that item **out of its slot file** and into `created-gear.md`, preserving/refining its metadata and recording the intended runtime asset path.

`runescape-reference-policy.md` still records the deliberately broad RuneScape inspiration policy. The same prototype/reference rule now applies to other source-inspired catalogue entries (including Path of Exile and Diablo references): source-specific names are planning language and should be renamed/originalized under #93 before a public/commercial release where appropriate.

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
- Future-slot files are catalogue/design space only. Their existence must not silently add runtime slots or expand active save/equipment schema.

## Art workflow

Before requesting art for a specific item, review/update that item's entry here. The current entry at art-request time becomes the intended design direction for that equipment identity.

After art is created and accepted, move the entry into `created-gear.md` and record the intended runtime asset path so it is no longer mixed with pending candidates.
