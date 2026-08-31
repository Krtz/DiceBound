# Unreleased — Beta 0.6.4.27

## Beta 0.6.5.0 Camp scene and Donut VFX repair (#17, #71, #145)
- Camp keeps legacy Nightmare, Hell and Storage source controls hidden whenever the destination refreshes, preventing locked Hell presentation from leaking outside the authored 16:9 stage.
- Start Run is a larger lower-right scene object with a synchronized painted hit target. Info now occupies the Pet-to-Trophy flow, while the bonfire sits lower in the clearing.
- Camp resolves each selected Class through the full-body `campFigure` semantic. Class chooser cards retain their dedicated headshot semantic.
- Donut proc presentation now uses the six approved transparent frame images through the shared VFX owner instead of CSS spritesheet cropping. No combat/RNG/save behavior changes.

## Beta 0.6.4.29 Friends Patch (#97, #162, #187, #211, #233, #234, #235, #236)

- Camp fully restores current HP on arrival, hides locked Hell and Heirloom Storage scene objects, preserves the current responsive object composition, and uses shared centered destination positioning for Class and Storage.
- Companion feeding now calls its canonical transaction, selected Pets appear using their semantic full-body battle art, and normal Prestige transactions stay on the Moon instead of returning to Camp.
- Dragoon is playable after a Board 4 miniboss victory: Jump creates one real Airborne enemy-response window, then resolves a single landing strike. Its new class Talent reduces Jump cooldown without changing ordinary class mechanics.
- Successful player dodges trigger a short shared backflip, and a new-combat boundary cancels stale attack/VFX timers before presentation begins.
- Approved Dragoon, Random Class, Wraith board-tier, Fire, Gun and Nullstar Hydra artwork are wired through the semantic asset registry. Fire and Gun proc effects travel from their actual source to their actual target.
- Combat overlay opacity was reduced moderately so authored Board backgrounds read more clearly while combat information remains legible.

---

## Beta 0.6.4.28 persistent sound preference (#205)

- Mute now persists with normal Options settings across browser and native WebView2 restarts.
- Volume and sound-pack settings remain independent, including when volume changes while sound is muted.

## Prestige Moon ownership and permanent Prestige foundation (#178, #198, #209, #40)

- Prestige now opens as a dedicated full-screen Moon destination with an always-visible Back control, live held-point stat tooltip, data-driven purchase nodes, and free Refund All.
- `progression/prestige.js` owns persisted Prestige currency, exact five-stat purchase bundles, held bonuses and refund transactions; `ui/prestige-moon.js` owns the scene only.
- The Moon Forge is visible as a deliberately unavailable `Cost TBD` upgrade until its balance value is approved. Crafting is not implemented by this release.
- Talent no longer presents a second Prestige action; Camp/shared CSS no longer carries the retired Prestige popup layout.

---

# Beta 0.6.4.26

## Beta 0.6.4.26 Talent constellation ownership and full-screen atlas (#186, #198, #209, #40)

- Talents now open in a dedicated full-screen constellation destination with a persistent top-right Done control.
- The atlas supports drag-to-pan, cursor-focused mouse-wheel zoom, Fit Tree, overview and close-inspection scales, and compact/short-wide layouts.
- Talent definitions, prerequisites, ranks, costs, Prestige, saves and gameplay effects are unchanged; the historical renderer/zoom/style patch chain is removed.

---

# Unreleased — Beta 0.6.4.24

## Beta 0.6.4.25 Companion chooser ownership (#206, #209, #40)

- Companion selection now has one responsive roster destination with semantic pet art, clear locked/current state and cookie feeding outside active runs.
- Done remains visible while the roster scrolls or the window changes size; the Camp scene owns its selected-pet presentation.
- Pet progression, unlocks, switching rules, saves, combat bonuses and RNG are unchanged.

---

# Beta 0.6.4.24

## Camp stage ownership cleanup (#185, #209, #40)

- The Campsite now has one authoritative 16:9 stage owner for final layout, authored Camp objects and painted-object hit targets.
- Removed the reward-policy Camp scaler, residual mobile/grid CSS, reveal-control DOM builders and historical monolith refresh chains instead of retaining a late translation patch layer.
- Class, pets, progression, saves, gameplay and RNG behavior are unchanged.

---

# Beta 0.6.4.23

## Class chooser modernization (#199, #209, #40)

- Class selection is now a dedicated roster-and-detail Camp destination rather than the historical card dump.
- Each class uses its canonical artwork; safe locked-class inspection, the existing five-unlock Random option, and the visible top-right Done control are preserved.
- This is presentation/architecture work only: class mechanics, unlock rules, Random choice behavior, save data and run behavior are unchanged.

---

# Beta 0.6.4.22

## Prismatic Birthright heirlooms (#210)

