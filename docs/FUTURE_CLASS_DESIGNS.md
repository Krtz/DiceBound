# DiceBound Future Class Designs

> Exploratory design companion to `docs/CLASS_LORE.md`.
>
> These are **first-pass kits and lore directions**, not implementation instructions or final balance. Numbers exist so we have something concrete to react to. Axel's later decisions override this document.

---

# Design rule

A future class should answer three questions:

1. **What does the player do differently every combat?**
2. **What stat/build direction makes that identity stronger?**
3. **Why does the Road remember this as a distinct Way?**

A new class should not exist only because its base stats differ.

---

# Dragoon — The Way Above the Road

**Status:** planned; tracked in #97.

The Road is very good at deciding what is next to what.

Dragoon discovered a loophole: leave.

For one impossible moment, the Dragoon is no longer standing on the Road at all. Ordinary attacks fail because there is no valid target where the traveler was. Then gravity, memory and violence agree on the same answer at once.

The landing is called **Jump** not because the movement is mundane, but because every older name for the technique has been lost.

### First-pass base stats

- 42 HP
- 7 Attack
- 1 Defense
- 8% Crit
- 4% Dodge
- 4% Echo
- ordinary Guard strength

### Actions

**Spear Thrust** — normal immediate Attack action.

**Jump** — leave the battlefield for one enemy-action window. Ordinary attacks cannot hit an Airborne Dragoon. On the next Dragoon turn, automatically land for roughly **240% Attack damage**, then Jump enters a **6-turn cooldown**.

Landing consumes the Dragoon's action for that turn. It is not free damage followed by another attack.

### Class-upgrade Talent

**High Jump** — reduce Jump cooldown by 1 turn per rank. Minimum cooldown should probably stop around 2–3 turns rather than reaching zero.

### Ultimate idea

**Falling Star** — leap beyond ordinary Airborne height and crash into the entire enemy pack for heavy damage. Boss specials explicitly tagged to hit Airborne can still matter during the setup.

### Unlock lore

Defeating the Board 4 miniboss demonstrates that the traveler has survived the Road's increasingly formal attempts to define where they belong.

The Road remembers a warrior whose answer to imposed position was simply:

> **Up.**

---

# Gambler — The Way of the Wager

**Status:** planned concept; tracked in #98.

The Twenty-Sider asks probability what can happen.

The Gambler asks probability what it is willing to lose.

A Gambler does not merely hope for good outcomes. They deliberately attach stakes to uncertainty. The Road is forced to choose not only what happens, but whether it accepts the terms of the wager.

### First-pass base stats

- 35 HP
- 6 Attack
- 1 Defense
- 10% Crit
- 6% Dodge
- +10 Luck

### Core resource: Ante

The Gambler can build a small **Ante** meter by accepting risky results. Ante is spent to improve or manipulate later wagers.

### Action ideas

**Coin Toss** — choose a target and call Heads or Tails.
- correct call: deal ~160% Attack damage and gain 1 Ante;
- wrong call: deal ~70% Attack damage.

**Double Down** — spend 1 Ante before the next Coin Toss. Correct call greatly amplifies the reward; wrong call causes a real penalty such as self-damage or lost Ultimate charge.

**Roll the Bones** — roll a d6 for a visible, learnable six-result mini-table. Unlike Twenty-Sider, the player chooses when to invoke the risk.

### Ultimate idea

**All In** — choose between two dangerous wagers before the roll. Potentially huge payoff, but never a guaranteed safe button.

### Class-upgrade Talent

Possible direction: one rank adds a limited **Loaded Coin** charge per battle that lets the player flip again after seeing the result. Higher ranks add charges or improve Ante conversion.

### Unlock lore

Repeated three-of-a-kind slot-machine results teach the Road that this traveler no longer experiences matching outcomes as isolated luck.

A pattern has formed.

The Road remembers somebody willing to bet on it.

---

# Invoker — The Way of Deliberate Combination

**Status:** unfinished class direction; tracked in #37.

Many spellcasters ask the Road for a spell.

Invoker asks for ingredients.

The Way remembers traditions in which magic was understood as a grammar: small stable principles combined in different orders to create larger effects. The terrifying part is not any individual spell. It is the implication that reality has syntax.

### First-pass base stats

- 32 HP
- 6 Attack
- 0 Defense
- 8% Crit
- 3% Dodge
- 20/100 Mana
- +5 Luck

### Core mechanic

Invoker cycles or chooses three **Invocations**/essences. The current sequence determines the available Mana-spender spell.

The final names should be original DiceBound identities even if the prototype took inspiration from another game.

Possible three-principle set:
- **Force** — damage / impact;
- **Motion** — Echo / speed / lightning;
- **Form** — defense / ice / persistence.

Three slots produce combinations such as:
- Force + Force + Force -> enormous single-target blast;
- Motion + Motion + Motion -> rapid multi-hit spell;
- Form + Form + Form -> barrier/freeze effect;
- Force + Motion + Form -> unstable all-purpose spell;
- mixed doubles produce additional authored spells.

### Unlock

Cast **100 qualifying Mana-spender spells across the career**.

