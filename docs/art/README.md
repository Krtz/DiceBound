# Artwork import - 2026-09-24

Based on main d3c4958 (Beta 0.6.7.33). Imports 56 PNGs: 32 equipment bases, two mythical equipment items, six Troll battle tiers, one full-body Rouge campsite replacement, and 15 Powerup icons.

The manifest records each source pack, destination and SHA256. Equipment uses slot folders; Troll tiers use the normal battle context; shared Powerups use shared/, class-locked Powerups use class-specific/, and other Powerups use rarity folders.

Rouge replaces the existing campsite path and is a red-themed painter. Other assets are staged in ASSET_INVENTORY.json pending runtime registry integration. Troll portrait and board marker remain unchanged. The gear catalogue carries the previously approved first 16-item move to created-gear.md.

Related issues: #389 (Rouge), #425 (Troll), #436 (Poor/Common Powerups), #457 (first gear batch). See powerup-reuse-plan-2026-09-24.md for sharing recommendations.

Validation: all 56 source/destination hashes match; images decode and corner transparency was checked. Runtime module syntax checks passed within tools/validate_asset_architecture.py. The full asset audit fails its fixed equipment count (expected 27, actual 61); its normal-enemy battle image count also needs reconciliation when staged assets are integrated. No validator expectations or runtime mappings were changed for this upload.
