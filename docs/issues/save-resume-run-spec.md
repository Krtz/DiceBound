# Save & Resume Active Runs

Tracking specification for the GitHub issue covering reliable run persistence.

## Goal

Allow a player to quit DiceBound during an active run and later continue from the last completed, stable tile state instead of losing the run.

## Save boundary

The game should persist the active run after every successfully completed tile/event resolution. A stable checkpoint is preferred over attempting to serialize transient animations, dialogs, or half-resolved combat actions.

## Persisted run state

At minimum, persist enough information to reconstruct the run deterministically or near-deterministically:

- Run seed and RNG state/cursor where practical
- Current board and tile position
- Difficulty/mode and run configuration
- Selected class and identity-specific state
- Current/max HP and combat-independent player stats
- Level, XP, gold and other run currencies
- Equipped gear and relevant generated item data
- Owned powerups and their stacks/state
- Companion/pet selection and run-local pet state
- Potions/consumables and relevant counters
- Class resources/counters that are expected to survive between tiles
- Board/run flags, triggered one-time events and cleared guardians
- Merchant/camp/run-local choices where required to prevent duplication
- Any other state needed to prevent rerolling completed outcomes after reload

## Resume behavior

- Main/camp UI should clearly offer **Continue Run** when a valid active-run checkpoint exists.
- Resume should restore the player to the last completed stable tile checkpoint.
- If the process closes during combat, a modal, animation, a choice screen, or another transient state, resume from the most recent safe checkpoint rather than trying to recreate a partially resolved action.
- A completed/abandoned/dead run must clear or invalidate the active-run checkpoint.
- Existing long-term save data must remain compatible.

## Safety

- Use versioned active-run save data so future migrations are possible.
- Write atomically/with backup protection so a crash during autosave does not destroy the previous valid checkpoint.
- Invalid or incompatible active-run data must fail gracefully without corrupting Legacy/meta progression.
- Do not allow reloads to duplicate rewards from an already completed tile/event.

## Acceptance criteria

- [ ] A checkpoint is written after every completed tile/event resolution.
- [ ] Run seed is persisted.
- [ ] RNG progression/state is persisted sufficiently to avoid obvious save-scumming/rerolling of already resolved outcomes.
- [ ] Board/tile position and all material run-build state are restored.
- [ ] Relaunching DiceBound presents a Continue Run option when appropriate.
- [ ] Closing on the road between events resumes correctly.
- [ ] Closing immediately after a completed combat/event resumes from the completed state without duplicating rewards.
- [ ] Closing during a transient/unsafe state falls back to the previous stable checkpoint.
- [ ] Victory, death, prestige/reset, or explicit run abandonment clears the active-run checkpoint.
- [ ] Existing Beta save data still loads.
- [ ] Native wrapper and direct browser runtime behave consistently where supported.
- [ ] Automated/static checks cover serialization, migration/versioning and reward-duplication guards.
- [ ] Real Windows smoke test verifies quit/relaunch/continue behavior.
