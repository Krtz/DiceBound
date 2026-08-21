# Source-inspired loot expansion pool

Working expansion catalogue for issue #83.

This file is deliberately a **big candidate pool**, not a promise that every entry is immediately runtime-ready. When Axel chooses an item for art or implementation, review that exact row/identity and move/refine it in the normal slot file if useful.

## Source note / future cleanup

This expansion deliberately borrows recognizable **equipment progression ideas and generic base-type vocabulary** from RuneScape and Diablo II because they are excellent loot-language reference points.

- RuneScape inspiration is primarily the familiar metal/equipment progression: Bronze, Iron, Steel, Mithril, Adamant, Rune, Orikalkum, Necronium, Bane, Elder Rune and Primal, plus the iconic Black/Dragon families and Masterwork-style endgame armour.
- Diablo II inspiration is primarily its enormous spread of mundane fantasy base types: different swords, axes, polearms, shields, armour cuts, helms, circlets, boots, etc.
- **These are prototype/reference identities.** Generic historical/fantasy terms can remain where appropriate; names that later feel too specifically tied to another IP should be renamed/originalized under #93 before a public/commercial release.
- DiceBound does **not** inherit RuneScape or Diablo stats, level requirements, rarity rules or exact progression. Everything below uses DiceBound's own base-identity / Intrinsic / rarity model.
- Cool remains reserved for genuinely special equipment. None of these entries grant Cool.

---

# A. RuneScape-inspired material/equipment ladder

## Design rule

The point of this ladder is to give DiceBound a very readable family of increasingly desirable **material identities**.

A Rune Longsword should visually and intrinsically feel better than an Iron Longsword even when both can still receive their own rolled affixes and special-rarity/set/Artifact wrappers.

These bases are intentionally **not equal-strength**. The material itself is part of the chase.

### Proposed tier identity

| Tier/family | Ordinary eligibility | General identity |
| --- | --- | --- |
| Bronze | poor+ | crude, cheap, honest starter metal |
| Iron | poor+ | dependable basic metal |
| Steel | common+ | refined martial baseline |
| Black | common+ | dark special-metal sidegrade; slightly more offensive/agile |
| Mithril | uncommon+ | light metal; Defense without as much Dodge penalty |
| Adamant | uncommon+ | hard, heavy, durable |
| Rune | rare+ | magical high-grade metal; Luck/Echo can begin appearing |
| Dragon | rare+ | aggressive/power-oriented red metal identity |
| Orikalkum | rare+ | heavy ancient orange metal; Defense/Thorns |
| Necronium | epic+ | death-dark metal; Attack/Defense with occult edge |
| Bane | epic+ | hostile high-tier metal; Thorns / anti-boss flavor |
| Elder Rune | legendary+ | extremely strong ancient runic metal |
| Primal | legendary+ | brutal pinnacle raw material; very high flat stats |
| Masterwork | Mythical | armour-only crafted pinnacle; balanced offense + defense |
| Trimmed Masterwork | Mythical | armour-only extravagant pinnacle; stronger than ordinary bases by design |

## Weapon candidates

| Item | family | material | weight | tags | eligibility | first-pass intrinsic |
| --- | --- | --- | --- | --- | --- | --- |
| Bronze Longsword | sword | bronze | medium | martial, material-tier | poor+ | +1 Attack |
| Iron Longsword | sword | iron | medium | martial, material-tier | poor+ | +2 Attack |
| Steel Longsword | sword | steel | medium | martial, material-tier | common+ | +3 Attack |
| Black Longsword | sword | black-metal | medium | martial, dark, material-tier | common+ | +3 Attack, +1% Crit |
| Mithril Longsword | sword | mithril | light | martial, light-metal, material-tier | uncommon+ | +4 Attack, +1% Dodge |
| Adamant Longsword | sword | adamant | heavy | martial, durable, material-tier | uncommon+ | +5 Attack, +1 Defense |
| Rune Longsword | sword | rune-metal | medium | martial, runic, material-tier | rare+ | +6 Attack, +1 Luck |
| Dragon Longsword | sword | dragon-metal | medium | martial, dragon, power, material-tier | rare+ | +7 Attack, +2% Crit |
| Orikalkum Warhammer | warhammer | orikalkum | heavy | martial, blunt, material-tier | rare+ | +7 Attack, +2 Defense, +1 Thorns |
| Necronium Battleaxe | battleaxe | necronium | heavy | martial, death, material-tier | epic+ | +8 Attack, +2 Defense, +1% Void proc chance |
| Bane Longsword | sword | bane-metal | heavy | martial, hostile, material-tier | epic+ | +9 Attack, +2 Thorns, +5% Boss Damage |
| Elder Rune Longsword | sword | elder-rune | heavy | martial, runic, ancient, material-tier | legendary+ | +10 Attack, +3 Defense, +2 Luck |
| Primal Greatsword | greatsword | primal-metal | very-heavy | martial, primal, brutal, material-tier | legendary+ | +13 Attack, +5 HP, -2% Dodge |

