#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import re

from audit_monolith_shadow_ownership import mask_non_code, readonly_mutations

ROOT=pathlib.Path(__file__).resolve().parents[1]
MONOLITH=ROOT/"runtime/js/dicebound.js"
ELEMENTS=ROOT/"runtime/js/combat/element-content.js"
DICE=ROOT/"runtime/js/run/dice.js"
BOARD_PRESENTATION=ROOT/"runtime/js/board/presentation.js"
KILLED=['achievementGateUnlocked', 'activePetDef', 'activePetState', 'activeTrainerPetId', 'affinityElementMultiplier', 'allocatedTalentPoints', 'applyRandomHighRarity', 'beta03AddBurn', 'beta03MinibossBaseTable', 'checkDynamicClassUnlocks', 'clearBloodOverhealTemp', 'commitClassUnlock', 'currentWeaponElement', 'elementHit', 'elementHitAll', 'enemyElementProc', 'enemyForPosition', 'enemyTurn', 'gameplayTalentRank', 'generateBoard', 'generateEquipment', 'healPlayer', 'isClassUnlocked', 'manaGain', 'maybePetElementProc', 'occultChannelAttack', 'occultSpellAttack', 'performStrike', 'petElementFor', 'recordHealing', 'renderEnemyParty', 'repairTalentPrerequisites', 'shuffledPetIds', 'statusDotsHTML', 'strikeBaseDamage', 'summonerConjure', 'trackElementProgress', 'trainerPetDamage', 'trainerStrike', 'triggerElementEffect', 'triggerWeaponElement', 'unlockClass', 'v14ClassTags', 'winCombat']
STALE_STARTUP_ALIASES=['db0512GateRewards','db0512RememberReward','db060GuardianArt','db060GuardianTileArt']
STALE_CLASS_PORTRAIT_ALIASES=['classPortraitV13Base','classPortraitV15Patch','classPortraitV16Base','classPortraitV18Base','classPortraitBeta042Base','db054LegacyPortraitSVG']
STALE_DOUBLE_DICE_ALIASES=['v19EnsureDoubleDiceButton','rollTwoDice','v22RollTwoDice','v22WireDoubleDice','v22ChooseDice','v22ShouldChooseRoll']
STALE_ARTIFACT_FACTORY_NAMES=['generateMythicalWeapon','generateMythicalOffhand','generateMythicalBoots','generateMythicalPants','generateMythicalAmulet','generateMythicalHat','generateMythicalRing','v24Artifactize','DB060_ARTIFACT_FACTORIES']
STALE_SCHEMA_MARKERS=['v13NormalizeMeta','normalizeV15','importOldSaveIfNeeded','v24MigrateItemRarity','raritySchemaV24','v24Rarity','db060MigratedNamed','ACHIEVEMENT_POWER_GATES','fighter_counter_reserve']
STALE_BOARD_PRESENTATION_NAMES=['tileMeta','guardianTileArt','db049EnemyTileIcon']
STALE_WAVE6_PREDECESSORS=['DB046_BOARD_OVERRIDES','DB047_BOARD_OVERRIDES','db046BoardBase','db047BoardBase','defenseDamageReductionV24Base','showToastV27Base','dbRunShowEndBase','db060SeedParserBase']
STALE_WAVE7_PREDECESSORS=['beta04SyncHudBeta042Base','db060GuardianArt','db060EnemyPortraitBase','db0636EnemyPortraitBase','dbNatureLegacyAnimationBase','dbFriendLegacyElementPresentation','db060MythicalizeNamed','db060MugBase','db060HeadphonesBase','db060JacketBase']
STALE_DEBUG_LOG_PREDECESSORS=['addLogV25Base','addCombatHistoryV25Base','setCombatTextV25Base','saveMetaV25Base']
STALE_WAVE9_MARKERS=['db0511OutsidePotionBtn','v16PotionHealValue','MANA_OCCULT_CLASSES','OCCULT_SPELLS','v27EnsureUpgrade','golden27','vampEdge28','venomThrone28','resonantTalent']
STALE_WAVE10_MARKERS=['enemyPortraitSVG','db0636TieredEnemyMarkup','v28FrogEchoCap','__DB_V26_FAST_ECHO__']

