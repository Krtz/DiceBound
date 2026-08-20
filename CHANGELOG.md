# DiceBound Changelog

This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.

## Unreleased — Beta 0.6.2.3

### Live computed combat descriptions (#40, #51)
- Added a pure effective-stat owner for shared Ultimate modifiers and Berserker Rage scaling.
- Ragequake's combat tooltip and active-run traits now show its recomputed effective Attack scaling and pre-defense damage range from the same functions used by combat.
- Changing Ultimate, class-Ultimate, all-damage, set or Rage modifiers updates the displayed values immediately.
- Fixed release stamping so arbitrary per-PR subtitles are preserved and all strict replacements succeed before any source file is written.

## Beta 0.6.2.2 — Development checkpoint

### Runtime services and Powerups (#40, #65, #51)
- Added an explicit Powerup runtime-service contract for live player state, economy, healing, rules, element IDs and class-signature behavior.
- Moved all 200 canonical Powerup definitions/effects into `runtime/js/powerups/registry.js`; their closures now consume injected capabilities instead of ambient game globals.
- Added a reset-safe live player port, injected fake-service contract tests, an exact 200-entry registry snapshot and live Perfected Signature descriptions.
- Removed the authoritative 2,886-line Powerup registry block from `dicebound.js` without changing Powerup values, eligibility, RNG order or save data.

## Beta 0.6.2.1 — Development checkpoint

### Version and release policy (#64)
- Adopted `MAJOR.MINOR.PATCH.REVISION` for all new PR builds while retaining historical three-component metadata compatibility.
- Added shared version parsing, per-PR uniqueness enforcement and four-component Windows VERSIONINFO coverage.
- Replaced the Beta-0.6.1-specific workflow with an explicit, version-agnostic validation/release workflow derived from committed project Version/Channel.
- Release specs and notes are now generated from authoritative project/runtime inputs; the immutable Beta 0.6.1 evidence remains archived under `.release/`.

### Balance
- Rebalanced the seven-slot Artifact table for #22: Boots 30%, Legs 20%, Ring 16%, Hat 14%, Amulet 9%, Offhand 7% and class Weapon 4%.
- Made the class Weapon the unique rarest Artifact-table result while preserving guardian Board/mode access rates and one-draw slot selection.

### Runtime architecture
- Continued #40 with the first behavior-preserving gameplay extraction: Artifact slot metadata, weights and weighted selection now live in `runtime/js/items/artifacts.js`.
- The Phase 1 extraction preserved the Beta 0.6.1 Artifact weights, guardian access rates, item factories and save behavior before the separate #22 balance change.
- Added deterministic boundary and immutability tests for the extracted weighted-selection module.
- Extracted guardian Artifact-access rates, ordinary guardian drop gates, rarity tables/promotions and secret-signature rates into `runtime/js/items/loot.js` without changing outcomes or RNG order.
- Added deterministic equivalence tests across every Board, guardian type and difficulty-mode combination for the new loot-policy owner.
- Moved the complete 25-class content registry into `runtime/js/classes/registry.js`, while preserving the recovered runtime's read-only compatibility view and all class data exactly.
- Added deterministic registry snapshot, isolation and ownership tests so future class mechanics and live descriptions can evolve behind an explicit module boundary.
- Extracted the canonical 45-node Legacy talent tree into `runtime/js/progression/talents.js` with every cost, rank, branch and prerequisite preserved.
- Added an exact talent snapshot plus structural validation for duplicate IDs, missing/invalid prerequisites and dependency cycles.
- Extracted the 13-pet registry, 11-enemy ordinary encounter pool and nine-tier rarity metadata into explicit pet/combat/item modules without changing content or selection behavior.
- Removed the monolith's byte-for-byte duplicate class-tag table; the compatibility view is now derived from the canonical class registry.
- Added deterministic snapshots, structural checks and clone-isolation coverage for the newly owned static registries.
- Moved board definitions, the special-enemy/guardian registry, equipment metadata and the achievement catalog into explicit domain owners.
- Extended the class owner with canonical passives, tag vocabulary, unlock requirements, mechanic tags and ultimate-support metadata.
- Preserved every extracted byte of content and the compatibility monolith's patch-era no-op behavior, with exact snapshots and nested clone-isolation tests.
- Extracted career defaults, Legacy XP thresholds, meta normalization/save coordination and the state-domain event bus into `runtime/js/core/state.js`.
- Added deterministic normalization/recovery and event-isolation tests, establishing the state boundary that active-run resume work can extend.