- Prismatic Birthright weapons are now run-only and no longer appear as heirloom candidates.
- Replacing one with ordinary gear still lets that replacement become an heirloom normally.

---

# Beta 0.6.4.21

## Effective equipment Mana (#215)

- `+Mana` from ordinary bonuses and authored equipment now raises the real Mana cap for Mana-using classes.
- Equipping Mana gear increases capacity without restoring free Mana; removing it clamps current Mana safely.
- Active runs retain the same effective cap after reset/checkpoint restoration, while non-Mana classes stay Mana-free.

---

# Unreleased — Beta 0.6.4.19

# Unreleased — Beta 0.6.4.20

## Playtest follow-ups (#213)

- Unbound Impossible Relic now offers the authoritative Rare/Epic/Legendary/Mythical powerup progression rather than Legendary-only.
- Gear details keep affixed item names while no longer repeat separate Prefix/Suffix text.
- Donut Rain renders its six authored spritesheet frames as restrained player-and-target cloud/rain effects for both proc origins, rather than scaling the entire sheet across the battlefield.
- A selected enemy killed by a Poison tick now advances through the authoritative targeting owner before status presentation continues.

---

# Unreleased — Beta 0.6.4.19

## Element proc artwork structure

- Nature, Donut and Gun proc artwork now live in dedicated per-element folders under `assets/combat/effects/`.
- Nature and Donut keep their existing implemented behavior through corrected canonical asset-registry paths.
- The approved ten-image Gun VFX pack is staged for a later Gun proc implementation; the two rejected arm variants are not shipped in the runtime repository.
- Asset validation now enforces the per-element proc folder convention.

---

# Unreleased — Beta 0.6.4.18

## Transparent Astral art + enemy Donut VFX (#13, #201)

- Astral Devourer Dragon now uses the approved transparent battle cutout instead of the opaque rectangular image.
- Donut elemental procs triggered by enemies/Guardians now play the authored Donut Rain artwork just like player-origin Donut procs.
- This patch changes presentation only; Donut damage/healing, proc odds, RNG, targeting, guardian behavior and saves are unchanged.

---

# Unreleased — Beta 0.6.4.17

## Persistent Class chooser exit (#197)

- The Class chooser now keeps its Done/Exit header visible at the top-right while the class list scrolls or the window is scaled down.
- This is a presentation-only fix: class selection, unlocks, RNG, saves and run behavior are unchanged.

---

# Unreleased — Beta 0.6.4.16

## Camp visual-baseline regression (#194)

- Restored the approved Beta 0.6.4.13 on-screen anchors for Options, Talents and Prestige after the Camp ownership extraction treated old adjustment offsets as standalone positions.
- Selected Class again renders as the full-body Camp figure, not a portrait-card image.
- Gameplay, RNG, saves and Camp progression reveals are unchanged.

---

# Unreleased — Beta 0.6.4.15

## Camp presentation ownership (#185, #40)

- Camp scene construction, current presentation refresh, approved responsive composition, authored Camp-object art and painted-object hit targets now have one owner: `runtime/js/ui/camp.js`.
- The approved Beta 0.6.4.13 visual arrangement is preserved while its final desktop coordinate definitions move out of the generic stylesheet and into the Camp owner.
- Class, pet, progression, save, mode and gameplay behavior remain in their existing domain owners; no balance, RNG or save semantics change.

---

# Unreleased — Beta 0.6.4.14

## Monolith hygiene (#180, #40)

- Removed 50 provably unreachable earlier top-level function declarations from the compatibility monolith, leaving the existing authoritative final declarations and wrapper chains intact.
- Added a strict architecture guard against new duplicate top-level declarations; no gameplay, RNG, save or visual behavior changes are intended.

---

# Unreleased — Beta 0.6.4.13

## Camp composition follow-up

- Spread the existing Camp objects back across the authored scene from screenshot playtest feedback: Options top-left, Talents/Prestige much higher, Trophy far left, Info into the former Trophy area, Pet under Class, Chest into the former Pet area, and the bonfire slightly lower.
- Start Run and all gameplay, save, interaction and hit-target behavior remain unchanged.

---

# Unreleased — Beta 0.6.4.12

## Astral Devourer Dragon battle art (#13)

- Replaced the incorrect canonical Board 2 final-guardian portrait with the approved Astral Devourer Dragon artwork.
- The existing authoritative guardian resolver remains unchanged; gameplay, RNG, balance and save behavior are unaffected.

---

# Unreleased — Beta 0.6.4.11

## Equivalent-state memory-cycle diagnostics (#124)

- Added a test-only real-runtime Camp → Board → ordinary combat → Board → Camp cycle for comparable memory samples; the temporary active run is cleared before and after the exercise.
- Memory Diagnostics now summarizes DOM and available heap deltas only among samples with the same lifecycle state. These are measurements, not automatic leak verdicts.
- Added deterministic summary coverage and Edge/WebView2 smoke assertions for three complete cycles.

