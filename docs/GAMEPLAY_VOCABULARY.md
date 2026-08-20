# DiceBound Gameplay Vocabulary

Working shared vocabulary for design notes, issues, `geartodo`, implementation and player-facing terminology.

The purpose of this file is to make shorthand unambiguous. If a design sheet says `+2 Thorns`, `Powerup`, `proc chance`, `Rare+`, etc., everyone working on DiceBound should interpret it the same way.

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

### Equipment identity
The authored underlying type of equipment represented by a distinct piece of art and a stable identity.

Examples:
- Gold Full Plate
- Band T-Shirt
- Jean Jacket
- Lily Pad

Under #83, different artwork should normally mean a different equipment identity rather than merely a cosmetic variant.

### Family
One or more descriptive classification tags attached to an equipment identity.

Examples:
- `cloth`
- `leather`
- `plate`
- `light`
- `heavy`
- `robe`
- `weird`

Families are primarily organizational/semantic metadata. A family tag does **not** automatically grant mechanics unless a future system explicitly uses that family mechanically.

Use lowercase family tags in design sheets where practical for consistency.

### Eligibility
The conditions under which an equipment identity is allowed to enter the generation pool.

Examples may include:
- minimum rarity;
- exact rarity;
- Board requirement;
- mode requirement;
- achievement requirement;
- other future conditions.

### `Rarity+` notation
When a design sheet says something like:

`eligibility: rare+`

it means **Rare rarity or any higher rarity**.

Likewise `poor+`, `common+`, etc. mean that rarity or above.

Use the canonical in-game rarity names when writing final definitions. Do not invent alternate spellings for the same rarity.

### Intrinsic
A property inherent to the **equipment identity itself**.

Every generated instance of that equipment identity receives its Intrinsic effect(s).

Under #83, Intrinsics are outside the normal rarity/stat point budget unless that design is deliberately changed later.

Example:

`Gold Full Plate`

may always have an authored Gold-related Intrinsic while still rolling different ordinary stats/affixes on different generated copies.

### Rolled stat
A normal generated stat/effect on a specific item instance rather than something guaranteed by the equipment identity.

### Affix
A generated prefix/suffix/effect from the ordinary equipment generation system.

Affixes are distinct from authored Intrinsics.

---

## Combat stat shorthand

For design files, prefer the full canonical word where convenient. Short forms such as `DEF` are fine for compact tables, but do not freely alternate between different spellings when they mean the same thing.

### HP
Hit Points.

`+5 HP` means five additional HP according to the normal effective-stat rules.

### Attack
The ordinary Attack stat unless a more specific damage modifier is named.

### Defense
The ordinary Defense stat.

Prefer **Defense** consistently in project design text rather than mixing `def`, `defence` and `defense` in final definitions.

### Mana
The ordinary Mana resource/capacity where the current class actually uses Mana.

If an item grants Mana, implementation must define sensible behavior for classes without a Mana system rather than relying on ambiguous design shorthand.

### Dodge
Chance to avoid an incoming qualifying attack.

In compact gear notes, a whole-number value such as `+2 Dodge` should normally be read as **+2 percentage points of Dodge chance**, unless the entry explicitly says otherwise.

### Crit
Critical-hit chance.

In compact gear notes, `+1 Crit` normally means **+1 percentage point of Crit chance** unless explicitly defined otherwise.

### Echo / Echo Strike
Chance for the relevant action to produce an Echo Strike/follow-up according to the authoritative Echo system.

In compact gear notes, `+2 Echo` normally means **+2 percentage points of Echo chance**, unless explicitly stated otherwise.

### Thorns
Retaliatory damage dealt to an attacker when that attacker lands a qualifying attack on the unit with Thorns.

**Numeric convention:** `+N Thorns` means the qualifying attacker takes **N Thorns damage**.

Example:

`+3 Thorns`

means an attacker takes 3 retaliatory Thorns damage whenever the authoritative Thorns trigger conditions are met.

Do not interpret the number as a percentage unless the effect explicitly says `% Thorns` or otherwise defines percentage scaling.

---

## Effect / trigger terminology

### Proc
Short for a triggered secondary effect becoming active after its qualifying condition occurs.

Examples:
- an elemental proc on attack;
- a chance to trigger an additional effect;
- an effect triggered by Guard, Crit, Echo or another event.

Use `proc` for the **activation/event**, not as a synonym for the underlying stat itself.

### Proc chance
The chance for a qualifying proc to occur.

When a design sheet modifies proc chance, write the percentage explicitly whenever possible:

`+1% Metal proc chance`

is clearer than:

`+1 Metal proc chance`

Unless a mechanic explicitly uses multiplicative probability, additions to proc chance should be treated as **percentage-point additions**.

### Elemental proc
A proc belonging to the DiceBound elemental system.

The actual resulting damage/status/animation must come from the authoritative elemental mechanic rather than being redefined independently by equipment text.

### Barrier
A defensive combat layer/state that blocks or absorbs damage according to the authoritative Barrier rules.

Do not use `Barrier` interchangeably with Energy Shield unless the runtime intentionally treats them as the same mechanic.

### Energy Shield
The existing Energy Shield mechanic. Keep it distinct from Barrier in design notes unless a future redesign explicitly merges the two systems.

---

## Numeric writing conventions

To reduce ambiguity in `geartodo` and issue notes:

- Flat stat: `+5 HP`, `+3 Attack`, `+2 Defense`
- Percentage-point chance: `+2% Crit`, `+3% Dodge`, `+4% Echo`
- Proc chance: `+1% Metal proc chance`
- Flat retaliation: `+2 Thorns`
- Negative modifier: `-2% Dodge`

When the current runtime/UI convention eventually chooses a different display format, implementation can translate these design values. The important thing is that the source design meaning remains unambiguous.

---

## Terms that must be explicitly marked if they are jokes/flavour

DiceBound deliberately contains nonsense. That is good, but design sheets should distinguish a real mechanic from a joke value.

Example:

`+100 Cool`

is ambiguous unless **Cool** becomes an actual game stat.

If it is flavour only, write something like:

`flavour: +100 Cool`

or:

`intrinsic: +5 Defense, +5% Dodge, +5% Crit, +5% Echo; flavour: +100 Cool`

If Cool later becomes a real mechanic, add it to this vocabulary with an authoritative definition.

---

## Design-sheet rule of thumb

A future implementer should be able to read an entry without asking what its numbers mean.

Good:

```text
family: cloth, t-shirt, weird
eligibility: rare+
intrinsic: +4% Dodge, +1 Thorns, +2% Echo, +1% Metal proc chance
```

Ambiguous:

```text
intrinsic: dodge 4, thorn, echo +2, metal 1
```

Clarity in the design sheet does not mean the final player-facing tooltip needs to use the same terse wording.

---

## Related design sources

- `geartodo/` — working equipment identity definitions
- issue #83 — authored equipment identities, Intrinsics and modular artwork
- issue #51 — authoritative live/computed player-facing descriptions
- issue #40 — runtime ownership/module architecture
