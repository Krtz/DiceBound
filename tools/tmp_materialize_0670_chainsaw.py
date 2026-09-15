from __future__ import annotations

import json
import pathlib
import re
from collections import Counter

from tree_sitter import Language, Parser
import tree_sitter_javascript as tsjs

from audit_monolith_shadow_ownership import ROOT, MONOLITH, mask_non_code, readonly_mutations, top_level_function_names

RUNTIME = ROOT / "runtime" / "js"
MANIFEST = RUNTIME / "module-manifest.json"
ELEMENT_MODULE = RUNTIME / "combat" / "element-content.js"

JS = Language(tsjs.language())
PARSER = Parser(JS)

PROXIES = {
    "CLASSES", "PETS", "upgrades", "talents", "enemyPool", "rarityInfo", "rarityValues",
    "CLASS_TAGS", "CLASS_PASSIVES", "BOARD_REGISTRY", "ENEMY_REGISTRY", "EQUIPMENT_REGISTRY",
    "ACHIEVEMENT_REGISTRY", "CLASS_TAG_VOCABULARY", "CLASS_UNLOCK_REGISTRY",
    "CLASS_MECHANICS_REGISTRY", "MECHANIC_TAG_VOCABULARY", "POWERUP_MECHANICS_REGISTRY",
}
MUTATORS = {"push", "pop", "shift", "unshift", "splice", "sort", "reverse", "copyWithin", "fill"}

DELEGATES = {
    "achievementGateUnlocked": "dbProgression.achievementGateUnlocked",
    "activePetDef": "dbPets.activeDefinition",
    "activePetState": "dbPets.activeState",
    "activeTrainerPetId": "dbCombat.activeTrainerPetId",
    "affinityElementMultiplier": "dbCombat.affinityElementMultiplier",
    "allocatedTalentPoints": "dbProgression.allocatedTalentPoints",
    "applyRandomHighRarity": "dbPowerups.applyRandomHighRarity",
    "checkDynamicClassUnlocks": "dbProgression.checkDynamicClassUnlocks",
    "clearBloodOverhealTemp": "dbCombat.clearBloodOverhealTemp",
    "commitClassUnlock": "dbProgression.commitClassUnlock",
    "currentWeaponElement": "dbCombat.currentWeaponElement",
    "elementHit": "dbCombat.elementHit",
    "elementHitAll": "dbCombat.elementHitAll",
    "enemyElementProc": "dbCombat.enemyElementProc",
    "enemyForPosition": "dbRun.enemyForPosition",
    "enemyTurn": "dbCombat.enemyTurn",
    "finalizeRun": "dbProgression.finalizeRun",
    "gameplayTalentRank": "dbProgression.gameplayTalentRank",
    "generateBoard": "dbRun.generateBoard",
    "generateEquipment": "dbItems.generateEquipment",
    "grantLegacyXp": "dbProgression.grantLegacyXp",
    "guardAction": "dbCombat.guard",
    "healPlayer": "dbCombat.heal",
    "isClassUnlocked": "dbProgression.isClassUnlocked",
    "manaGain": "dbCombat.manaGain",
    "maybePetElementProc": "dbCombat.maybePetElementProc",
    "occultChannelAttack": "dbCombat.channel",
    "occultSpellAttack": "dbCombat.spell",
    "performStrike": "dbCombat.strike",
    "petElementFor": "dbCombat.petElementFor",
    "petTurn": "dbCombat.petTurn",
    "playerAttack": "dbCombat.attack",
    "recordHealing": "dbCombat.recordHealing",
    "renderEnemyParty": "dbCombatView.renderEnemyParty",
    "repairTalentPrerequisites": "dbProgression.repairTalentPrerequisites",
    "resolveEnemyResponse": "dbCombat.enemyResponse",
    "rollD20Chaos": "dbCombat.chaos",
    "shuffledPetIds": "dbPets.shuffledPetIds",
    "statusDotsHTML": "dbCombatView.statusDotsHTML",
    "strikeBaseDamage": "dbCombat.strikeBaseDamage",
    "summonerConjure": "dbCombat.summonerConjure",
    "talentAvailable": "dbProgression.talentAvailable",
    "trackElementProgress": "dbPets.trackElementProgress",
    "trainerPetDamage": "dbCombat.trainerPetDamage",
    "trainerStrike": "dbCombat.trainerStrike",
    "triggerElementEffect": "dbCombat.element",
    "triggerWeaponElement": "dbCombat.triggerWeaponElement",
    "unlockClass": "dbProgression.unlockClass",
    "winCombat": "dbCombat.win",
}