---

# Unreleased — Beta 0.6.4.10

## Memory Diagnostics export validation hotfix (#124)

- Made the deterministic `.log` export assertion compare the captured generated timestamp instead of creating a second timestamped export representation.

---

# Unreleased — Beta 0.6.4.9

## Memory Diagnostics export (#124)

- Debug → Memory Diagnostics now exports the complete bounded time series as a plain `.log` through the shared browser/native text-save contract.
- The export includes generated time, Version, Channel and truthful Build ID availability, then uses the exact same canonical sample lines shown in Debug.
- Exporting never clears, reorders or otherwise mutates the retained diagnostic samples.

---

# Beta 0.6.4.8

## Chained combat target presentation (#73, #40)
- When a strike defeats the selected enemy, target selection now advances to the next living enemy before combat events, VFX/floating-number consumers and the next Echo or follow-up animation.
- The target HUD, selected battle host/glow and target-selector button stay synchronized with the actual living target through repeated chained kills.
- Added a deterministic target resolver plus browser/native combat-smoke coverage for a delayed multi-kill Echo chain.

---

# Beta 0.6.4.7

## Final guardian identity correctness (#161)
- Final guardians now resolve from one Board-owned identity covering combat data, special/weakness and semantic battle/board-marker artwork.
- The runtime no longer lets the legacy portrait map independently override guardian art.
- Deterministic coverage plus browser/native smoke assertions cover Board 1, resumed Board 3 and Board 6 in Normal, Nightmare and Hell.

---

# Beta 0.6.4.5

## Class unlock feedback (#116)
- Unlock toasts now explain the completed, authoritative requirement instead of only naming the class.
- Returning to Camp presents queued new classes one at a time with their canonical artwork, identity, play-style summary and unlock reason.
- Acknowledged reveal cards remain acknowledged across restart/Continue Run; secret requirements are shown only after their class actually unlocks.
- Native Camp layout rerenders keep the Start Run button matched to the painted caravan.

---

# Beta 0.6.4.4

## Lunch playtest follow-ups (#156)
- Mixed enemy packs keep authored art and fallback combatants aligned in a more consistent row without changing combat mechanics.
- Found gear keeps the current/new side-by-side comparison and now adds compact final-stat deltas with vertically stacked Keep/Equip and Sell controls.
- Traversed ordinary road spaces leave subtle footsteps that survive Continue Run; Merchant spaces intentionally stay unmarked.
- Camp interactions use restrained hover/focus lift and glow feedback with tighter clickable regions around visible artwork.
- Slime remains an early-road enemy on Boards 1–6 and uses the matching Board-specific progression art.
- Standard Slime Radiation chance is 5% per earlier Slime kill this run, safely capped at 100%; the run counter resets on a new run and survives active-run checkpoint/resume.

---

# Beta 0.6.4.3

## Screenshot-driven browser hotfix (#154)
- Nature Poison Vines now stays visible through live combat rerenders by moving the authored effect to a stable foreground host without changing Nature mechanics, RNG or turns.
- Equipment presentation combines authored and rolled stats into one readable item block; equipped-item hover uses the same readable RPG-style presentation.
- Newly found equipment is shown side by side with the currently equipped item on desktop for faster comparison, with a single-column fallback on narrow windows.
- Camp no longer scales a fixed 1600×900 interaction canvas. Interactions use viewport-relative positions over the authored `cover` background so wide and tall Edge windows keep the Camp controls on-screen.
- Miniboss and final-boss art now sizes the actual guardian image frame instead of only enlarging its empty stage container; final bosses remain larger than minibosses.
- Heavy Purse now uses the shared level-scaled Gold policy at a 0.70 source multiplier before the authoritative Gold modifier is applied once.

---

# Unreleased — Beta 0.6.4.2

## Combat presentation ownership (#40)

- `runtime/js/combat/vfx.js` now owns the authored Nature Poison Vines and Donut Rain presentation lifecycle.
- Combat mechanics still own damage, targets, turns and RNG. The remaining monolith adapters only supply live combat-local state and hook the presentation after real resolved procs.
- Nature continues to replace only its legacy generic elemental burst for a real authored Nature proc; generic Poison cues and non-Nature effects are unchanged.

## Memory Diagnostics (#124)

- Debug now contains lightweight Memory Diagnostics: take a one-shot snapshot, optionally record a bounded periodic/lifecycle time series, or clear the local log.
- Samples record actual runtime context, Chromium heap data when exposed, DOM/overlay state and DiceBound asset-registry paths. Unsupported timer/listener/native-process metrics stay visibly unavailable rather than pretending to be zero.
- Direct Edge and native WebView2 smoke now capture representative Camp, Board and overlay samples.

---

# Beta 0.6.4.0

## Friends patch

