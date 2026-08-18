# Dicebound TODO

## Visual assets / art
- [x] Make dedicated Ranger character art.
- [x] Make Trophy art to replace the placeholder Trophy / Achievements button in the Campsite.
- [x] Replace the Ninja board-marker emoji/icon with a proper Dicebound marker.
- [x] Make a dedicated board-marker icon for **every class**, designed to stay readable on small road tiles.
- [ ] Replace the Ranger offhand placeholder emoji/icon with proper art.
- [ ] Replace the Frog offhand / lily-pad placeholder emoji/icon with proper art.
- [ ] Replace the Seraph's Aegis placeholder emoji/icon with proper art.
- [x] Make bespoke art for the **Talent star**, **Info book**, and **Prestige moon** so they can live naturally in the campsite sky as real scene objects rather than placeholder icon buttons.
- [ ] Continue replacing remaining machine-dependent emoji placeholders with Dicebound art assets.
- [ ] Create and integrate dedicated artwork for **all 200 powerups**; use a consistent icon language by rarity/build family rather than relying on machine-dependent emoji.

- [x] Add dedicated Nightmare OFF/ON camp creature artwork and swap it live with difficulty state.
- [x] Replace the campsite Options emoji with the steampunk cog artwork.

## Meta progression & UI
- [ ] Design a real Prestige Points system rather than Prestige being mostly a reset/conversion mechanic.
- [ ] Potential Prestige Point sinks: permanent stats, starting runs with some talent points, gear crafting, and other between-run upgrades.
- [ ] Revisit the Legacy Constellation after more player use: consider keystone-sized nodes, stronger branch identities and clearer path previews without making the tree harder to read.
- [ ] Add hover/tooltip text for campsite sky interactions so the art can become more diegetic without hurting discoverability.
- [ ] Consider a dedicated run-summary / build-history screen so successful or ridiculous builds can be compared later.

## Balance / progression watch list
- [ ] Keep comparing real-player board balance against harness results, especially Boards 4–6.
- [ ] Revisit the very-late class-unlock tail once more real-play data exists; harness estimates are useful but do not override actual player evidence.
- [ ] Continue watching Haste / elemental-proc turn economy for any remaining enemy-response lockouts.
- [ ] Add run-history statistics: class, mode, road reached, final build, deaths/victories and seed/build ID when available.

## Native wrapper / release engineering
- [x] Add a public WebView2Loader-first bootstrap path using `CreateCoreWebView2EnvironmentWithOptions`.
- [x] Make the launcher build pipeline capable of embedding Microsoft's signed x64 `WebView2Loader.dll` from the official SDK artifact.
- [ ] Vendor Microsoft's signed x64 WebView2Loader artifact in the production/CI release environment so the isolated compatibility fallback can be removed completely. The current sandbox cannot fetch/package the signed DLL itself.
- [ ] Consider Windows code signing before wider distribution.
- [ ] Eventually add a proper updater / Check for Update flow.
- [ ] Eventually consider a proper Windows installer.
- [ ] Once the Git repository exists, add CI that builds the browser/native artifacts and runs deterministic regression smoke tests for every tagged release.
- [ ] Show build provenance in Options once Git exists: version, build ID/commit hash, save schema, wrapper mode and WebView2 loader mode.

## Quality-of-life / tooling suggestions
- [x] Add manual **Export Save / Import Save / Import File / Download Save / Create Backup Now** controls to Options.
- [ ] Add an **Export Debug Bundle** option containing logs + build information (and include the save only if explicitly chosen).
- [ ] Add accessibility options: UI scale, reduced-motion override and non-colour-only rarity/status cues.
- [ ] Consider showing the current save timestamp / slot health in Options so backup/export decisions feel safer.
- [ ] Add a tiny first-open talent-map helper explaining drag-to-pan, so the PoE-style full-window flow feels intentional immediately.

## Runtime stability
- [x] Runtime-cache self-repair that preserves saves.
- [x] Build-specific frontend/WebView2 cache directories.
- [x] Frontend-ready handshake and startup logging.
- [ ] Vendor/sign the official WebView2 loader in the eventual CI/release environment.

- [ ] Replace the few fallback/duplicate battle portraits (Rouge, Cleric/Paladin overlap, Summoner and Ouroboros) with fully distinct dedicated full-body art in a future visual pass.

## Completed in Beta 0.5.5
- [x] Dedicated full-screen Campsite background.
- [x] Custom Talent northern-star campsite artwork.
- [x] Custom Info books-and-scrolls campsite artwork.

## Campsite spatial pass
- [x] Reposition campsite interactions around the environmental background and remove leftover top-of-screen summary text.
- [x] Remove translucent boxes behind Talent Star and Info Books.
- [x] Hide talent-map scrollbars and use mouse-wheel zoom.

## Completed in Beta 0.5.10
- [x] Create and integrate dedicated artwork for every current pet.
- [x] Add a true full-body Ouroboros battle portrait.
- [x] Refine campsite Nightmare/Class/Bonfire/Trophy/Chest/Start Run placement.

## Completed in Beta 0.5.11
- [x] Make desktop combat a full-window game state instead of a floating modal.
- [x] Mirror player elemental mechanics for enemy elemental activations, including Ice Freeze.
- [x] Fix outside-combat Alchemist potion lifetime tracking.
- [x] Restore Glass Needle artwork in powerup selection.
- [x] Raise Frog unlock threshold to 150% Echo Strike.
- [x] Tune Arcane Lance Echo conversion to 50% of Echo chance.
- [x] Continue Campsite Class / Nightmare / Start Run placement refinement.
- [ ] Real-playtest the 0.5.14 powerup rebalance: watch early Poor/Common usefulness, Uncommon saturation, high-rarity gate pacing and whether the 5 ungated Epics / 7 ungated Legendaries provide enough variety.


## Completed in Beta 0.5.14
- [x] Audit and rebalance the complete powerup pool.
- [x] Expand Poor and Uncommon variety.
- [x] Normalize Epic/Legendary rarity identity.
- [x] Repair authoritative achievement gating for powerups.


## Beta 0.6 follow-up
- Build Prestige crafting for discovered named Mythical recipes (Axel's Coffee Mug, Kratz Headphones, The Jean Jacket Lost at Kelly's).
- Playtest the new 151–210 Legendary budget and all 20 Legendary Effects; tune effect-specific weights/gates if some dominate.
- Tune guardian ordinary rarity tables from real careers; Artifact table roll rates are now centralized and easy to adjust.
- Decide whether future Artifact chest piece should enter the weighted table.
- Create/integrate dedicated art for the complete powerup pool and later for Legendary Effect badges.