### Ultimate idea

**Perfect Syntax** — for several actions, invoked spells do not consume their normal sequence and/or may be cast at enhanced strength.

### Class-upgrade Talent

Could reduce invocation friction: retain one essence between casts, gain starting Mana, or unlock a fourth temporary wildcard slot at the final rank.

---

# Illusionist — The Way of the Wrong Target

**Status:** exploratory; tracked in #101.

The Road normally collapses several possibilities into one location.

Illusionist politely declines.

An Illusionist does not become invisible. They make multiple positions remain *plausible* for slightly too long. Enemies attack an answer the Road has not yet decided was wrong.

### First-pass base stats

- 31 HP
- 5 Attack
- 0 Defense
- 16% Dodge
- 8% Crit
- 15/100 Mana
- +8 Luck

### Core mechanic: Images

Successful Dodges create **Image** stacks, perhaps capped at 3.

Images can be spent on spells/actions rather than merely adding passive Dodge.

### Actions

**Prismatic Bolt** — modest attack; builds Mana.

**Misdirect** — spend Mana or an Image to apply Confusion and gain a short Dodge bonus.

**False Opening** — spend an Image so the next enemy hit is redirected into an illusion; if the attack misses the real traveler, gain Ultimate charge.

### Ultimate idea

**Hall of Mirrors** — apply Confusion to all enemies, gain maximum Images, and make the next several enemy target checks substantially less reliable.

### Class-upgrade Talent

Increase maximum Images by 1 per rank or make the first Dodge each battle create an additional Image.

### Identity rule

Ninja = Crit + personal evasion + smoke.

Illusionist = target manipulation + Confusion + making the enemy choose incorrectly.

---

# Liquid Mirror / Mirror — The Way of Immediate Reflection

**Status:** exploratory; tracked in #107.

Most Ways tell the Road what the traveler is.

The Mirror Way asks what the enemy is and answers:

> **For now? That.**

Its identity is deliberately weak. Another creature's remembered shape can temporarily overwrite it.

### First-pass base stats

The untransformed form should be mediocre but survivable:

- 40 HP
- 5 Attack
- 1 Defense
- 5% Crit
- 5% Dodge

### Core mechanic: Reflect Form

At battle start, choose one enemy in the encounter. The Mirror assumes a player-safe version of that enemy's identity.

It should copy:
- visual silhouette/form where practical;
- one normal attack pattern;
- one signature mechanic/skill;
- an adapted weakness/affinity identity where fun.

It should **not** copy raw boss HP or arbitrary enemy AI functions.

### Action ideas

**Reflected Strike** — attack using the copied enemy's basic style.

**Borrowed Trick** — use the adapted signature skill on a cooldown/resource.

### Ultimate idea

**Perfect Reflection** — temporarily access an enhanced version of the copied signature or copy a second enemy mechanic from the current encounter.

### Unlock