### Release identity
- Added `runtime/js/version.js` as the single current Version/Channel owner for browser-runtime consumers; wrapper contract, platform, native host, save envelopes and the monolith now consume its frozen API.
- Reduced release stamping to project config, the central runtime identity, static HTML fallback identity and native wrapper output, all driven by one explicit Version/Channel input.
- Added a deterministic identity validator covering module dependencies, runtime/build/native/release metadata and optional post-publication `latest.json` reconciliation.
- Added mutation tests proving stale central/native/module/project/distribution identity fails closed.
- Added a deterministic launcher-manifest generator so `distribution/latest.json` is derived from the final verified artifact metadata and release tag/URL convention instead of assembled independently.

### Launcher reliability
- Added persistent launcher diagnostics at `%LOCALAPPDATA%\DiceBoundLauncher\launcher.log`, including splash startup failures, PowerShell stderr, update decisions and game-launch results.
- Replaced the truncated launcher JPEG with a WPF-validated PNG derived from the approved campsite-road artwork, added a branded decoder fallback and made launcher asset validation fail on malformed PNG chunks/CRCs.
- Added deterministic Windows coverage for all four shortcut choices, repeated configuration, offline fallback, version/hash/size update decisions, verified replacement, and failed download/hash/size recovery without touching the prior game or saves.

## Beta 0.6.1 — Runtime Packaging & Asset Architecture