## Full-helm candidates

| Item | material | weight | eligibility | first-pass intrinsic |
| --- | --- | --- | --- | --- |
| Bronze Full Helm | bronze | medium | poor+ | +1 Defense |
| Iron Full Helm | iron | medium | poor+ | +2 Defense |
| Steel Full Helm | steel | medium | common+ | +3 Defense |
| Black Full Helm | black-metal | medium | common+ | +2 Defense, +1% Crit |
| Mithril Full Helm | mithril | light | uncommon+ | +3 Defense, +1% Dodge |
| Adamant Full Helm | adamant | heavy | uncommon+ | +4 Defense, +5 HP |
| Rune Full Helm | rune-metal | heavy | rare+ | +5 Defense, +1 Luck |
| Dragon Full Helm | dragon-metal | heavy | rare+ | +4 Defense, +2 Attack, +1% Crit |
| Orikalkum Full Helm | orikalkum | heavy | rare+ | +6 Defense, +1 Thorns |
| Necronium Full Helm | necronium | heavy | epic+ | +6 Defense, +2 Attack, +1% Void proc chance |
| Bane Full Helm | bane-metal | heavy | epic+ | +7 Defense, +2 Thorns |
| Elder Rune Full Helm | elder-rune | very-heavy | legendary+ | +8 Defense, +8 HP, +1 Luck |
| Primal Full Helm | primal-metal | very-heavy | legendary+ | +10 Defense, +10 HP, -1% Dodge |
| Masterwork Helm | masterwork-alloy | heavy | Mythical | +8 Defense, +3 Attack, +1% Crit |
| Trimmed Masterwork Helm | trimmed-masterwork | heavy | Mythical | +10 Defense, +4 Attack, +2% Crit, +5 HP |

All helm entries above use `family: full-helm` and tags `martial, plate, material-tier` plus their obvious tier/theme tag.

## Platebody candidates

| Item | material | weight | eligibility | first-pass intrinsic |
| --- | --- | --- | --- | --- |
| Bronze Platebody | bronze | heavy | poor+ | +2 Defense |
| Iron Platebody | iron | heavy | poor+ | +3 Defense |
| Steel Platebody | steel | heavy | common+ | +4 Defense, +3 HP |
| Black Platebody | black-metal | medium | common+ | +3 Defense, +1 Attack, +1% Crit |
| Mithril Platebody | mithril | medium | uncommon+ | +4 Defense, +2% Dodge |
| Adamant Platebody | adamant | heavy | uncommon+ | +5 Defense, +8 HP |
| Rune Platebody | rune-metal | heavy | rare+ | +6 Defense, +10 HP, +1 Luck |
| Dragon Platebody | dragon-metal | heavy | rare+ | +5 Defense, +4 Attack, +8 HP |
| Orikalkum Platebody | orikalkum | very-heavy | rare+ | +7 Defense, +12 HP, +2 Thorns |
| Necronium Platebody | necronium | very-heavy | epic+ | +8 Defense, +3 Attack, +10 HP, +1% Void proc chance |
| Bane Platebody | bane-metal | very-heavy | epic+ | +9 Defense, +15 HP, +3 Thorns, +5% Boss Damage |
| Elder Rune Platebody | elder-rune | very-heavy | legendary+ | +10 Defense, +18 HP, +2 Thorns, +1 Luck |
| Primal Platebody | primal-metal | very-heavy | legendary+ | +12 Defense, +25 HP, +3 Thorns, -2% Dodge |
| Masterwork Platebody | masterwork-alloy | heavy | Mythical | +10 Defense, +20 HP, +5 Attack, +2% Crit |
| Trimmed Masterwork Platebody | trimmed-masterwork | heavy | Mythical | +12 Defense, +25 HP, +7 Attack, +3% Crit, +2 Thorns |

