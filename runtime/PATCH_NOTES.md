# Unreleased — Beta 0.6.3.15

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
