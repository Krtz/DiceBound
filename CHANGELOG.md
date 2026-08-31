# DiceBound Changelog

This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.

## Beta 0.6.4.29

### Friends Patch — Camp, combat, companions and staged art (#97, #162, #187, #211, #233, #234, #235, #236)
- Camp returns now restore current HP to the authoritative effective maximum, hide locked Hell and locked Heirloom Storage objects, retain the accepted responsive scene composition, and keep Class/Storage destinations centered.
- Pet combat art and the Companion feed controls now use the authoritative selected-pet state and feeding transaction; Prestige confirmation and ordinary Moon purchases remain on the Moon.
- Added the playable Dragoon class, unlocked by a Board 4 miniboss victory, with a real one-response Airborne Jump, a landing strike, a rank-scaled cooldown talent and approved Camp/battle/marker artwork.
- Successful dodges use a short shared backflip presentation. Combat boundaries now cancel stale VFX work, while approved Fire and Gun projectiles travel between the actual attacker and target.
- Integrated approved Random Class, Wraith progression, Dragoon, Fire, Gun and Nullstar Hydra artwork. Combat tints now leave authored battle backgrounds more visible without sacrificing the combat UI.

## Beta 0.6.4.28

### Persistent sound preference (#205)
- Mute is now a normalized, durable Options setting shared by browser and native WebView2 storage rather than transient audio state.
- Muting and unmuting save immediately; changing volume while muted retains that volume for the next unmute and restart.

## Beta 0.6.4.27

### Prestige Moon ownership and permanent Prestige foundation (#178, #198, #209, #40)
- Added `progression/prestige.js` as the single owner for persisted Prestige currency, exact random-stat purchase bundles, held-point totals, and the free Refund All transaction.
- Replaced the old live Prestige presentation path with the full-screen `ui/prestige-moon.js` destination, including live held-bonus details, data-driven nodes and persistent Back chrome across wide, compact and short-wide layouts.
- The Moon Forge is visibly represented but deliberately remains `Cost TBD` until its balance value is approved; this release does not invent a cost or add crafting.

## Beta 0.6.4.26

### Talent constellation presentation ownership (#186, #198, #209, #40)
- Replaced the historical Talent modal renderer, fixed-layout override chain, wheel handlers and shared CSS with the authoritative `ui/talent-tree.js` full-screen constellation destination.
- The destination keeps a persistent top-right Done control, pointer drag-to-pan, cursor-focused wheel zoom, Fit Tree and responsive wide/compact/short-wide behavior. Its geometry audit and Edge/native smoke assertions guard the node/connector layout and prevent legacy presentation ownership from returning.
- Talent mechanics, prerequisites, points/costs, Prestige calculation, saves, checkpoints and RNG remain unchanged. A discovered historical Prestige survivor-dialog ID mismatch was corrected while preserving existing survivor semantics.

## Beta 0.6.4.25

### Pet chooser presentation ownership (#206, #209, #40)
- Replaced the layered Companion picker, duplicate Camp panel and late mutation-observer art patch with the authoritative `ui/pet-chooser.js` destination.
- The roster now uses semantic pet artwork, preserves locked/current state and outside-run cookie feeding, and keeps its Done control visible while scrolling or resizing a compact window.
- Camp now owns the selected pet figure it presents. Pet unlocks, bonding, switching restrictions, combat bonuses, saves and RNG are unchanged.

## Beta 0.6.4.24

### Camp presentation authority cleanup (#185, #209, #40)
- Moved the complete authored 16:9 Campsite stage, final object anchors, Camp-object art, and painted-object hit-target positioning into `ui/camp.js`.
- Removed the duplicate reward-policy scaler, residual mobile/grid Camp CSS, Camp-reveal DOM builders, scene-size override and chest-refresh wrapper chains from `dicebound.js`/shared CSS; Camp now has one final layout/art writer with no coordinate-translation patch layer.
- Added deterministic stage-frame and ownership guards, including short/wide containment coverage. Camp gameplay, class/pet/progression data, saves and RNG are unchanged.

