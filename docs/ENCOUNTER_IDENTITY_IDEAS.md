# DiceBound Encounter Identity Ideas

> First-pass design bank for issues #74 and #92.
>
> This document is **not final balance**. It exists so monsters and guardians have recognizable behaviors before Codex implementation work begins. Numbers are placeholders unless already established elsewhere.

---

# Design rule

Ordinary monsters should usually have **one memorable rule**.

Minibosses should usually have **one central mechanic plus one supporting twist**.

Final bosses should feel like a small encounter system: a recognizable loop, escalation, and something the player can learn/respond to.

Hell/Nightmare should intensify the identity rather than merely inflate HP.

---

# Ordinary monsters

## Wolf — Pack Momentum

**Identity:** fast pressure, increasingly dangerous in groups.

- In a pack, each living Wolf grants the others a small Attack bonus.
- Later-board Wolves gain the already-planned Echo progression rather than inventing a second unrelated late-game gimmick.
- Killing one Wolf should visibly reduce the pack's momentum.

**Nightmare/Hell:** first Echo each battle can gain a small damage bonus, or the pack bonus scales slightly faster.

The point is simple: kill Wolves early or the pack feels much worse than one Wolf.

---

## Slime — Adaptive Ooze

**Identity:** annoying persistence and poison/adaptation.

- Basic hits may add a small Poison stack at later Boards.
- The first time the Slime is hit by an element, it temporarily gains modest resistance to that same element for the rest of the battle.
- Do not make resistance enormous; the goal is to encourage varied proc builds, not invalidate elemental specialization.

**Nightmare/Hell:** adaptation can also give a tiny proc chance for the copied element.

---

## Goblin — Dirty Opportunist

**Identity:** weak alone, irritating when allowed to act.

- Goblin attacks have a chance to steal a small amount of Gold.
- Killing the Goblin returns the stolen Gold.
- If the Goblin survives several turns, it gains Dodge as it becomes increasingly desperate to escape.

**Pack behavior:** Goblins become good secondary targets because ignoring them costs money.

---

## Bandit — Ambush

**Identity:** dangerous opening turns.

- First attack of the battle gets bonus Crit or damage.
- If the player Guards the opening attack, the Bandit's advantage is largely neutralized.
- Later Bandits may gain one re-ambush after the player drinks a potion or uses a non-attacking action.

The player should learn: **Bandits punish careless starts.**

---

## Skeleton — Reassemble

**Identity:** the first kill may not stick.

- First time reduced to 0 HP, a Skeleton has a chance to collapse and reassemble at low HP after one action/beat.
- Reassembly should be clearly telegraphed by bones remaining on the field.
- Fire/Holy could reduce or prevent the reassembly chance if that fits final elemental policy.

**Nightmare/Hell:** higher reassembly chance or a small Defense bonus after returning.

---

## Orc — Blooded Fury

**Identity:** becomes more dangerous when wounded.

- Below 50% HP, gain Attack.
- Below 25% HP, gain a smaller second boost or Crit chance.
- Avoid copying Berserker's exact 1%-per-1% Rage formula; this should be chunky threshold behavior.

The player chooses between finishing the Orc quickly or enduring a nastier second half.

---

## Cultist — Ritual

**Identity:** visible setup that the player wants to interrupt/end quickly.

- Every few turns, the Cultist begins a one-turn Ritual telegraph.
- If it survives to complete the Ritual, it triggers a random occult/elemental effect: damage, Poison, debuff, barrier, etc.
- The table should be small and legible, not a 2d10 situation.

**Nightmare/Hell:** Ritual table gains one additional dangerous result or shorter cadence.

---

## Wraith — Phase

**Identity:** periodic untargetability/evasion window.

- After taking several hits, the Wraith enters **Phased** for one action window.
- While Phased, ordinary basic attacks have greatly reduced accuracy or cannot hit, but selected magic/elemental effects may still connect.
- The phase ends after the Wraith acts.

This creates a small timing decision around Ultimates and big hits.

---

## Troll — Regeneration

**Identity:** if you stop applying pressure, it heals.