Strongest thematic candidate: defeat **The Hateful Mirror** (#106).

### Class-upgrade Talent

Improve copied-skill cooldown/potency and, at a high rank, preserve one previously copied minor trait between battles.

---

# Blue Mage — The Way of Stolen Lessons

**Status:** exploratory; tracked in #107.

A Blue Mage does not become the monster.

They remember what the monster taught them.

The Road contains countless hostile patterns that never stabilized into full heroic Ways. Blue Mages collect fragments of those patterns anyway, turning enemies into a spellbook reality did not intend the traveler to read.

### First-pass base stats

- 37 HP
- 6 Attack
- 1 Defense
- 7% Crit
- 5% Dodge
- 25/100 Mana

### Core mechanic: Learned Skills

Enemy abilities may carry explicit `learnable` metadata with an authored player-safe version.

The Blue Mage has a persistent **Blue Library** of learned skills.

Base loadout capacity suggestion: **3 equipped enemy skills**.

The player chooses which learned skills are active for the run/class loadout.

### Learning rule ideas

A skill might be learned by:
- surviving being hit by it;
- witnessing it;
- defeating the enemy after witnessing it;
- or a mixture depending on skill rarity.

Boss skills should require deliberate adapted versions rather than copying boss code.

### Normal action

**Azure Strike** — ordinary low-complexity attack/Mana builder so the class is never bricked by a bad loadout.

### Ultimate idea

**Enemy Archive** — temporarily cast one equipped learned skill at greatly increased potency, or invoke all equipped skills once in sequence at reduced individual strength.

### Class-upgrade Talent

Increase equipped Learned Skill capacity by **+1 per rank**. This is a very natural place for the existing class-upgrade Talent to matter strongly.

A Legendary equipment effect could grant another skill slot or improve learned-skill potency.

### Unlock

TBD. The Hateful Mirror could unlock Mirror instead, leaving Blue Mage a collection-themed requirement such as encountering/learning a certain number of enemy techniques.

---

# Necromancer — The Way of Useful Remains

**Status:** exploratory; depends heavily on #100 player-side allied entities.

The Road is obsessed with deciding which things are still true.

Necromancers are less picky.

To a Necromancer, a dead creature is not gone. It is simply a pattern whose owner has stopped objecting to reuse.

### First-pass base stats

- 33 HP
- 5 Attack
- 0 Defense
- 6% Crit
- 0% Dodge
- 30/100 Mana

### Core mechanic: Skeleton allies

Skeletons are **real allied combat entities**:
- targetable by enemies;
- have HP;
- can die;
- can attack;
- can receive some statuses/effects if the future allied-entity rules allow it.

First-pass cap: **2 Skeletons**.

Possible Skeleton baseline per summon:
- HP = ~25% of Necromancer max HP;
- Attack = ~45% of Necromancer Attack;
- low/no Defense.

These numbers are placeholders.

### Actions

**Bone Bolt** — ordinary attack and Mana builder.

**Raise Skeleton** — spend Mana to create a Skeleton if below cap.

**Command Dead** — choose a Skeleton target/action; could become the class's agency tool if summons otherwise act automatically.

### Passive idea

**Grave Economy** — whenever a Skeleton dies, gain Mana and/or Ultimate charge. Losing summons should be painful but not purely failure.

### Ultimate idea

**Open the Grave** — fill empty summon slots and immediately command all Skeletons to attack once.

### Class-upgrade Talent

Potentially +1 maximum Skeleton per selected ranks, or improved summon stats. Be careful: action economy grows violently with summon count.

---

# 2d10 — The Way of the Unhelpful Appendix

**Status:** secret-class concept; tracked in #108.

The Twenty-Sider reveals twenty outcomes.

2d10 reveals a filing system.

Somewhere in the Road there appears to be an **encyclopedia of consequences** with one hundred entries. Nobody knows who wrote it. Nobody knows why result 43 has anything to do with bees. Most scholars insist the book is metaphorical until result 43 occurs.

The 2d10 Way does not control the table.

It consults it.

### First-pass base stats

- 40 HP
- 6 Attack
- 1 Defense
- 5% Crit
- 5% Dodge
- +5 Luck

The class's strength should come primarily from the percentile table, not amazing starting stats.

### Core action

**Consult the Table** — roll percentile dice and resolve exactly one authored result from 01–100.

Every number has its own canonical effect.

Some results are good.
Some are terrible.
Some are extremely situational.
Some should make the player say "what the hell does 73 do again?"

### Encyclopedia progression

The first time an outcome is rolled, permanently reveal that entry in an optional **2d10 Encyclopedia**.

Before discovery:

`73 — ???`

After discovery:

`73 — [canonical effect name and description]`

This creates a natural long-tail class mastery goal and an achievement for discovering all 100.

### Class-upgrade Talent ideas

Do not simply make every roll better. Preserve volatility.

Better ideas:
- rank 1: once per battle, swap the tens and ones dice after rolling;
- rank 2: once per battle, reroll one die;
- rank 3: preview the names (not exact effects) of two nearby results before choosing a one-die reroll;
- final rank: very rarely mark a result as "familiar" and grant a small bonus when it recurs.

### Ultimate idea

**Cross-Reference** — roll two percentile results and resolve both.

Yes, this can absolutely make things worse.

That is the point.

---

# D&D Dice Set — backburner seed only

Not a planned class yet.

The joke/concept is a single character composed of the classic tabletop dice set: d4, d6, d8, d10, d12, d20 and percentile die/d10.

Each die could represent a different stance/action domain, with the whole "person" behaving like an argumentative probability committee.

Do not create implementation scope yet. Preserve it in the idea vault because it is too stupid to lose.

---

# Fighter / Defender split — exploratory naming and role question

The **current Fighter** is mechanically much closer to a defender/guardian archetype:
- strong Guard;
- Counterstance;
- Barriers;
- Defense scaling;
- Titan Cleave that reinforces survivability.

There is a legitimate future question whether to:

### Option A — keep Fighter

Treat "Fighter" as a broad durable warrior and add a new offensive class under another name such as Warrior, Slayer, Duelist or Vanguard.

### Option B — rename current Fighter

Possible names:
- **Defender** — extremely clear, slightly plain;
- **Guardian** — clear but overlaps guardian/boss terminology;
- **Vanguard** — more flavorful, implies front line rather than pure turtle play;
- **Sentinel** — defensive and readable;
- **Bulwark** — strongest defensive identity, but sounds less like a person/class.

Then introduce a new **Fighter** focused on weapon offense.

### Possible offensive Fighter identity

If the name is freed, the new Fighter should not become Berserker-without-Rage or Monk-without-Combo.

One promising identity is **Weapon Tempo**:
- normal attacks build **Pressure**;
- Crits add extra Pressure;
- Guard does not build Pressure and may reduce it;
- spend Pressure on heavy techniques;
- offense ramps through staying engaged rather than missing HP (Berserker) or unbroken attack sequence (Monk).

First-pass stats:
- 43 HP
- 8 Attack
- 1 Defense
- 10% Crit
- 2% Dodge

Possible Ultimate: **Weaponmaster's Assault** — a sequence of heavy hits whose count/potency scales with current Pressure.

**No rename decision is locked.** This section exists so the thought survives until the roster is reviewed as a whole.