## Beta 0.6.4.23

### Class chooser presentation ownership (#199, #209, #40)
- Replaced the historical Class-card grid and its reassignment chain with the authoritative `ui/class-chooser.js` roster/detail destination.
- The Camp Class surface now supports semantic class artwork, safe locked-class inspection, the existing five-unlock Random pool, and persistent top-right Done chrome across wide, compact and short/wide layouts.
- Removed the old chooser hub/card CSS and strengthened architecture checks so the former Class UI owner cannot return to the monolith. Class mechanics, unlock rules, RNG, saves and start-run behavior are unchanged.

## Beta 0.6.4.22

### Prismatic Birthright heirloom eligibility (#210)
- Prismatic Birthright starter weapons now carry semantic temporary-run provenance and are excluded from end-run and Prestige heirloom candidates.
- Replacing one with ordinary equipment keeps the replacement heirloom-eligible; already-bound legacy heirlooms are preserved without guessing from names.

## Beta 0.6.4.21

### Effective equipment Mana (#215)
- Equipped `+Mana` now contributes exactly once to the authoritative effective Mana cap for Mana-using classes, including both ordinary rolled bonuses and authored equipment intrinsics.
- Equipping or replacing Mana gear raises only the cap; it no longer refills current Mana. Removing it safely clamps current Mana if the cap falls.
- Run reset and active-run checkpoint restore retain the same effective Mana cap. Non-Mana classes do not gain a hidden Mana resource from equipped Mana gear.

## Beta 0.6.4.20

### Playtest follow-ups (#213)
- Unbound Impossible Relic now selects from the canonical Rare/Epic/Legendary/Mythical powerup progression instead of Legendary-only.
- Kept gear affix data and affixed names while removing redundant Prefix/Suffix detail text.
- Reworked the authored six-frame Donut Rain sheet into controlled player-and-actual-target VFX for player and enemy proc origins.
- Poison kills now reconcile selected-target presentation through the existing combat targeting owner before subsequent status presentation.

## Beta 0.6.4.19

### Element proc artwork structure
- Organized Nature, Donut and staged Gun proc art into dedicated element folders and updated canonical Nature/Donut references.
- Added a validator guard against loose proc PNGs at the combat-effects root; Gun gameplay/VFX behavior is not activated by this release.

## Beta 0.6.4.18

### Transparent Astral art + enemy Donut VFX (#13, #201)
- Replaced the opaque Astral Devourer Dragon battle image with the approved transparent cutout and made it the canonical Board 2 final-guardian art.
- Enemy-origin Donut procs now invoke the same authored Donut Rain battlefield VFX as player-origin procs after the real proc resolves.
- Gameplay values, targeting, RNG, Donut damage/healing, guardian mechanics and save behavior are unchanged.

## Beta 0.6.4.17

### Persistent Class chooser exit (#197)
- Kept the Class chooser Done/Exit control visible at the top-right while its class list scrolls or the window is scaled down.
- Added a focused Camp UI regression guard; no class mechanics, unlock, RNG, save or balance behavior changed.

## Beta 0.6.4.16

### Camp visual-baseline regression (#194)
- Restored the approved 0.6.4.13 top-stage Camp anchors for Options, Talents and Prestige after the #185 extraction incorrectly treated historical offsets as complete coordinates.
- Restored the selected Class figure to the semantic full-body Camp artwork path rather than the portrait-card renderer.
- Kept gameplay, RNG, saves, progression reveals and the remaining Camp layout unchanged.

## Beta 0.6.4.15

### Camp presentation ownership (#185, #40)
- Added `runtime/js/ui/camp.js` as the authoritative owner for Camp scene construction, approved wide/compact/stacked composition regimes, authored Camp-object rendering, and painted-object hit-target synchronization.
- Moved the final Beta 0.6.4.13 Camp coordinate definitions into that owner and removed the duplicate external layout block.
- Kept class, pet, progression, save, mode and gameplay owners in their existing domains; the compatibility monolith now supplies a narrow Camp view model/actions adapter only.

## Beta 0.6.4.14