def main()->int:
    text=MONOLITH.read_text(encoding="utf-8")
    live_chainsaw_wave_guards(text)
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
    early_progression="dbProgression=dbProgressionOwner.configure({"
    canonical_normalize="meta=normalizeCareerMeta(meta)"
    repair_call="dbProgression.repairTalentPrerequisites();"
    assert early_progression in text, "Progression owner is not bootstrapped directly"
    assert canonical_normalize in text, "current career meta is no longer normalized canonically"
    assert repair_call in text, "career-meta repair no longer routes directly to Progression owner"
    assert text.index(early_progression)<text.index(canonical_normalize), "Progression owner bootstrap must precede career-meta normalization"

    for name in STALE_STARTUP_ALIASES:
        assert not re.search(rf"\b{re.escape(name)}\b",code), f"historical startup alias {name} returned"
    assert "DB0512_GLOBAL_POWER_IDS" in text, "0.5.12 regression snapshot no longer reads canonical powerup metadata"
    board_presentation_text=BOARD_PRESENTATION.read_text(encoding="utf-8")
    assert "guardians.resolveById" in board_presentation_text, "guardian presentation no longer routes through the Guardian owner"
    assert "assets.resolveGuardianArt" in board_presentation_text, "guardian presentation no longer routes through DiceboundAssets"

    for name in STALE_CLASS_PORTRAIT_ALIASES:
        assert not re.search(rf"\b{re.escape(name)}\b",text), f"historical class portrait alias {name} returned"
    assert len(re.findall(r"\bfunction\s+classPortraitSVG\s*\(",text))==1, "classPortraitSVG must remain one canonical implementation"
    assert not re.search(r"\bclassPortraitSVG\s*=\s*function\b",text), "classPortraitSVG replacement ladder returned"
    assert "db054LegacyPortraitSVG" not in text, "class portrait legacy fallback returned"
    assert "CLASSES[classId]||CLASSES.ranger" not in text, "class portrait Ranger fallback returned"

    for name in STALE_DOUBLE_DICE_ALIASES:
        assert f"function {name}(" not in code and f"async function {name}(" not in code, f"historical Double Dice owner {name} returned"
    dice_text=DICE.read_text(encoding="utf-8")
    for marker in [
        'const OWNER="run/dice"',
        'function ensureButton(',
        'function bindPrimaryButton(',
        'async function rollOneCore(',
        'async function rollTwoCore(',
        'function rollOne()',
        'function rollTwo()',
        'window.DiceboundRunDice=api'
    ]:
        assert marker in dice_text, f"run/dice owner missing {marker}"
    assert text.count("dbRunDice.configure({")==1, "Run Dice must have one composition boundary in dicebound.js"
    assert "dbRunDice.bindPrimaryButton();dbRunDice.ensureButton();" in text, "monolith no longer initializes canonical Run Dice controls"
    assert 'await call("move",' in dice_text, "Run Dice no longer hands completed rolls to injected Board movement"
    assert "await dbRun.move(" not in text, "road-dice gameplay moved directly back into the monolith"

    for name in STALE_ARTIFACT_FACTORY_NAMES:
        assert not re.search(rf"\b{re.escape(name)}\b",code), f"Artifact predecessor {name} returned to monolith"
    assert "dbArtifacts.configure({" in text and "dbArtifacts.create(" in text, "monolith no longer routes Artifact creation through items/artifacts.js"
    for marker in STALE_SCHEMA_MARKERS:
        assert marker not in text, f"historical schema/migration marker {marker} returned"
    assert "function normalizeCareerMeta(raw={}){" in code, "canonical career normalizer is missing"
    for marker in STALE_WAVE6_PREDECESSORS:
        assert marker not in text, f"historical Wave 6 predecessor {marker} returned"
    for marker in STALE_WAVE7_PREDECESSORS:
        assert marker not in text, f"historical Wave 7 predecessor {marker} returned"
    for marker in STALE_DEBUG_LOG_PREDECESSORS:
        assert marker not in text, f"debug-log predecessor {marker} returned"
    for marker in STALE_WAVE9_MARKERS:
        assert marker not in text, f"historical Wave 9 marker {marker} returned"
    for marker in STALE_WAVE10_MARKERS:
        assert marker not in text, f"historical Wave 10 marker {marker} returned"
    board_text=BOARD_PRESENTATION.read_text(encoding="utf-8")
    for name in STALE_BOARD_PRESENTATION_NAMES:
        assert not re.search(rf"\bfunction\s+{re.escape(name)}\s*\(",code), f"Board presentation predecessor {name} returned to monolith"
    assert "dbBoardPresentation.tileMeta(tile,{ready:dbTileMetaFinalReady})" in text, "board rendering no longer routes through board/presentation"
    for marker in ['const OWNER="board/presentation"','function tileMeta(','function enemyArtForId(','window.DiceboundBoardPresentation=api']:
        assert marker in board_text, f"board/presentation owner missing {marker}"

    print(f"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element, Road Dice and Artifact owners, {len(KILLED)} shadow delegates absent, startup aliases, class portraits, Double Dice ladders and retired schema migrations absent, Board presentation canonical")
    return 0


