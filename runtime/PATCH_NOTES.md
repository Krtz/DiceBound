# Unreleased — Beta 0.6.6.18

## Beta 0.6.6.18 Merchant and Info hotfixes (#306)
- Fixed Merchant arrival crashing during shop-stock construction because two live equipment-identity formatting helper names had been deleted while `formatBonuses()` / `formatGearComparison()` still called them.
- Restored the narrow compatibility formatting bridge against the authoritative equipment owner, and fixed Merchant transaction visit ownership so one rendered stock array keeps one transaction visit through rerenders and Legendary choices.
- Fixed the Roadkeeper's Guide failing to open on progressed saves with Invoker unlocked. The Formula Codex uppercased recipe letters before looking them up in the lowercase colour map, so Guide rendering threw before the overlay could become visible.
- Added deterministic transaction coverage plus real Windows Edge regressions for Merchant arrival and Info controls, including direct `file://` branch testing with a progressed all-classes profile.
- Merchant prices, stock composition, RNG, Board generation, secret Merchant-boss behavior, save schema and balance values are unchanged.

# Unreleased — Beta 0.6.6.16

## Beta 0.6.6.17 Info/Guide adapter ownership cleanup (#40, #209)
- Replaced the historical no-op and `openInfoV15` last-definition-wins chain with one stable thin-adapter set to `ui/info-guide.js`.
- First-run startup still prepares the Guide tab without opening the surface; the anti-shadow guards now reject any return of those legacy reassignment layers.
- Gameplay, RNG, saves/checkpoints, progression and Info/Guide presentation behavior are unchanged.

## Beta 0.6.6.16 Mana / Occult Action Resolution ownership (#40, #209, #302)
- `combat/mana-action-resolution.js` now owns Mana gain plus generator and spender action orchestration for Sorcerer, Vampire, Rouge, Merchant and Summoner, while Invoker continues to delegate its class-owned orb/spell behavior.
- The historical Summoner, Mana-Powerup, Rouge and career wrapper ladder is retired from `dicebound.js`; existing RNG order, spend/order quirks, targeting, Arcane Overflow behavior and career counting are preserved exactly.
- Basic Attack, Pet damage, generic elemental/healing, Invoker recipes, Victory, enemy-response internals, saves/checkpoints and gameplay/balance remain in their existing owners.

# Unreleased — Beta 0.6.6.15

## Beta 0.6.6.15 Invoker battle-art fix (#300)
- Fixed the combat class-art compatibility resolver so it derives valid class IDs from the authoritative class registry instead of a stale hand-maintained allowlist. Invoker now resolves its approved full-body battle art rather than falling back to Ranger, and future registered classes inherit the same protection.
- Added a registry-sync regression test covering canonical campsite, battle and marker art for every registered class. No gameplay, RNG, save, combat-math or progression behavior changes.

## Beta 0.6.6.14 Invoker class (#37)
- Added the Invoker's FIFO Blue/Green/Red orb system: Defend forms Blue, Arcane Current forms Green, Elemental Lance forms Red, and only successful core actions can create an orb.
- Invoke now resolves the ten authored formulae through `classes/invoker.js`; the battle UI shows the active three-orb sequence and recipe preview, and Info includes the unlocked Formula Codex.
- Imported the six approved semantic Invoker assets. Generic combat resolution, save/checkpoint ownership, RNG and progression remain in their existing owners.

# Unreleased — Beta 0.6.6.13

## Beta 0.6.6.13 Elemental Proc / Effect resolution ownership (#40, #209, #297)
- `combat/element-resolution.js` now owns player/enemy elemental mechanics, affinity/weakness math, Radiation, Coffee/Haste safeguards, elemental progress and Legendary element chaining.
- Fire Burn, Electric stun, Prismatic Echo, enemy parity and Second Barrel/Prismatic Weapon preserve their historical RNG draw order and target semantics.
- `combat/vfx.js` remains the authored Nature/Donut/projectile presentation owner; generic Healing and damage remain separate.

# Unreleased — Beta 0.6.6.12

## Beta 0.6.6.12 Healing / Overheal resolution ownership (#40, #209, #295)
- `combat/healing-resolution.js` now owns generic healing and the cumulative Cleric, Paladin, Blood Overheal, Devil's Horns, Philosopher's Stone and Crimson Aegis healing-side effects.
