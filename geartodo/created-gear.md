# Created gear

Working design sheet for equipment identities that already have approved/generated art.

These entries have moved out of the raw `geartodo` candidate/reference lists because their first modular art asset now exists. The metadata here remains the design source until runtime implementation/refinement under #83/#110.

The PNGs are currently delivered through the #110 art-inbox pack. `asset` records the intended stable runtime filename/path once imported.

## Weapon

### Bronze Longsword
family: sword
material: bronze
weight: medium
tags: martial, material-tier
eligibility: poor+
intrinsic: +1 Attack
asset: `runtime/assets/gear/weapon/bronze-longsword.png`
art: worn, poor-quality bronze longsword; dented/nicked starter-tier equipment
---

### Shortbow
family: shortbow
material: wood
weight: light
tags: ranged, starter
eligibility: poor+
intrinsic: +1 Attack, +1% Crit
asset: `runtime/assets/gear/weapon/shortbow.png`
art: worn, poor-quality simple wooden shortbow
---

### Rubber Chicken
family: improvised
material: rubber
weight: light
tags: weird, clown
eligibility: poor+
intrinsic: +1 Attack
asset: `runtime/assets/gear/weapon/rubber-chicken.png`
art: battered yellow squeaky rubber chicken weapon
---

### Crimson Brush
family: brush
material: redwood, bristle
weight: light
tags: artist, crimson, weird
eligibility: poor+
intrinsic: +1 Attack, +1% Fire proc chance
asset: `runtime/assets/gear/weapon/crimson-brush.png`
art: redwood handle, white bristles still loaded and stained with red paint
---

### Tongue Lash
family: whip
material: flesh
weight: light
tags: frog, weird
eligibility: poor+
intrinsic: +1 Attack, +2% Echo
asset: `runtime/assets/gear/weapon/tongue-lash.png`
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
asset: `runtime/assets/gear/hat/bronze-full-helm.png`
art: worn, poor-quality bronze full helm with dents, scratches and tarnish
---

## Chest

### Bronze Platebody
family: platebody
material: bronze
weight: heavy
tags: martial, plate, material-tier
eligibility: poor+
intrinsic: +2 Defense
asset: `runtime/assets/gear/chest/bronze-platebody.png`
art: worn, poor-quality bronze platebody with rough low-tier construction
---

## Legs

### Bronze Platelegs
family: platelegs
material: bronze
weight: medium
tags: martial, plate, material-tier
eligibility: poor+
intrinsic: +1 Defense
asset: `runtime/assets/gear/legs/bronze-platelegs.png`
art: worn, poor-quality bronze platelegs
---

## Boots

### Bronze Armoured Boots
family: armoured-boots
material: bronze, leather
weight: medium
tags: martial, plate, material-tier
eligibility: poor+
intrinsic: +1 Defense
asset: `runtime/assets/gear/boots/bronze-armoured-boots.png`
art: worn, poor-quality bronze armoured boots over simple leather underlayers
---

## Offhand

### Bronze Round Shield
family: round-shield
material: bronze, wood
weight: medium
tags: martial, guardian, material-tier
eligibility: poor+
intrinsic: +1 Defense
asset: `runtime/assets/gear/offhand/bronze-round-shield.png`
art: battered wooden round shield with worn bronze rim and boss
---

## Workflow

When more gear art is approved/generated:
1. move the corresponding item out of the pending/reference geartodo list;
2. preserve/refine its metadata here;
3. record the intended runtime asset path;
4. keep the PNG in the art-inbox handoff until Codex/runtime integration imports it;
5. once runtime implementation exists, this file may also record the authoritative `equipmentId`.

Related: #83 #110