- Regenerates a percentage of max HP after its action.
- Fire temporarily suppresses regeneration for one or more turns.
- The amount should be meaningful enough to notice but not so large that low-damage builds hard-lock.

**Nightmare/Hell:** regen suppression from Fire is shorter, or Troll gains a small burst heal at a threshold.

---

## Demon — Hellfire

**Identity:** stacking burn/escalation.

- Successful hits add a small **Burn** stack.
- Burn hurts at the end of player actions or enemy rounds depending on the final status model.
- Guard reduces the chance or amount of Burn application.

**Hell:** Demon begins with a minor Barrier or applies Burn more reliably, fitting Hell's wider defensive/escalation identity.

---

## Lich — Death Economy

**Identity:** makes other dead things useful.

- In a pack, when another enemy dies, the Lich gains Mana/charge or a temporary buff.
- After enough charges, it casts a stronger spell or raises a weak Skeleton add if allied-enemy entity support is clean.
- Alone, it should still have a basic curse mechanic so the identity does not vanish.

The player may want to kill the Lich before clearing its companions.

---

# Candidate/new ordinary monsters

## Bear — Maul

**Identity:** slow telegraphed brutality.

- Ordinary attack is straightforward.
- Every few turns, Bear telegraphs **Maul**.
- Maul hits much harder, but Guard is especially effective against it.
- If Maul hits an unguarded player, it may briefly reduce Defense.

Simple, readable, and useful on early/mid Boards.

---

## Ghost — Haunt

**Identity:** debuff/misdirection rather than raw damage.

- Ghost can apply **Haunted**, modestly reducing Crit or increasing the chance of a future Confusion-style mis-target once that status system exists.
- Ghost itself has some Dodge/phase identity but less than Wraith; don't make them redundant.

Possible distinction:
- Wraith = hard phase/evasion window;
- Ghost = psychological/status disruption.

---

## Ancient Reanimating Machine Soldier

**Identity:** mechanical persistence without borrowed-IP expression.

- First lethal hit triggers **Reconstruction Protocol**.
- The soldier goes inert for one turn, then returns at reduced HP unless hit by a qualifying anti-repair effect or enough overkill damage.
- Each reconstruction lowers max HP so the loop always ends.

Possible Tech/Math interaction later: those elements could disrupt reconstruction more effectively.

---

# Minibosses

## Board 1 — Ogre Roadwarden: Toll of Passage

**Fantasy:** not merely an Ogre; it believes it has legitimate authority over passage.

### Core mechanic — Toll
Every few turns the Roadwarden demands a Toll and visibly marks its next action.

Possible implementation:
- lose a small amount of Gold voluntarily to weaken/skip the special;
- refuse and the Ogre uses a heavy **Roadblock** attack;
- if Gold payment as combat UI feels clumsy, replace voluntary choice with the Ogre stealing Gold on hit and returning it on death.

### Supporting mechanic — Roadblock
After using its special, the Ogre gains temporary Defense until the player lands a Crit or elemental proc.

### Difficulty scaling
- Normal: one Toll/Roadblock loop.
- Nightmare: Roadblock stronger.
- Hell: Toll special also applies a short movement/combat debuff such as reduced Dodge, but stays readable.

The fight teaches that guardians have rules rather than only bigger numbers.

---

## Board 2 — Titan Guard: Stance of the Colossus

**Fantasy:** ancient containment soldier that alternates between holding and crushing.

### Core mechanic — two stances
**Bulwark Stance:** high Defense, reduced Attack.

**Siege Stance:** lower Defense, much higher Attack.

The Titan swaps every few turns with a clear visual/log cue.

### Supporting mechanic — Seismic Blow
In Siege Stance, special attack hits hard and may partially ignore Defense, but is strongly reduced by Guard.

### Difficulty scaling
Nightmare/Hell shorten the safe Bulwark window or add a small Barrier on stance swap.

The player learns when to unload damage and when to defend.

---

## Board 3 — Paradox Warden: Repetition Is Evidence

**Fantasy:** hunts contradictions and repeated causal patterns.