ELEMENT_MODULE_TEXT = r'''(() => {
  "use strict";

  // Canonical elemental content metadata. Mechanics remain in the existing
  // Combat/Pets/Progression owners; this focused content module only owns the
  // authored IDs, labels, spells and player-facing descriptions.
  const DATA = Object.freeze({
    fire:Object.freeze({icon:"🔥",name:"Fire",spell:"Fireball",description:"Deals a burst of bonus damage."}),
    ice:Object.freeze({icon:"❄️",name:"Ice",spell:"Ice Nova",description:"Deals damage and freezes the enemy for one turn."}),
    electric:Object.freeze({icon:"⚡",name:"Electric",spell:"Thunderbolt",description:"Deals heavy lightning damage."}),
    light:Object.freeze({icon:"✨",name:"Light",spell:"Holy",description:"Deals damage and restores HP."}),
    void:Object.freeze({icon:"🕳️",name:"Void",spell:"Black Hole",description:"Tears away a percentage of enemy maximum HP."}),
    nature:Object.freeze({icon:"🌿",name:"Nature",spell:"Poison Vines",description:"Deals pack damage and adds stackable Poison. Every Poison stack deals a percentage of your Attack each combat round."}),
    donut:Object.freeze({icon:"🍩",name:"Donut",spell:"Healing Rain of Donuts",description:"Restores a generous amount of HP. Extremely serious magic."}),
    tech:Object.freeze({icon:"🤖",name:"Tech",spell:"Brain Hack",description:"Deals damage and permanently lowers enemy attack."}),
    metal:Object.freeze({icon:"🤘",name:"Metal",spell:"Hard Rock Metal Music",description:"Deals sonic damage and grants ultimate charge."}),
    coffee:Object.freeze({icon:"☕",name:"Coffee",spell:"Caffeinated Haste",description:"Grants an immediate extra action."}),
    gun:Object.freeze({icon:"🔫",name:"Gun",spell:"Deadeye Volley",description:"Fires a piercing shot for heavy single-target damage, ignoring half of the target's Defense."}),
    radiation:Object.freeze({name:"Radiation",icon:"☢️",spell:"Irradiate",description:"Deals light elemental damage and permanently lowers the target's Defense for the current battle."})
  });
  const IDS=Object.freeze(Object.keys(DATA));
  const CORE_IDS=Object.freeze(["fire","ice","electric","nature","light","void"]);

  function createRegistry(){
    return Object.fromEntries(Object.entries(DATA).map(([id,value])=>[id,{...value}]));
  }

  window.DiceboundElementContent=Object.freeze({
    createRegistry,
    ids:IDS,
    coreIds:CORE_IDS
  });
})();
'''


def parse(source: bytes):
    return PARSER.parse(source)


def walk(node):
    stack=[node]
    while stack:
        current=stack.pop()
        yield current
        stack.extend(reversed(current.children))


def node_text(source: bytes, node) -> str:
    return source[node.start_byte:node.end_byte].decode("utf-8")


def proxy_root(text: str) -> str | None:
    match=re.match(r"\s*([A-Za-z_$][\w$]*)", text)
    return match.group(1) if match and match.group(1) in PROXIES else None


