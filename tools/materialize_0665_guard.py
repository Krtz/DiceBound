#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
MANIFEST = ROOT / "runtime/js/module-manifest.json"
INDEX = ROOT / "runtime/index.html"
VALIDATOR = ROOT / "tools/validate_runtime_architecture.py"
SHADOW = ROOT / "tools/test_shadow_ownership_drain.py"
CHANGELOG = ROOT / "CHANGELOG.md"
PATCH_NOTES = ROOT / "runtime/PATCH_NOTES.md"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def remove_once(text: str, old: str, label: str) -> str:
    return replace_once(text, old, "", label)


mono = MONO.read_text(encoding="utf-8")

mono = replace_once(
    mono,
    "  let dbCombatStrikes=null;\n  let dbCombatUltimateResolution=null;\n  let dbCombatPresentation=null;",
    "  let dbCombatStrikes=null;\n  let dbCombatUltimateResolution=null;\n  let dbCombatGuardResolution=null;\n  let dbCombatPresentation=null;",
    "Guard owner state slot",
)

old_guard = '''  async function guardAction(){
    if(combatBusy||!currentEnemy||player.guardCooldown>0)return;combatBusy=true;const chaos=await rollD20Chaos("guard");player.guardCooldown=player.guardDelay;chargeUltimate(player.ultimateGuardGain);let notes=[`gain ${player.ultimateGuardGain} ultimate charge`];if(player.guardHeal>0){const h=healPlayer(player.guardHeal);if(h)notes.push(`restore ${h} HP`);}if(player.guardShield>0){player.combatShield+=player.guardShield;notes.push("raise a Battle Barrier");}if(player.guardCounter>0){const counter=damageEnemy(currentEnemy,Math.max(1,Math.round((player.attack+player.defense*player.defenseAttackScale)*player.guardCounter)));notes.push(`riposte for ${counter} damage`);}if(chaos.forceElement){const r=triggerElementEffect(chaos.forceElement,currentEnemy,{forced:true,source:"d20 guard"});if(r)notes.push(r.message);}if(chaos.allElements)DIBO_ELEMENTS.forEach(k=>triggerElementEffect(k,currentEnemy?.hp>0?currentEnemy:livingEnemies()[0],{forced:true,source:"natural twenty guard"}));const pants=applyMythicPantsPulse();if(pants)notes.push(pants);updateCombatUI();setCombatText(`You brace yourself and ${notes.join(", ")}.`);tone(260,.12,"triangle",.03,180);await delay(620);if(!livingEnemies().length)return winCombat();await resolveEnemyResponse(true,(chaos.guardBonus||0));
  }'''
new_guard = '''  async function guardAction(...args){if(!dbCombatGuardResolution)throw new Error('Combat Guard-resolution owner is not configured.');return dbCombatGuardResolution.guardAction(...args);}'''
mono = replace_once(mono, old_guard, new_guard, "base guardAction -> adapter")

old_identity = '  async function identityGuardAction(){if(classIdentityActive("monk"))player.monkCombo=0;if(classIdentityActive("fighter"))player.fighterCounterReady=true;if(classIdentityActive("turtle"))player.turtleCrushReady=true;return guardAction();}'
new_identity = '''  async function identityGuardAction(...args){
    if(!dbCombatGuardResolution)throw new Error('Combat Guard-resolution owner is not configured.');
    const invoke=(...inner)=>dbCombatGuardResolution.identityGuardAction(...inner);
    if(typeof v25TraceCommand==='function')return v25TraceCommand('identityGuardAction',invoke,'detailed',args,this);
    return invoke(...args);
  }'''
mono = replace_once(mono, old_identity, new_identity, "identity guard adapter")

mono = remove_once(
    mono,
    '  identityGuardAction=async function(){if(classIdentityActive("monk"))player.monkCombo=0;if(classIdentityActive("fighter")){player.fighterCounterReady=false;player.fighterCounterStacks=Math.min(player.fighterCounterMax||1,(player.fighterCounterStacks||0)+1);identityFlash(`🛡️ Counterblow ${player.fighterCounterStacks}/${player.fighterCounterMax}`);}if(classIdentityActive("turtle")){player.turtleCrushReady=false;player.turtleGuardChain=Math.min(player.turtleGuardMax||5,(player.turtleGuardChain||0)+1);if(player.turtleGuardChain===3||player.turtleGuardChain===5){player.combatShield++;identityFlash(`🐢 Shell wall ×${player.turtleGuardChain} · Barrier`);}const rank=0;const bonus=Math.max(0,(player.turtleGuardChain-1)*.05),old=player.guardPower;player.guardPower=clamp(old+bonus,0,.90);try{return await guardAction();}finally{player.guardPower=old;updateCombatUI();}}return guardAction();};\n',
    "V16 identity Guard wrapper",
)

