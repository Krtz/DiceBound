from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
VALIDATOR=ROOT/'tools/validate_runtime_architecture.py'


def replace_once(text:str,old:str,new:str,label:str)->str:
    if old in text:
        return text.replace(old,new,1)
    if new in text:
        return text
    raise RuntimeError(f'Could not update {label}; validator shape changed')


def main()->int:
    text=VALIDATOR.read_text(encoding='utf-8').replace('\r\n','\n')

    text=replace_once(text,
'''    if monolith_source:
        expected_adapter = "function renderClassChoices(){return window.DiceboundClassChooser?.render();}"
        if expected_adapter not in monolith_source:
            errors.append("dicebound.js must retain only the thin Class chooser composition adapter")''',
'''    if monolith_source:
        if re.search(r"\\bfunction\\s+renderClassChoices\\s*\\(", monolith_source):
            errors.append("dicebound.js retains an obsolete Class chooser compatibility adapter")
        if "window.DiceboundClassChooser.render(" not in monolith_source:
            errors.append("dicebound.js must route Class chooser calls directly to DiceboundClassChooser")''',
'class chooser guard')

    text=replace_once(text,
'''    if monolith_source:
        expected_pet_adapter = "function renderPetCollection(){return window.DiceboundPetChooser?.render?.()||null;}"
        if expected_pet_adapter not in monolith_source:
            errors.append("dicebound.js must retain only the thin Pet chooser lifecycle adapter")''',
'''    if monolith_source:
        if re.search(r"\\bfunction\\s+renderPetCollection\\s*\\(", monolith_source):
            errors.append("dicebound.js retains an obsolete Pet chooser compatibility adapter")
        if "window.DiceboundPetChooser.render(" not in monolith_source:
            errors.append("dicebound.js must route Pet chooser calls directly to DiceboundPetChooser")''',
'pet chooser guard')

    text=replace_once(text,
'''    if monolith_source:
        for expected_equipment_ui_adapter in [
            "function renderEquipment(){\\n    beta043RefreshEquipmentArt?.();return dbEquipmentUi.renderEquipment();\\n  }",
            "function renderEndGear(){\\n    return dbEquipmentUi.renderEndGear();\\n  }",
            "function openLoot(item,callback){if(!dbEquipmentPrepareLoot(item,callback))return;pendingLootItem=item;pendingLootCallback=callback;return dbEquipmentUi.renderLoot(item);}",
        ]:
            if expected_equipment_ui_adapter not in monolith_source:
                errors.append("dicebound.js must retain only the thin equipment/Heirloom UI lifecycle adapters")''',
'''    if monolith_source:
        for expected_equipment_ui_route in [
            "function renderEquipment(){\\n    beta043RefreshEquipmentArt?.();return dbEquipmentUi.renderEquipment();\\n  }",
            "function openLoot(item,callback){if(!dbEquipmentPrepareLoot(item,callback))return;pendingLootItem=item;pendingLootCallback=callback;return dbEquipmentUi.renderLoot(item);}",
            "dbEquipmentUi.renderEndGear()",
        ]:
            if expected_equipment_ui_route not in monolith_source:
                errors.append("dicebound.js must route equipment/Heirloom UI lifecycle through DiceboundEquipmentHeirlooms")
        if re.search(r"\\bfunction\\s+renderEndGear\\s*\\(", monolith_source):
            errors.append("dicebound.js retains obsolete renderEndGear compatibility adapter")''',
'equipment UI guard')

    text=replace_once(text,
'''    if monolith_source:
        if "dbCombatUltimateResolution=dbCombatUltimateOwner.configure({" not in monolith_source:
            errors.append("dicebound.js must configure the combat Ultimate-resolution owner")
        if monolith_source.count("async function useUltimate(") != 1 or "return dbCombat.ultimate(...args);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin useUltimate adapter through DiceboundCombat")''',
'''    if monolith_source:
        if "dbCombatUltimateResolution=dbCombatUltimateOwner.configure({" not in monolith_source:
            errors.append("dicebound.js must configure the combat Ultimate-resolution owner")
        if monolith_source.count("async function useUltimate(") != 0:
            errors.append("dicebound.js retains an obsolete useUltimate compatibility adapter")
        if "dbCombat.ultimate(" not in monolith_source:
            errors.append("dicebound.js must route Ultimate calls directly through DiceboundCombat")''',
'Ultimate guard')

    text=replace_once(text,
'''        if monolith_source.count("async function guardAction(") != 1 or "return dbCombat.guard(...args);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin guardAction adapter through DiceboundCombat")''',
'''        if monolith_source.count("async function guardAction(") != 0:
            errors.append("dicebound.js retains an obsolete guardAction compatibility adapter")
        if "dbCombat.guard(" not in monolith_source:
            errors.append("dicebound.js must route Guard calls directly through DiceboundCombat")''',
'Guard action guard')

    text=replace_once(text,
'''        if monolith_source.count("async function petTurn(") != 1 or "return dbCombat.petTurn(...args);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin petTurn adapter through DiceboundCombat")''',
'''        if monolith_source.count("async function petTurn(") != 0:
            errors.append("dicebound.js retains an obsolete petTurn compatibility adapter")
        if "dbCombat.petTurn(" not in monolith_source:
            errors.append("dicebound.js must route Pet turns directly through DiceboundCombat")''',
'Pet turn guard')

    VALIDATOR.write_text(text,encoding='utf-8',newline='\n')
    print('Runtime architecture validator now enforces direct owner routing for retired compatibility adapters')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
