# Artwork import - 2026-09-24

Based on main d3c4958 (Beta 0.6.7.33). Imports 56 PNGs: 32 equipment bases, two mythical equipment items, six Troll battle tiers, one full-body Rouge campsite replacement, and 15 Powerup icons.

The manifest records each source pack, destination and SHA256. Equipment uses slot folders; Troll tiers use the normal battle context; shared Powerups use shared/, class-locked Powerups use class-specific/, and other Powerups use rarity folders.

Rouge replaces the existing campsite path and is a red-themed painter. Beta 0.6.8.0 integrates the full imported pack into the live runtime: all 32 ordinary equipment bases, the two named Mythical equipment artworks, six Troll Board battle tiers, Rouge campsite art, and the imported Powerup icons. `ASSET_INVENTORY.json` now records these files as implemented rather than staged. Troll portrait and board marker remain unchanged.

Related issues: #389 (Rouge), #425 (Troll), #436 (Poor/Common Powerups), #457 (first gear batch). See powerup-reuse-plan-2026-09-24.md for sharing recommendations.

Validation: all 56 source/destination hashes match; images decode and corner transparency was checked. Beta 0.6.8.0 reconciles the runtime mappings and validator expectations: 61 equipment PNGs, Board-tier Troll battle art, 37 Powerup art keys, 47 semantic Powerup-ID mappings, and 402 registry files are now covered by the asset architecture contract.