- Combat framing now gives mini-bosses/final bosses more presence and keeps Slime/Wolf Board art proportionate.
- Slot frequency, odds and rewards are owned by a deterministic event-reward policy; Fortune, slots and the Wheel share level-scaled Gold.
- Camp hit targets follow their visible painted objects while preserving keyboard buttons.
- Achievements are grouped into collapsible semantic sections with a Hero Mastery subgroup for every playable class.

## Beta 0.6.3.15

## Authored equipment identity foundation (#128, #83, #110)
- Imported the ten approved transparent modular equipment assets into their canonical slot-based runtime folders; the raw art handoff remains outside Git.
- Ordinary generated equipment now persists a stable `equipmentId` selected by one extracted equipment-domain registry with slot, family, material, eligibility, visual rig/anchor, canonical art and roll-weight metadata.
- Base Intrinsics are authoritative and separate from the ordinary generated point budget: the first pack adds its approved Attack, Defense, Crit, elemental-proc and Echo values.
- Class preferences are relative roll weights only. Every class can still equip every valid item and stored equipment remains cross-class usable.
- The Equipment panel and loot card resolve the identity-owned artwork and label Intrinsics explicitly. Existing untagged Beta gear is not rerolled or migrated.

---

# Beta 0.6.3.14

## Nature Poison Vines presentation hotfix (#80)
- A real Nature elemental proc now replaces the retired generic Nature burst with the authored Poison Vines sequence instead of showing both effects.
- Nature mechanics, damage, Poison, targets, RNG, turns and saves are unchanged; ordinary Poison cues remain unchanged.
- Fire retains its generic elemental presentation. Browser and native smoke both assert that a real Nature proc creates vines but no legacy Nature placeholder.

---

# Beta 0.6.3.13

## Combat presentation and Nature regression coverage (#53, #80)
- Minibosses and final bosses now have a stronger on-screen presence in battle; final bosses are larger than the player portrait in the supported narrow layout check.
- Slime and Wolf full-body Board-progression artwork is a little smaller, keeping its Board-based resolver and difficulty aura separate from combat mechanics.
- Nature Poison Vines now has live combat regression coverage for a multi-enemy proc: defeated targets do not receive the visual, and all surviving affected enemies do.

---

# Beta 0.6.3.12

## Startup cleanup (#138)
- The obsolete Alpha-era class-selection screen no longer flashes for a moment while the modern Camp is being constructed.
- DiceBound now keeps the bootstrap UI invisible through first paint and reveals it immediately after runtime initialization, with no artificial loading delay.
- Removed an unused hidden block of old Alpha rules text from the startup DOM.

---

# Beta 0.6.3.11

## Nature Poison Vines VFX (#80)
- Nature procs now show thorny poison vines erupting, lashing their actual living target, then receding.
- Player Nature procs animate each surviving affected enemy; enemy Nature procs animate the player.
- The sequence is visual-only, non-blocking, and skipped for defeated targets.

---

# Beta 0.6.3.10

## Camp layout hotfix
- Moved the Info books a little left in the desktop Camp composition.
- Moved the Start Run caravan much farther right in the desktop Camp composition; mobile positioning is unchanged.


## Ordinary equipment generation architecture (#127)
- Ordinary generated-item construction and post-generation normalization now have one equipment-domain owner outside the compatibility monolith.
- Current point budgets, affix tables, seed/RNG services and runtime identity are injected without changing ordinary item outcomes, save shape or balance.
- Deterministic coverage now locks all current rarity/slot fixtures and the forced/unforced-slot RNG-call boundary.

---

## Wolf battle progression (#91)
- Wolf now uses its approved full-body Board 1--6 artwork in battle, including the authored Board 5/6 two-Direwolf base forms.
- The artwork does not alter pack size, enemy turns or damage; its separately approved Echo Strike balance policy remains intentionally outside this art-only PR.
- The existing road marker remains one static Wolf marker on every Board and difficulty.

---

## Normal combat backgrounds (#115)
- Added one supplied Normal-mode battle backdrop for every Board, from the Board 1 woodland through the Board 6 gothic citadel.
- Normal background selection is Board-specific and separate from combatants; Nightmare and Hell do not fabricate variants and retain their existing presentation.

## Static ordinary-enemy board markers (#82)
- Added approved transparent static board markers for Slime, Goblin, Skeleton, Orc, Cultist, Wraith, Demon and Lich.
- Markers now resolve semantically for all ordinary enemies, remain unchanged across Boards and Normal/Nightmare/Hell, and do not become battle art.

## Slime battle progression (#81)
- Slime now uses its approved full-body Board 1--6 artwork in battle.
- Difficulty no longer needs alternate art: Normal uses the base form, while Nightmare and Hell add separate faint runtime auras.
- Road markers remain a separate static context and are never replaced by the battle form.

---

# Beta 0.6.3.3 — Development checkpoint

