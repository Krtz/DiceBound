#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def replace_once(rel: str, old: str, new: str) -> None:
    text = read(rel)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"PATCH FAILED: {rel}: expected one exact match, found {count}: {old[:100]!r}")
    write(rel, text.replace(old, new, 1))


def regex_once(rel: str, pattern: str, replacement: str, label: str) -> None:
    text = read(rel)
    matches = list(re.finditer(pattern, text, flags=re.S))
    if len(matches) != 1:
        raise SystemExit(f"PATCH FAILED: {rel}: expected one {label}, found {len(matches)}")
    write(rel, re.sub(pattern, lambda _m: replacement, text, count=1, flags=re.S))


CLASS_RULES = r'''(() => {
  "use strict";

  const TARGET_IDS=Object.freeze(["pokemontrainer","rogue","merchant","slime","vampire","invoker","dragoon"]);

  function normalizeFacts(facts={}){
    return {
      board3MinibossDefeated:!!facts.board3MinibossDefeated,
      board3BossDefeated:!!facts.board3BossDefeated,
      board4MinibossDefeated:!!facts.board4MinibossDefeated,
      beastmasterBoard5Cleared:!!facts.beastmasterBoard5Cleared,
      roadMerchantSecretBossDefeated:!!facts.roadMerchantSecretBossDefeated,
      maxLifesteal:Number(facts.maxLifesteal)||0,
      manaSpenderCasts:Math.max(0,Math.floor(Number(facts.manaSpenderCasts)||0)),
    };
  }

  function allPetsLevel10(ctx={}){
    const ids=Array.isArray(ctx.petIds)?ctx.petIds:[];
    const levels=ctx.petLevels||{};
    return ids.length>0&&ids.every(id=>(Number(levels[id])||1)>=10);
  }

  function isEligible(id,ctx={}){
    const f=normalizeFacts(ctx.facts);
    switch(id){
      case "pokemontrainer":return allPetsLevel10(ctx)&&f.beastmasterBoard5Cleared;
      case "rogue":return (Number(ctx.highestGold)||0)>=5000&&f.board3MinibossDefeated;
      case "merchant":return f.roadMerchantSecretBossDefeated;
      case "slime":return new Set(ctx.unlockedClassIds||[]).size>=10;
      case "vampire":return f.maxLifesteal>1&&f.board3BossDefeated;
      case "invoker":return f.manaSpenderCasts>=100;
      case "dragoon":return f.board4MinibossDefeated;
      default:return null;
    }
  }

  function recordCombatFacts(facts={},event={}){
    const out=normalizeFacts(facts),board=Number(event.board)||0;
    if(event.miniBoss&&board===3)out.board3MinibossDefeated=true;
    if(event.finalBoss&&board===3)out.board3BossDefeated=true;
    if(event.miniBoss&&board===4)out.board4MinibossDefeated=true;
    if(event.finalBoss&&board===5&&event.classId==="beastmaster")out.beastmasterBoard5Cleared=true;
    if(event.merchantBoss)out.roadMerchantSecretBossDefeated=true;
    return out;
  }

  function recordManaSpenderCast(facts={},qualified=true){
    const out=normalizeFacts(facts);
    if(qualified)out.manaSpenderCasts++;
    return out;
  }

  window.DiceboundClassUnlockRules=Object.freeze({apiVersion:1,targetIds:TARGET_IDS,normalizeFacts,allPetsLevel10,isEligible,recordCombatFacts,recordManaSpenderCast});
})();
'''

BORROWING = r'''(() => {
  "use strict";
  function ownerIds(powerup={}){return [...new Set([powerup.classId,...(powerup.classIds||[])].filter(Boolean))];}
  function ownershipAllowed(powerup,borrowerId,unlockedClassIds=[]){
    const owners=ownerIds(powerup);
    if(!owners.length)return true;
    if(owners.includes(borrowerId))return true;
    const unlocked=new Set(unlockedClassIds||[]);
    return owners.some(id=>unlocked.has(id));
  }
  window.DiceboundPowerupBorrowing=Object.freeze({apiVersion:1,ownerIds,ownershipAllowed});
})();
'''