mono = remove_once(
    mono,
    '  const identityGuardActionV17Base=identityGuardAction;identityGuardAction=async function(){const tags=CLASSES[classIdentityId()]?.tags||[],rank=gameplayTalentRank("turtle_guard_element"),chance=(tags.includes("guardian")?rank*.05:0)+((classIdentityActive("turtle")||classIdentityActive("slime"))?(player.guardElementProcBonus||0):0);if(chance&&currentEnemy?.hp>0&&random()<clamp(chance,0,.75)){const key=player.equipment?.weapon?.element||activePetDef().element||pick(ELEMENT_KEYS);const r=triggerElementEffect(key,currentEnemy,{forced:true,source:"Resonant Guard"});if(r)addCombatHistory(`🌈 Resonant Guard: ${r.message}`);}return identityGuardActionV17Base();};\n',
    "V17 Resonant Guard wrapper",
)

mono = remove_once(
    mono,
    '''  const identityGuardActionV18Base=identityGuardAction;
  identityGuardAction=async function(){
    if(classHasMechanic("mana")&&!combatBusy&&currentEnemy){const gained=manaGain(player.guardManaGain||6);if(gained){addCombatHistory(`🔷 Guard channels +${gained} Mana.`);identityFlash(`🛡️ +${gained} Mana`);}}
    return identityGuardActionV18Base();
  };
''',
    "V18 Mana Guard wrapper",
)

mono = remove_once(
    mono,
    '''  const identityGuardActionV19Base=identityGuardAction;
  identityGuardAction=async function(){
    if(!classIdentityActive("paladin"))return identityGuardActionV19Base();
    const grace=Math.floor(player.paladinGrace||0),extraGuard=Math.min(.20,grace*.002),barriers=Math.floor(grace/25),oldPower=player.guardPower;player.paladinGrace=0;player.guardPower=clamp(oldPower+extraGuard,0,.92);if(barriers)player.combatShield=(player.combatShield||0)+barriers;addCombatHistory(`⚜️ Oath Guard consumes ${grace} Grace: +${Math.round(extraGuard*100)}% Guard power${barriers?` and ${barriers} Barrier${barriers===1?"":"s"}`:""}.`);identityFlash(`⚜️ Oath Guard · ${grace} Grace`);try{return await identityGuardActionV19Base();}finally{player.guardPower=oldPower;updateCombatUI();}
  };
''',
    "V19 Paladin Guard wrapper",
)

mono = remove_once(
    mono,
    '''  const identityGuardActionV19OffhandBase=identityGuardAction;
  identityGuardAction=async function(){if(hasMythicPiece("offhand")){player.ultimateCharge=clamp((player.ultimateCharge||0)+8,0,100);player._eventHorizonGuards=(player._eventHorizonGuards||0)+1;if(player._eventHorizonGuards%3===0){player.combatShield=(player.combatShield||0)+1;addCombatHistory("🌌 Event Horizon Ward raises a Barrier on the third Guard.");}}return identityGuardActionV19OffhandBase();};
''',
    "V19 Event Horizon Guard wrapper",
)

mono = remove_once(
    mono,
    '''  const db060GuardActionBase=guardAction;
  guardAction=async function(){if(!db060HasEffect('perfect_guard')||!(player.guardCounter>0))return db060GuardActionBase();const old=player.guardCounter,echoes=rollTieredProc(player.doubleStrike||0);player.guardCounter=old*(1+echoes*.70);try{if(echoes)addCombatHistory(`🛡️🔁 Perfect Guard rolls ${echoes} counter Echo${echoes===1?'':'es'}.`);return await db060GuardActionBase();}finally{player.guardCounter=old;}};
''',
    "DB060 Perfect Guard wrapper",
)

