# Narrative Delivery — The Road Remembers

## Purpose

DiceBound already has a substantial story bible, class lore and prologue draft. The missing layer is not lore creation; it is **player-facing delivery**.

The narrative system should make the existing game mechanics feel more meaningful without turning DiceBound into a dialogue-heavy RPG or interrupting the run loop.

The guiding rule remains:

> **Gameplay first. Short surfaces in ordinary play. Deep lore through optional discovery.**

This document defines the intended delivery model and the proposed feature spine for a future major narrative release, working title:

**Beta 0.6.10.0 — The Road Remembers**

This is a design target, not an instruction to begin implementation automatically.

---

## 1. Canon foundation

The protagonist is an **Echo from the beginning of DiceBound**.

Escaping the Dice does not create the Echo. DiceFree reveals a wider world that has language for what the protagonist already was.

Inside DiceBound:
- the Echo is Dicebound: attached to the impossible die and the Road's six-outcome reality-selection machinery;
- death/reset/Prestige/Legacy are manifestations of continuity that ordinary reality should not permit;
- the Camp and persistent systems reinforce facts that collapsed routes try to erase;
- classes are Ways, stable patterns of possibility an Echo can embody.

Across both games:

> **An Echo becomes what reality has enough evidence to recognize.**

DiceBound class unlock conditions and DiceFree advancement requirements are the same metaphysical principle expressed in different game structures.

---

## 2. Narrative delivery layers

### Layer A — short first-play prologue

Use `docs/STORY_PROLOGUE_DRAFT.md` as source material, not as a mandatory wall of prose.

The first playable introduction should communicate:
- the Camp exists at the end of no visible Road;
- the traveler has impossible fragments of memory;
- the die chooses rather than merely predicts;
- the Road changes around a roll;
- the Merchant recognizes the situation more than the player does;
- repeated `AGAIN` marks imply this has happened before.

The player should **not** be told “you are an Echo” at the beginning.

The full prose version may be unlocked in Roadkeeper after the introduction.

Requirements:
- skippable after first presentation;
- replayable/readable later;
- no gameplay RNG consumption;
- no permanent progression miss if skipped.

### Layer B — first-clear Board revelations

Ordinary runs should stay light. Major story progression occurs on first meaningful milestones.

Initial Board sequence from the Story Bible:

**Board 1**
- Ancient Road Dragon implies it has seen the traveler before.
- The player should initially be unsure whether this is prophecy, mistaken identity or recurrence.

**Board 2**
- An impossible star map or equivalent memory fragment shows constellations not visible on the current Road.
- The sky is no longer trustworthy.

**Board 3**
- Paradox Warden identifies the player as a classification error rather than an intruder.
- The player begins to understand that the world's absurdity has rules.

**Board 4**
- Crownless Auditor references or produces a verdict that predates the current route.
- Bureaucracy begins to imply an older administrative system behind the Road.

**Board 5**
- Ring Tyrant openly recognizes recurrence.
- Prestige/Legacy stop looking like purely game-facing reset systems.

Candidate line:
> “You call it Legacy because ‘contamination’ frightened you.”

**Board 6**
- The Last Equation attempts to calculate the traveler and fails.
- This is the first explicit indication that the protagonist cannot be reduced to one valid answer.
- Defeat eventually exposes a breach into **space that is not another Road**.

### Layer C — guardian dialogue

Guardians should carry short, memorable narrative identity.

Prefer:
- one short pre-fight line;
- optionally one defeat/transition line;
- occasional special reactions to a Way, repeat clear, difficulty or secret condition.

Do not give every ordinary enemy dialogue.

Guardian titles are existing lore assets:
- Roadwarden;
- Guard;
- Warden;
- Auditor;
- Chancellor;
- Custodian.

Their dialogue should gradually imply that the Road was or is **administered**, not simply haunted.

### Layer D — class unlock / Way recognition

Class unlocks should increasingly use the language of recognition rather than generic reward text.

Preferred pattern:

> **A Way has been remembered: Berserker.**
>
> Pain failed to remove you often enough that reality learned the lesson.

The short unlock line is player-facing.

The deeper class entry lives in Roadkeeper.

DiceFree should later use the same ontology:
- Novice = comparatively uncommitted Echo;
- advancement = deeper manifestation of a Way;
- secret advancement conditions = evidence that reality can recognize a rarer pattern.

### Layer E — Roadkeeper as codex / memory archive

Roadkeeper should become the primary optional lore destination rather than creating a completely separate disconnected Lore screen.

Suggested categories:
- **Roads** — Boards/regions and first-clear discoveries;
- **Guardians** — miniboss/final-boss identities and later revelations;
- **Ways** — class lore and unlock meaning;
- **Creatures** — enemy families;
- **Artifacts & Relics** — important gear, Heirlooms, Artifacts, Mythicals;
- **People & Institutions** — Merchant, Mystic, Bloodmage, lost administration;
- **Fragments** — star maps, verdicts, equations, impossible memories and miscellaneous discoveries.

Entries may grow over time.

A discovered entry can gain paragraphs or annotations when later milestones reinterpret it.

This supports the central fiction:
- the player is not collecting encyclopedia trivia;
- the Camp is accumulating **facts that the Road can no longer successfully erase**.

### Layer F — repetition, Prestige and difficulty as story

The story should know DiceBound is a loop game.

Narrative milestone candidates:
- first death/reset;
- first Heirloom surviving a collapsed route;
- first Prestige;
- 5 / 10 / 20 / later Prestige thresholds;
- first Nightmare clear;
- first Hell clear;
- first repeated kill where a guardian explicitly recognizes the traveler;
- important achievement-memory anchors;
- Echo Crucible / Moon Forge milestones when relevant.

Prestige should increasingly feel like the traveler learning to collapse a route **deliberately** and preserve selected truth from it.

Nightmare/Hell should expose deeper or less stable layers of the same world, not require a completely separate plot.

---

## 3. Roadkeeper data behavior

Narrative content should be semantic and data-driven.

A story entry should have stable identity independent of visible prose, for example:
- `road.board1`
- `guardian.ancient-road-dragon`
- `way.berserker`
- `fragment.board2.star-map`
- `system.prestige.first`

Suggested entry data:
- stable ID;
- category;
- title;
- short summary;
- unlock/reveal conditions;
- ordered reveal stages;
- optional related entities;
- optional art;
- optional “new” presentation state.

Do **not** use visible strings as gameplay state keys.

---

## 4. Persistence ownership

Story discovery is persistent meta progression.

Recommended ownership:
- canonical discovered/reveal state under **Progression**;
- bounded save-safe data: IDs/stages, not duplicated prose;
- Board/Run/Combat emit semantic events and do not own story text;
- narrative registry/content resolves what those events reveal;
- UI/Roadkeeper owns presentation.

Examples of semantic events:
- first Board clear;
- first guardian defeat;
- guardian defeated Nth time where a specific reveal is configured;
- Way unlocked;
- first Prestige;
- difficulty first clear;
- secret boss first clear;
- Artifact/Mythical discovery.

No story reveal may consume gameplay RNG or alter the gameplay RNG cursor.

---

## 5. Dialogue architecture

Dialogue should be a reusable narrative presentation surface rather than one-off boss popups.

Requirements:
- stable speaker/entity identity;
- line/sequence ID;
- optional conditions;
- skippable/advanceable input;
- no input leakage into combat/Board actions;
- safe dismissal;
- responsive browser/native presentation;
- repeat policy: once, first-per-difficulty, always, or conditional;
- no mechanics encoded in dialogue text.

Dialogue may be used for:
- prologue;
- guardian introductions;
- defeat/transition lines;
- Merchant/Mystic observations;
- Camp memory beats;
- class/Way recognition;
- final Last Equation sequence.

---

## 6. The Board 6 ending and DiceFree handoff

