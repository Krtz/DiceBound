# DiceBound Legendary Equipment Effect Ideas

> First-pass design bank for future Legendary equipment work.
>
> These are **Legendary effects**, not equipment-base Intrinsics. A Legendary item can still sit on a weak/strong authored base and roll ordinary affixes according to the eventual gear-generation rules.
>
> Nothing here is final balance. The point is to create memorable build-changing effects worth hunting.

---

# Design rules

A good Legendary effect should usually do at least one of these:

- alter how a familiar action is used;
- create a build-around incentive;
- reward a stat that otherwise risks becoming generic;
- change decision-making rather than only adding `+20% damage`;
- create funny but legible interactions with DiceBound's existing systems.

Avoid making every Legendary universally correct. Some should be fantastic on one build and mediocre on another.

Numbers below are first-pass placeholders.

---

# Weapons

## Echo Forge
**Effect:** Echo Strikes deal +25% damage. Every third Echo Strike in a battle triggers one random elemental proc at 50% normal proc strength.

Build identity: Echo + elemental hybrid.

## Executioner's Argument
**Effect:** Your first hit against an enemy below 35% HP deals +100% damage. If that hit kills, gain 15 Ultimate charge.

Build identity: cleanup/execution without duplicating the existing hard Execute mechanic.

## Blood Debt
**Effect:** +20% Lifesteal. Overhealing from Lifesteal stores up to 20% max HP as **Blood Debt**; your next basic attack consumes the stored amount to deal that much bonus damage.

Build identity: aggressive sustain conversion.

## Elemental Loaded Chamber
**Effect:** Every basic attack cycles to the next element in a visible six-element sequence. That element gains +8% proc chance for that attack only.

Build identity: predictable elemental rotation instead of pure RNG.

## Bossbreaker
**Effect:** +20% Boss Damage. Every time a boss uses its special attack, permanently gain +3% Boss Damage for the rest of that battle.

Build identity: long guardian fights become increasingly favorable.

---

# Offhands

## Mirror Buckler
**Effect:** When you Dodge, deal 50% of the avoided attack's pre-mitigation damage back to the attacker. Can trigger once per enemy action.

Build identity: Dodge becomes retaliation.

## Second Opinion
**Effect:** The first elemental proc each battle triggers a second random *different* element at 40% normal strength.

Build identity: proc diversity and elemental chaos.

## Portable Accounting Department
**Effect:** Selling gear gives +50% Gold. Every 500 Gold gained during the run grants +1 Attack, up to +10 Attack.

Build identity: wealth becomes offense.

## Emergency Reservoir
**Effect:** If you would spend Mana while below 20 Mana, gain 20 Mana once per battle before the spell resolves.

Build identity: protects Mana-spender classes from one bad dry turn.

## Thorned Aegis
**Effect:** +5 Thorns. Whenever Thorns deals damage, gain 2 Ultimate charge. Maximum 20 charge per enemy action.

Build identity: tank retaliation.

---

# Boots

## Seven-League Boots
**Effect:** After rolling movement, if the roll was 5 or 6, move +1 additional tile. If this causes a guardian encounter, gain a Battle Barrier at combat start.

Build identity: faster Road progression with a little risk insulation.

## Phasewalkers
**Effect:** +10% Dodge. After a successful Dodge, your next basic attack cannot be Dodged and deals +25% damage.

Build identity: evasion into tempo.

## Coward's Triumph
**Effect:** Every time you Guard instead of attacking, gain +3% Dodge until your next attack. Stacks up to 5 times; all stacks are consumed on attack.

Build identity: defensive setup into evasive burst.

## Recursion Boots
**Effect:** The first time each battle an Echo Strike triggers, gain +5% Echo for the rest of that battle. Maximum +25%.

Build identity: Echo snowball.

## Boots of Questionable Direction
**Effect:** Whenever an extra-step effect triggers, gain a random temporary combat bonus for the next battle: +10% Crit, +10% Echo, +10% Dodge or +20% Gold Gain.

Build identity: Road movement feeds combat unpredictably.

---

# Legs

## Last Stand Greaves
**Effect:** Below 35% HP, gain +4 Defense and +20% damage. The bonuses disappear after healing above 35%.

Build identity: controlled danger without duplicating Berserker's exact Rage formula.

## Loaded Trousers
**Effect:** +15 Luck. Once per battle, when an RNG check fails by 5 percentage points or less, treat it as successful instead.

Build identity: Luck becomes visibly clutch rather than only statistical.

## Rooted Plate
**Effect:** If you did not Dodge last enemy action, gain +1 Defense for the rest of the battle, up to +5. Any successful Dodge resets the bonus.

Build identity: heavy immovable armor dislikes evasive builds.

## Venom Reservoir
**Effect:** Poison damage you deal stores 10% of its damage. On your Ultimate, consume the stored value as bonus damage divided across living enemies.

Build identity: Poison builds toward burst.

## March of the Dead
**Effect:** Future summon-capable classes: allied summons gain +15% max HP and +15% damage. When a summon dies, the hero gains a Battle Barrier.

Build identity: explicit Necromancer/summon chase item; harmlessly niche before that ecosystem exists.

---

# Chests

## Crown of Thorns
**Effect:** +8 Thorns. Each time Thorns triggers, gain +2% Attack for the rest of the battle, up to +20%.

Build identity: being hit makes retaliation more dangerous.