### Monolith hygiene (#180, #40)
- Removed 50 provably unreachable earlier top-level function declarations from `runtime/js/dicebound.js`; the JavaScript runtime already initialized the last same-scope declaration before any game code could run.
- Kept every authoritative final declaration and all later wrapper/adaptor chains, so gameplay, RNG order, saves and Camp behavior are unchanged.
- Runtime architecture validation now fails if duplicate top-level function declarations are reintroduced; repeated nested test/helper names remain advisory because they are independent scopes.

## Beta 0.6.4.13

### Camp composition follow-up
- Repositioned the existing Camp interaction groups from screenshot playtest feedback: Options moves to the top-left; Talents and Prestige rise into the sky; Trophy moves to the far-left foreground; Info takes the former Trophy area; Pet moves under Class; Chest takes the former Pet area; and the bonfire settles slightly lower.
- Start Run, artwork sizes, gameplay, saves and semantic Camp hit-target synchronization are unchanged.

## Beta 0.6.4.12

### Astral Devourer Dragon battle art (#13)
- Replaced the incorrect canonical Board 2 final-guardian portrait with the approved Astral Devourer Dragon artwork.
- Kept the authoritative #169 guardian identity/resolver unchanged; this is an art-only correction with no combat, RNG, balance or save changes.

## Beta 0.6.4.11

### Equivalent-state memory-cycle diagnostics (#124)
- Added a test-only real-runtime Camp -> Board -> ordinary combat -> Board -> Camp cycle that clears its temporary active-run checkpoint before and after the exercise.
- Memory Diagnostics now produces one canonical equivalent-state summary with Camp/Board/Combat DOM and available heap deltas relative to each state’s baseline; it records evidence and does not label a change a leak.
- Added deterministic summary coverage plus Edge/WebView2 smoke assertions for three complete cycles.

## Beta 0.6.4.10

### Memory Diagnostics export validation hotfix (#124)
- Fixed the export test to compare the captured export timestamp, eliminating a millisecond-boundary false failure without changing runtime export behavior.

## Beta 0.6.4.9

### Memory Diagnostics export (#124)
- Debug → Memory Diagnostics can now write/download its bounded time series as a plain `.log` without clearing it.
- The file starts with generated time and truthful Version/Channel/Build-ID metadata, then contains the same canonical concise sample lines visible in Debug.
- Added deterministic contract coverage for the shared platform save path and non-mutating exports, plus runtime smoke assertions for the new control and log text.

## Beta 0.6.4.8

### Chained combat target presentation (#73, #40)
- Added `combat/targeting.js`, the tested pure resolver for the next living enemy in a combat pack.
- A lethal strike now advances the selected target before combat events, floating-number/VFX consumers and any Echo or other follow-up presentation runs.
- The target HUD, selected stage host/glow and target selector now share that one live target; strike events expose the resulting presentation target for consumers and regression tests.

## Beta 0.6.4.7

### Final guardian identity correctness (#161)
- Added `combat/guardians.js`, the single resolver joining Board selection, combat data and canonical semantic battle/board-marker paths for every miniboss and final guardian.
- Routed live final/miniboss combat construction, Board 6's final override, the road HUD and the legacy portrait adapter through that resolver, removing the stale portrait map that could disagree with encounter identity.
- Added deterministic Board 1–6 registry coverage plus Edge/WebView2 smoke assertions for Board 1, a resumed Board 3, and Board 6 across Normal/Nightmare/Hell.

## Beta 0.6.4.6

### Merchant reward transaction reliability (#160)
- Added one authoritative Merchant-visit transaction owner for offer reservations, consumed stock and the exclusive Sovereign/Legendary Contract choice.
- A pending Legendary choice now freezes the current Merchant visit: delayed rerenders or re-entry cannot rebuild stock, re-enable a sold offer or begin a second choice.
- An exhausted Legendary pool still refunds the price, but the current visit's offer remains consumed so the flow cannot loop or softlock.
- Added deterministic transaction coverage and real Edge/WebView2 smoke coverage for the delayed Sovereign selection path.

## Beta 0.6.4.5