### Core mechanic — Paradox Mark
If the player uses the **same action category twice in a row** (Attack/Guard/Ultimate/special class action where sensible), gain a Paradox Mark.

At 2–3 Marks the Warden **Echoes** the repeated action against the player in an adapted form or triggers bonus damage.

This should not punish unavoidable auto-actions or class mechanics the player cannot control.

### Supporting mechanic — Contradiction
Using a different action category removes one Mark or grants a small opening against the Warden.

### Difficulty scaling
- Normal: 3 Marks to trigger.
- Nightmare: 2 Marks.
- Hell: trigger also gives the Warden a temporary Echo/Barrier effect.

This fight makes variation itself a defensive mechanic.

---

## Board 4 — Crownless Auditor: Stat Audit

**Fantasy:** bureaucracy has become metaphysical enforcement.

### Core mechanic — Audit
At intervals, the Auditor identifies the player's **highest effective combat stat category** and temporarily taxes it.

Examples:
- Attack highest -> temporary Attack reduction;
- Defense highest -> temporary Defense reduction;
- Crit/Echo/Dodge highest -> temporary chance reduction;
- Lifesteal/high sustain -> temporary healing efficiency reduction.

The audited stat must be shown clearly.

### Supporting mechanic — Filing Deadline
The tax expires after a few turns. Dealing enough damage during the audit or using an Ultimate might end it early.

### Difficulty scaling
Hell can audit the top two categories, but at reduced strength per stat so it is not a total build shutdown.

The joke is that the Auditor is mechanically checking your character sheet.

---

## Board 5 — Ringbound Chancellor: The Previous Turn

**Fantasy:** recursion weaponized as governance.

### Core mechanic — Recurrence
Every fourth turn, the Chancellor repeats a reduced-strength version of **its previous turn's action** in addition to its current one.

The player sees what is about to recur, making it a planning problem rather than random double damage.

### Supporting mechanic — Ring Seal
At HP thresholds, creates a Ring Seal/Barrier that breaks after a certain number of distinct hit events rather than raw damage. Echo-heavy builds break it quickly; single-hit builds can use elements/Ultimates.

### Difficulty scaling
Nightmare/Hell make Recurrence happen more often or strengthen the repeated action, not both at once.

---

## Board 6 — Abyssal Custodian: Seal the Contradiction

**Fantasy:** the Road's deepest custodian tries to lock player systems one by one.

### Core mechanic — Seal
At intervals, temporarily **seals one player capability category** for a short duration:
- elemental procs;
- Echo;
- Lifesteal/healing;
- Guard bonuses;
- pet bonus attacks;
- Crit bonus.

Never seal the player's only basic Attack action. The player must always have a valid turn.

The selected Seal is telegraphed and displayed as a debuff.

### Supporting mechanic — Purge
When a Seal expires, the Custodian gains a small buff based on what it had sealed unless the player dealt enough damage during the sealed window.

### Difficulty scaling
Hell may maintain two Seals, but with staggered expiry and very clear UI.

This feels like the containment system actively studying the player's build.

---

# Final bosses

## Board 1 — Ancient Road Dragon: Again?

**Fantasy:** the first apparent fantasy dragon is old enough to know the journey is repeating.

### Loop
The Dragon cycles through three clearly readable actions:
1. Claw — ordinary damage;
2. Wingbeat — lower damage + temporary Dodge/accuracy disruption;
3. Breath — telegraphed heavy elemental attack.

### Signature mechanic — Memory of the Traveler
At ~50% HP, the Dragon **remembers** the player's most-used action category so far and develops a counter to it:
- Attack spam -> temporary Thorns/Guard;
- Guard-heavy -> Breath gains partial Guard penetration;
- Echo-heavy attacks -> Dragon gains short anti-Echo shell;
- heavy elemental use -> brief resistance to most-used element.

The counter should be temporary/answerable, not invalidate the build permanently.

### Death line seed
**"Again?"**

This is the first lore crack.

---

## Board 2 — Astral Devourer Dragon: Eat the Sky

**Fantasy:** consumes foreign possibilities leaking into the Road.