## Voidcoat
**Effect:** The first time each battle you fall below 25% HP, become **Untouchable** against ordinary attacks until after your next action. Boss specials explicitly marked unavoidable/anti-phase may still hit.

Build identity: dramatic emergency window rather than a simple revive.

## Heroic Cardigan
**Effect:** +25 HP, +3 Defense, +50 Cool. Every 25 Cool grants +1% Crit and +1% Dodge.

Build identity: this is the first possible proof that Cool may actually matter, while remaining funny on gear that only provides Cool elsewhere.

## Resonant Carapace
**Effect:** Guardian classes gain +5% elemental proc chance on qualifying Guard/counter actions. Non-guardian classes gain +2% instead.

Build identity: preserve the existing desired guardian resonance direction while still functioning universally.

## Second Skin
**Effect:** At battle start, copy the strongest single positive flat stat Intrinsic from another equipped base at 50% value for this battle.

Build identity: makes base hunting/composition matter in a strange way.

---

# Hats

## Crown of Impossible Fortune
**Effect:** +20 Luck. Once per battle, after any visible random outcome, you may automatically reroll that outcome if the system supports a safe reroll hook. The second result is final.

Build identity: active probability control. Needs careful system ownership.

## Tin Foil Crown
**Effect:** +10% Dodge. Immune to Confusion. Math elemental damage against you is reduced by 25%.

Build identity: deeply stupid and potentially excellent once Math exists.

## Helm of the Audience
**Effect:** Crits generate 3 extra Ultimate charge. When Ultimate reaches 100%, gain +10% Crit until the Ultimate is used.

Build identity: crit-to-ultimate feedback loop.

## Chef's Crown
**Effect:** Donut procs deal +25% damage and heal +25% more than their current Donut values. Potion Healing also increases Donut healing at 25% of its value.

Build identity: Donut specialist without making Holy obsolete.

## Hat of Bad Ideas
**Effect:** At the start of each battle, gain one random Legendary-style temporary modifier and one random drawback for that battle.

Build identity: Clown/2d10/Gambler bait. Requires a curated safe table.

---

# Rings

## Ouroboros Ring
**Effect:** The first non-unique Powerup you gain each Board is echoed at 50% of its numeric effect where safely representable. If it cannot be safely echoed, gain +5% Echo instead.

Build identity: recursion; implementation needs explicit supported effects, not text parsing.

## Loaded Signet
**Effect:** +10 Luck, +5% Crit, +5% Echo. Rolling the maximum value on the movement die doubles those bonuses for the next battle.

Build identity: die outcome affects combat preparation.

## Ring of Spite
**Effect:** When an enemy Dodges your attack, your next hit against that enemy deals +50% damage and cannot be Dodged.

Build identity: anti-evasion.

## Ring of the Fifth Answer
**Effect:** Every fifth basic attack in a battle repeats at 60% damage as a guaranteed Echo that cannot itself create further Echoes.

Build identity: deterministic recursion.

## Bloodglass Signet
**Effect:** +15% Lifesteal. If Lifesteal would heal while at full HP, convert 40% of that healing into Energy Shield.

Build identity: overheal tanking.

---

# Amulets

## Saint's Receipt
**Effect:** Healing yourself also grants 10% of the amount healed as temporary bonus damage on your next qualifying attack, capped at 50% of Attack.

Build identity: Holy/Cleric/Paladin healing becomes offense without making healing itself deal damage.

## Blue Archive Locket
**Effect:** Future Blue Mage effect: +1 equipped Learned Skill slot. Learned Skills deal/heal +10%.

Build identity: obvious ultra-desirable Blue Mage chase item.

## Packlord's Whistle
**Effect:** +25% Pet Damage. After the hero uses an Ultimate, the active pet immediately performs one bonus attack at 50% normal pet damage.

Build identity: pet classes.

## Last Equation Fragment
**Effect:** At battle start, one of Attack, Defense, Crit, Dodge or Echo is marked as the **Variable**. Gain +20% to that stat's effective contribution for the battle. The chosen Variable is visible.

Build identity: mathematical instability without hidden effects.

## Hateful Shard
**Effect:** At battle start, copy 20% of the enemy's highest relevant combat stat into the corresponding player stat for that battle, with explicit caps for boss-safe values.

Build identity: future reward/theme from The Hateful Mirror.

---

# Cross-slot Legendary set-seed ideas

These are not full Artifact sets yet, merely possible repeated Legendary themes.

### The Accountant's Error
Several pieces convert Gold milestones into combat power, but each uses a different stat. A late-game wealth build can become genuinely combat-capable without every class becoming CEO/Merchant.

### Glass Road
Very high Crit/Echo/Dodge bonuses paired with negative Defense/HP. Excellent when ahead, terrifying when hit.

### Rejected Answer
Effects become stronger when the player fails checks, misses, is Dodged, or receives a bad roll. A deliberately anti-luck build.

### Cool Guy Set
Multiple otherwise respectable items provide suspicious amounts of Cool. Do not immediately explain the payoff.

### Blue Archive
Future Blue Mage-supporting gear can add Learned Skill slots, Mana efficiency, or improve enemy-skill potency without making the base class unusable without the set.

---

# Balance warning

Legendary effects are allowed to be asymmetric and build-specific, but avoid creating one item that is simply the best possible choice for every class and every run.

The desired chase has several independent axes:

**Legendary/special effect + equipment base + ordinary affixes + build context.**

A mediocre base carrying a perfect Legendary effect can still be exciting. Later, the player hunts that same effect on a better base and better rolls.