## Camp grows with your career (#109)
- A fresh Camp now begins without the Trophy, Talent Star or Prestige Moon.
- Earn a second achievement to reveal the Trophy permanently; its count-based tier logic is ready for future art upgrades.
- Gain your first Legacy level to reveal the Talent Star, and reach a one-point Prestige offer to reveal the Moon.
- Your Camp keeps each earned object after a Prestige reset, while hidden objects are absent rather than invisible buttons.

---

# Beta 0.6.3.2 — Development checkpoint

## Release pipeline reliability (#118)
- Release publication can now advance the launcher's verified `latest.json` pointer without weakening protected `main`.
- The elevated release credential is restricted to the final post-validation manifest commit and is never used by pull-request validation.
- The release workflow fails early if that credential is missing instead of publishing a release that the permanent launcher cannot discover.

---

# Beta 0.6.3.1 — Development checkpoint

## Class progression, Slime borrowing and ordinary gear (#96, #104, #87)
- Revised Pokémon Trainer, Rogue, Merchant, Slime and Vampire unlock progression with persistent independent career prerequisites.
- Added future career hooks for 100 qualifying Mana-spender casts (Invoker) and the Board 4 miniboss (Dragoon).
- Slime and Slime Rouge may borrow class-owned Powerups only from classes the career has actually unlocked; Slime Rouge still enforces its mechanical compatibility rules.
- Ordinary generated gear now uses neutral slot names and equal-weight slot-eligible affixes instead of class-biased names/prefixes.


## Continue active runs (#35)
- DiceBound now checkpoints each completed road state and offers **Continue Run** at camp after a restart.
- Your exact board, build, gear, resources, cleared outcomes and seeded random sequence return together.
- Closing during combat or an unresolved reward safely returns to the previous completed checkpoint instead of saving a half-finished interaction.
- Active runs have independent rotating backups; corrupt run data can be discarded without harming career progress.
- Fixed a stale Pet Mirror function name that prevented fresh source builds from completing runtime startup.

---

# Beta 0.6.2.4 — Development checkpoint

## Effective Gold gain stat (#52)
- Current Run Buffs and the Info screen's Stats tab now always show your effective Gold gain percentage.
- Hover or tap the stat for an exact baseline, Gold-bonus and difficulty-multiplier explanation.
- The display and actual gold rewards now share one calculation, so Gold powerups update the value immediately.

---

# Beta 0.6.2.3 — Development checkpoint

## Live computed combat descriptions (#40, #51)
- Ragequake now displays its current effective Attack scaling and exact pre-defense damage range from the authoritative combat calculation.
- Ultimate damage, class-Ultimate, all-damage, set and current Rage modifiers immediately recompute that description.
- Release version stamping now preserves each PR's custom subtitle and cannot leave a partially stamped tree after a strict-match failure.

---

# Beta 0.6.2.2 — Development checkpoint

## Runtime services and Powerups (#40, #65, #51)
- Powerup mechanics now use one explicit six-capability runtime contract rather than arbitrary ambient state.
- All 200 canonical Powerup definitions/effects moved to `js/powerups/registry.js`, while the existing choice/apply pipeline remains compatible.
- Live player access follows reset/replacement state, and Perfected Signature descriptions resolve through the same injected service used by its mechanic.

---

# Beta 0.6.2.1 — Development checkpoint

## Version and release policy (#64)
- Every new PR build now carries a unique four-component DiceBound version; historical three-component saves/releases remain readable.
- The generic release workflow derives its tag, title, artifact label, generated spec/notes and distribution identity from the committed Version/Channel.
- Four-component identity is validated through browser/runtime/native metadata, launcher manifests, build IDs and Windows VERSIONINFO.

## Artifact balance (#22)
- Changed the Artifact table to Boots 30%, Legs 20%, Ring 16%, Hat 14%, Amulet 9%, Offhand 7% and class Weapon 4%.
- The class Weapon is now the unique rarest table result; guardian Board/mode access rates and one-random-draw selection are unchanged.

