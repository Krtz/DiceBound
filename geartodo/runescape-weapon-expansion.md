# RuneScape-inspired weapon expansion

Working candidate catalogue for issue #83.

This file expands the earlier RuneScape-inspired material ladder into the **actual breadth of RuneScape weapon forms**. These are design/reference candidates for DiceBound, not a requirement that every entry ship immediately.

## Rules

- Treat each distinct visual form as a potential DiceBound equipment base identity.
- All classes may equip all otherwise-valid gear.
- Intrinsics are first-pass DiceBound mechanics, not copied RuneScape stats.
- Higher-tier bases are deliberately allowed to be stronger.
- Cool remains reserved for explicitly special gear; none of these entries grant Cool.
- RuneScape-specific names are prototype/reference language and belong in the future #93 public-release audit where appropriate.
- Do not create duplicate identities when an item already exists in another `geartodo` file; merge/refine when promoting a candidate into the live slot catalogue.

---

# 1. Core RuneScape melee weapon forms

RuneScape's normal melee vocabulary includes daggers, swords/shortswords, longswords, two-handed swords, scimitars, maces, battleaxes, warhammers, spears/hastae, claws and halberds, with additional iconic forms such as whips and mauls.

## Standard metal-family candidates

For Bronze / Iron / Steel / Black / Mithril / Adamant / Rune, create candidate versions of:

- Dagger
- Sword / Shortsword
- Scimitar
- Mace
- Longsword
- Battleaxe
- Warhammer
- Claws
- Two-Handed Sword
- Spear
- Hasta
- Halberd

Dragon may use the same broad families where visually useful, but it should feel like a special aggressive tier rather than merely another recolour.

### Family identity suggestions

| form | family | first-pass DiceBound identity |
| --- | --- | --- |
| Dagger | dagger | lower flat Attack, higher Crit/Dodge |
| Shortsword | sword | fast/generalist Attack + small Crit |
| Scimitar | scimitar | Attack + Crit/Dodge |
| Mace | mace | Attack + small Thorns/Defense |
| Longsword | longsword | reliable flat Attack |
| Battleaxe | battleaxe | larger Attack, possible Dodge penalty |
| Warhammer | warhammer | heavy Attack + Thorns, Dodge penalty |
| Claws | claws | Crit + Echo, lower Defense |
| Two-Handed Sword | two-handed-sword | very high Attack, Dodge penalty |
| Spear | spear | Attack + Crit, balanced weight |
| Hasta | hasta | lighter spear; Crit/Dodge |
| Halberd | halberd | heavy Attack + Crit, slower/heavier identity |

### Material identity overlay

Use the same broad material identity already established in `source-inspired-loot-expansion.md`:

- Bronze — crude starter
- Iron — dependable starter
- Steel — refined baseline
- Black — dark offensive/agile sidegrade
- Mithril — light metal / Dodge-friendly
- Adamant — hard/heavy/defensive
- Rune — magical high-grade / Luck-Echo hints
- Dragon — aggressive power identity

Do **not** mechanically clone one intrinsic across every form. `Rune Dagger` and `Rune Warhammer` should both feel Rune-made while still behaving like a dagger and a warhammer.

## Higher smithing-era metal forms

For Orikalkum / Necronium / Bane / Elder Rune / Primal, prioritize the forms that make sense as authored high-tier loot:

- Longsword
- Battleaxe
- Warhammer
- Two-Handed Sword / Greatsword
- Spear
- Halberd
- Maul

First-pass high-tier identity:

- Orikalkum — Defense + Thorns
- Necronium — Attack + Defense + Void/death flavour
- Bane — heavy Attack/Thorns/Boss Damage
- Elder Rune — very high flat stats + runic/Luck identity
- Primal — huge raw flat stats, often with weight/Dodge cost

---

# 2. Bows

RuneScape separates bows into **shortbows**, **shieldbows**, composite bows and special/chargebow families.

## Shortbow material/wood ladder

Candidate bases:

- Shortbow
- Oak Shortbow
- Willow Shortbow
- Maple Shortbow
- Yew Shortbow
- Magic Shortbow
- Elder Shortbow
- Eternal Magic Shortbow
- Masterwork Bow / Masterwork Shortbow

