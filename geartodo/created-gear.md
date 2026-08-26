# Created gear

Working design sheet for equipment identities that already have approved/generated art.

These entries have moved out of the raw `geartodo` candidate/reference lists because their first modular art asset now exists. The metadata here remains the design source until runtime implementation/refinement under #83/#110.

The PNGs are delivered through approved art-inbox packs such as #110 and #142. `asset` records the intended stable runtime filename/path once imported.

## Weapon

### Bronze Longsword
family: sword
material: bronze
weight: medium
tags: martial, material-tier
eligibility: poor+
intrinsic: +1 Attack
asset: `runtime/assets/equipment/weapon/bronze-longsword.png`
art: worn, poor-quality bronze longsword; dented/nicked starter-tier equipment
---

### Shortbow
family: shortbow
material: wood
weight: light
tags: ranged, starter
eligibility: poor+
intrinsic: +1 Attack, +1% Crit
asset: `runtime/assets/equipment/weapon/shortbow.png`
art: approved #110 simple worn wooden shortbow with leather grip and visible wear
---

### Oak Shortbow
family: shortbow
material: wood
weight: light
tags: ranged, bow, source-inspired
eligibility: poor+
intrinsic: +2 Attack, +1% Crit
asset: `runtime/assets/equipment/weapon/oak-shortbow.png`
art: approved #142 distinct oak shortbow; this is not a replacement for the original Shortbow
---

### Bronze Battleaxe
family: battleaxe
material: bronze
weight: heavy
tags: martial, material-tier, battleaxe
eligibility: poor+
intrinsic: +3 Attack, -1% Dodge
asset: `runtime/assets/equipment/weapon/bronze-battleaxe.png`
art: approved #142 battered starter battleaxe; rough wooden haft and worn low-tier metal head
---

### Rubber Chicken
family: improvised
material: rubber
weight: light
tags: weird, clown
eligibility: poor+
intrinsic: +1 Attack
asset: `runtime/assets/equipment/weapon/rubber-chicken.png`
art: battered yellow squeaky rubber chicken weapon
---

### Crimson Brush
family: brush
material: redwood, bristle
weight: light
tags: artist, crimson, weird
eligibility: poor+
intrinsic: +1 Attack, +1% Fire proc chance
asset: `runtime/assets/equipment/weapon/crimson-brush.png`
art: redwood handle, white bristles still loaded and stained with red paint
---

### Tongue Lash
family: whip
material: flesh
weight: light
tags: frog, weird
eligibility: poor+
intrinsic: +1 Attack, +2% Echo
asset: `runtime/assets/equipment/weapon/tongue-lash.png`
art: slimy fleshy whip made from a frog tongue
---

## Hat

### Bronze Full Helm
family: full-helm
material: bronze
weight: medium
tags: martial, plate, material-tier
eligibility: poor+
intrinsic: +1 Defense
asset: `runtime/assets/equipment/hat/bronze-full-helm.png`
art: worn, poor-quality bronze full helm with dents, scratches and tarnish
---

### Hunter Hood
family: hood
material: cloth, leather
weight: light
tags: ranger, hunting
eligibility: poor+
intrinsic: +2% Dodge, +1% Crit
asset: `runtime/assets/equipment/hat/hunter-hood.png`
art: approved #142 weathered olive-green hunter hood with worn leather edging; authored review lowers the older uncommon+ suggestion to poor+
---

## Chest

### Bronze Platebody
family: platebody
material: bronze
weight: heavy
tags: martial, plate, material-tier
eligibility: poor+
intrinsic: +2 Defense
asset: `runtime/assets/equipment/chest/bronze-platebody.png`
art: worn, poor-quality bronze platebody with rough low-tier construction
---

### Leather Harness
family: harness
material: leather
weight: light
tags: weird
eligibility: poor+
intrinsic: +1% Dodge
asset: `runtime/assets/equipment/chest/leather-harness.png`
art: approved #142 rugged stitched leather starter vest/harness with straps and patched reinforcement
---

## Legs

### Bronze Platelegs
family: platelegs
material: bronze
weight: medium
tags: martial, plate, material-tier
eligibility: poor+
intrinsic: +1 Defense
asset: `runtime/assets/equipment/legs/bronze-platelegs.png`
art: worn, poor-quality bronze platelegs
---

### Ranger Trousers
family: trousers
material: cloth, leather
weight: light
tags: ranger, agile
eligibility: poor+
intrinsic: +1% Dodge
asset: `runtime/assets/equipment/legs/ranger-trousers.png`
art: approved #142 patchwork ranger trousers with mismatched cloth, leather straps, pouches and worn knee protection
---

## Boots

### Bronze Armoured Boots
family: armoured-boots
material: bronze, leather
weight: medium
tags: martial, plate, material-tier
eligibility: poor+
intrinsic: +1 Defense
asset: `runtime/assets/equipment/boots/bronze-armoured-boots.png`
art: worn, poor-quality bronze armoured boots over simple leather underlayers
---

### Trail Boots
family: boots
material: leather
weight: light
tags: ranger, trail
eligibility: poor+
intrinsic: +1% Dodge
asset: `runtime/assets/equipment/boots/trail-boots.png`
art: approved #142 scuffed brown leather travel boots with heavy lacing, straps and trail wear
---

## Offhand

### Bronze Round Shield
family: round-shield
material: bronze, wood
weight: medium
tags: martial, guardian, material-tier
eligibility: poor+
intrinsic: +1 Defense
asset: `runtime/assets/equipment/offhand/bronze-round-shield.png`
art: battered wooden round shield with worn bronze rim and boss
---

### Iron Round Shield
family: round-shield
material: iron
weight: medium
tags: martial, guardian, material-tier
eligibility: poor+
intrinsic: +2 Defense
asset: `runtime/assets/equipment/offhand/iron-round-shield.png`
art: approved #142 battered wooden round shield with scratched iron rim, rivets and central boss
---

### Spellbook
family: spellbook
material: paper, leather
weight: light
tags: arcane, caster
eligibility: poor+
intrinsic: +5 Mana
asset: `runtime/assets/equipment/offhand/spellbook.png`
art: approved #142 worn starter spellbook with battered binding, simple arcane sigil and faint magical page glow
---

## Ring

### Mood Ring
family: ring
material: metal, glass
weight: light
tags: clown, weird
eligibility: poor+
intrinsic: +1 Luck
asset: `runtime/assets/equipment/ring/mood-ring.png`
art: approved #142 hammered copper ring with patina and a small teal glass mood stone
---

## Amulet

### Hawkeye Charm
family: charm
material: bone, metal
weight: light
tags: ranger, precision
eligibility: poor+
intrinsic: +2% Crit, +1% Dodge
asset: `runtime/assets/equipment/amulet/hawkeye-charm.png`
art: approved #142 rough bone-and-turquoise hunting charm with leather cord, carved tokens and feather; authored review lowers the older uncommon+ suggestion to poor+
---

## Workflow

When more gear art is approved/generated:
1. move the corresponding item out of the pending/reference geartodo list;
2. preserve/refine its metadata here;
3. record the intended runtime asset path;
4. keep the PNG in the art-inbox handoff until Codex/runtime integration imports it;
5. once runtime implementation exists, this file may also record the authoritative `equipmentId`.

Related: #83 #110 #142