### Class unlock feedback (#116)
- Added immediate, registry-derived unlock reasons from the canonical successful `unlockClass` path instead of inferring them from toast text.
- Added a persistent, sequential Camp reveal for newly unlocked classes with canonical artwork, class identity, a concise play-style summary and the completed requirement.
- Acknowledged reveals do not replay, while multiple new classes remain queued one at a time.
- Kept the semantic Start Run target tied to the painted caravan after native Camp layout rerenders, rather than allowing a later generic minimum height to enlarge it.

## Beta 0.6.4.4

### Lunch playtest follow-ups (#156)
- Tightened mixed authored/placeholder enemy-pack presentation without changing pack mechanics, targeting, stats or RNG.
- Added final-stat loot comparison deltas and stacked Keep/Equip and Sell decisions for faster equipment reads.
- Added presentation-only footsteps to traversed ordinary road spaces while deliberately leaving Merchant spaces unmarked; active-run resume restores the trail.
- Added restrained hover/focus feedback and tighter hit areas for Camp interactions.
- Kept Slime in the early road pool across Boards 1–6 using the correct Board-specific art.
- Standard Slimes now gain 5% Radiation proc chance per earlier Slime killed in the current run, capped at 100%, with the count reset on new runs and preserved by active-run checkpoints.

## Beta 0.6.4.3

### Screenshot-driven browser hotfix (#154)
- Kept the now-confirmed authored Nature Poison Vines fix: live combat rerenders no longer delete the effect before it becomes visible, and Nature mechanics/RNG/turns remain unchanged.
- Unified authored and rolled equipment stats in player-facing presentation, retained the RPG-style equipped-item hover, and added side-by-side currently-equipped versus newly-found loot comparison on desktop.
- Replaced the broken fixed 1600×900 Camp transform with viewport-relative object placement over the authored cover background so wide and tall Edge windows keep the Camp interaction set on-screen.
- Corrected guardian sizing by enlarging the actual miniboss/final-boss image frames rather than only their stage containers; final bosses remain larger than minibosses.
- Heavy Purse now consumes the shared level-scaled Gold policy at a 0.70 source multiplier, with the authoritative Gold modifier applied once.

## Unreleased — Beta 0.6.4.2

### Combat presentation ownership (#40)

- Extracted authored Nature Poison Vines and Donut Rain DOM presentation into `runtime/js/combat/vfx.js`.
- The existing combat pipeline retains its exact mechanics, targets, turns and RNG; the monolith now supplies only its local-state adapters to the presentation owner.
- Added deterministic coverage for VFX ownership, scoped Nature legacy-suppression, live-target filtering and the established Nature/Donut asset contracts.

### Memory diagnostics (#124)

- Added the off-by-default **Debug → Memory Diagnostics** time-series recorder with manual snapshots, bounded retention and lifecycle/periodic recording.
- Samples distinguish available Chromium heap/DOM/overlay/asset-registry context from unsupported timer, listener and native-process metrics instead of reporting invented zeroes.
- Added direct Edge and native WebView2 smoke coverage for Camp, Board and major-overlay diagnostic samples.

## Beta 0.6.4.0

### Friends patch

- Enlarged mini-boss and final-boss battle art while scaling Slime and Wolf progression art down for clearer combat framing.
- Made slot tiles materially rarer, improved their match odds/rewards, and introduced one level-scaled Gold policy for the Fortune talent, slots and Lucky Wheel.
- Replaced detached Camp interaction rectangles with painted-object-sized semantic button targets.
- Added collapsible achievement groups and per-hero mastery subgroups driven by authoritative metadata.

## Beta 0.6.3.15

### Authored equipment identity foundation (#128, #83, #110)
- Imported the first ten approved modular equipment assets and introduced stable, persisted equipment identities with canonical slot, family, art, visual and relative class-weight metadata.
- Base Intrinsics are now explicit and distinct from ordinary rolled item points; the Equipment and loot panels expose the actual identity, artwork and Intrinsic values.
- Every class can still equip valid gear. Class preferences only alter relative generation likelihood.

