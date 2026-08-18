# DiceBound Roadmap

This roadmap converts the recovered Beta TODO into Git-tracked work. GitHub issues are the actionable backlog; this document explains the larger direction and keeps related work grouped.

## Near-term: Beta 0.6.x / next balance pass

### Prestige crafting for discovered Mythicals
Build a real between-run crafting path for:
- Axel's Coffee Mug
- Kratz Headphones
- The Jean Jacket Lost at Kelly's

Open design questions include recipe discovery, cost, interaction with Heirlooms/Prestige, and how to preserve the excitement of random Mythical drops.

### Legendary Effect playtesting
Beta 0.6 ships 20 generated Legendary Effects on 151–210 point gear. Real-player testing should identify effects that dominate, underperform, or interact too explosively with Echo/Crit/Poison/Ultimate/elemental/pet/Guard systems.

### Guardian loot tuning
Keep comparing real careers with harness expectations, especially Boards 4–6. Current 0.6 baseline:
- Miniboss ordinary item: 85% Normal / 92% Nightmare / 100% Hell
- Final boss ordinary item: guaranteed
- Artifact access: one centralized roll per guardian, at most one Artifact

Real-player evidence wins when harness estimates disagree.

### Artifact chest decision
The Beta 0.6 Artifact table currently contains weapon, boots, legs, ring, hat, amulet and offhand. Decide whether a bespoke Artifact chest should be designed and how the 100% weight table should be redistributed if so.

## Visual backlog

- Replace Ranger offhand placeholder art.
- Replace Frog/lily-pad offhand placeholder art.
- Replace Seraph's Aegis placeholder art.
- Continue removing machine-dependent emoji placeholders.
- Create and integrate dedicated artwork for all 200 current powerups.
- Later create a compact visual/badge language for generated Legendary Effects.
- Replace remaining duplicate/fallback battle portraits (Rouge, Cleric/Paladin overlap, Summoner, Ouroboros where still applicable).

## Meta progression

- Design a real Prestige Points system instead of Prestige being mostly reset/conversion.
- Candidate Prestige sinks: permanent stats, starting talent points, gear crafting and other between-run upgrades.
- Revisit Legacy Constellation branch identity and keystone-sized nodes after more use.
- Add a run-summary/build-history screen.
- Add run-history statistics: class, mode, road reached, final build, deaths/victories and seed/build ID where available.

## Quality of life / accessibility

- Add hover/tooltips to environmental Campsite interactions.
- Add an Export Debug Bundle with logs + build data; include save only with explicit user choice.
- Add UI scale, reduced-motion override and non-colour-only rarity/status cues.
- Show save timestamp / slot health in Options.
- Add a first-open talent-map helper for drag-to-pan and wheel zoom.

## Native wrapper / release engineering

Already completed before Beta 0.6:
- WebView2-first native bootstrap.
- Build pipeline capable of embedding Microsoft's signed x64 WebView2Loader DLL.
- Runtime-cache self-repair and build-specific caches.
- Frontend-ready handshake/startup logging.

Still planned:
- Vendor Microsoft's signed x64 WebView2Loader artifact in production/CI.
- Consider Windows code signing before wider distribution.
- Add a proper Check for Update flow.
- Eventually add a proper Windows installer.
- Add CI that builds browser/native artifacts and runs deterministic smoke/regression checks for tagged releases.
- Show build provenance in Options: version, commit/build ID, save schema, wrapper mode and WebView2 loader mode.

## Balance watch list

- Boards 4–6 difficulty compared with real play.
- Very-late class unlock pacing.
- Haste / elemental-proc turn economy and enemy-response lockouts.
- Powerup rarity balance after the 0.5.14 200-powerup rebalance.
- Whether 5 ungated Epics / 7 ungated Legendaries provide enough early variety.

## Project rule

A TODO that becomes concrete enough to implement should become a GitHub issue. Completed release work should be reflected in `CHANGELOG.md` and closed issues rather than living only in chat history.