def is_dead_mutation(source: bytes, node) -> bool:
    text=node_text(source,node)
    if node.type == "assignment_expression":
        left=node.child_by_field_name("left")
        return bool(left and proxy_root(node_text(source,left)))
    if node.type == "unary_expression" and re.match(r"\s*delete\s+", text):
        rest=re.sub(r"^\s*delete\s+", "", text, count=1)
        return proxy_root(rest) is not None
    if node.type != "call_expression":
        return False
    fn=node.child_by_field_name("function")
    if not fn:
        return False
    fn_text=node_text(source,fn).strip()
    if fn_text == "Object.assign":
        args=node.child_by_field_name("arguments")
        if not args:
            return False
        inner=node_text(source,args)[1:-1]
        return proxy_root(inner) is not None
    match=re.match(r"^([A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*\.([A-Za-z_$][\w$]*)$", fn_text)
    return bool(match and match.group(1) in PROXIES and match.group(2) in MUTATORS)


def removal_owner(node):
    current=node
    while current.parent and current.type != "expression_statement":
        current=current.parent
    if current.type != "expression_statement":
        return None, False
    replace_empty=False
    while current.parent:
        parent=current.parent
        if parent.type == "if_statement" and parent.child_by_field_name("consequence") == current:
            if parent.child_by_field_name("alternative") is None:
                current=parent
                continue
            replace_empty=True
            break
        if parent.type in {"for_statement","for_in_statement","while_statement","do_statement"} and parent.child_by_field_name("body") == current:
            current=parent
            continue
        break
    return current, replace_empty


def delete_dead_proxy_statements(text: str) -> tuple[str,int,int,set[str]]:
    source=text.encode("utf-8")
    tree=parse(source)
    spans={}
    removed_identifiers=set()
    mutation_nodes=0
    for node in walk(tree.root_node):
        if not is_dead_mutation(source,node):
            continue
        mutation_nodes += 1
        owner, replace_empty=removal_owner(node)
        if owner is None:
            raise RuntimeError(f"Dead proxy mutation has no expression statement: {node.type} {node_text(source,node)[:120]}")
        key=(owner.start_byte,owner.end_byte)
        spans[key] = spans.get(key,False) or replace_empty
    for start,end in spans:
        removed_identifiers.update(re.findall(r"\b[A-Za-z_$][\w$]*\b",source[start:end].decode("utf-8")))
    out=source
    for (start,end),replace_empty in sorted(spans.items(), reverse=True):
        out=out[:start]+(b";" if replace_empty else b"")+out[end:]
    result=out.decode("utf-8")
    _,remaining=readonly_mutations(result,mask_non_code(result))
    if remaining:
        sample=", ".join(f"{row['var']}@{row['line']}" for row in remaining[:8])
        raise RuntimeError(f"DB317 cleanup incomplete: {len(remaining)} mutations remain ({sample})")
    return result,mutation_nodes,len(spans),removed_identifiers