## Beta 0.6.3.14

### Nature Poison Vines presentation hotfix (#80)
- Authored Nature Poison Vines now replaces the legacy generic Nature burst for a real elemental proc instead of layering over it.
- Nature mechanics, target selection, RNG order, turns and saves are unchanged. Generic Poison cues remain intact, and Fire retains its generic elemental presentation.
- Browser and native combat smoke explicitly verify the real Nature VFX without the generic Nature placeholder, alongside the Fire negative control.

## Beta 0.6.3.13

### Combat presentation and Nature-proc regression coverage (#53, #80)
- Made miniboss and final-boss battle portraits explicitly larger than ordinary enemies; final bosses now render larger than the player portrait at the tested narrow layout.
- Reduced the dedicated Slime/Wolf Board-progression battle-art stage modestly at desktop and narrow widths without affecting their art resolver, modes, combat stats or turns.
- Extended the real browser/native combat smoke to exercise a Nature pack proc through the live pipeline: the killed target is excluded while both surviving affected enemies receive Poison and the VFX; a forced Fire proc confirms that ordinary non-Nature combat does not create a vines overlay.

## Beta 0.6.3.12

### Startup bootstrap cleanup (#138)
- Prevented the historical start/class-selection scaffold and underlying run UI from painting before the current full-screen Camp finishes synchronous construction.
- Removed the unreferenced hidden Alpha rules block from the bootstrap DOM while preserving compatibility IDs still used by the current Camp runtime.

## Beta 0.6.3.11

### Nature Poison Vines proc VFX (#80, #71)
- Added the approved eight-frame transparent thorny-vines effect to the canonical combat-effects tree and registered it as a reusable elemental-proc animation.
- Nature procs play on actual living targets without changing RNG, damage, targeting, turns or saves.

## Beta 0.6.3.10

### Camp layout hotfix
- Shifted the Info books modestly left on desktop Camp layouts.
- Shifted the Start Run caravan substantially farther right while leaving mobile Camp positioning unchanged.

## Beta 0.6.3.9

### Ordinary equipment generation architecture (#127)
- Moved the authoritative deterministic construction and normalization of ordinary equipment into `runtime/js/items/equipment.js`.
- The compatibility monolith now supplies its current mutable balance tables and runtime identity/RNG services through a narrow injected contract, while special handcrafted gear and presentation chains remain in their existing owners.
- Added seeded equivalence fixtures spanning every slot and current ordinary-generation rarity, including generated object shape and outer RNG-call-count boundaries.

### Wolf Board battle-art progression (#91)
- Added the approved transparent Wolf base forms for Boards 1--6 to the canonical ordinary-enemy battle-art tree, reusing the Slime PR's identity-plus-Board resolver and separate difficulty aura presentation.
- Wolf road-marker ownership stays static and unchanged. Board 5/6 two-Direwolf artwork does not independently change pack size, turn count or damage; the separately approved Echo Strike policy remains a follow-up mechanic task.

### Normal combat backgrounds (#115)
- Added the six supplied Board 1–6 Normal-mode battle environment plates under the canonical combat-background hierarchy.
- Combat now resolves the environment from Board and difficulty context: authored Normal plates apply independently of combatant art, while Nightmare and Hell deliberately retain their existing presentation until authored #88 variants exist.
- Added deterministic registry/asset coverage and browser/native runtime smoke assertions for the combat-background contract.

### Static ordinary-enemy board markers (#82)
- Added the approved transparent Slime, Goblin, Skeleton, Orc, Cultist, Wraith, Demon and Lich board markers under the canonical normal-enemy marker hierarchy.
- The semantic marker resolver now covers all eleven ordinary enemy identities while keeping marker-only assets out of the full-body battle-art resolver.
- Board-marker selection remains invariant across Boards and difficulties; the new assets do not imply battle art, tier variants or mode auras.