### Core mechanic — Devour Element
When hit by an elemental proc, the Dragon records that element. After several elemental hits, it **Devours** the most frequent one:
- gains temporary resistance to it;
- next special uses a corrupted version of that element against the player.

This rewards element variety.

### Supporting mechanic — Star Hunger
At HP thresholds the Dragon gains a short damage buff until struck by an element it has not recently devoured.

### Difficulty scaling
Hell can remember two devoured elements at once.

---

## Board 3 — Nullstar Hydra: Mutually Exclusive Heads

**Fantasy:** several outcomes that should have collapsed separately are alive simultaneously.

### Encounter structure
Represent the Hydra as multiple targetable heads if the current multi-enemy framework can support it cleanly.

Possible three-head identities:
- **Red Head — Violence:** high Attack;
- **Blue Head — Denial:** Defense/Barrier;
- **Black Head — Recursion:** Echo/status/support.

The body/encounter ends when all required heads are defeated.

### Core mechanic — Impossible Regrowth
If the player kills heads in the same order every attempt/phase or leaves one head alive too long, it can regrow a weakened head once.

Cleaner implementation alternative: each surviving head buffs the others, so kill order materially matters without literal regrowth complexity.

### Difficulty scaling
Nightmare/Hell add stronger cross-head synergies rather than only more HP.

This boss should be one of the first fights where target selection really matters.

---

## Board 4 — Crown-Eater of the Fourth Road: Dethrone

**Fantasy:** destroys anything that accumulates too much sovereignty/power.

### Core mechanic — Crown
The boss periodically marks one of the player's strongest temporary/run bonuses as **Crowned**.

After a telegraph, **Dethrone** suppresses that bonus for several turns and converts part of its strength into a boss buff.

Do not permanently delete Powerups.

### Supporting mechanic — False Crown
The player can break a temporary Crown object/barrier or deal enough damage before Dethrone completes to prevent full theft.

### Difficulty scaling
Hell can Crown two effects sequentially or gain a stronger buff from successful theft.

The fight attacks the idea of becoming too strong, not only the HP bar.

---

## Board 5 — Ring Tyrant of the Fifth Road: The Loop

**Fantasy:** understands the recursive structure of the Road and forces local repetition.

### Core mechanic — Four-Turn Loop
The Tyrant records a small snapshot at the start of a four-turn cycle.

At cycle end, it rewinds **one limited property**, not the entire battle. Possible rotating rewind targets:
- restores part of boss HP lost during the cycle;
- restores one broken Barrier;
- resets one temporary boss debuff;
- repeats the damage from its first action.

The rewind type is shown at cycle start so the player can adapt.

### Supporting mechanic — Break the Ring
If the player meets a visible condition during the cycle (enough damage, enough distinct elements, Ultimate use, etc.), the rewind fails and the Tyrant is briefly vulnerable.

### Difficulty scaling
Nightmare/Hell make the break condition harder or add a second possible rewind type, but always telegraph it.

The boss should make players feel they are fighting recursion itself without literally undoing ten minutes of progress.

---

## Board 6 — The Last Equation: Reduce to One Answer

**Fantasy:** not merely a creature; a rule trying to make all possibility resolve cleanly.

### Core mechanic — Variables
At the start of each phase, the Last Equation defines a visible **rule** for several turns.

Examples:
- `ATTACK = ERROR` — repeated basic attacks empower the boss;
- `GUARD = ZERO` — Guard is weakened but attacking breaks its Barrier faster;
- `ECHO > 1` — Echoes feed a temporary boss shield;
- `ELEMENT ≠ ELEMENT` — repeating the same element is punished;
- `HP < 50%` — boss becomes more aggressive while player is below half HP.

Rules must use icons/plain language as well as equation flavor. The player should never need actual algebra homework.

### Supporting mechanic — Proof
Each phase has a clear way to **disprove** the active rule. Doing so damages/stuns the Equation or removes a Barrier.

### Final phase — Reduction
At low HP, several earlier rules appear in simplified rotation. The boss attempts to collapse the fight into one acceptable action pattern; the player wins by continuing to produce valid contradictions.