TEST = r'''const fs=require("fs");const vm=require("vm");const path=require("path");
const root=path.resolve(__dirname,"..");
function load(rel,window={}){const code=fs.readFileSync(path.join(root,rel),"utf8");vm.runInNewContext(code,{window,console});return window;}
function assert(v,msg){if(!v)throw new Error(msg);}
const w=load("runtime/js/progression/class-unlock-rules.js",{}),R=w.DiceboundClassUnlockRules;
const base={petIds:["a","b"],petLevels:{a:10,b:10},highestGold:0,unlockedClassIds:[],facts:{}};
for(const mode of ["normal","nightmare","hell"]){const facts=R.recordCombatFacts({}, {board:5,finalBoss:true,classId:"beastmaster",mode});assert(R.isEligible("pokemontrainer",{...base,facts}),`Pokemon Trainer failed ${mode}`);}
let facts=R.recordCombatFacts({}, {board:3,miniBoss:true});assert(!R.isEligible("rogue",{...base,highestGold:4999,facts}),"Rogue unlocked below 5000");assert(R.isEligible("rogue",{...base,highestGold:5000,facts}),"Rogue separate facts failed");
facts=R.recordCombatFacts({}, {merchantBoss:true});assert(R.isEligible("merchant",{...base,facts}),"Merchant first kill failed");
assert(!R.isEligible("slime",{...base,unlockedClassIds:Array.from({length:9},(_,i)=>`c${i}`)}),"Slime unlocked at 9");assert(R.isEligible("slime",{...base,unlockedClassIds:Array.from({length:10},(_,i)=>`c${i}`)}),"Slime did not unlock at 10");
facts=R.recordCombatFacts({}, {board:3,finalBoss:true});facts.maxLifesteal=1;assert(!R.isEligible("vampire",{...base,facts}),"Vampire accepted exactly 100%");facts.maxLifesteal=1.001;assert(R.isEligible("vampire",{...base,facts}),"Vampire >100% failed");
let mana={};for(let i=0;i<99;i++)mana=R.recordManaSpenderCast(mana,true);mana=R.recordManaSpenderCast(mana,false);assert(!R.isEligible("invoker",{...base,facts:mana}),"Invoker counted non-spender");mana=R.recordManaSpenderCast(mana,true);assert(R.isEligible("invoker",{...base,facts:mana}),"Invoker 100 spender casts failed");
facts=R.recordCombatFacts({}, {board:4,miniBoss:true});assert(R.isEligible("dragoon",{...base,facts}),"Dragoon Board 4 miniboss failed");
const bw=load("runtime/js/powerups/borrowing.js",{}),B=bw.DiceboundPowerupBorrowing;
assert(B.ownershipAllowed({id:"generic"},"slime",["ranger"]),"generic power blocked");assert(!B.ownershipAllowed({classId:"ninja"},"slime",["ranger","fighter"]),"locked Ninja leaked to Slime");assert(B.ownershipAllowed({classId:"ninja"},"slime",["ranger","ninja"]),"unlocked Ninja unavailable to Slime");assert(B.ownershipAllowed({classIds:["ninja","fighter"]},"slime",["fighter"]),"multi-owner power failed");assert(!B.ownershipAllowed({classId:"ninja"},"slimerouge",["ranger"]),"locked Ninja leaked to Slime Rouge");
const ew={DiceboundRarities:{ids:["poor","common","uncommon","rare","epic","legendary","artifact","omega"]}};load("runtime/js/items/equipment.js",ew);const E=ew.DiceboundEquipment;
const labels={weapon:"Weapon",offhand:"Offhand",boots:"Boots",legs:"Legs",chest:"Chest",hat:"Hat",ring:"Ring",amulet:"Amulet"};for(const [slot,label] of Object.entries(labels))assert(E.ordinaryBaseName(slot)===label,`${slot} not neutral`);
const pool=[{id:"a",slots:["weapon"],tags:["ninja"]},{id:"b",slots:["weapon"],tags:["fighter"]},{id:"c",slots:["weapon"],tags:[]}];assert(E.pickOrdinaryAffix(()=>0.01,pool,"weapon").id==="a","uniform picker first");assert(E.pickOrdinaryAffix(()=>0.40,pool,"weapon").id==="b","uniform picker middle");assert(E.pickOrdinaryAffix(()=>0.90,pool,"weapon").id==="c","uniform picker last");const special=E.createRegistry().special;assert(special["axels-coffee-mug"]&&special["impossible-weapon"],"special gear was flattened");
const mono=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");assert(mono.includes("DiceboundPowerupBorrowing.ownershipAllowed"),"borrowing helper not wired");assert(mono.includes("v318SlimeRougePowerCompatible"),"Slime Rouge compatibility owner missing");assert(mono.includes("DiceboundEquipment.pickOrdinaryAffix"),"neutral affix helper not wired");assert(!mono.includes("let n=3;if((a.tags||[]).some(t=>tags.has(t)))n+=2"),"legacy class affix weighting still live");assert(mono.includes("db0631RecordObservedProgress"),"0.6.3.1 progression wiring missing");
const html=fs.readFileSync(path.join(root,"runtime/index.html"),"utf8");assert(html.includes("js/progression/class-unlock-rules.js")&&html.includes("js/powerups/borrowing.js"),"new modules not loaded");
console.log("PASS #96/#104/#87 deterministic rules");
'''