def live_chainsaw_wave_guards(text:str)->None:
    assert 'db317Readonly' not in text, 'DB317 read-only compatibility proxy returned'
    assert 'DB317_CONTENT_MUTATORS' not in text, 'DB317 mutator compatibility table returned'
    assert 'DB317_READONLY_CACHE' not in text, 'DB317 proxy cache returned'
    assert 'CLASSES[player.classId]||CLASSES.ranger' not in text, 'Ranger class fallback returned'
    assert 'Object.entries(CLASS_TAGS).forEach(([id,tags])=>{});' not in text, 'empty CLASS_TAGS compatibility pass returned'
    assert not re.search(r'\bfunction\s+renderMerchant\s*\(',text), 'call-only adapter renderMerchant returned'
    assert not re.search(r'\bfunction\s+finalizeRun\s*\(',text), 'call-only adapter finalizeRun returned'
    assert not re.search(r'\bfunction\s+purchaseTalentNode\s*\(',text), 'call-only adapter purchaseTalentNode returned'
    assert not re.search(r'\bfunction\s+renderTalents\s*\(',text), 'call-only adapter renderTalents returned'
    assert not re.search(r'\bfunction\s+openTalentTree\s*\(',text), 'call-only adapter openTalentTree returned'
    assert not re.search(r'\bfunction\s+renderPetCollection\s*\(',text), 'call-only adapter renderPetCollection returned'
    assert not re.search(r'\bfunction\s+feedActivePet\s*\(',text), 'call-only adapter feedActivePet returned'
    assert not re.search(r'\bfunction\s+renderClassChoices\s*\(',text), 'call-only adapter renderClassChoices returned'
    assert not re.search(r'\bfunction\s+makeMerchantGear\s*\(',text), 'call-only adapter makeMerchantGear returned'
    assert not re.search(r'\bfunction\s+merchantCatalog\s*\(',text), 'call-only adapter merchantCatalog returned'
    assert not re.search(r'\bfunction\s+merchantPrice\s*\(',text), 'call-only adapter merchantPrice returned'
    assert not re.search(r'\bfunction\s+openMerchant\s*\(',text), 'call-only adapter openMerchant returned'
    assert not re.search(r'\bfunction\s+useUltimate\s*\(',text), 'call-only adapter useUltimate returned'
    assert not re.search(r'\bfunction\s+playerAttack\s*\(',text), 'call-only adapter playerAttack returned'
    assert not re.search(r'\bfunction\s+usePotion\s*\(',text), 'call-only adapter usePotion returned'
    assert not re.search(r'\bfunction\s+usePotionOutsideCombat\s*\(',text), 'call-only adapter usePotionOutsideCombat returned'
    assert not re.search(r'\bfunction\s+gearPowerScore\s*\(',text), 'call-only adapter gearPowerScore returned'
    assert not re.search(r'\bfunction\s+itemSellValue\s*\(',text), 'call-only adapter itemSellValue returned'
    assert not re.search(r'\bfunction\s+formatGearComparison\s*\(',text), 'call-only adapter formatGearComparison returned'
    assert not re.search(r'\bfunction\s+updateBossSpecialIndicator\s*\(',text), 'call-only adapter updateBossSpecialIndicator returned'
    assert not re.search(r'\bfunction\s+getUpgradeChoices\s*\(',text), 'call-only adapter getUpgradeChoices returned'
    assert not re.search(r'\bfunction\s+powerupDisplayDesc\s*\(',text), 'call-only adapter powerupDisplayDesc returned'
    assert not re.search(r'\bfunction\s+renderEndGear\s*\(',text), 'call-only adapter renderEndGear returned'
    assert len(re.findall(r'\b(?:async\s+)?function\s+animateUltimate\s*\(',text))<=1, 'Ultimate animation patch ladder returned'

if __name__=="__main__":
    raise SystemExit(main())