DiceBound should have a complete emotional ending even if the player never plays DiceFree.

The Last Equation represents the strongest expression of a reality that wants one correct answer.

The Echo defeats it not because the entire cosmology is solved, but because the Equation cannot reduce the Echo's accumulated contradictions into one valid state.

After the fight:
- system-like Board 6 reality destabilizes;
- the normal Road should no longer be the only possible continuation;
- the player discovers a breach;
- beyond it is the first view of **space that is not Road**;
- the player crosses or approaches the boundary.

End DiceBound's canonical narrative handoff there.

Do not explain yet:
- whether The Last Equation was jailer, defense system, god, machine, prior Echo or something else;
- whether defeating it saved or endangered anything;
- exactly how exterior inhabitants understand the Dice;
- whether other Dice exist;
- why Echoes exist at all.

Those mysteries belong to the shared DiceBound/DiceFree story.

---

## 7. DiceFree continuity

DiceFree begins with the same Echo.

The protagonist does not undergo an “Echo transformation” on escape.

Instead:
- exterior people, institutions or scholarship may recognize the term Echo;
- the protagonist may finally gain language for their own continuity;
- memories of DiceBound may be incomplete, fragmented or pressure-sensitive without erasing player continuity;
- DiceFree class advancement is a persistent extension of DiceBound's Ways;
- DiceFree's six exterior faces correspond to the Dice's six faces and should carry transformed echoes of the six internal Roads.

A major long-term reward is recognition across games:
- exterior ruins resemble internal Road fragments;
- myths contradict DiceBound experiences in interesting ways;
- Face cultures may remember consequences of interior events without knowing their source;
- an outside scholar may insist life inside the Dice is impossible;
- discoveries can reinterpret DiceBound without invalidating it.

---

## 8. Relationship to obsolete Board 7 concept

The old DiceBound Board 7 direct-exploration concept is superseded by DiceFree.

Its valuable idea was:
- after the Last Road, the rules of movement break;
- direct exploration begins beyond the six-outcome Road structure.

DiceFree now owns that payoff at game scale:
- outside the Dice;
- direct/isometric exploration;
- six exterior faces;
- persistent character/class progression;
- later co-op.

Do not implement a second competing “outside-style” Board 7 inside DiceBound unless a future story decision explicitly reopens it.

---

## 9. Proposed Beta 0.6.10.0 scope — The Road Remembers

A coherent first narrative-delivery release could include:

1. persistent narrative-memory/reveal state;
2. narrative content registry;
3. Roadkeeper codex/memory archive;
4. short first-play prologue;
5. Board 1–6 first-clear story beats;
6. reusable guardian dialogue surface;
7. Way/class-unlock recognition copy + Roadkeeper entries;
8. first death / first Prestige narrative beats;
9. canonical Board 6 Last Equation ending/handoff sequence;
10. deterministic + browser/Edge + native validation.

Out of scope for the first narrative release:
- fully voiced dialogue;
- hundreds of NPC conversations;
- exhaustive lore for every item/enemy;
- resolving The Last Equation's true nature;
- explaining the complete cosmology;
- importing DiceFree gameplay into DiceBound.

---

## 10. Acceptance principles

The narrative foundation is successful when:
- a new player can play without being forced through long prose;
- a curious player can discover substantially more story;
- repeated runs reveal that the loop is diegetic;
- class unlocks feel like identity discovery, not only checkboxes;
- Boards 1–6 form an escalating mystery;
- defeating The Last Equation creates a satisfying ending and clean DiceFree handoff;
- the protagonist is consistently an Echo in both games;
- story state is semantic, persistent and deterministic;
- prose is not hard-coded into unrelated gameplay owners;
- narrative presentation works in browser/Edge/native;
- the game remains funny, weird and mechanically fast.

---

## One-line narrative contract

> **DiceBound is about an Echo using chance, memory and accumulated contradictions to fight a reality that wants everything to have one correct answer — until the Echo reaches the edge of that reality and discovers the world outside.**