## Runtime architecture (#40)
- Moved Artifact slot metadata, the existing 30/20/16/14/9/7/4 weights and weighted selection into `js/items/artifacts.js`.
- Kept guardian access rates, item generation, loot outcomes and save behavior unchanged.
- Added deterministic tests for the extracted module so later balance changes such as #22 remain isolated and directly verifiable.
- Moved guardian Artifact-access policy, ordinary guardian gear gates/rarity promotion and secret-signature rates into `js/items/loot.js` while keeping concrete equipment factories in the compatibility monolith.
- Preserved every current loot value, outcome and RNG draw/order, backed by exhaustive deterministic policy-equivalence tests.
- Moved all 25 canonical class definitions into `js/classes/registry.js` without changing stats, unlocks, descriptions, passives or ultimate metadata.
- Preserved the compatibility monolith's read-only class view while making the class registry an independently testable owner.
- Moved the 45-node Legacy talent tree into `js/progression/talents.js` without changing costs, ranks, descriptions, branches or prerequisites.
- Added deterministic tree validation for registry integrity and prerequisite cycles.
- Moved pet definitions, the ordinary-enemy pool and rarity labels/weights/values into dedicated domain modules with exact snapshot coverage.
- Removed the duplicate class-tag table and now derive it from canonical class definitions; tags and behavior are unchanged.
- Moved boards, special enemies/guardians, equipment metadata and achievements into dedicated domain registries.
- Moved class passives, tag vocabulary, unlock rules, mechanic tags and ultimate-support metadata into the class owner.
- Added exact deterministic snapshots and clone-isolation checks for every newly extracted registry; gameplay, RNG and saves are unchanged.
- Moved career defaults, Legacy XP thresholds, meta normalization/save coordination and state-domain events into `js/core/state.js`.
- Added deterministic coverage for default careers, legacy normalization, pet unlock recovery, settings bounds, heirloom isolation and event listeners.

## Release identity (#45)
- Added one central browser-runtime Version/Channel owner used by the wrapper contract, platform diagnostics, native host handshake, save envelopes and final visible game identity.
- Added deterministic build validation that rejects stale native/runtime/project/release identity and verifies launcher distribution metadata against a final built artifact.

## Launcher reliability (#23)
- Added a persistent launcher log with splash, PowerShell, update-decision and launch diagnostics.
- Replaced the truncated launcher splash with a WPF-validated night-road PNG and added a branded fallback if a future image cannot be decoded.
- Added Windows regression coverage for shortcut/configuration idempotency, offline fallback, verified updates and safe hash/size/download failures that preserve the current game and saves.

---

# Beta 0.6.1 — Runtime Packaging & Asset Architecture

## Release and launcher reliability
- All visible/runtime/native version identities now consistently report Beta 0.6.1; save schema remains version 2.
- The complete current runtime and artwork tree is staged into the native wrapper, and JPG assets are included in the browser-content hash.
- The Windows release embeds Microsoft's signed x64 WebView2 loader and uses its public bootstrap path.
- Launcher source now includes the long-download HTTP policy in documented builds and avoids stuck hidden PowerShell helper processes.

## Asset architecture (#29)
- Reorganized runtime art into semantic folders for characters, enemy roles, equipment slots, powerup rarities, camp, board, combat, UI, installer and audio.
- Added explicit future/placeholder homes for Random Class, Hell demon states, Gloves, guardian board markers, combat statuses, installer splash art and other still-emoji/shared visuals.
- `runtime/js/assets.js` is now the authoritative current asset registry; current class/pet/enemy/camp/board/equipment/powerup mappings point to the granular hierarchy.
- Added 22 canonical powerup art entries covering 28 rendered powerup names/tiers, including the current Glass Needle art.
- Added `runtime/assets/ASSET_INVENTORY.json` and `tools/validate_asset_architecture.py` to audit every registry target and all known historical runtime asset pointers.
- Historical Beta 0.6 monolith fallback paths remain as documented read-only compatibility mirrors so existing pointers do not break. New art must not be added to those mirrors.
- Archived the exact Beta 0.6 browser build metadata under `docs/releases/beta-0.6/`; Beta 0.6.1 uses a new content-derived build identity.
- No gameplay/balance behavior is intentionally changed by this migration.
- Static/reference validation and a native Windows launch smoke test cover this release packaging pass.

---

## Beta 0.5.14 — Powerup Cleanup & Balance
- Audited all existing powerups against a six-tier rarity philosophy: Poor = small single-axis bumps, Common = solid simple upgrades, Uncommon = specialized/two-axis synergies, Rare = strong build accelerators, Epic = build-defining, Legendary = run-defining.
- Expanded the pool from **188 to exactly 200 powerups**.
- Added **7 new Poor** powerups: Lucky Pebble, Cracked Scope, Faint Echo, Weak Tonic, Monster Notes, Folded Road Map and Cheap Venom.
- Added **5 new Uncommon** powerups: Field Surgeon, Boss Hunter's Badge, Elemental Relay, Leeching Fang and Fortune Broker.
- New rarity distribution: **17 Poor / 35 Common / 64 Uncommon / 31 Rare / 34 Epic / 19 Legendary**.
- Promoted Worldheart, Crown of Repetition, Prismatic Sovereignty, Blood Contract, The Road Is Loaded, Packbreaker and Second Sun to true Legendary rarity and increased their strength to match.
- Promoted Executioner, Phoenix Feather, Echo Chamber, Perfected Signature, Recursive Toxin and Elemental Molting into Epic where their effects are build-defining.
- Moved Quick Brew and Deep Reservoir from Common to Uncommon.
- Rebalanced a large set of Common/Uncommon/Rare values so lower-rarity utility no longer overshadows higher-rarity equivalents; especially flat reduction, potion healing, Defense-to-Attack scaling, Lifesteal, Dodge and mixed-stat bundles.
- Fixed the previous achievement-powerup gate implementation: 0.5.12 attempted to write gates through the read-only content registry, so several displayed unlocks were not actually enforced. Gates are now baked into the authoritative powerup definitions.
- Loosened the gate plan at the same time so early high-rarity rolls retain variety: **5 generally available Epics** and **7 generally available Legendaries** remain in the ungated pool before class restrictions.
- Added a runtime powerup audit helper for count/rarity/gate regression checks.
- Artwork for the complete powerup set remains a future visual pass.

