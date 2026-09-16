#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import re

from audit_monolith_shadow_ownership import mask_non_code, readonly_mutations

ROOT=pathlib.Path(__file__).resolve().parents[1]
MONOLITH=ROOT/"runtime/js/dicebound.js"
ELEMENTS=ROOT/"runtime/js/combat/element-content.js"
DICE=ROOT/"runtime/js/run/dice.js"
KILLED=['achievementGateUnlocked', 'activePetDef', 'activePetState', 'activeTrainerPetId', 'affinityElementMultiplier', 'allocatedTalentPoints', 'applyRandomHighRarity', 'beta03AddBurn', 'beta03MinibossBaseTable', 'checkDynamicClassUnlocks', 'clearBloodOverhealTemp', 'commitClassUnlock', 'currentWeaponElement', 'elementHit', 'elementHitAll', 'enemyElementProc', 'enemyForPosition', 'enemyTurn', 'gameplayTalentRank', 'generateBoard', 'generateEquipment', 'healPlayer', 'isClassUnlocked', 'manaGain', 'maybePetElementProc', 'occultChannelAttack', 'occultSpellAttack', 'performStrike', 'petElementFor', 'recordHealing', 'renderEnemyParty', 'repairTalentPrerequisites', 'shuffledPetIds', 'statusDotsHTML', 'strikeBaseDamage', 'summonerConjure', 'trackElementProgress', 'trainerPetDamage', 'trainerStrike', 'triggerElementEffect', 'triggerWeaponElement', 'unlockClass', 'v14ClassTags', 'winCombat']
STALE_STARTUP_ALIASES=['db0512GateRewards','db0512RememberReward','db060GuardianArt','db060GuardianTileArt']
STALE_CLASS_PORTRAIT_ALIASES=['classPortraitV13Base','classPortraitV15Patch','classPortraitV16Base','classPortraitV18Base','classPortraitBeta042Base','db054LegacyPortraitSVG']
STALE_DOUBLE_DICE_ALIASES=['v19EnsureDoubleDiceButton','rollTwoDice','v22RollTwoDice','v22WireDoubleDice','v22ChooseDice','v22ShouldChooseRoll']

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
    # Progression bootstrap must be direct and ordered before legacy-meta repair.
    early_progression="dbProgression=dbProgressionOwner.configure({"
    legacy_import="importOldSaveIfNeeded();"
    repair_call="dbProgression.repairTalentPrerequisites();"
    assert early_progression in text, "Progression owner is not bootstrapped directly"
    assert repair_call in text, "legacy-meta repair no longer routes directly to Progression owner"
    assert text.index(early_progression)<text.index(legacy_import), "Progression owner bootstrap must precede legacy-meta repair"

    # Historical startup aliases must stay retired now that their consumers read
    # canonical Powerup/Guardian/Asset owners directly.
    for name in STALE_STARTUP_ALIASES:
        assert not re.search(rf"\b{re.escape(name)}\b",code), f"historical startup alias {name} returned"
    assert "DB0512_GLOBAL_POWER_IDS" in text, "0.5.12 regression snapshot no longer reads canonical powerup metadata"
    assert "DB317_GUARDIANS.resolveById" in text, "guardian consumers no longer route through the Guardian owner"
    assert "window.DiceboundAssets.resolveGuardianArt" in text, "secret-boss art fallback no longer routes through DiceboundAssets"

    for name in STALE_CLASS_PORTRAIT_ALIASES:
        assert not re.search(rf"\b{re.escape(name)}\b",text), f"historical class portrait alias {name} returned"
    assert len(re.findall(r"\bfunction\s+classPortraitSVG\s*\(",text))==1, "classPortraitSVG must remain one canonical implementation"
    assert not re.search(r"\bclassPortraitSVG\s*=\s*function\b",text), "classPortraitSVG replacement ladder returned"
    assert "db054LegacyPortraitSVG" not in text, "class portrait legacy fallback returned"
    assert "CLASSES[classId]||CLASSES.ranger" not in text, "class portrait Ranger fallback returned"

    for name in STALE_DOUBLE_DICE_ALIASES:
        assert f"function {name}(" not in code and f"async function {name}(" not in code, f"historical Double Dice owner {name} returned"
    dice_text=DICE.read_text(encoding="utf-8")
    for marker in ['const OWNER="run/dice"','function ensureButton(','async function roll(','window.DiceboundRunDice=api']:
        assert marker in dice_text, f"run/dice owner missing {marker}"
    assert "dbRunDice.configure({" in text and "dbRunDice.ensureButton();" in text, "monolith no longer configures the authoritative run/dice owner"

    print(f"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element owner, {len(KILLED)} shadow delegates absent, startup aliases, class portraits and Double Dice ladders retired")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