### Slime Board battle-art progression (#81)
- Added the approved transparent Slime base forms for Boards 1--6 to the canonical ordinary-enemy battle-art tree.
- Battle presentation now resolves dedicated enemy art from semantic identity plus Board. Normal, Nightmare and Hell reuse the same Board base image; the latter two render only a separate faint runtime aura.
- Slime battle art is explicitly distinct from road-marker ownership. The static Slime marker remains the #82 asset/context and no Board or mode marker variants were created.

## Beta 0.6.3.3 — Development checkpoint

### Progressive Camp reveals (#109)
- Fresh careers now begin with no Achievement Trophy, Talent Star or Prestige Moon in Camp. Each is a permanent career reveal rather than an invisible disabled control.
- The existing Trophy appears after the second earned achievement through a count-based tier helper, leaving a stable seam for later Trophy-art upgrades.
- The Talent Star appears after the first earned Legacy level, and the Prestige Moon appears when the existing nine-total-Talent-Points calculation first offers at least one Prestige Point.
- Advanced careers reconcile from authoritative achievement, Legacy and Prestige facts without revealing objects for a genuinely fresh level-one career.

## Beta 0.6.3.2 — Development checkpoint

### Release pipeline reliability (#118)
- Protected `main` remains protected while successful release publication can advance the permanent launcher manifest through a narrowly scoped maintainer credential.
- Pull-request validation never uses the protected-main credential; ordinary GitHub Release creation continues to use the workflow token.
- The final launcher-manifest update now uses the GitHub Contents API instead of a bot `git push` that repository rules reject.
- Publish runs fail early when the protected-main credential is missing, and manifest-only commits remain excluded from recursive release runs.

## Beta 0.6.3.1 — Development checkpoint

### Class progression, Slime borrowing and ordinary gear (#96, #104, #87)
- Pokémon Trainer now requires every pet at level 10 plus a Board 5 clear with Beastmaster on any difficulty; the two career conditions may be completed in separate runs.
- Rogue now requires holding at least 5,000 Gold at once plus defeating the Board 3 miniboss; Vampire requires exceeding 100% Lifesteal plus defeating the Board 3 final boss; both pairs persist independently across runs.
- Merchant now unlocks after the first Road Merchant secret-boss kill, Slime unlocks at 10 total unlocked classes, and future Invoker/Dragoon progression facts track qualifying Mana-spender casts and the Board 4 miniboss.
- Slime and Slime Rouge can borrow class-owned Powerups only from classes the career has unlocked. Slime Rouge still applies its existing capability/Ultimate compatibility checks, while generic and valid multi-owner Powerups remain available.
- Ordinary generated equipment now uses neutral slot names and uniform slot-eligible prefix/suffix selection with no class or tag weighting; named special gear and higher-tier handcrafted items are unchanged.

### Active-run save and resume (#35)
- Added a separate versioned active-run checkpoint schema with a primary slot, three rotating backups and corrupt-primary recovery; existing career saves remain schema 2 and independently recoverable.
- Seeded each real expedition through the shared RNG service and persist its exact state/call cursor with the board, player/build, run counters, cleared outcomes and matching career snapshot.
- Added a campsite Continue Run panel plus explicit abandonment flow. Victory, death, Prestige, reset and starting a replacement run clear the checkpoint.
- Autosaves occur only at completed road states. Quitting during combat, a reward, merchant, level-up or other transient interaction resumes the previous completed checkpoint, preventing partial-state and duplicate-reward saves.
- Added deterministic coverage for serialization safety, backup recovery, exact RNG continuation, career isolation and runtime composition guards.
- Fixed the current-source Pet Mirror wrapper to extend the live `petTurn` pipeline instead of referencing nonexistent `petAttack`, which had prevented a fresh browser payload from completing startup.

## Beta 0.6.2.4 — Development checkpoint

### Effective Gold gain stat (#52)
- Current Run Buffs and Info → Stats now show effective Gold gain, with 100% defined as the baseline.
- The visible percentage, hover explanation and every scaled gold reward now use the same authoritative calculation, including Nightmare/Hell's 50% reward multiplier.
- Existing Gold reward behavior is unchanged; focused tests cover normal and difficulty-adjusted rounding.

## Beta 0.6.2.3 — Development checkpoint

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