## Beta 0.5.13 — Boss & Miniboss Art
- Added the supplied boss/miniboss portrait art to the game package and encounter presentation.
- Tightened Start Run placement/label spacing, moved Nightmare slightly lower, and added a dice/question-mark camp placeholder for Random Class.

## Beta 0.5.12 — Achievement Powerup Progression
- Moved the Heirloom Chest up and left, closer to the bonfire.
- Moved Start Run upward and increased the caravan presentation by roughly 20%.
- Moved the Nightmare toggle farther down the right-side treeline.
- Expanded achievement-gated powerup progression, focused on Epic and Legendary rewards.
- Added a second class-mastery Epic tier on Board 2 where a class has another eligible Epic.
- Added a Board 5 Legendary mastery tier where a class has an additional ungated Legendary.
- Added achievement gates to a curated set of powerful global Epics and Legendaries using existing milestones such as Board clears, Prestige, pet collection, relic discovery, Hell, and secret-class progression.
- Existing saves immediately receive credit for achievements they have already completed.
- Achievement cards now list the additional powerups they unlock.

# Dicebound Patch Notes

## Beta 0.5.11 — Combat screen & elemental parity
- Reworked desktop combat into a full-window game state instead of a centered popup card. Combat content remains centered/readable inside the full-screen battlefield.
- Moved the Campsite class portrait farther right, moved Nightmare farther down, and increased Start Run by roughly 50% on wide desktop layouts.
- Enemy elemental activations now mirror the gameplay identity of player elements instead of using the old unrelated enemy-only penalty table. In particular, enemy Ice Nova now Freezes the player for the next action rather than draining Ultimate charge.
- Added mirrored enemy Burn, Poison, Static Shock stun, healing, Brain Hack, piercing, Radiation shred, and other element-side effects with player status indicators.
- Fixed outside-combat potion use so the live Alchemist lifetime counter and 15-potion unlock are updated through the actual button event path.
- Restored Glass Needle artwork in all powerup choice interfaces.
- Arcane Lance now converts **half** of Echo Strike chance into bonus spell damage while retaining Lifesteal. Example: 100% Echo gives +50% Arcane Lance damage.
- Frog now unlocks at **150% Echo Strike** reached during a run. Existing Frog unlocks remain unlocked.

## Beta 0.5.10 — Companion art & campsite tuning
- Added dedicated artwork for all 13 companions: DiBo, Ember, Frostbite, Zapp, Halo, Nox, Sprig, Sprinkle, Bit, Riff, Mocha, Trigger and Glowbug.
- Pet artwork now appears in the active companion HUD, companion selection, campsite pet display and combat.
- Added the new full-body Ouroboros battle portrait.
- Reduced the Nightmare campsite creature to roughly half size and moved it slightly lower.
- Nudged the selected class farther right and moved the bonfire slightly lower.
- Moved the Trophy slightly upward.
- Increased Heirloom Chest size slightly.
- Increased Start Run caravan size slightly and moved it lower.

## Beta 0.5.8 — Campsite art replacement & character presence

### Campsite art
- Replaced the Prestige emoji with the new large glowing full-moon artwork.
- Replaced the Trophy emoji with the new ale keg + resplendent trophy cup artwork, facing the requested direction.
- Replaced the Options gear emoji with the custom steampunk cog artwork.
- Nightmare now has two dedicated scene artworks: OFF spies from behind the right-side tree, ON steps out and visibly watches the camp.

### Campsite layout
- Moved Options into the top-left corner of the camp.
- Moved Start Run slightly farther down into the clearing.
- Moved the selected class and pet interactions a little to the right.
- The selected class is now shown as its full-body battle portrait in camp instead of a headshot icon.

### Class battle art
- Updated the new full-body battle portraits for Monk, Clown, Ninja, CEO and Alchemist from the latest art pass.

## Beta 0.5.7 — Campsite spatial refinement

- Moved the Talent Star to the upper center of the campsite as the main celestial interaction.
- Moved the Info Books down beside the Heirloom Chest.
- Moved Trophy / Achievements down to the left of the Pet interaction.
- Enlarged the Heirloom Chest artwork and interaction footprint.
- Made the Start Run caravan substantially larger so it reads as a major physical campsite object.
- Kept the 0.5.6 talent-tree wheel zoom and hidden-scrollbar behavior unchanged.