write("runtime/js/progression/class-unlock-rules.js", CLASS_RULES)
write("runtime/js/powerups/borrowing.js", BORROWING)
write("tools/test_0631_progression_slime_gear.js", TEST)

# Equipment static owner: neutral slot identity and uniform slot-filtered selection.
replace_once(
    "runtime/js/items/equipment.js",
    "  function createRegistry(){return JSON.parse(JSON.stringify(EQUIPMENT_DATA));}\n  window.DiceboundEquipment=Object.freeze({apiVersion:1,createRegistry});",
    "  function createRegistry(){return JSON.parse(JSON.stringify(EQUIPMENT_DATA));}\n  function ordinaryBaseName(slot){return EQUIPMENT_DATA.labels[slot]||String(slot||\"Equipment\");}\n  function eligibleOrdinaryAffixes(pool,slot){return (pool||[]).filter(affix=>Array.isArray(affix?.slots)&&affix.slots.includes(slot));}\n  function pickOrdinaryAffix(random,pool,slot){const eligible=eligibleOrdinaryAffixes(pool,slot);if(!eligible.length)return null;const roll=Math.max(0,Math.min(.999999999,Number(random?.())||0));return eligible[Math.floor(roll*eligible.length)];}\n  window.DiceboundEquipment=Object.freeze({apiVersion:1,createRegistry,ordinaryBaseName,eligibleOrdinaryAffixes,pickOrdinaryAffix});",
)

# Player-facing class registry requirements.
class_file="runtime/js/classes/registry.js"
class_text=read(class_file)
for cid,unlock in {
    "pokemontrainer":"Secret: raise every companion to level 10 and clear Board 5 with Beastmaster on any difficulty",
    "rogue":"Hold 5,000 gold at one time and defeat the Board 3 miniboss",
    "merchant":"Defeat the Road Merchant secret boss once",
    "slime":"Unlock 10 classes in total",
    "vampire":"Exceed 100% Lifesteal and defeat the Board 3 final boss",
}.items():
    pattern=rf'(\"{re.escape(cid)}\"\s*:\s*\{{.*?\"unlock\"\s*:\s*)\"[^\"]*\"'
    matches=list(re.finditer(pattern,class_text,flags=re.S))
    if len(matches)!=1:raise SystemExit(f"PATCH FAILED: class registry {cid} unlock matches={len(matches)}")
    class_text=re.sub(pattern,lambda m:m.group(1)+json.dumps(unlock,ensure_ascii=False),class_text,count=1,flags=re.S)
write(class_file,class_text)

mono="runtime/js/dicebound.js"
replace_once(mono,
'  function v15AffixForClass(R,pool,slot,classId){const tags=new Set(CLASSES[v15SafeClassId(classId)]?.tags||[]),eligible=pool.filter(a=>a.slots.includes(slot)),weighted=[];eligible.forEach(a=>{let n=3;if((a.tags||[]).some(t=>tags.has(t)))n+=2;for(let i=0;i<n;i++)weighted.push(a);});return v14SPick(R,weighted.length?weighted:eligible);}\n  function v15BaseNameForClass(slot,R,classId){const source=gearNames[slot],names=(source&&source[classId])||source;return Array.isArray(names)&&names.length?v14SPick(R,names):SLOT_LABELS[slot];}',
'  function v15AffixForClass(R,pool,slot){return window.DiceboundEquipment.pickOrdinaryAffix(R,pool,slot);}\n  function v15BaseNameForClass(slot){return window.DiceboundEquipment.ordinaryBaseName(slot);}')
for old,new in [
    ("v15AffixForClass(R,V14_PREFIXES,slot,classId)","v15AffixForClass(R,V14_PREFIXES,slot)"),
    ("v15AffixForClass(R,V14_SUFFIXES,slot,classId)","v15AffixForClass(R,V14_SUFFIXES,slot)"),
    ("v15BaseNameForClass(slot,R,classId)","v15BaseNameForClass(slot)"),
]:
    replace_once(mono,old,new)