Suggested identity:

| item | eligibility | first-pass intrinsic direction |
| --- | --- | --- |
| Shortbow | poor+ | +1 Attack, +1% Crit |
| Oak Shortbow | poor+ | +2 Attack, +1% Crit |
| Willow Shortbow | common+ | +2 Attack, +2% Crit |
| Maple Shortbow | common+ | +3 Attack, +2% Crit |
| Yew Shortbow | uncommon+ | +4 Attack, +2% Crit, +1% Dodge |
| Magic Shortbow | rare+ | +5 Attack, +3% Crit, +1% Echo |
| Elder Shortbow | epic+ | +6 Attack, +4% Crit, +2% Echo |
| Eternal Magic Shortbow | legendary+ | +7 Attack, +4% Crit, +3% Echo, +1 Luck |
| Masterwork Bow | Mythical | +9 Attack, +5% Crit, +3% Echo, +2 Luck |

## Shieldbow ladder

Candidate bases:

- Shieldbow
- Oak Shieldbow
- Willow Shieldbow
- Maple Shieldbow
- Yew Shieldbow
- Magic Shieldbow
- Elder Shieldbow

Shieldbows should trade some offense for durability, mirroring their RuneScape identity without copying stats.

Suggested direction:

- lower Attack/Crit than corresponding Shortbow;
- add Defense and/or HP;
- occasional Thorns on higher tiers;
- keep them as Weapon-slot identities rather than pretending the Offhand slot is occupied.

Example:

| item | eligibility | first-pass intrinsic |
| --- | --- | --- |
| Oak Shieldbow | poor+ | +1 Attack, +1 Defense |
| Willow Shieldbow | common+ | +2 Attack, +1 Defense, +3 HP |
| Maple Shieldbow | common+ | +2 Attack, +2 Defense |
| Yew Shieldbow | uncommon+ | +3 Attack, +2 Defense, +5 HP |
| Magic Shieldbow | rare+ | +4 Attack, +3 Defense, +1% Echo |
| Elder Shieldbow | epic+ | +5 Attack, +4 Defense, +8 HP, +1% Echo |

## Composite / special bow forms

Candidate identities:

- Willow Composite Bow
- Yew Composite Bow
- Magic Composite Bow
- Ogre Composite Bow
- Chargebow
- Crystal Bow
- Dark Bow
- Noxious Longbow
- Seren Godbow
- Bow of the Last Guardian

The final five are explicitly **special/high-tier inspiration**, not normal mundane bases. If retained long-term, they should be reviewed/originalized under #93.

Possible DiceBound identities:

- Composite Bow — Attack + Crit + small Defense
- Chargebow — Echo / self-contained projectile flavour
- Crystal Bow — Crit + Echo + Light proc
- Dark Bow — huge Attack, heavy/slow drawback
- Noxious-style bow — Nature/Poison proc identity
- Godbow-style weapon — Legendary/Mythical candidate with bespoke effect rather than ordinary intrinsic only

---

# 3. Crossbows

RuneScape supports main-hand, off-hand and two-handed crossbows. DiceBound can represent the visual identities without inheriting RuneScape's exact hand-slot model.

## Standard crossbow ladder

Candidate Weapon-slot bases:

- Crossbow
- Bronze Crossbow
- Iron Crossbow
- Blurite Crossbow
- Steel Crossbow
- Black Crossbow
- Mithril Crossbow
- Adamant Crossbow
- Rune Crossbow
- Dragon Crossbow
- Primal Crossbow

Suggested general crossbow identity:

- higher flat Attack than comparable bow;
- slightly less Dodge/Crit than shortbows;
- some crossbows lean toward Echo to represent repeated/bolt volleys;
- heavy versions may carry a Dodge penalty.

## Two-handed crossbow ladder

Candidate Weapon-slot identities:

- Bronze 2H Crossbow
- Iron 2H Crossbow
- Blurite 2H Crossbow
- Steel 2H Crossbow
- Black 2H Crossbow
- Mithril 2H Crossbow
- Adamant 2H Crossbow
- Rune 2H Crossbow
- Dragon 2H Crossbow

