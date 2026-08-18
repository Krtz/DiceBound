# DiceBound Backlog Map

GitHub issues are the actionable backlog. This file is a lightweight index for how the current work should be grouped in the GitHub Project.

## Recommended Next Patch candidates

- Prestige crafting for discovered named Mythicals (#1)
- Playtest/tune generated Legendary Effects (#2)
- Guardian loot rarity playtest/tuning (#3)
- Board 4–6 real-career balance pass (tracked as a dedicated balance issue)

Do not automatically put all of these into one release. Choose a small scope when the next version is named.

## Needs Playtest / Balance Lab

- Generated Legendary Effects (#2)
- Guardian loot rarity (#3)
- Current 200-powerup rarity balance after Beta 0.5.14
- Boards 4–6 difficulty and mode scaling
- Very-late class unlock tail
- Haste / elemental-proc turn economy

## Systems / Features

- Prestige crafting (#1)
- Real Prestige Points system
- Run/build history and summary
- Artifact chest decision (#4)
- Export Debug Bundle
- Updater / installer later in Beta

## Art / UI

- Complete 200-powerup artwork (#5)
- Remaining placeholder offhand/equipment art
- Remaining duplicate/fallback class portraits
- Legendary Effect badge language after powerup art
- Campsite hover/discoverability polish
- Accessibility / UI scale / reduced motion

## Release Engineering

- CI release builds and deterministic smoke tests (#6)
- Official signed x64 WebView2Loader in production builds
- Windows code signing before wider distribution
- Build provenance in Options

## Suggested Project fields

See `GITHUB_PROJECT_SETUP.md` for the full layout. At minimum use:

- **Status:** Backlog / Next Patch / In Progress / Needs Playtest / Blocked / Done
- **Target Version:** 0.6.x / 0.7 / Later Beta / Post-Beta / Unscheduled
- **Work Type:** Bug / Balance / Feature / Art / UI / Content / Release Engineering / Tech Debt / Playtest
- **Priority:** P0 / P1 / P2 / P3
- **Area:** Combat / Classes / Companions / Gear & Loot / Powerups / Boards & Enemies / Legacy & Prestige / Campsite & UI / Native Wrapper / Save System / Release & CI

## Rule

Broad ideas stay in `ROADMAP.md`. Once a task has a clear problem, direction and definition of done, create an issue and manage it in the Project rather than growing another giant TODO document.
