# DiceBound Gameplay Vocabulary

Working shared vocabulary for design notes, issues, `geartodo`, implementation and player-facing terminology.

The purpose of this file is to make shorthand unambiguous. If a design sheet says `+2 Thorns`, `Powerup`, `+5% Attack`, `Rare+`, etc., everyone working on DiceBound should interpret it the same way.

This is a living document. Add terms when new systems need shared language.

---

## Core progression terms

### Run
One active expedition from Camp until it ends through death, completion, abandonment, Prestige/reset, or another explicit run-ending action.

Run-specific state normally does not persist into a new run unless another system explicitly says it does.

### Powerup
A **run-specific** upgrade/modifier acquired during an expedition, usually through level-up choices, events, rewards or similar run systems.

A Powerup is not the same thing as a Talent, equipment Intrinsic, Artifact, achievement unlock or permanent Legacy upgrade.

An achievement may permanently **unlock a Powerup into the available pool**, but actually obtaining that Powerup during a run is still run-specific.

### Talent
A Legacy/Prestige progression upgrade from the Talent tree.

Talents are persistent progression and are conceptually separate from run-specific Powerups.

### Legacy
Persistent progression that survives individual runs/Prestiges according to the current Legacy system.

### Achievement
A persistent recorded accomplishment. Achievements can unlock content or act as requirements, but are not themselves Powerups or Talents.

---

## Equipment terms

### Equipment identity / base
The authored underlying type of equipment represented by a distinct piece of art and stable identity.

Examples:
- Gold Full Plate
- Band T-Shirt
- Jean Jacket
- Lily Pad

In gear-design discussion, **base** is shorthand for this equipment identity and its guaranteed Intrinsics, independent of the item's rolled affixes and special rarity/set effects.

Different artwork should normally mean a different equipment identity rather than merely a cosmetic variant.

### Base strength is intentionally uneven
Equipment identities are **not required to have equal-strength Intrinsics**.

Two items with identical rarity and identical rolled affixes can be differently strong because their bases are different. This is intentional and creates a long-term optimization chase.

Example design goal:
1. the player is initially delighted to obtain an Artifact/set piece because its special effect or set bonus matters, even if its underlying base is weak;
2. once the set is assembled, the player can keep farming for the same special piece on a stronger base;
3. a late-game perfect item therefore combines the desired special effect/set identity, a strong base identity and strong rolled affixes.

Do **not** automatically normalize every Intrinsic to the same point value. Base quality is part of loot progression.

### Special rarity/set effect vs base
Artifact, Omega, set and similar special item identities/effects are conceptually separate from the underlying equipment base.

A special item may therefore use a base whose ordinary minimum-rarity eligibility would be much lower than the special item's final rarity. The base keeps its own Intrinsics; the special item contributes its separate special effect/set behavior.

Exact generation policy remains implementation work, but design data must keep these axes separable.

### Family
A broad form/category shared by visually or conceptually related equipment.

Examples:
- `full-plate`
- `t-shirt`
- `longbow`
- `bloodbound`
- `shield`

Family does not automatically grant mechanics unless a future system explicitly uses it mechanically.

### Material
Physical or magical construction material where useful.

Examples:
- `cloth`
- `leather`
- `iron`
- `steel`
- `shell`
- `gel`
- `spectral`

Material may be blank for objects where it is irrelevant or unknown.

### Weight
Broad physical/equipment weight classification where useful:
- `light`
- `medium`
- `heavy`
- `very-heavy`

Weight may be blank where it does not make sense.

### Tags
Additional semantic/vibe/mechanical-design labels that do not fit family/material/weight.

Examples:
- `weird`
- `cool`
- `holy`
- `vampiric`
- `wealth`
- `probability`
- `pet`

Use lowercase tags. Multiword tags use hyphens, for example `very-heavy`, `road-warden`, `pet-focused`.

Empty metadata fields are allowed. Do not invent meaningless metadata just to fill every field.

### Eligibility
The ordinary conditions under which an equipment identity is allowed to enter the base-generation pool.

Examples may include:
- minimum ordinary rarity;
- exact rarity;
- Board requirement;
- mode requirement;
- achievement requirement;
- other future conditions.

Special Artifact/Omega/set generation may deliberately use a broader base pool as described above.

### `Rarity+` notation
When a design sheet says:

`eligibility: rare+`

it means **Rare rarity or any higher ordinary rarity that is allowed to use the normal base pool**.

Likewise `poor+`, `common+`, etc. mean that rarity or above.

Canonical runtime rarity labels currently include Poor, Common, Uncommon, Rare, Epic, Legendary, Mythical, Omega and Artifact.

### Intrinsic
A property inherent to the **equipment base itself**.

Every generated instance using that base receives its Intrinsic effect(s).

Intrinsics are outside the normal rarity/stat point budget unless that design is deliberately changed later.

### Rolled stat
A normal generated stat/effect on a specific item instance rather than something guaranteed by the equipment base.

### Affix
A generated prefix/suffix/effect from the ordinary equipment generation system.

Affixes are distinct from authored Intrinsics.

---

## Combat stat shorthand

### HP
Hit Points.

`+5 HP` means five additional HP.

`+5% HP` means a five-percent increase to HP, not five flat HP.

### Attack
The ordinary Attack stat unless a more specific damage modifier is named.

- `+5 Attack` = five flat Attack.
- `+5% Attack` = five percent more Attack.