These should be the heavier cousins of standard crossbows: more Attack, more weight, less Dodge.

## Iconic/high-tier crossbow pool

Prototype/reference candidates:

- Dorgeshuun Crossbow
- Zanik's Crossbow
- Hunter's Crossbow
- Demon Slayer Crossbow
- Karil's Pistol Crossbow
- Armadyl Crossbow
- Chaotic Crossbow
- Royal Crossbow
- Wyvern Crossbow
- Ascension Crossbow
- Blightbound Crossbow
- Eldritch Crossbow

Possible DiceBound identities:

- Demon Slayer — Boss Damage / anti-secret-boss direction
- Chaotic — high Echo/Luck with instability
- Royal — strong balanced ranged base
- Wyvern — Ice/Poison themed proc candidate
- Ascension — very high Crit/Echo
- Blightbound — Nature/Void/Poison hybrid candidate
- Eldritch — Void proc + extreme offense

Keep names as prototype inspiration until #93 review.

---

# 4. Thrown ranged weapons

RuneScape's standard thrown weapon families should also exist in the candidate pool.

## Material ladders

For Bronze / Iron / Steel / Mithril / Adamant / Rune, create candidate forms for:

- Dart
- Throwing Knife
- Throwing Axe
- Javelin

Black and Dragon variants may be used where visually/thematically useful rather than forcing every exact source-game availability rule.

Suggested identities:

| form | family | intrinsic direction |
| --- | --- | --- |
| Dart | dart | low Attack, high Crit/Echo |
| Throwing Knife | throwing-knife | Crit + Dodge |
| Throwing Axe | throwing-axe | higher Attack, lower Dodge |
| Javelin | javelin | Attack + Crit, medium weight |

Additional special inspiration:

- Chinchompa-style explosive thrown weapon — eventual DiceBound-original AoE/weird weapon
- Sagaie-style javelin — Nature/hunting identity

---

# 5. Magic staves

RuneScape's staff family is much richer than the first expansion captured.

## Basic staff identities

Candidate Weapon-slot bases:

- Staff
- Magic Staff
- Staff of Air
- Staff of Water
- Staff of Earth
- Staff of Fire

DiceBound elemental translation:

- Air -> Electric or Echo/Dodge depending final element policy
- Water -> Ice
- Earth -> Nature / Defense
- Fire -> Fire

Do not invent an Air element unless we deliberately add one.

## Battlestaves

Candidate bases:

- Battlestaff
- Air Battlestaff
- Water Battlestaff
- Earth Battlestaff
- Fire Battlestaff
- Mud Battlestaff
- Lava Battlestaff
- Steam Battlestaff

Optional combination-staff reference pool:

- Smoke Battlestaff
- Mist Battlestaff
- Dust Battlestaff

Battlestaff identity should mix Mana with a little physical Attack/Defense instead of being a pure caster stick.

## Mystic staves

Candidate bases:

- Mystic Air Staff
- Mystic Water Staff
- Mystic Earth Staff
- Mystic Fire Staff
- Mystic Mud Staff
- Mystic Lava Staff
- Mystic Steam Staff
- Mystic Smoke Staff
- Mystic Mist Staff
- Mystic Dust Staff

Suggested identity: higher Mana + corresponding elemental proc + small Echo/Crit depending staff.

## Limitless staves

High-tier candidate bases:

- Staff of Limitless Air
- Staff of Limitless Water
- Staff of Limitless Earth
- Staff of Limitless Fire
- Staff of Limitless Mud
- Staff of Limitless Lava
- Staff of Limitless Steam

These should be Epic/Legendary+ bases with strong Mana and elemental identity.

## Special/high-tier staff inspiration

Prototype candidates:

- Ancient Staff
- Iban-style Staff
- Armadyl Battlestaff
- Camel Staff
- Polypore-style Staff
- Chaotic Staff
- Noxious Staff
- Staff of Sliske
- Fractured Staff of Armadyl

Possible DiceBound identity directions:

- Ancient — Void + Mana
- Camel — Fire + Potion/odd utility
- Polypore — Nature/Poison
- Chaotic — Mana + Echo + Luck/instability
- Noxious — Nature/Poison + Crit
- Sliske-style — Void/Echo
- Fractured-god-staff style — Mythical/Artifact-scale spell amplification