### Asset architecture
- Reorganized current runtime art into a granular role/context hierarchy for characters, enemies, equipment, powerups, campsite, board, combat, UI, installer and audio assets (#29).
- Split class art into campsite, battle and marker contexts; split enemies into normal/miniboss/final-boss/secret-boss roles with explicit future board-marker homes.
- Added slot-specific equipment folders including the future special-only Gloves location from #28.
- Organized current powerup art by rarity/shared role and made `runtime/js/assets.js` the authoritative current mapping layer.
- Added tracked README placeholder homes for art that is not implemented yet, including Random Class, Hell demon states, Gloves, combat statuses, guardian board markers, missing equipment/character art and installer splash art.
- Added a machine-readable `runtime/assets/ASSET_INVENTORY.json` and `tools/validate_asset_architecture.py` so every registry target, placeholder home and known historical runtime pointer can be audited.
- Retained documented read-only compatibility mirrors for historical paths still referenced by the recovered Beta 0.6 monolith. These mirrors are not valid destinations for new artwork and can be removed after the old fallback literals are extracted.
- Archived the exact original Beta 0.6 browser build metadata under `docs/releases/beta-0.6/`; Beta 0.6.1 now carries its own content-derived build identity.
- Added `tools/refresh_runtime_manifest.py` to materialize content-derived development build metadata before packaging.

### Release and launcher reliability
- Stamped the visible runtime, diagnostics, save envelopes, native title/logging, Windows VERSIONINFO and project metadata consistently as Beta 0.6.1 without changing save schema 2.
- Packaged the exact runtime and artwork tree, including JPG assets in the authenticated browser-content hash.
- Embedded Microsoft's signed x64 WebView2 loader and required a valid Authenticode signature for production builds.
- Fixed the launcher build instructions to include its long-download HTTP policy and prevented helper PowerShell windows from becoming stuck hidden processes.

### Powerup art
- Integrated the first generated powerup-art batch into the semantic powerup hierarchy while preserving the current supplied Glass Needle image.
- Added registry-backed rendered-choice mappings for 28 powerup names/tiers covering 22 canonical art assets.

## Beta 0.6 — Gear & Guardian Loot Rebuild

- Replaced independent Artifact slot rolls with one weighted Artifact loot-table roll per guardian; at most one Artifact can drop per kill.
- Artifact weights: Weapon 30%, Boots 20%, Legs 16%, Ring 14%, Hat 9%, Amulet 7%, Offhand 4%.
- Artifact-table access now follows the agreed Board 1–6 Normal / Nightmare / Hell matrix, scaling from 0.5% to 10% on Normal, 1% to 18% on Nightmare and 2% to 28% on Hell depending on guardian depth/type.
- Moved Axel's Coffee Mug, Kratz Headphones and The Jean Jacket Lost at Kelly's from Legendary to Mythical. Their unique behaviour is preserved; Prestige crafting is deferred.
- Added generated Legendary gear: 151–210 item points plus one of 20 build-changing Legendary Effects.
- Generated equipment point pools are now Poor 11–25, Common 26–45, Uncommon 46–70, Rare 71–105, Epic 106–150, Legendary 151–210.
- Memory Cache now guarantees generated Legendary equipment on Board 4+: 1/450 Normal, 1/300 Nightmare, 1/200 Hell, preferring an undiscovered Legendary Effect.
- Miniboss ordinary-equipment chance is now 85% Normal / 92% Nightmare / 100% Hell. Final bosses continue to guarantee an ordinary item.
- Fixed Abyssal Custodian / Board 6 miniboss cookie reward to 10.
- Final Price and Philosopher's Stone signature drop chance is now 5% Normal / 10% Nightmare / 15% Hell.
- Re-integrated boss/miniboss art bindings and the Random-class campsite placeholder into the authoritative runtime path.
- Fixed the old Memory Cache wrapper path so it cannot bypass the new cache implementation.
- Fixed Echo Chamber so Crit conversion occurs early enough in the attack pipeline to actually increase Echo count.
- Validated the recovered release with 32/32 static/build checks passing. The original sandbox could not honestly claim a headless visual browser test because enterprise policy blocked local/loopback Chromium execution.

## Beta 0.5.14 — Powerup Cleanup & Balance

- Audited all powerups against the six-tier rarity philosophy.
- Expanded the pool from 188 to exactly 200 powerups.
- New rarity distribution: 17 Poor / 35 Common / 64 Uncommon / 31 Rare / 34 Epic / 19 Legendary.
- Rebalanced lower-rarity values and repaired authoritative achievement gating.
- Kept 5 generally available Epics and 7 generally available Legendaries ungated for early high-rarity variety.

## Beta 0.5.13 — Boss & Miniboss Art

- Added supplied boss/miniboss portrait art to encounters.
- Refined Start Run/Nightmare campsite placement and added the Random-class camp placeholder.

## Beta 0.5.12 — Achievement Powerup Progression

- Expanded achievement-gated Epic/Legendary progression using existing milestones.
- Added Board 2 class-mastery Epic tiers and Board 5 Legendary mastery tiers where eligible.
- Updated achievement cards to list newly unlocked powerups.

## Beta 0.5.11 — Combat Screen & Elemental Parity

- Reworked desktop combat into a full-window game state.
- Mirrored player elemental identities for enemy elemental activations, including Ice Freeze.
- Fixed outside-combat Alchemist potion tracking.
- Restored Glass Needle artwork.
- Arcane Lance now converts half of Echo Strike chance into bonus spell damage.
- Frog unlock threshold increased to 150% Echo Strike during a run.

## Beta 0.5.10 — Companion Art & Campsite Tuning

- Added dedicated art for all 13 companions.
- Added full-body Ouroboros battle art.
- Continued Campsite spatial tuning.

## Beta 0.5.8 — Campsite Art Replacement

- Added dedicated Prestige moon, Trophy and Options art.
- Added separate Nightmare OFF/ON scene artwork.
- Updated several full-body class battle portraits.

## Beta 0.5.7 / 0.5.6 / 0.5.5 — Campsite & Runtime Foundation

- Added the full-screen Campsite environment and environmental interaction art.
- Added separate class board-marker artwork.
- Added talent-tree wheel zoom and hidden scrollbars.
- Added runtime-cache self-repair while preserving saves.
- Added build-specific frontend/WebView2 caches and frontend-ready startup handshake/logging.
- Added Alchemist potion-healing progression.

## Beta 0.4.1 — World Background Hotfix

- Replaced the fragile pseudo-element world background with explicit scene/atmosphere layers.
- Began durable repository-style patch-note/TODO tracking.