def replace_element_content(text: str) -> str:
    pattern=re.compile(r"  const ELEMENTS=\{.*?\n  \};\n  const ELEMENT_KEYS=Object\.keys\(ELEMENTS\);\n  const DIBO_ELEMENTS=\[[^\n]+\];",re.S)
    replacement='''  const DB_ELEMENT_CONTENT=window.DiceboundElementContent;\n  if(!DB_ELEMENT_CONTENT)throw new Error("DiceboundElementContent must load before dicebound.js");\n  const ELEMENTS=DB_ELEMENT_CONTENT.createRegistry();\n  const ELEMENT_KEYS=[...DB_ELEMENT_CONTENT.ids];\n  const DIBO_ELEMENTS=[...DB_ELEMENT_CONTENT.coreIds];'''
    text,count=pattern.subn(replacement,text,count=1)
    if count != 1:
        raise RuntimeError(f"Expected one base ELEMENTS block, found {count}")
    text,count=re.subn(r'\n\s*ELEMENTS\.gun=\{[^\n]+\};\n\s*if\(!ELEMENT_KEYS\.includes\("gun"\)\)ELEMENT_KEYS\.push\("gun"\);',"",text,count=1)
    if count != 1:
        raise RuntimeError("Could not remove historical gun element patch")
    radiation=re.compile(r'\n\s*if\(!ELEMENTS\.radiation\)\{\s*\n\s*ELEMENTS\.radiation=\{[^\n]+\};\s*\n\s*if\(!ELEMENT_KEYS\.includes\("radiation"\)\)ELEMENT_KEYS\.push\("radiation"\);\s*\n\s*\}',re.S)
    text,count=radiation.subn("",text,count=1)
    if count != 1:
        raise RuntimeError("Could not remove historical radiation element patch")
    text,count=re.subn(r'const ELEMENT_ID_VOCABULARY=db317Readonly\(\["fire","ice","electric","light","void","nature","donut","tech","metal","coffee","gun","radiation"\]\);',
                       'const ELEMENT_ID_VOCABULARY=db317Readonly([...DB_ELEMENT_CONTENT.ids]);',text,count=1)
    if count != 1:
        raise RuntimeError("Could not canonicalize ELEMENT_ID_VOCABULARY")
    if re.search(r"\bELEMENTS\.(?:gun|radiation)\s*=",text):
        raise RuntimeError("Extended element patch write survived")
    return text


def eliminate_delegates(text: str) -> tuple[str,list[str],list[str]]:
    source=text.encode("utf-8")
    killed=[]
    skipped=[]
    for name,target in DELEGATES.items():
        tree=parse(source)
        replacements=[]
        declarations=[]
        for node in walk(tree.root_node):
            if node.type == "call_expression":
                fn=node.child_by_field_name("function")
                if fn and fn.type == "identifier" and node_text(source,fn) == name:
                    replacements.append((fn.start_byte,fn.end_byte,target.encode("utf-8")))
            elif node.type == "function_declaration":
                ident=node.child_by_field_name("name")
                if ident and node_text(source,ident) == name:
                    declarations.append(node)
        for start,end,repl in sorted(replacements,reverse=True):
            source=source[:start]+repl+source[end:]
        tree=parse(source)
        declarations=[]
        other=[]
        for node in walk(tree.root_node):
            if node.type == "function_declaration":
                ident=node.child_by_field_name("name")
                if ident and node_text(source,ident) == name:
                    declarations.append(node)
            elif node.type == "identifier" and node_text(source,node) == name:
                parent=node.parent
                if parent and parent.type == "function_declaration" and parent.child_by_field_name("name") == node:
                    continue
                other.append(node)
        if len(declarations) != 1:
            skipped.append(f"{name}: declarations={len(declarations)}")
            continue
        # Calls were rewritten; any surviving identifier use means this adapter is
        # still intentionally used as a value/hook and must stay.
        if other:
            skipped.append(f"{name}: non-call refs={len(other)}")
            continue
        decl=declarations[0]
        start,end=decl.start_byte,decl.end_byte
        while end < len(source) and source[end:end+1] in {b" ",b"\t"}:
            end += 1
        if end < len(source) and source[end:end+2] == b"\r\n":
            end += 2
        elif end < len(source) and source[end:end+1] == b"\n":
            end += 1
        source=source[:start]+source[end:]
        killed.append(name)
    return source.decode("utf-8"),killed,skipped


