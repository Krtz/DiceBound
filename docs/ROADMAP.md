# DiceBound Roadmap

GitHub issues are the actionable backlog. This document groups the **current larger direction** without pretending to replace the live queue.

For exact ordering, current release identity and newest playtest reports, use:

- **#404 — START HERE / durable release checkpoint**
- **#130 — current executable queue**

Live `main`, current issue comments and newer playtest evidence always beat this document if they disagree.

## Current phase: player-facing correctness + feature-driven cleanup

The 12-public-owner architecture program and broad post-owner archaeology phase are complete. DiceBound is now in a healthier maintenance mode:

> A real bug or feature chooses the coherent responsibility slice; clean that touched slice while implementing the player-facing change.

Do not resume broad monolith surgery merely to reduce source size.

## Near-term correctness

### Enemy identity / ordinary Devil naming — #158
Promote semantic enemy identity far enough to rename the ordinary `Devil` family to `Demon` and support bounded element-aware naming without parsing generated display strings.

Keep the special boss **The Pale Devil** distinct unless a separate design issue changes it.

### Touch/mobile first-tap actions — #352
Combat actions on touch/mobile should execute on the first intentional tap rather than requiring a focus/hover-like first interaction.

Preserve desktop behavior and do not solve this with a global click/touch hack that bypasses modal/input ownership.

### Additional focused work
- #393 — richer per-Board ordinary-enemy roster/content design; Beta 0.6.7.11's Board-1-style policy is intentionally only a stopgap.
- #389 — proper Rouge full-body Camp/Class Selection art.
- #337 — Invoke / Unstable Ultimate correctness.
- #202 — Sealed Relic should roll Uncommon+.
- #249 + #76 — player-facing terminology/copy cleanup.
- #90 — remaining Escape/modal keyboard ownership.

Real playtest regressions discovered later outrank this list and should update #130 when promoted.

## Combat presentation

Beta 0.6.7.7 shipped the generic enemy-attack presentation and Echo pacing work from #376/#377. Future Combat View work should build on those semantic attacker/target paths rather than reintroducing monster-name DOM special cases.

### Elemental proc VFX — #71
Continue adding authored Combat View presentation for remaining elements through the existing semantic target/VFX path.

## Enemy identity / naming / stats

The semantic identity program remains useful:

- #38 — stable ordinary enemy family identity;
- #158 — ordinary `Devil` -> `Demon` plus bounded element-aware naming;
- #157 — Stats/lifetime ledger keyed by semantic identity.

The special boss **The Pale Devil** remains distinct unless separately redesigned.

Do not solve naming or Stats by parsing generated display strings.

## Guardian and encounter depth

### Boss/miniboss mechanics — #92
Inventory current guardian behavior and improve underdeveloped fights one coherent mechanic at a time.

Prefer recognizable encounter identity, telegraphs and learnable Nightmare/Hell escalation over raw stat inflation.

### Playtest-led balance — #12 / #36
Board pacing concerns under #12 remain playtest-led rather than table-led. #36 is now specifically the live **Field Potion / ordinary-consumable value** note after the Vampire/Monk items shipped in 0.6.7.9.

Real careers outrank harness predictions when they repeatedly disagree.

## Meta progression

### Prestige Moon / Moon Forge — #178
The Moon and authoritative Prestige economy already ship. Remaining major Moon phase is **Moon Forge**, whose PP cost still requires an explicit design decision before implementation.

### Prestige crafting — #1
Once the Forge economy is approved, build authored Mythical recipe discovery/crafting through current Prestige + Items ownership rather than a parallel crafting economy.

### Echo Crucible — #179
Future very-late-game effect extraction should store semantic unique-effect IDs, not item descriptions, and must never double-apply an equipped + Crucible copy.

### Heirloom progression — #330
Potential ranked Prestige Moon storage/loadout redesign; values/refund semantics require explicit approval before implementation.

### Special-only Gloves — #28
Add `gloves` as a real slot lifecycle while excluding it from ordinary procedural generation. Coordinate with Gear/paper-doll presentation rather than adding scattered slot lists.

## Large exploratory features

These are **not** current implementation commitments.

### Board 7 overworld — #102
Potential top-down directly controlled region beyond the six Roads. Must begin as a small non-release POC that keeps the die meaningful and reuses current Run/Combat/checkpoint owners.

### Player-side allied entities / Necromancer — #100
Potential targetable summons and deeper pet control. Start only with a minimal Skeleton POC if approved; do not preemptively rewrite Combat into a generic party engine.

## Quality of life / accessibility

Important longer-term direction includes:

- touch/mobile interaction quality (#352 and related input/UI work);
- reduced-motion support and non-colour-only status/rarity cues (#10);
- clearer keyboard/modal ownership (#90);
- build/save health/provenance visibility in Options;
- run/build history and statistics;
- continued replacement of placeholder/fallback art with repository-owned semantic assets.

## Native / release engineering

Already established:

- Windows WebView2 native build;
- official signed x64 WebView2 loader staged in CI;
- centralized four-component version identity;
- deterministic source + Edge/browser + native validation;
- protected-main prerelease publication;
- verified `distribution/latest.json` reconciliation through the dedicated GitHub App;
- retry/reconciliation handling around GitHub API failures.

Future distribution work can include:

- Windows code signing before broader distribution;
- a polished user-facing Check for Update flow;
- a proper installer/updater experience;
- richer build provenance/support tooling.

Do not destabilize the current release path casually: it is now part of the project's safety net.

## Balance philosophy

- Real career/playtest evidence is primary for feel, pacing and whether a build/action is worth using.
- Deterministic tests and seeded simulations explain mechanics and protect exact contracts; they do not overrule repeated real-play evidence about fun/pacing.
- Avoid broad value sweeps without a reproduced problem and stated goal.
- When a balance report is promoted, audit the complete effective-stat/action/reward path it actually touches.

## Project rule

A TODO that is concrete enough to act on should become a GitHub issue. Completed work belongs in release notes/CHANGELOG and closed issues, not as a permanent ghost item in this roadmap.

When a new playtest regression appears, update #130 and promote it ahead of lower-value roadmap work where appropriate.