mono = remove_once(
    mono,
    '''  const dbFriendGuardActionBase=guardAction;
  guardAction=async function(...args){if(dbFriendDragoonActive()&&player.dragoonLandingReady)return dbFriendDragoonLanding();if(dbFriendDragoonActive()&&!combatBusy&&currentEnemy&&player.guardCooldown<=0)dbFriendTickDragoonCooldown();return dbFriendGuardActionBase.apply(this,args);};
''',
    "Friends Dragoon Guard wrapper",
)

mono = replace_once(
    mono,
    "    const fn=({rollDice,rollTwoDice,returnToRoad,winCombat,applyUpgrade,equipItem,usePotion,usePotionOutsideCombat,identityGuardAction})[name];if(typeof fn!=='function')return;",
    "    const fn=({rollDice,rollTwoDice,returnToRoad,winCombat,applyUpgrade,equipItem,usePotion,usePotionOutsideCombat})[name];if(typeof fn!=='function')return;",
    "V25 trace dispatch map",
)
mono = replace_once(
    mono,
    "    if(name==='rollDice')rollDice=wrapped;else if(name==='rollTwoDice')rollTwoDice=wrapped;else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='winCombat')winCombat=wrapped;else if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;else if(name==='usePotion')usePotion=wrapped;else if(name==='usePotionOutsideCombat')usePotionOutsideCombat=wrapped;else if(name==='identityGuardAction')identityGuardAction=wrapped;",
    "    if(name==='rollDice')rollDice=wrapped;else if(name==='rollTwoDice')rollTwoDice=wrapped;else if(name==='returnToRoad')returnToRoad=wrapped;else if(name==='winCombat')winCombat=wrapped;else if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;else if(name==='usePotion')usePotion=wrapped;else if(name==='usePotionOutsideCombat')usePotionOutsideCombat=wrapped;",
    "V25 trace assignment",
)
mono = replace_once(
    mono,
    "  ['rollDice','rollTwoDice','returnToRoad','winCombat','applyUpgrade','equipItem','usePotion','usePotionOutsideCombat','identityGuardAction'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'||n==='winCombat'?'events':'detailed'));",
    "  ['rollDice','rollTwoDice','returnToRoad','winCombat','applyUpgrade','equipItem','usePotion','usePotionOutsideCombat'].forEach(n=>v25WrapCommand(n,n==='rollDice'||n==='rollTwoDice'||n==='winCombat'?'events':'detailed'));",
    "V25 trace installation",
)

config = '''  const dbCombatGuardOwner=window.DiceboundCombatGuardResolution;
  if(!dbCombatGuardOwner)throw new Error('DiceBound requires the combat Guard-resolution owner before dicebound.js');
  dbCombatGuardResolution=dbCombatGuardOwner.configure({
    getPlayer:()=>player,
    getCurrentEnemy:()=>currentEnemy,
    livingEnemies:()=>livingEnemies(),
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;},
    rollD20Chaos:action=>rollD20Chaos(action),
    chargeUltimate:amount=>chargeUltimate(amount),
    healPlayer:amount=>healPlayer(amount),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    triggerElementEffect:(key,target,options)=>triggerElementEffect(key,target,options),
    getDiboElements:()=>DIBO_ELEMENTS,
    applyMythicPantsPulse:()=>applyMythicPantsPulse(),
    updateCombatUI:()=>updateCombatUI(),
    setCombatText:text=>setCombatText(text),
    tone:(frequency,duration,type,gain,slide)=>tone(frequency,duration,type,gain,slide),
    delay:ms=>delay(ms),
    winCombat:()=>winCombat(),
    resolveEnemyResponse:(guarded,bonus)=>resolveEnemyResponse(guarded,bonus),
    isClassActive:id=>classIdentityActive(id),
    classIdentityId:()=>classIdentityId(),
    classHasMechanic:tag=>classHasMechanic(tag),
    getClassTags:id=>CLASSES[id]?.tags||[],
    gameplayTalentRank:id=>gameplayTalentRank(id),
    getWeaponElement:()=>player.equipment?.weapon?.element||null,
    getActivePetElement:()=>activePetDef().element,
    getElementKeys:()=>ELEMENT_KEYS,
    random:()=>random(),
    pick:list=>pick(list),
    clamp:(value,min,max)=>clamp(value,min,max),
    addCombatHistory:text=>addCombatHistory(text),
    identityFlash:text=>identityFlash(text),
    manaGain:amount=>manaGain(amount),
    hasMythicPiece:slot=>hasMythicPiece(slot),
    hasLegendaryEffect:id=>db060HasEffect(id),
    rollTieredProc:chance=>rollTieredProc(chance),
    dragoonActive:()=>dbFriendDragoonActive(),
    dragoonLandingReady:()=>!!player.dragoonLandingReady,
    dragoonLanding:()=>dbFriendDragoonLanding(),
    tickDragoonCooldown:()=>dbFriendTickDragoonCooldown(),
    invokeGuardAction:(...args)=>guardAction(...args)
  });

'''
mono = replace_once(mono, "  const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;", config + "  const dbCombatStrikeOwner=window.DiceboundCombatStrikeResolution;", "Guard owner composition")
MONO.write_text(mono, encoding="utf-8")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
module_id = "combat-guard-resolution"
if module_id in manifest["loadOrder"] or any(m.get("id") == module_id for m in manifest["modules"]):
    raise RuntimeError("Guard module already exists in manifest")