All platebody entries above use `family: platebody` and tags `martial, plate, material-tier` plus their tier/theme tag.

## Platelegs candidates

| Item | material | weight | eligibility | first-pass intrinsic |
| --- | --- | --- | --- | --- |
| Bronze Platelegs | bronze | medium | poor+ | +1 Defense |
| Iron Platelegs | iron | medium | poor+ | +2 Defense |
| Steel Platelegs | steel | heavy | common+ | +3 Defense |
| Black Platelegs | black-metal | medium | common+ | +2 Defense, +1% Crit |
| Mithril Platelegs | mithril | medium | uncommon+ | +3 Defense, +1% Dodge |
| Adamant Platelegs | adamant | heavy | uncommon+ | +4 Defense, +5 HP |
| Rune Platelegs | rune-metal | heavy | rare+ | +5 Defense, +5 HP, +1 Luck |
| Dragon Platelegs | dragon-metal | heavy | rare+ | +4 Defense, +3 Attack, +1% Crit |
| Orikalkum Platelegs | orikalkum | heavy | rare+ | +6 Defense, +8 HP, +1 Thorns |
| Necronium Platelegs | necronium | heavy | epic+ | +7 Defense, +2 Attack, +1% Void proc chance |
| Bane Platelegs | bane-metal | very-heavy | epic+ | +8 Defense, +10 HP, +2 Thorns |
| Elder Rune Platelegs | elder-rune | very-heavy | legendary+ | +9 Defense, +12 HP, +1 Luck |
| Primal Platelegs | primal-metal | very-heavy | legendary+ | +10 Defense, +18 HP, +2 Thorns, -1% Dodge |
| Masterwork Platelegs | masterwork-alloy | heavy | Mythical | +8 Defense, +12 HP, +4 Attack, +1% Crit |
| Trimmed Masterwork Platelegs | trimmed-masterwork | heavy | Mythical | +10 Defense, +16 HP, +5 Attack, +2% Crit, +1 Thorns |

All plateleg entries above use `family: platelegs` and tags `martial, plate, material-tier` plus their tier/theme tag.

## Armoured-boot candidates

| Item | material | weight | eligibility | first-pass intrinsic |
| --- | --- | --- | --- | --- |
| Bronze Armoured Boots | bronze | medium | poor+ | +1 Defense |
| Iron Armoured Boots | iron | medium | poor+ | +1 Defense, +1 HP |
| Steel Armoured Boots | steel | heavy | common+ | +2 Defense |
| Black Armoured Boots | black-metal | medium | common+ | +1 Defense, +1% Crit |
| Mithril Armoured Boots | mithril | light | uncommon+ | +2 Defense, +1% Dodge |
| Adamant Armoured Boots | adamant | heavy | uncommon+ | +3 Defense, +3 HP |
| Rune Armoured Boots | rune-metal | heavy | rare+ | +4 Defense, +1 Luck |
| Dragon Armoured Boots | dragon-metal | medium | rare+ | +3 Defense, +2 Attack, +1% Crit |
| Orikalkum Armoured Boots | orikalkum | heavy | rare+ | +5 Defense, +1 Thorns, -1% Dodge |
| Necronium Armoured Boots | necronium | heavy | epic+ | +5 Defense, +2 Attack, +1% Void proc chance |
| Bane Armoured Boots | bane-metal | heavy | epic+ | +6 Defense, +2 Thorns, -1% Dodge |
| Elder Rune Armoured Boots | elder-rune | very-heavy | legendary+ | +7 Defense, +5 HP, +1 Luck |
| Primal Armoured Boots | primal-metal | very-heavy | legendary+ | +8 Defense, +8 HP, +1 Thorns, -1% Dodge |
| Masterwork Boots | masterwork-alloy | heavy | Mythical | +6 Defense, +3 Attack, +1% Crit |
| Trimmed Masterwork Boots | trimmed-masterwork | heavy | Mythical | +7 Defense, +4 Attack, +2% Crit, +5 HP |

All boot entries above use `family: armoured-boots` and tags `martial, plate, material-tier` plus their tier/theme tag.

## Shield candidates

