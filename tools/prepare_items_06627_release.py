#!/usr/bin/env python3
from pathlib import Path

root=Path(__file__).resolve().parents[1]
patch=root/'runtime'/'PATCH_NOTES.md'
text=patch.read_text(encoding='utf-8')
old='# Unreleased — Beta 0.6.6.26\n\n'
if not text.startswith(old):
    raise SystemExit('unexpected PATCH_NOTES head')
section='''# Unreleased — Beta 0.6.6.27\n\n## Beta 0.6.6.27 Items subsystem ownership (#320)\n- Added `DiceboundItems` as the ordinary public Items boundary over focused generation and operations owners while keeping rarity, equipment identity, consumables, Artifacts, Loot and Equipment/Heirloom presentation in their existing focused modules.\n- Retired the historical equipment-generation ladder and the layered score/sell/equip/comparison wrapper stack from `dicebound.js`; ordinary callers now route through the Items boundary.\n- Preserved released 0.6.6.26 behavior with a permanent 23-case exact output/state/RNG oracle, including generated Legendary effect selection, Merchant x2 resale, Board → Treasure handoff, direct special-rarity demotion quirks and the malformed-but-non-null invalid-rarity compatibility path.\n- Architecture-only: no rarity odds, point budgets, affix weights, elemental odds, Merchant balance, Artifact/Mythical/Omega design, save/checkpoint semantics or gameplay tuning is intended. Runtime graph is 77 modules (76 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 694,385 bytes / 7,130 physical lines, down from 709,513 bytes / 7,267 lines in released 0.6.6.26.\n\n'''
patch.write_text(section+text,encoding='utf-8',newline='\n')

changelog=root/'CHANGELOG.md'
text=changelog.read_text(encoding='utf-8')
marker='This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n'
if marker not in text:
    raise SystemExit('unexpected CHANGELOG head')
section='''## Beta 0.6.6.27\n\n### Items subsystem facade and ownership (#320)\n- Added `runtime/js/items/facade.js` as the single ordinary public `DiceboundItems` boundary, backed by focused `items/generation.js` and `items/operations.js` owners rather than patch-era wrapper ladders.\n- Routed Road Event Treasure, Merchant stock and Run player initialization through the Items boundary, and retired the historical generated-equipment plus score/value/equip/comparison shadow implementations from `dicebound.js`.\n- Added a permanent 23-case exact released-0.6.6.26 Items oracle plus facade/generation/operations ownership guards; shipped RNG order, generated Legendary behavior, Merchant resale semantics and compatibility quirks are frozen exactly.\n- Architecture measurement: runtime graph 74 → 77 modules (73 → 76 extracted/internal plus one monolith); normalized `dicebound.js` 709,513 → 694,385 bytes and 7,267 → 7,130 lines. No gameplay, rarity, Merchant balance, Artifact/Mythical/Omega design or save/checkpoint behavior change is intended.\n\n'''
changelog.write_text(text.replace(marker,marker+section,1),encoding='utf-8',newline='\n')
print('Items 0.6.6.27 release notes staged.')