load_index = manifest["loadOrder"].index("combat-ultimate-resolution") + 1
manifest["loadOrder"].insert(load_index, module_id)
module_index = next(i for i, m in enumerate(manifest["modules"]) if m.get("id") == "combat-ultimate-resolution") + 1
manifest["modules"].insert(module_index, {
    "id": module_id,
    "path": "js/combat/guard-resolution.js",
    "domain": "combat/player-guard-and-defensive-action-resolution",
    "status": "extracted",
    "requires": [],
    "provides": ["DiceboundCombatGuardResolution"],
})
monolith_entry = next(m for m in manifest["modules"] if m.get("id") == "dicebound-monolith")
requires = monolith_entry.get("requires") or []
if module_id in requires:
    raise RuntimeError("Guard module already present in monolith requires")
requires.insert(requires.index("combat-ultimate-resolution") + 1, module_id)
monolith_entry["requires"] = requires
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

index = INDEX.read_text(encoding="utf-8")
index = replace_once(
    index,
    '<script src="js/combat/ultimate-resolution.js"></script>\n<script src="js/combat/enemy-policy.js"></script>',
    '<script src="js/combat/ultimate-resolution.js"></script>\n<script src="js/combat/guard-resolution.js"></script>\n<script src="js/combat/enemy-policy.js"></script>',
    "runtime Guard script order",
)
INDEX.write_text(index, encoding="utf-8")

validator = VALIDATOR.read_text(encoding="utf-8")
guard_validation = r'''
    guard_owner = next((m for m in modules if m.get("id") == "combat-guard-resolution"), None)
    if not guard_owner or guard_owner.get("status") != "extracted":
        errors.append("combat Guard-resolution owner is missing or not extracted")
    else:
        if guard_owner.get("path") != "js/combat/guard-resolution.js" or "DiceboundCombatGuardResolution" not in (guard_owner.get("provides") or []):
            errors.append("combat-guard-resolution must provide DiceboundCombatGuardResolution from js/combat/guard-resolution.js")
        if position.get("combat-guard-resolution", -1) >= position.get(str(monolith_id), -1):
            errors.append("combat-guard-resolution must load before the compatibility monolith")
    if monolith_source:
        if "dbCombatGuardResolution=dbCombatGuardOwner.configure({" not in monolith_source:
            errors.append("dicebound.js must configure the combat Guard-resolution owner")
        if monolith_source.count("async function guardAction(") != 1 or "return dbCombatGuardResolution.guardAction(...args);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin guardAction adapter")
        if monolith_source.count("async function identityGuardAction(") != 1 or "dbCombatGuardResolution.identityGuardAction" not in monolith_source:
            errors.append("dicebound.js must retain only the thin traced identityGuardAction adapter")
        if re.search(r"(?m)^  guardAction\s*=", monolith_source):
            errors.append("dicebound.js retains a top-level guardAction reassignment after Guard extraction")
        if re.search(r"(?m)^  identityGuardAction\s*=", monolith_source):
            errors.append("dicebound.js retains an identityGuardAction reassignment after Guard extraction")
        for symbol in (
            "identityGuardActionV17Base", "identityGuardActionV18Base", "identityGuardActionV19Base", "identityGuardActionV19OffhandBase",
            "db060GuardActionBase", "dbFriendGuardActionBase"
        ):
            if re.search(rf"(?<![\\w$]){re.escape(symbol)}(?![\\w$])", monolith_source):
                errors.append(f"retired combat Guard-resolution wrapper remains in dicebound.js: {symbol}")
'''
validator = replace_once(validator, "    planned_domains = [str(x) for x in manifest.get(\"plannedDomains\") or []]", guard_validation + "\n    planned_domains = [str(x) for x in manifest.get(\"plannedDomains\") or []]", "Guard architecture validator")
VALIDATOR.write_text(validator, encoding="utf-8")