## Beta 0.5.6 — Campsite composition & talent navigation

### Campsite
- Removed the leftover between-expeditions explanatory line and Legacy summary pill from the visible campsite.
- Repositioned the campsite interactions based on the annotated 0.5.5 screenshot: Talent/Info move into the upper-left scenery, Prestige/Options move right, Class/Pet stay left, the bonfire remains central, and Chest/Start Run move farther into the open right-hand ground.
- Talent Star and Info Books no longer sit inside translucent button boxes; their artwork now behaves like directly clickable environmental objects.
- Campsite panels open over the world instead of pushing the environmental composition around.

### Legacy Constellation
- Talent-map scrollbars are hidden.
- The mouse wheel now zooms the constellation directly without requiring Ctrl/Command.
- Zoom is anchored around the mouse cursor so the point you are inspecting stays under the pointer.
- Drag-to-pan remains unchanged.

## Beta 0.5.5 — Campsite environment & Alchemist distillery
- Added the supplied star-lit clearing as the full-screen Campsite background.
- Added the supplied custom northern-star artwork to the Talents campsite interaction.
- Added the supplied books-and-scrolls artwork to the Info campsite interaction.
- Removed the old Campsite title/emoji presentation and the stray “Choose your next class” wording from the camp scene; the class popup now simply says “Classes”.
- Alchemist now starts each run with **+50% Potion Healing** and gains another **+5 percentage points of Potion Healing every time it levels up**.
- Alchemist’s class description/stats now advertise the new Potion Healing progression.

## Beta 0.5.5 — Class board markers
- Added separate small board-marker token artwork for every class and integrated them into the moving board pawn.
- Native EXE and browser build now include the class marker art assets.

## Beta 0.5.5 — Runtime self-repair & UI hotfix
- Heavy Purse now uses the supplied custom coin-bag artwork.
- HUD/stat hover information now renders in a floating top-level tooltip so it can extend outside Adventurer/Equipment cards without being clipped.
- Saves remain under `%LOCALAPPDATA%\Dicebound\saves`; disposable frontend/WebView2 files now live under `%LOCALAPPDATA%\Dicebound\runtime-cache`.
- Runtime cache is build-specific, preventing stale extracted frontend files/profiles from being reused across builds.
- Native EXE now performs a frontend-ready handshake. If the frontend fails to initialise, it clears only runtime-cache and relaunches once automatically.
- Options now exposes a manual `Repair Dicebound runtime` action in the native EXE; it preserves saves.
- Startup logging now records runtime-cache/game/WebView2 paths and repair state.
- Keeps the working Beta 0.5.1 camp, fullscreen talent tree, close buttons, Tyrant's Legendary Contract and save tools.

## Beta 0.4.1 — World Background Hotfix
- Replaced the fragile pseudo-element world background with explicit scene/atmosphere layers and introduced durable repository patch notes/TODO tracking.

# Beta 0.6 — Gear & Guardian Loot Rebuild

- Replaced independent Artifact slot rolls with one explicit weighted Artifact loot table. A guardian can now drop at most one Artifact per kill.
- Artifact table weights: Weapon 30%, Boots 20%, Legs 16%, Ring 14%, Hat 9%, Amulet 7%, Offhand 4%.
- Artifact-table roll rates now use the agreed Board 1–6 Normal / Nightmare / Hell matrix (0.5%→10% Normal, 1%→18% Nightmare, 2%→28% Hell depending on guardian depth/type).
- Moved Axel's Coffee Mug, Kratz Headphones and The Jean Jacket Lost at Kelly's from Legendary to Mythical rarity. Their unique behavior is preserved; Prestige crafting is reserved for a later patch.
- Added generated Legendary gear: 151–210 item points plus one of 20 build-changing Legendary Effects.
- New exact generated point pools: Poor 11–25, Common 26–45, Uncommon 46–70, Rare 71–105, Epic 106–150, Legendary 151–210.
- Memory Cache now guarantees generated Legendary gear on Board 4+: 1/450 Normal, 1/300 Nightmare, 1/200 Hell. It preferentially shows an undiscovered Legendary Effect.
- Miniboss ordinary gear is no longer automatically guaranteed on Normal: 85% Normal, 92% Nightmare, 100% Hell. Guardian rarity tables now improve with road depth and harder modes.
- Fixed Abyssal Custodian / Board 6 miniboss cookie reward from the old fallback of 1 to 10 cookies.
- The Final Price and Philosopher's Stone signature drop chance is now 5% Normal / 10% Nightmare / 15% Hell.
- Re-integrated the 0.5.13 boss/miniboss art bindings and Random-class campsite placeholder inside the authoritative runtime closure so they actually own the live UI/combat paths.
