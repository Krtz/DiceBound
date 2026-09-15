#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import re

from audit_monolith_shadow_ownership import mask_non_code, readonly_mutations

ROOT=pathlib.Path(__file__).resolve().parents[1]
MONOLITH=ROOT/"runtime/js/dicebound.js"
ELEMENTS=ROOT/"runtime/js/combat/element-content.js"
KILLED=['achievementGateUnlocked', 'activePetDef', 'activePetState', 'activeTrainerPetId', 'affinityElementMultiplier', 'allocatedTalentPoints', 'applyRandomHighRarity', 'checkDynamicClassUnlocks', 'clearBloodOverhealTemp', 'commitClassUnlock', 'currentWeaponElement', 'elementHit', 'elementHitAll', 'enemyElementProc', 'enemyForPosition', 'enemyTurn', 'gameplayTalentRank', 'generateBoard', 'generateEquipment', 'healPlayer', 'isClassUnlocked', 'manaGain', 'maybePetElementProc', 'occultChannelAttack', 'occultSpellAttack', 'performStrike', 'petElementFor', 'recordHealing', 'renderEnemyParty', 'repairTalentPrerequisites', 'shuffledPetIds', 'statusDotsHTML', 'strikeBaseDamage', 'summonerConjure', 'trackElementProgress', 'trainerPetDamage', 'trainerStrike', 'triggerElementEffect', 'triggerWeaponElement', 'unlockClass', 'winCombat']

def main()->int:
    text=MONOLITH.read_text(encoding="utf-8")
    code=mask_non_code(text)
    _,dead=readonly_mutations(text,code)
    assert not dead, f"DB317 runtime-dead writes returned: {[(x['var'],x['line']) for x in dead[:8]]}"
    assert not re.search(r"\bconst\s+ELEMENTS\s*=\s*\{",code), "element registry moved back into monolith"
    assert not re.search(r"\bELEMENTS\.(?:gun|radiation)\s*=",code), "historical extended-element patch returned"
    element_text=ELEMENTS.read_text(encoding="utf-8")
    for ident in ["fire","ice","electric","light","void","nature","donut","tech","metal","coffee","gun","radiation"]:
        assert re.search(rf"\b{ident}\s*:",element_text), f"missing canonical element {ident}"
    for name in KILLED:
        assert not re.search(rf"\bfunction\s+{re.escape(name)}\s*\(",code), f"shadow delegate {name} returned to monolith"
    print(f"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element owner, {len(KILLED)} shadow delegates absent")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