shadow = SHADOW.read_text(encoding="utf-8")
guard_shadow = r'''
guard_retired = [
    'identityGuardActionV17Base','identityGuardActionV18Base','identityGuardActionV19Base','identityGuardActionV19OffhandBase',
    'db060GuardActionBase','dbFriendGuardActionBase',
]
for symbol in guard_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Guard-resolution owner returned: {symbol}"
assert mono.count('async function guardAction(') == 1, 'guardAction must have exactly one thin compatibility adapter'
assert mono.count('async function identityGuardAction(') == 1, 'identityGuardAction must have exactly one thin traced compatibility adapter'
assert not re.search(r'(?m)^  guardAction\s*=', mono), 'top-level guardAction reassignment chain must not return'
assert not re.search(r'(?m)^  identityGuardAction\s*=', mono), 'identityGuardAction reassignment chain must not return'
assert "dbCombatGuardResolution=dbCombatGuardOwner.configure({" in mono, 'combat Guard-resolution owner is not configured by the composition root'
assert "return dbCombatGuardResolution.guardAction(...args);" in mono, 'Guard thin adapter is missing'
assert "dbCombatGuardResolution.identityGuardAction" in mono, 'identity Guard thin adapter is missing'

'''
shadow = replace_once(shadow, "print('Monolith spring-clean guard PASS')", guard_shadow + "print('Monolith spring-clean guard PASS')", "Guard shadow ownership checks")
SHADOW.write_text(shadow, encoding="utf-8")

changelog = CHANGELOG.read_text(encoding="utf-8")
section = '''## Beta 0.6.6.5

### Guard resolution ownership (#40, #209, #279)
- Extracted the complete player Guard transaction into `runtime/js/combat/guard-resolution.js`, consolidating both the `guardAction` and `identityGuardAction` ownership ladders behind one authoritative owner.
- Preserved the historical outer order for Mythic offhand, Paladin Grace, Mana Guard, Resonant Guard, Fighter/Turtle/Monk identity behavior, Dragoon landing/cooldown, Perfect Guard and the base D20 Guard action, including RNG draw/order and temporary-stat restoration semantics.
- Potions, Pet turns, basic/Echo strikes, Ultimates, enemy-response internals, encounter/presentation owners, saves/checkpoints and gameplay values remain unchanged.

'''
changelog = replace_once(changelog, "## Beta 0.6.6.4\n", section + "## Beta 0.6.6.4\n", "0.6.6.5 changelog")
CHANGELOG.write_text(changelog, encoding="utf-8")

notes = PATCH_NOTES.read_text(encoding="utf-8")
notes_section = '''# Unreleased — Beta 0.6.6.5

## Beta 0.6.6.5 Guard resolution ownership (#40, #209, #279)
- Guard now resolves through one authoritative `combat/guard-resolution.js` owner; the historical `guardAction` / `identityGuardAction` wrapper towers are retired from `dicebound.js`.
- Fighter Counterblows, Turtle Shell Momentum, Mana Guard, Resonant Guard, Paladin Grace, Event Horizon Ward, Perfect Guard, D20 Guard behavior and Dragoon landing/cooldown retain their existing values, RNG order and wrapper ordering.
- Potions, Pet turns, basic/Echo strikes, Ultimates, enemy-response internals, encounter/presentation owners, saves/checkpoints and gameplay values are unchanged.

'''
PATCH_NOTES.write_text(notes_section + notes, encoding="utf-8")

print("0.6.6.5 Guard extraction materialized")