Flat and percentage Attack are deliberately different effects and must not be implemented interchangeably.

Unless an effect explicitly defines multiplicative stacking with other percentage modifiers, multiple additive `% Attack` bonuses should add their percentage values before the authoritative effective-stat calculation applies them.

### Defense
The ordinary Defense stat.

- `+5 Defense` = five flat Defense.
- `+5% Defense` = five percent more Defense.

Prefer **Defense** consistently rather than mixing `def`, `defence` and `defense` in final definitions.

### Mana
The ordinary Mana resource/capacity on classes that use Mana.

**Mana bonuses intentionally do nothing on a class with no Mana system.**

All classes being allowed to equip all otherwise-valid gear does **not** mean every base must be useful or optimal for every class.

### Dodge
Chance to avoid an incoming qualifying attack.

`+2% Dodge` means **+2 percentage points of Dodge chance**.

### Crit
Critical-hit chance.

`+1% Crit` means **+1 percentage point of Crit chance**.

### Echo / Echo Strike
Chance for the relevant action to produce an Echo Strike/follow-up according to the authoritative Echo system.

`+2% Echo` means **+2 percentage points of Echo chance**.

### Luck
The ordinary Luck stat used by DiceBound's authoritative Luck mechanics.

Unless `% Luck` is explicitly written, `+N Luck` is a flat Luck-stat addition.

### Lifesteal
Healing gained from qualifying damage according to the authoritative Lifesteal rules.

`+2% Lifesteal` means +2 percentage points of Lifesteal.

### Gold Gain
A modifier to qualifying Gold rewards.

`+5% Gold Gain` means five percent more qualifying Gold using the authoritative Gold-gain calculation.

### Boss Damage
A percentage modifier to qualifying damage against bosses/guardians.

`+5% Boss Damage` means five percent more qualifying boss damage.

### Potion Healing
A modifier to healing produced by potions.

`+10% Potion Healing` means potions heal ten percent more under the authoritative potion-healing calculation.

### Pet Damage
A modifier to damage produced by the player's active pet/companion where applicable.

`+10% Pet Damage` means ten percent more qualifying pet damage. It can be useless on a build with no active damaging pet; that is acceptable.

### Cool
A **real design stat with no current gameplay effect**.

Do not relabel Cool as flavour or discard it during implementation. `+100 Cool` should persist as an actual stat/value even while nothing currently consumes it.

This ambiguity is intentional. A future mechanic may decide that Cool matters.

### Thorns
Retaliatory damage dealt to an attacker when that attacker lands a qualifying attack on the unit with Thorns.

`+N Thorns` means the qualifying attacker takes **N flat Thorns damage** whenever the authoritative Thorns trigger conditions are met.

Thorns is especially appropriate on visibly spiked, studded, barbed or retaliatory equipment, but it is not restricted to those families.

---

## Effect / trigger terminology

### Proc
Short for a triggered secondary effect becoming active after its qualifying condition occurs.

Use `proc` for the **activation/event**, not as a synonym for the underlying stat itself.

### Proc chance
Chance for a qualifying proc to occur.

`+1% Metal proc chance` means **+1 percentage point** to the chance of triggering the existing Metal elemental proc on a qualifying action.

Unless explicitly defined otherwise, additions to proc chance are percentage-point additions.

### Elemental proc
A proc belonging to the DiceBound elemental system.

The actual resulting damage/status/animation comes from the authoritative elemental mechanic rather than being redefined independently by equipment text.

### Barrier
A defensive combat layer/state that blocks or absorbs damage according to the authoritative Barrier rules.

Do not use `Barrier` interchangeably with Energy Shield unless the runtime intentionally treats them as the same mechanic.

### Energy Shield
The existing Energy Shield mechanic. Keep it distinct from Barrier unless a future redesign explicitly merges the two systems.

---

## Numeric writing conventions

To reduce ambiguity in `geartodo` and issue notes:

- Flat stat: `+5 HP`, `+3 Attack`, `+2 Defense`, `+5 Mana`, `+100 Cool`
- Percentage stat modifier: `+5% Attack`, `+10% Potion Healing`, `+8% Pet Damage`
- Percentage-point chance: `+2% Crit`, `+3% Dodge`, `+4% Echo`
- Proc chance: `+1% Metal proc chance`
- Flat retaliation: `+2 Thorns`
- Negative flat stat: `-2 Defense`
- Negative percentage/chance: `-2% Dodge`, `-5% Attack`

A number without `%` must never silently become a percentage during implementation, and a number with `%` must never silently become a flat stat.

---

## Design-sheet rule of thumb

A future implementer should be able to read an entry without asking what its numbers mean.

Good:

```text
family: t-shirt
material: cloth
weight: light
tags: weird, music
eligibility: rare+
intrinsic: +4% Dodge, +1 Thorns, +2% Echo, +1% Metal proc chance
```

Also valid when a field is irrelevant:

```text
family: probability-table
material:
weight:
tags: probability, weird
eligibility: uncommon+
intrinsic: +2 Luck, +2% Echo
```

---

## Related design sources

- `geartodo/` — working equipment-base definitions
- `geartodo/README.md` — catalogue workflow and field conventions
- issue #83 — authored equipment identities, Intrinsics and modular artwork
- issue #51 — authoritative live/computed player-facing descriptions
- issue #40 — runtime ownership/module architecture