def remove_dead_support_declarations(text: str, removed_names:set[str]) -> tuple[str,list[str]]:
    removed=[]
    for _ in range(5):
        source=text.encode("utf-8")
        tree=parse(source)
        masked=mask_non_code(text)
        candidates=[]
        for node in walk(tree.root_node):
            if node.type != "lexical_declaration":
                continue
            named=[child for child in node.named_children if child.type == "variable_declarator"]
            if len(named) != 1:
                continue
            decl=named[0]
            ident=decl.child_by_field_name("name")
            value=decl.child_by_field_name("value")
            if not ident or ident.type != "identifier" or not value:
                continue
            name=node_text(source,ident)
            if name not in removed_names and not re.match(r"^(?:v\d|db\d|dbBeta|beta\d|ACHIEVEMENT_POWER_GATES$)",name,re.I):
                continue
            if value.type not in {"object","array","string","number","true","false","null","arrow_function","function_expression"}:
                continue
            if len(re.findall(rf"\b{re.escape(name)}\b",masked)) != 1:
                continue
            candidates.append((node.start_byte,node.end_byte,name))
        if not candidates:
            break
        for start,end,name in sorted(candidates,reverse=True):
            while end < len(source) and source[end:end+1] in {b" ",b"\t",b";"}:
                end+=1
            if end < len(source) and source[end:end+2] == b"\r\n": end+=2
            elif end < len(source) and source[end:end+1] == b"\n": end+=1
            source=source[:start]+source[end:]
            removed.append(name)
        text=source.decode("utf-8")
    return text,removed


def update_manifest() -> None:
    data=json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not any(m.get("id")=="combat-element-content" for m in data["modules"]):
        entry={
            "id":"combat-element-content",
            "path":"js/combat/element-content.js",
            "domain":"combat/element-content-metadata",
            "status":"extracted",
            "requires":[],
            "provides":["DiceboundElementContent"],
        }
        idx=next(i for i,m in enumerate(data["modules"]) if m.get("id")=="combat-effective-stats")
        data["modules"].insert(idx,entry)
    if "combat-element-content" not in data["loadOrder"]:
        idx=data["loadOrder"].index("combat-effective-stats")
        data["loadOrder"].insert(idx,"combat-element-content")
    mono=next(m for m in data["modules"] if m.get("id")=="dicebound-monolith")
    if "combat-element-content" not in mono["requires"]:
        idx=mono["requires"].index("combat-effective-stats")
        mono["requires"].insert(idx,"combat-element-content")
    MANIFEST.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")


def write_anti_return(killed:list[str]) -> None:
    content=f'''#!/usr/bin/env python3\nfrom __future__ import annotations\n\nimport pathlib\nimport re\n\nfrom audit_monolith_shadow_ownership import mask_non_code, readonly_mutations\n\nROOT=pathlib.Path(__file__).resolve().parents[1]\nMONOLITH=ROOT/"runtime/js/dicebound.js"\nELEMENTS=ROOT/"runtime/js/combat/element-content.js"\nKILLED={killed!r}\n\ndef main()->int:\n    text=MONOLITH.read_text(encoding="utf-8")\n    code=mask_non_code(text)\n    _,dead=readonly_mutations(text,code)\n    assert not dead, f"DB317 runtime-dead writes returned: {{[(x['var'],x['line']) for x in dead[:8]]}}"\n    assert not re.search(r"\\bconst\\s+ELEMENTS\\s*=\\s*\\{{",code), "element registry moved back into monolith"\n    assert not re.search(r"\\bELEMENTS\\.(?:gun|radiation)\\s*=",code), "historical extended-element patch returned"\n    element_text=ELEMENTS.read_text(encoding="utf-8")\n    for ident in ["fire","ice","electric","light","void","nature","donut","tech","metal","coffee","gun","radiation"]:\n        assert re.search(rf"\\b{{ident}}\\s*:",element_text), f"missing canonical element {{ident}}"\n    for name in KILLED:\n        assert not re.search(rf"\\bfunction\\s+{{re.escape(name)}}\\s*\\(",code), f"shadow delegate {{name}} returned to monolith"\n    print(f"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element owner, {{len(KILLED)}} shadow delegates absent")\n    return 0\n\nif __name__=="__main__":\n    raise SystemExit(main())\n'''
    (ROOT/"tools/test_monolith_chainsaw.py").write_text(content,encoding="utf-8")