old_slime='  eligibleUpgrades=function(filter=()=>true){return upgrades.filter(u=>{let classOk=(!u.classId&&!u.classIds)||u.classId===player.classId||(u.classIds||[]).includes(player.classId);if(classIdentityActive("slime")&&!classOk){const owners=[u.classId,...(u.classIds||[])].filter(Boolean),secretOwner=owners.some(id=>CLASSES[id]?.secret),tags=inferUpgradeTags(u),caps=new Set(classMechanicsFor("slime"));if(owners.length&&!secretOwner&&!tags.includes("ultimate")&&db32PowerMechanicsCompatible(u,caps))classOk=true;}return classOk&&achievementGateUnlocked(u.achievementGate)&&(!u.unique||!(player.upgradeCounts?.[u.id]))&&filter(u);});};'
new_slime='  eligibleUpgrades=function(filter=()=>true){return upgrades.filter(u=>{let classOk=(!u.classId&&!u.classIds)||u.classId===player.classId||(u.classIds||[]).includes(player.classId);if(classIdentityActive("slime")&&!classOk){const unlocked=["slime",...Object.keys(CLASSES).filter(id=>id!=="slime"&&isClassUnlocked(id))],tags=inferUpgradeTags(u),caps=new Set(classMechanicsFor("slime"));if(window.DiceboundPowerupBorrowing.ownershipAllowed(u,"slime",unlocked)&&!tags.includes("ultimate")&&db32PowerMechanicsCompatible(u,caps))classOk=true;}return classOk&&achievementGateUnlocked(u.achievementGate)&&(!u.unique||!(player.upgradeCounts?.[u.id]))&&filter(u);});};'
replace_once(mono,old_slime,new_slime)
old_rouge='  function v318SlimeRougePowerCompatible(u){\n    if(!u)return false;const owners=[u.classId,...(u.classIds||[])].filter(Boolean);\n    if(!owners.length||owners.includes(\'slimerouge\'))return true;\n    const spec=window.DiceboundContent?.powerupMechanics?.[u.id]||{requires:[]};const caps=slimeRougeCapabilities();\n    return (spec.requires||[]).every(req=>req.startsWith(\'ultimate:\')?player.slimeRougeUltimateClass===req.slice(9):caps.has(req));\n  }'
new_rouge='  function v318SlimeRougePowerCompatible(u){\n    if(!u)return false;const owners=[u.classId,...(u.classIds||[])].filter(Boolean),unlocked=[\'slimerouge\',...Object.keys(CLASSES).filter(id=>id!==\'slimerouge\'&&isClassUnlocked(id))];\n    if(!window.DiceboundPowerupBorrowing.ownershipAllowed(u,\'slimerouge\',unlocked))return false;\n    if(!owners.length||owners.includes(\'slimerouge\'))return true;\n    const spec=window.DiceboundContent?.powerupMechanics?.[u.id]||{requires:[]};const caps=slimeRougeCapabilities();\n    return (spec.requires||[]).every(req=>req.startsWith(\'ultimate:\')?player.slimeRougeUltimateClass===req.slice(9):caps.has(req));\n  }'
replace_once(mono,old_rouge,new_rouge)