### Hell
Hell can combine two compatible rules at once, but never combinations that remove all meaningful player choices.

The Last Equation should be the culmination of the Road attempting to classify and constrain the traveler.

---

# Existing secret bosses

## Road Merchant — Hostile Acquisition

**Identity:** combat as a transaction.

- Merchant can temporarily **buy** one of the player's buffs/Powerups for several turns, offering Gold in exchange whether the player wants it or not.
- The stolen effect returns after the duration or on defeating a temporary Ledger target.
- Merchant's own damage may scale with Gold currently held/stolen during the encounter.

Optional midfight choice: accept a terrible deal for immediate healing/potion and empower the Merchant later.

Do not make the UI a full shop inside combat unless it is actually fun.

---

## Bloodmage — Every Spell Has a Price

**Identity:** HP is resource and record.

- Bloodmage spends its own HP to empower specials.
- Healing/Lifesteal by the player can create **Blood Scent**, slightly empowering the boss unless managed.
- At low HP, Bloodmage may consume stored Blood Scent to heal, giving the player an incentive to burst through the final phase.

The secret boss should demonstrate blood mechanics more dangerously than the playable class eventually does.

---

## Pale Devil — Burn Through the Barrier

Preserve the existing strong identity:
- begins with Barrier;
- stacking Burn;
- multi-attacks that interact dangerously with defensive layers.

Potential refinement:
- each Barrier layer broken increases Pale Devil's attack speed/multi-hit count;
- player chooses between leaving defense intact longer or exposing a more violent final phase;
- Hell version gains a telegraphed **Ashen Verdict** that deals more damage per Burn stack, making stack management matter.

---

# Future secret boss — The Hateful Mirror

Tracked in #106.

### Core mechanic — Build Reflection
At encounter start, create a semantic snapshot of:
- class identity;
- effective stats;
- equipment bases/important Intrinsics;
- Powerups;
- pet identity where relevant.

The boss uses adapted versions rather than blindly executing player functions.

### Fight identity
The Mirror should visibly use the player's own strengths:
- high Crit build -> Mirror Crits frequently;
- Thorns build -> Mirror has dangerous retaliation;
- pet build -> distorted mirrored companion;
- Mana class -> recognizable spender patterns;
- defensive build -> frustratingly durable Mirror.

### Anti-stalemate rule
The Mirror should carry a hidden/explicit **Hateful Escalation** that slowly increases damage each round so identical defensive builds cannot create an endless draw.

### Phase idea — Cracked Reflection
At 50% HP, one copied strength becomes exaggerated while one copied weakness becomes exposed.

Example: Mirror doubles the player's highest stat bonus but loses part of another defensive category. This makes the second half more than a pure mirror match.

### Reward direction
Strong thematic unlock candidate for the future Liquid Mirror/transform class.

---

# Pack-composition ideas

Once ordinary monsters have identities, packs can become small puzzles without custom scripting.

Examples:

- **Wolf + Bandit:** opening burst while Wolves scale with numbers.
- **Troll + Cultist:** Troll regeneration buys time for Rituals.
- **Lich + Skeletons:** killing Skeletons first powers the Lich; killing Lich first leaves simpler cleanup.
- **Orc + Wraith:** Orc pressures low HP while Wraith creates awkward damage windows.
- **Goblin + anything tanky:** the tank buys time for the Goblin to steal money.
- **Ghost + heavy hitter:** Haunt/Confusion makes the heavy attack less predictable.

The system should get mileage from combining simple identities rather than requiring every pack to have bespoke logic.

---

# Difficulty philosophy

A useful escalation pattern is:

**Normal:** learn what the enemy does.

**Nightmare:** the same rule matters more often or has one extra consequence.

**Hell:** the identity becomes genuinely dangerous and may interact with another system, but remains readable.

Avoid:
- doubling every mechanic frequency simultaneously;
- invisible immunity;
- permanent action denial;
- bosses that invalidate an entire class with no answer;
- massive random punishment with no telegraph.

The best hard fight makes the player say **"I know what I should have done"**, not **"what even happened?"**