| Item | material | weight | eligibility | first-pass intrinsic |
| --- | --- | --- | --- | --- |
| Bronze Round Shield | bronze | medium | poor+ | +1 Defense |
| Iron Round Shield | iron | medium | poor+ | +2 Defense |
| Steel Kiteshield | steel | heavy | common+ | +3 Defense, +1 Thorns |
| Black Kiteshield | black-metal | medium | common+ | +2 Defense, +1% Crit, +1% Dodge |
| Mithril Kiteshield | mithril | medium | uncommon+ | +3 Defense, +2% Dodge |
| Adamant Kiteshield | adamant | heavy | uncommon+ | +5 Defense, +5 HP |
| Rune Kiteshield | rune-metal | heavy | rare+ | +6 Defense, +1 Luck |
| Dragon Square Shield | dragon-metal | heavy | rare+ | +5 Defense, +2 Attack, +2 Thorns |
| Orikalkum Kiteshield | orikalkum | very-heavy | rare+ | +7 Defense, +3 Thorns, -1% Dodge |
| Necronium Kiteshield | necronium | very-heavy | epic+ | +8 Defense, +2 Attack, +2 Thorns |
| Bane Square Shield | bane-metal | very-heavy | epic+ | +9 Defense, +4 Thorns, +5% Boss Damage |
| Elder Rune Round Shield | elder-rune | very-heavy | legendary+ | +10 Defense, +4 Thorns, +8 HP |
| Primal Kiteshield | primal-metal | very-heavy | legendary+ | +12 Defense, +5 Thorns, +12 HP, -2% Dodge |

Shield entries use `family: shield` or the obvious `kiteshield` / `round-shield` / `square-shield` subtype and tags `martial, guardian, material-tier`.

---

# B. Diablo II-inspired base-type expansion

## Design rule

Diablo II is useful here because it treats **mundane base shape** as meaningful loot identity. A Poleaxe, Flail, Circlet, Mage Plate and Pavise are not just synonyms for `weapon`, `hat`, `chest` and `offhand`.

DiceBound should steal that *density of vocabulary*.

The names below are candidate mundane bases. They can later receive whatever rarity, rolled affixes, special rarity or Artifact/set wrapper DiceBound generates.

## Weapon-type pool

These are deliberately mostly generic/historical fantasy terms; exact first-pass balance can be set when an item is promoted into `weapon.md`.

| Candidate | family | rough identity |
| --- | --- | --- |
| Hand Axe | axe | light axe; Attack + Crit |
| Double Axe | axe | heavier axe; more Attack, small Dodge penalty |
| Great Axe | greataxe | very-heavy burst Attack |
| Scimitar | sword | light curved sword; Crit/Dodge |
| Falchion | sword | medium curved sword; Attack/Crit |
| Crystal Sword | sword | magical sword; Attack + Mana/Echo potential |
| Claymore | greatsword | heavy two-handed Attack |
| Flamberge | greatsword | heavy sword; Attack + Thorns/Fire theme candidate |
| Club | club | cheap blunt starter |
| Spiked Club | club | Attack + Thorns |
| Morning Star | mace | Attack + Thorns |
| Flail | flail | Attack + Echo identity candidate |
| Short Bow | bow | light ranged Crit |
| Composite Bow | bow | stronger ranged baseline |
| Long War Bow | longbow | heavy ranged Attack/Crit |
| Light Crossbow | crossbow | Crit-focused ranged base |
| Heavy Crossbow | crossbow | high Attack, Dodge penalty |
| Repeating Crossbow | crossbow | Echo-focused ranged base |
| Kris | dagger | Crit-heavy dagger |
| Javelin | javelin | Attack + Crit; thrown/melee identity |
| Pilum | javelin | heavier javelin; Attack + Defense |
| Glaive | javelin | long thrown blade; Attack + Echo |
| Bardiche | polearm | heavy polearm, high Attack |
| Voulge | polearm | heavy polearm, Attack + Thorns |
| Scythe | polearm | Attack + Lifesteal/occult candidate |
| Poleaxe | polearm | high Attack, modest Crit |
| Halberd | polearm | Attack + Defense |
| Grand Scepter | scepter | Mana + Light proc candidate |
| War Scepter | scepter | Attack + Mana + Light proc |
| Trident | spear | Attack + Ice/Water theme candidate |
| Pike | spear | very-high Attack, Dodge penalty |
| Gnarled Staff | staff | Mana + Nature/Void potential |
| Battle Staff | staff | Mana + flat Attack |
| War Staff | staff | high Mana + Echo |
| Bone Wand | wand | Mana + Lifesteal/Void candidate |
| Grim Wand | wand | Mana + Void proc/Echo candidate |
| Throwing Knife | throwing-knife | Crit/Dodge |
| Throwing Axe | throwing-axe | Attack/Crit |
| Balanced Knife | throwing-knife | Crit/Echo |
| Balanced Axe | throwing-axe | Attack/Echo |
| Katar | katar | Crit + Attack; assassin-style hand weapon |
| Claws | katar | Crit + Echo; fast-strike identity |
| Sacred Globe | orb | Mana + Light proc |
| Smoked Sphere | orb | Mana + Void/Fire candidate |