# Final 0.6.3.1 integration: persistent career facts + guarded unlocks + event hooks.
text=read(mono)
if not text.rstrip().endswith("})();"):raise SystemExit("PATCH FAILED: monolith final closure not found")
block=r'''

  /* BETA 0.6.3.1 — class progression, Slime ownership, neutral ordinary gear */
  const db0631Rules=window.DiceboundClassUnlockRules;
  if(!db0631Rules||!window.DiceboundPowerupBorrowing||!window.DiceboundEquipment?.pickOrdinaryAffix)throw new Error('Beta 0.6.3.1 rule modules must load before dicebound.js');
  const db0631TargetIds=new Set(db0631Rules.targetIds);
  function db0631Facts(){
    const stats=ensureAlphaMeta();stats.classUnlockFacts=db0631Rules.normalizeFacts(stats.classUnlockFacts||{});return stats.classUnlockFacts;
  }
  const db0631IsClassUnlockedBase=isClassUnlocked;
  function db0631Context(includeUnlocked=false){
    const stats=ensureAlphaMeta(),facts=db0631Facts(),petIds=Object.keys(PETS),petLevels={};petIds.forEach(id=>petLevels[id]=meta.pets?.[id]?.level||1);
    const ctx={facts,petIds,petLevels,highestGold:Math.max(Number(stats.highestGold)||0,gameStarted?(Number(player.gold)||0):0),unlockedClassIds:[]};
    if(includeUnlocked)ctx.unlockedClassIds=Object.keys(CLASSES).filter(id=>id!=='slime'&&db0631EligibleWithoutSlime(id));
    return ctx;
  }
  function db0631EligibleWithoutSlime(id){
    if(meta.unlocks?.[id])return true;if(!CLASSES[id])return false;
    if(db0631TargetIds.has(id)&&id!=='slime'){const result=db0631Rules.isEligible(id,db0631Context(false));if(result!==null)return result;}
    return db0631IsClassUnlockedBase(id);
  }
  function db0631RuleEligible(id){
    if(meta.unlocks?.[id])return true;if(!CLASSES[id])return false;
    const result=db0631Rules.isEligible(id,db0631Context(id==='slime'));return result===null?db0631IsClassUnlockedBase(id):result;
  }
  const db0631BaseClassUnlockedBase=baseClassUnlocked;
  baseClassUnlocked=function(id){if(db0631TargetIds.has(id)&&CLASSES[id])return db0631RuleEligible(id);return db0631BaseClassUnlockedBase(id);};
  isClassUnlocked=function(id){if(db0631TargetIds.has(id)&&CLASSES[id])return db0631RuleEligible(id);return db0631IsClassUnlockedBase(id);};
  const db0631UnlockClassBase=unlockClass;
  unlockClass=function(id){if(db0631TargetIds.has(id)&&CLASSES[id]&&!db0631RuleEligible(id))return false;return db0631UnlockClassBase(id);};
  function db0631RecordObservedProgress(){
    if(!gameStarted)return false;const stats=ensureAlphaMeta(),facts=db0631Facts(),gold=Math.max(Number(stats.highestGold)||0,Number(player.gold)||0),life=Math.max(Number(facts.maxLifesteal)||0,Number(player.lifeSteal)||0);let changed=false;
    if(gold!==(Number(stats.highestGold)||0)){stats.highestGold=gold;changed=true;}if(life!==(Number(facts.maxLifesteal)||0)){facts.maxLifesteal=life;changed=true;}return changed;
  }
  const db0631CheckDynamicBase=checkDynamicClassUnlocks;
  checkDynamicClassUnlocks=function(...args){const changed=db0631RecordObservedProgress(),result=db0631CheckDynamicBase.apply(this,args);['pokemontrainer','rogue','merchant','slime','vampire','invoker','dragoon'].forEach(id=>{if(CLASSES[id]&&db0631RuleEligible(id))unlockClass(id);});if(changed)saveMeta();return result;};
  const db0631WinCombatBase=winCombat;
  winCombat=async function(...args){
    const defeated=currentEncounterLead||currentEnemy,board=boardLevel,classId=player.classId,isFinal=!!defeated?.finalBoss||v16CombatKind==='final'||tiles[currentEnemyTile]?.type==='boss',stats=ensureAlphaMeta();
    stats.classUnlockFacts=db0631Rules.recordCombatFacts(db0631Facts(),{board,classId,miniBoss:!!defeated?.miniBoss,finalBoss:isFinal,merchantBoss:!!defeated?.merchantBoss,mode:hellMode?'hell':nightmareMode?'nightmare':'normal'});saveMeta();
    const result=await db0631WinCombatBase.apply(this,args);checkDynamicClassUnlocks();saveMeta();return result;
  };
  const db0631OccultSpellAttackBase=occultSpellAttack;
  occultSpellAttack=async function(...args){const beforeMana=Number(player.mana)||0,beforeActions=Number(player.combatActionCount)||0,result=await db0631OccultSpellAttackBase.apply(this,args),spent=beforeMana>(Number(player.mana)||0)&&(Number(player.combatActionCount)||0)>beforeActions;if(spent){const stats=ensureAlphaMeta();stats.classUnlockFacts=db0631Rules.recordManaSpenderCast(db0631Facts(),true);saveMeta();checkDynamicClassUnlocks();}return result;};
  if(CLASSES.pokemontrainer)CLASSES.pokemontrainer.unlock='Secret: raise every companion to level 10 and clear Board 5 with Beastmaster on any difficulty';
  if(CLASSES.rogue)CLASSES.rogue.unlock='Hold 5,000 gold at one time and defeat the Board 3 miniboss';
  if(CLASSES.merchant)CLASSES.merchant.unlock='Defeat the Road Merchant secret boss once';
  if(CLASSES.slime)CLASSES.slime.unlock='Unlock 10 classes in total';
  if(CLASSES.vampire)CLASSES.vampire.unlock='Exceed 100% Lifesteal and defeat the Board 3 final boss';
  checkDynamicClassUnlocks();
'''
pos=text.rfind("})();")
text=text[:pos]+block+"\n"+text[pos:]
write(mono,text)