def update_notes(before_lines:int,before_bytes:int,after_lines:int,after_bytes:int,killed:list[str],dead_nodes:int,dead_statements:int,support:list[str]) -> None:
    summary=(
        f"- **Beta 0.6.7.0 — Monolith Chainsaw:** removed all provable DB317 no-op registry writes "
        f"({dead_nodes} mutation nodes across {dead_statements} dead statements), moved the final 12-element content registry into "
        f"`combat/element-content.js`, and removed {len(killed)} redundant monolith-to-owner delegate functions. "
        f"`dicebound.js` fell from {before_lines:,} lines / {before_bytes:,} bytes to {after_lines:,} lines / {after_bytes:,} bytes before generated version metadata.\n"
    )
    changelog=ROOT/"CHANGELOG.md"
    if changelog.exists():
        text=changelog.read_text(encoding="utf-8")
        if "Beta 0.6.7.0 — Monolith Chainsaw" not in text:
            marker=text.find("\n")+1
            text=text[:marker]+"\n"+summary+text[marker:]
            changelog.write_text(text,encoding="utf-8")
    notes=ROOT/"runtime/PATCH_NOTES.md"
    if notes.exists():
        text=notes.read_text(encoding="utf-8")
        if "Beta 0.6.7.0 — Monolith Chainsaw" not in text:
            notes.write_text(summary+"\n"+text,encoding="utf-8")
    report=ROOT/"docs/MONOLITH_CHAINSAW_0670.md"
    report.write_text(
        "# Beta 0.6.7.0 monolith chainsaw report\n\n"
        f"Baseline: reconciled Beta 0.6.6.39 `main`.\n\n"
        f"- Monolith before: **{before_lines:,} lines / {before_bytes:,} UTF-8 bytes**.\n"
        f"- Monolith after source cleanup: **{after_lines:,} lines / {after_bytes:,} UTF-8 bytes**.\n"
        f"- Physical reduction: **{before_lines-after_lines:,} lines / {before_bytes-after_bytes:,} bytes**.\n"
        f"- Proven DB317 no-op mutations removed: **{dead_nodes}** mutation nodes in **{dead_statements}** dead statements/control statements.\n"
        f"- Redundant same-name owner delegates removed: **{len(killed)}**.\n"
        f"- Dead supporting literal declarations removed after their no-op writers disappeared: **{len(support)}**.\n"
        "- Element metadata: moved from `dicebound.js` into `runtime/js/combat/element-content.js` with all 12 final elements present from one canonical registry.\n\n"
        "## Removed delegate names\n\n"+"\n".join(f"- `{name}`" for name in killed)+"\n",
        encoding="utf-8"
    )


def main() -> int:
    text=MONOLITH.read_text(encoding="utf-8")
    before_lines=text.count("\n")+1
    before_bytes=len(text.encode("utf-8"))
    _,before_dead=readonly_mutations(text,mask_non_code(text))
    if len(before_dead) < 80:
        raise RuntimeError(f"Expected large DB317 dead-code baseline, found only {len(before_dead)}")

    text,dead_nodes,dead_statements,removed_names=delete_dead_proxy_statements(text)
    text=replace_element_content(text)
    text,killed,skipped=eliminate_delegates(text)
    text,support=remove_dead_support_declarations(text,removed_names)
    MONOLITH.write_text(text,encoding="utf-8")
    ELEMENT_MODULE.write_text(ELEMENT_MODULE_TEXT,encoding="utf-8")
    update_manifest()
    write_anti_return(killed)

    after_lines=text.count("\n")+1
    after_bytes=len(text.encode("utf-8"))
    update_notes(before_lines,before_bytes,after_lines,after_bytes,killed,dead_nodes,dead_statements,support)

    print(f"CHAINSAW_MATERIALIZED before={before_lines} lines/{before_bytes} bytes after={after_lines} lines/{after_bytes} bytes")
    print(f"DB317 dead nodes={dead_nodes}; removed statement/control spans={dead_statements}")
    print(f"Delegates killed={len(killed)}: {', '.join(killed)}")
    print(f"Delegates skipped={len(skipped)}: {'; '.join(skipped)}")
    print(f"Dead support declarations removed={len(support)}: {', '.join(support)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