### Diablo-style weapon families to preserve in the catalogue

`axe`, `bow`, `crossbow`, `dagger`, `javelin`, `mace`, `polearm`, `scepter`, `spear`, `staff`, `sword`, `throwing-knife`, `throwing-axe`, `wand`, `katar`, `orb`.

## Chest/body-armour pool

Several Diablo-style bodies already exist in `chest.md` (Quilted Armour, Leather Armour, Hard Leather Armour, Studded Leather, Ring Mail, Scale Mail, Chain Mail, Plate Mail, Field Plate, Gothic Plate, Light Plate, Full Plate, Ancient Armour). Keep those rather than duplicating them.

Add/use these additional base identities when the chest catalogue expands:

| Candidate | family | weight | rough identity |
| --- | --- | --- | --- |
| Breast Plate | breastplate | light | Defense with less Dodge penalty |
| Splint Mail | splint-mail | medium | Defense + Thorns |
| Full Plate Mail | full-plate-mail | very-heavy | high Defense/HP, Dodge penalty |
| Ghost Armor | ghost-armour | light | Dodge + Void proc |
| Serpentskin Armor | serpentskin | light | Dodge + Nature proc |
| Demonhide Armor | demonhide | medium | Attack + Fire/Void proc |
| Trellised Armor | trellised-armour | medium | Defense + Dodge |
| Linked Mail | linked-mail | medium | Defense + Thorns |
| Tigulated Mail | tigulated-mail | heavy | high Defense, small Dodge penalty |
| Cuirass | cuirass | medium | clean Defense baseline |
| Mesh Armor | mesh-armour | medium | Defense + Dodge |
| Russet Armor | russet-armour | medium | Defense + Fire resistance/proc candidate |
| Mage Plate | mage-plate | light | Defense + Mana |
| Sharktooth Armor | sharktooth-armour | medium | Defense + Thorns |
| Templar Coat | templar-coat | heavy | Defense + Light proc + HP |
| Embossed Plate | embossed-plate | heavy | Defense + Luck |
| Chaos Armor | chaos-armour | very-heavy | Defense + Echo/Luck; weird |
| Ornate Plate | ornate-plate | heavy | Defense + Gold Gain/Luck |
| Dusk Shroud | dusk-shroud | light | Dodge + Void proc |
| Wyrmhide | wyrmhide | light | Dodge + HP + elemental proc candidate |
| Scarab Husk | scarab-husk | medium | Defense + Thorns |
| Wire Fleece | wire-fleece | medium | Defense + Thorns + Dodge |
| Diamond Mail | diamond-mail | medium | Defense + Light proc |
| Loricated Mail | loricated-mail | heavy | high Defense + Thorns |
| Great Hauberk | hauberk | heavy | Defense + HP |
| Boneweave | boneweave | medium | Defense + Lifesteal/Void candidate |
| Balrog Skin | balrog-skin | heavy | Attack + Fire proc + Defense |
| Archon Plate | archon-plate | medium | strong Defense without full heavy penalty |
| Kraken Shell | kraken-shell | heavy | Defense + HP + Ice/Water theme |
| Hellforge Plate | hellforge-plate | very-heavy | Defense + Fire proc + Thorns |
| Lacquered Plate | lacquered-plate | heavy | Defense + Luck/Dodge |
| Shadow Plate | shadow-plate | very-heavy | Defense + Void proc, Dodge penalty |
| Sacred Armor | sacred-armour | very-heavy | very high Defense + HP + Light proc |

## Hat/head pool

Existing entries already cover `Circlet`, multiple crowns and multiple helms. Add these additional mundane identities:

| Candidate | family | weight | rough identity |
| --- | --- | --- | --- |
| Cap | cap | light | tiny Dodge/Crit baseline |
| Skull Cap | skull-cap | light | Defense + occult tag |
| Full Helm | full-helm | heavy | Defense baseline |
| Great Helm | great-helm | very-heavy | high Defense, Dodge penalty |
| Mask | mask | light | Dodge/Echo/weird |
| Crown | crown | medium | Luck + Defense |
| Coronet | circlet | light | Mana + Crit |
| Tiara | circlet | light | Mana + Luck + Crit |
| Diadem | circlet | light | high Mana + Luck/Echo |
| War Hat | war-hat | light | Attack + Dodge |
| Sallet | sallet | medium | Defense + Dodge |
| Casque | casque | medium | Defense + Crit |
| Basinet | basinet | heavy | Defense + HP |
| Winged Helm | winged-helm | heavy | Defense + Attack + Dodge |
| Death Mask | death-mask | medium | Lifesteal/Void theme |
| Grand Crown | crown | heavy | Defense + Luck |
| Grim Helm | grim-helm | medium | Defense + Void proc |

## Boots pool

Existing DiceBound boots already cover many fantasy shoe/greave ideas. Add these classic armour-weight variants:

| Candidate | family | weight | rough identity |
| --- | --- | --- | --- |
| Heavy Boots | boots | medium | Defense, small Dodge penalty |
| Chain Boots | chain-boots | medium | Defense + Dodge |
| Light Plated Boots | plated-boots | medium | Defense + Dodge |
| Demonhide Boots | demonhide-boots | light | Dodge + Fire/Void proc |
| Sharkskin Boots | sharkskin-boots | light | Dodge + HP |
| Mesh Boots | mesh-boots | medium | Defense + Dodge |
| Battle Boots | battle-boots | heavy | Attack + Defense |
| War Boots | war-boots | heavy | Attack + Defense + Thorns |

## Offhand/shield pool

Existing DiceBound entries already cover Buckler, Kite Shield, Tower Shield and Spiked Buckler/other shield families. Add:

| Candidate | family | weight | rough identity |
| --- | --- | --- | --- |
| Small Shield | shield | light | Defense + Dodge |
| Large Shield | shield | medium | Defense + HP |
| Bone Shield | bone-shield | light | Defense + Void/Lifesteal candidate |
| Gothic Shield | gothic-shield | medium | Defense + Thorns + Void proc |
| Defender | shield | light | Defense + Dodge |
| Round Shield | round-shield | medium | Defense baseline |
| Scutum | shield | heavy | Defense + HP |
| Barbed Shield | barbed-shield | medium | Defense + Thorns |
| Dragon Shield | dragon-shield | heavy | Defense + Attack/Fire candidate |
| Grim Shield | grim-shield | medium | Defense + Void proc |
| Pavise | pavise | very-heavy | very high Defense, Dodge penalty |
| Ancient Shield | ancient-shield | heavy | Defense + Luck/Thorns |

## Diablo-style armour categories not currently represented as their own DiceBound slots

Diablo II also treats **Gloves** and **Belts** as independent equipment slots. DiceBound currently does not.

Do **not** add new runtime slots just because this source pool mentions them, but preserve them as future design inspiration:

### Future glove families
- Leather Gloves
- Heavy Gloves
- Chain Gloves
- Light Gauntlets
- Gauntlets
- Demonhide Gloves
- Sharkskin Gloves
- Heavy Bracers
- Battle Gauntlets
- War Gauntlets
- Bramble Mitts
- Vampirebone Gloves
- Vambraces
- Crusader Gauntlets
- Ogre Gauntlets

### Future belt families
- Sash
- Light Belt
- Belt
- Heavy Belt
- Plated Belt
- Demonhide Sash
- Sharkskin Belt
- Mesh Belt
- Battle Belt
- War Belt

These are **backburner slot ideas only**, not a decision to expand the current eight-slot equipment model.

---

# C. What to do when one of these gets selected

Before art or runtime implementation for an entry from this pool:

1. review the exact name and decide whether it remains generic enough or needs a DiceBound-original rename;
2. confirm slot/family/material/weight/tags;
3. give it a final `eligibility` and `intrinsic` using `docs/GAMEPLAY_VOCABULARY.md`;
4. copy/refine the approved entry into the normal slot file if useful;
5. then request/generate art from that reviewed version.

The same core rule still applies:

> Axel's reviewed item-specific version wins over every first-pass suggestion in this file.