# Manifest + HTML load order for the two extracted pure-rule owners.
manifest_path=ROOT/"runtime/js/module-manifest.json";manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
new_modules=[
 {"id":"progression-class-unlock-rules","path":"js/progression/class-unlock-rules.js","domain":"progression/class-unlock-rules","status":"extracted","requires":[],"provides":["DiceboundClassUnlockRules"]},
 {"id":"powerup-borrowing","path":"js/powerups/borrowing.js","domain":"powerups/borrowing-eligibility","status":"extracted","requires":[],"provides":["DiceboundPowerupBorrowing"]},
]
ids={m["id"] for m in manifest["modules"]}
for module in new_modules:
    if module["id"] in ids:raise SystemExit(f"PATCH FAILED: module already exists {module['id']}")
    manifest["modules"].insert(-1,module)
order=manifest["loadOrder"]
order.insert(order.index("pets-registry"),"progression-class-unlock-rules")
order.insert(order.index("dicebound-monolith"),"powerup-borrowing")
mono_entry=next(m for m in manifest["modules"] if m["id"]=="dicebound-monolith")
for dep in ["progression-class-unlock-rules","powerup-borrowing"]:
    if dep not in mono_entry["requires"]:mono_entry["requires"].append(dep)
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")

index=read("runtime/index.html")
for old,new in [
 ('<script src="js/classes/registry.js"></script>','<script src="js/classes/registry.js"></script>\n<script src="js/progression/class-unlock-rules.js"></script>'),
 ('<script src="js/powerups/registry.js"></script>','<script src="js/powerups/registry.js"></script>\n<script src="js/powerups/borrowing.js"></script>'),
]:
    if index.count(old)!=1:raise SystemExit(f"PATCH FAILED: runtime/index script anchor {old}")
    index=index.replace(old,new,1)
write("runtime/index.html",index)

# Stamp the real runtime release identity after manifest changes so project.json picks up load order.
subprocess.run(["python","tools/set_project_version.py","--version","0.6.3.1","--channel","Beta"],cwd=ROOT,check=True)

notes=read("runtime/PATCH_NOTES.md")
if not notes.startswith("# Unreleased — Beta 0.6.3.0\n"):raise SystemExit("PATCH FAILED: unexpected PATCH_NOTES heading")
notes=notes.replace("# Unreleased — Beta 0.6.3.0\n","# Unreleased — Beta 0.6.3.1\n\n## Class progression, Slime borrowing and ordinary gear (#96, #104, #87)\n- Revised Pokémon Trainer, Rogue, Merchant, Slime and Vampire unlock progression with persistent independent career prerequisites.\n- Added future career hooks for 100 qualifying Mana-spender casts (Invoker) and the Board 4 miniboss (Dragoon).\n- Slime and Slime Rouge may borrow class-owned Powerups only from classes the career has actually unlocked; Slime Rouge still enforces its mechanical compatibility rules.\n- Ordinary generated gear now uses neutral slot names and equal-weight slot-eligible affixes instead of class-biased names/prefixes.\n\n",1)
write("runtime/PATCH_NOTES.md",notes)

print("PATCH 0.6.3.1 READY")