Names remain prototype references until #93 review.

---

# 6. Wands

RuneScape also has a strong one-handed magic weapon ladder.

Candidate Weapon-slot bases:

- Wizard Wand
- Avernic Wand
- Imp Horn Wand
- Exquisite Wand
- Spider Wand
- Batwing Wand
- Splitbark Wand
- Mystic Wand
- Gravite Wand
- Grifolic Wand
- Crystal Wand
- Blisterwood Wand
- Abyssal Wand
- Virtus Wand
- Attuned Crystal Wand
- Seasinger Kiba
- Cywir-style Wand

First-pass family identity:

- wands generally grant Mana + Crit/Echo rather than the heavier defensive/Attack mix of Battlestaves;
- nature/organic names may grant Nature proc;
- crystal names may grant Light/Echo;
- abyssal names may grant Void;
- high-tier wands can be very strong bases without needing bespoke Legendary effects.

---

# 7. Magic offhands: books and orbs

These belong in DiceBound's **Offhand** slot.

## Books

Candidate offhand bases:

- Wizard Book
- Avernic Book
- Imphide Book
- Batwing Book
- Tome of Frost
- Mages' Book
- Ahrim-style Book of Magic
- Virtus Book

Suggested identity: Mana + Echo, with Tome of Frost leaning Ice and higher books receiving stronger caster stats.

## Orbs

Candidate offhand bases:

- Exquisite Orb
- Spider Orb
- Splitbark Orb
- Mystic Orb
- Gravite Orb
- Grifolic Orb
- Crystal Orb
- Blisterwood Orb
- Abyssal Orb
- Attuned Crystal Orb
- Seasinger Makigai

Suggested identity: Mana + Crit/Echo/proc chance, usually more offensive than books.

---

# 8. Necromancy weapon family

RuneScape's Necromancy combat uses a main-hand **siphon** and off-hand **conduit**. Its core upgradeable weapon pair is the Death Guard and Skull Lantern.

Candidate DiceBound identities:

## Weapon

### Death Guard / Necrotic Siphon
family: siphon
material: bone, metal, necrotic
weight: medium
tags: necromancy, death, caster, prototype-reference
eligibility: rare+
intrinsic direction: +Mana, +Attack, +Void proc chance

## Offhand

### Skull Lantern / Necrotic Conduit
family: conduit
material: bone, metal, necrotic
weight: medium
tags: necromancy, death, summoning, prototype-reference
eligibility: rare+
intrinsic direction: +Mana, +Pet/Summon Damage, +Echo or Void proc chance

If DiceBound's future Necromancer uses targetable Skeleton allies, the conduit family is a natural place for summon-capacity / summon-damage Intrinsics later.

---

# 9. Iconic RuneScape melee inspiration pool

These are **not ordinary material-tier bases**. They are a reference pool for later special/high-tier equipment identities or Legendary/Mythical effects.

- Abyssal Whip
- Dragon Claws
- Dragon Scimitar
- Dragon Dagger
- Dragon Battleaxe
- Dragon 2H Sword
- Godsword family
- Chaotic Rapier
- Chaotic Longsword
- Chaotic Maul
- Drygore Longsword
- Drygore Mace
- Drygore Rapier
- Noxious Scythe
- Zaros Godsword
- Masterwork Spear
- Leng-style swords
- Ek-ZekKil-style colossal sword

Do not blindly ship recognisable proper names. The useful part is the **form/mechanical fantasy**: whip, paired burst claws, enormous godsword, ultra-fast rapier, colossal maul, scythe, masterwork spear, paired ice swords, gigantic execution blade, etc.

---

# 10. Promotion rule into the normal geartodo slot files

This file is a large source pool.

When an item is selected for actual art or implementation:

1. decide the exact DiceBound name;
2. decide whether the source name is generic enough to retain or should be originalised;
3. copy/promote it into the correct `geartodo/<slot>.md` file;
4. give it final `family`, `material`, `weight`, `tags`, `eligibility`, and `intrinsic` fields;
5. review it before art generation;
6. keep Jean Jacket as the only current base with the Cool stat unless explicitly changed later.
