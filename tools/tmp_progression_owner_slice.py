from pathlib import Path
import json
import re

ROOT=Path('.')
DICE=ROOT/'runtime/js/dicebound.js'
MANIFEST=ROOT/'runtime/js/module-manifest.json'
INDEX=ROOT/'runtime/index.html'
LIFECYCLE=ROOT/'runtime/js/progression/lifecycle.js'
ORACLE=ROOT/'tools/test_progression_oracle.js'
OWNER_TEST=ROOT/'tools/test_progression_owner.js'


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)


def regex_once(text,pattern,replacement,label,flags=0):
    out,count=re.subn(pattern,replacement,text,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')
    return out

if LIFECYCLE.exists():
    raise SystemExit('progression/lifecycle.js already exists')

LIFECYCLE.write_text(r'''/* DiceBound Progression public subsystem owner.
 *
 * This is the semantic owner for Talent/Legacy progression and the final
 * Prestige reset transaction. Focused registries/domains remain separate:
 * progression/talents.js owns Talent data and progression/prestige.js owns
 * Prestige currency/Moon purchase math. The compatibility runtime supplies
 * composition callbacks for persistence, presentation and active-run state.
 */
(() => {
  'use strict';

  const OWNER='progression/facade';
  const CORE=window.DiceboundCoreState;
  const PRESTIGE=window.DiceboundPrestige;
  if(!CORE?.legacyXpForLevel)throw new Error('DiceboundProgression requires DiceboundCoreState.');
  if(!PRESTIGE?.award)throw new Error('DiceboundProgression requires DiceboundPrestige.');

  let runtime=Object.freeze({});
  function configure(nextRuntime={}){runtime=Object.freeze({...runtime,...nextRuntime});return api;}
  function requireCapability(name){const fn=runtime[name];if(typeof fn!=='function')throw new Error(`DiceboundProgression capability is not configured: ${name}`);return fn;}
  function call(name,...args){return requireCapability(name)(...args);}
  function meta(){return call('getMeta');}
  function talents(){return call('getTalents');}

  function talentRank(id){return Math.max(0,Number(meta().purchased?.[id])||0);}
  function gameplayTalentRank(id){const source=call('getRunTalentSnapshot')||meta().purchased||{};return Math.max(0,Number(source[id])||0);}
  function setRunTalentSnapshot(value){return call('setRunTalentSnapshot',value);}
  function runTalentSnapshot(){return call('getRunTalentSnapshot');}
  function withRunTalentSnapshot(work){
    if(typeof work!=='function')throw new TypeError('DiceboundProgression.withRunTalentSnapshot requires a callback.');
    const snapshot=runTalentSnapshot();
    if(!snapshot)return work();
    const state=meta(),live=state.purchased;
    try{state.purchased=snapshot;return work();}
    finally{state.purchased=live;}
  }
  function talentAvailable(input){
    const talent=typeof input==='string'?talents().find(entry=>entry.id===input):input;
    return !!talent&&(talent.requires||[]).every(requirement=>talentRank(requirement.id)>=requirement.rank);
  }
  function allocatedTalentPoints(){return talents().reduce((sum,talent)=>sum+talentRank(talent.id)*talent.cost,0);}
  function repairTalentPrerequisites(){
    const entries=talents(),byId=Object.fromEntries(entries.map(talent=>[talent.id,talent]));let changed=true,guard=0;
    while(changed&&guard++<100){changed=false;for(const talent of entries){if(!talentRank(talent.id))continue;for(const requirement of talent.requires||[]){const requiredTalent=byId[requirement.id];if(requiredTalent&&talentRank(requirement.id)<requirement.rank){meta().purchased[requirement.id]=Math.min(requiredTalent.maxRank,requirement.rank);changed=true;}}}}
    if(changed===false)call('saveMeta');
  }
  function purchaseTalent(id){
    const talent=talents().find(node=>node.id===id),rank=talentRank(id),state=meta();
    if(!talent||rank>=talent.maxRank||!talentAvailable(talent)||state.points<talent.cost)return false;
    state.points-=talent.cost;state.purchased[talent.id]=rank+1;call('saveMeta');call('sfxLevel');call('showToast',`${talent.name} rank ${rank+1} · activates next run`);call('renderTalents');return true;
  }

  function legacyXpForLevel(level){return CORE.legacyXpForLevel(level);}
  function grantLegacyXp(amount){
    const state=meta();state.xp+=amount;
    while(state.xp>=state.xpNext){state.xp-=state.xpNext;state.level++;state.points++;state.xpNext=legacyXpForLevel(state.level);}
  }
  function finalizeRun(){
    if(call('isRunFinalized'))return call('getLastLegacyAward');
    call('setRunFinalized',true);
    const player=call('getPlayer'),travelAward=Math.max(0,Math.round(call('getTilesMovedThisRun')*(1+player.legacyXpBonus))),goldAward=Math.max(0,Math.floor(player.gold/10)),award=(travelAward+goldAward)*(call('isNightmare')?5:1),state=meta();
    call('setLastGoldLegacyAward',goldAward);call('setLastLegacyAward',award);
    state.runs++;state.bestTiles=Math.max(state.bestTiles,call('getTilesMovedThisRun'));grantLegacyXp(award);call('saveMeta');call('updateMetaUI');return award;
  }

  function prestigeOffer(total=allocatedTalentPoints()+(meta().points||0)){return Math.max(0,Math.floor(Math.max(0,Number(total)||0)/9));}
  function completePrestige(total){
    const rewards=prestigeOffer(total),remainder=Math.max(0,Number(total)||0)%9;
    if(rewards<1)return false;
    const state=meta();state.prestige=PRESTIGE.award(state.prestige,rewards);state.purchased={};state.level=1;state.xp=0;state.xpNext=legacyXpForLevel(1);state.points=remainder;
    call('clearPendingPrestige');call('hidePrestigeHeirloomOverlay');
    if(call('storageUnlocked'))call('syncStorage');
    const cap=call('getHeirloomSlots');state.heirlooms=(state.heirlooms||[]).slice(0,cap).map(item=>call('normalizeSavedItem',item));
    call('saveMeta');call('checkDynamicClassUnlocks');call('sfxHoly');call('showToast',`Prestige gained ${rewards} unspent Prestige Point${rewards===1?'':'s'}`);call('renderTalents');call('updateMetaUI');call('openStartScreen');return true;
  }

  function inspect(){return Object.freeze({owner:OWNER,configured:Object.freeze(Object.fromEntries(Object.entries(runtime).map(([key,value])=>[key,typeof value==='function'])))});}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,inspect,
    talentRank,gameplayTalentRank,setRunTalentSnapshot,runTalentSnapshot,withRunTalentSnapshot,talentAvailable,allocatedTalentPoints,repairTalentPrerequisites,purchaseTalent,
    legacyXpForLevel,grantLegacyXp,finalizeRun,prestigeOffer,completePrestige
  });
  window.DiceboundProgression=api;
})();
''',encoding='utf-8',newline='\n')

manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
if any(module.get('id')=='progression-lifecycle' for module in manifest['modules']):
    raise SystemExit('progression-lifecycle already present in manifest')
try:
    order_index=manifest['loadOrder'].index('progression-achievements')+1
except ValueError:
    raise SystemExit('progression-achievements missing from loadOrder')
manifest['loadOrder'].insert(order_index,'progression-lifecycle')
module_index=next((i for i,module in enumerate(manifest['modules']) if module.get('id')=='progression-achievements'),None)
if module_index is None:
    raise SystemExit('progression-achievements module missing')
manifest['modules'].insert(module_index+1,{
    'id':'progression-lifecycle',
    'path':'js/progression/lifecycle.js',
    'domain':'progression/talent-legacy-prestige-lifecycle-and-public-facade',
    'status':'extracted',
    'requires':['core-state','progression-talents','progression-prestige'],
    'provides':['DiceboundProgression']
})
MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')

index=INDEX.read_text(encoding='utf-8')
index=replace_once(index,'  <script src="js/progression/achievements.js"></script>','  <script src="js/progression/achievements.js"></script>\n  <script src="js/progression/lifecycle.js"></script>','index progression lifecycle script')
INDEX.write_text(index,encoding='utf-8',newline='\n')

dice=DICE.read_text(encoding='utf-8')
dice=replace_once(dice,
'''  const dbRun=window.DiceboundRun;
  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");''',
'''  const dbRun=window.DiceboundRun;
  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");
  const dbProgressionOwner=window.DiceboundProgression;
  if(!dbProgressionOwner)throw new Error("dicebound.js requires DiceboundProgression before loading.");
  let dbProgression=null;''','Progression owner bootstrap')

old_talent_setup='''  const req=(id,rank=1)=>({id,rank});
  const talentRank=id=>Math.max(0,Number(meta.purchased[id])||0);

  /* Alpha v3.1.7: talents are registry-owned. */
  function repairTalentPrerequisites(){
    const byId=Object.fromEntries(talents.map(t=>[t.id,t]));let changed=true,guard=0;
    while(changed&&guard++<100){changed=false;for(const talent of talents){if(!talentRank(talent.id))continue;for(const r of talent.requires||[]){const reqTalent=byId[r.id];if(reqTalent&&talentRank(r.id)<r.rank){meta.purchased[r.id]=Math.min(reqTalent.maxRank,r.rank);changed=true;}}}}
    if(changed===false)saveMeta();
  }
  repairTalentPrerequisites();'''
new_talent_setup='''  const req=(id,rank=1)=>({id,rank});
  dbProgression=dbProgressionOwner.configure({
    getMeta:()=>meta,getPlayer:()=>player,getTalents:()=>talents,getRunTalentSnapshot:()=>runTalentSnapshot,setRunTalentSnapshot:value=>{runTalentSnapshot=value;return runTalentSnapshot;},
    saveMeta:()=>saveMeta(),sfxLevel:()=>sfx.level(),showToast:(...args)=>showToast(...args),renderTalents:()=>renderTalents(),
    isRunFinalized:()=>runFinalized,setRunFinalized:value=>{runFinalized=!!value;},getLastLegacyAward:()=>lastLegacyAward,setLastLegacyAward:value=>{lastLegacyAward=value;},setLastGoldLegacyAward:value=>{lastGoldLegacyAward=value;},
    getTilesMovedThisRun:()=>tilesMovedThisRun,isNightmare:()=>!!nightmareMode,updateMetaUI:()=>updateMetaUI(),
    clearPendingPrestige:()=>{pendingPrestige=null;pendingPrestigeKeepIds=new Set();},hidePrestigeHeirloomOverlay:()=>$('prestigeHeirloomOverlay')?.classList.add('hidden'),
    storageUnlocked:()=>!!v24StorageUnlocked?.(),syncStorage:()=>v24SyncStorage?.(),getHeirloomSlots:()=>getHeirloomSlots(),normalizeSavedItem:item=>normalizeSavedItem(item),
    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),sfxHoly:()=>sfx.holy(),openStartScreen:()=>openStartScreen()
  });
  const talentRank=id=>dbProgression.talentRank(id);

  /* Alpha v3.1.7: talents are registry-owned; lifecycle policy is Progression-owned. */
  function repairTalentPrerequisites(){return dbProgression.repairTalentPrerequisites();}
  repairTalentPrerequisites();'''
dice=replace_once(dice,old_talent_setup,new_talent_setup,'Talent owner setup')

dice=replace_once(dice,'  function gameplayTalentRank(id){const source=runTalentSnapshot||meta.purchased||{};return Math.max(0,Number(source[id])||0);}','  function gameplayTalentRank(id){return dbProgression.gameplayTalentRank(id);}','gameplayTalentRank adapter')

dice=replace_once(dice,
'''    withRunTalentSnapshot:work=>{
      if(!runTalentSnapshot)return work();
      const live=meta.purchased;
      try{meta.purchased=runTalentSnapshot;return work();}
      finally{meta.purchased=live;}
    },''',
'''    withRunTalentSnapshot:work=>dbProgression.withRunTalentSnapshot(work),''','run Talent snapshot composition')

dice=replace_once(dice,
'''  function grantLegacyXp(amount){
    meta.xp+=amount;
    while(meta.xp>=meta.xpNext){meta.xp-=meta.xpNext;meta.level++;meta.points++;meta.xpNext=legacyXpForLevel(meta.level);}
  }''',
'''  function grantLegacyXp(amount){return dbProgression.grantLegacyXp(amount);}''','Legacy XP owner adapter')

dice=replace_once(dice,
'''  function finalizeRun(){
    if(runFinalized)return lastLegacyAward;runFinalized=true;
    const travelAward=Math.max(0,Math.round(tilesMovedThisRun*(1+player.legacyXpBonus)));lastGoldLegacyAward=Math.max(0,Math.floor(player.gold/10));lastLegacyAward=(travelAward+lastGoldLegacyAward)*(nightmareMode?5:1);
    meta.runs++;meta.bestTiles=Math.max(meta.bestTiles,tilesMovedThisRun);grantLegacyXp(lastLegacyAward);saveMeta();updateMetaUI();return lastLegacyAward;
  }''',
'''  function finalizeRun(){return dbProgression.finalizeRun();}''','finalizeRun owner adapter')

dice=replace_once(dice,'  function allocatedTalentPoints(){return talents.reduce((sum,t)=>sum+talentRank(t.id)*t.cost,0);}','  function allocatedTalentPoints(){return dbProgression.allocatedTalentPoints();}','allocated Talent adapter')
dice=replace_once(dice,'  function talentAvailable(t){return (t.requires||[]).every(r=>talentRank(r.id)>=r.rank);}','  function talentAvailable(t){return dbProgression.talentAvailable(t);}','Talent availability adapter')
dice=regex_once(dice,r'''  function purchaseTalentNode\(id\)\{\n    const t=talents\.find\(node=>node\.id===id\),rank=talentRank\(id\);\n    if\(!t\|\|rank>=t\.maxRank\|\|!talentAvailable\(t\)\|\|meta\.points<t\.cost\)return false;\n    meta\.points-=t\.cost;meta\.purchased\[t\.id\]=rank\+1;saveMeta\(\);sfx\.level\(\);showToast\(`\$\{t\.name\} rank \$\{rank\+1\} · activates next run`\);\n    renderTalents\(\);return true;\n  \}''','  function purchaseTalentNode(id){return dbProgression.purchaseTalent(id);}','Talent purchase adapter')

dice=replace_once(dice,
'''  function db0633PrestigeOfferPoints(total=allocatedTalentPoints()+(meta.points||0)){
    return Math.max(0,Math.floor(Math.max(0,Number(total)||0)/9));
  }''',
'''  function db0633PrestigeOfferPoints(total=allocatedTalentPoints()+(meta.points||0)){return dbProgression.prestigeOffer(total);}''','Prestige offer adapter')

dice=regex_once(dice,r'''  function v27CompletePrestigeNoChoice\(total\)\{const rewards=db0633PrestigeOfferPoints\(total\),remainder=total%9;if\(rewards<1\)return false;meta\.prestige=DB_PRESTIGE\.award\(meta\.prestige,rewards\);meta\.purchased=\{\};meta\.level=1;meta\.xp=0;meta\.xpNext=legacyXpForLevel\(1\);meta\.points=remainder;pendingPrestige=null;pendingPrestigeKeepIds=new Set\(\);\$\('prestigeHeirloomOverlay'\)\?\.classList\.add\('hidden'\);if\(v24StorageUnlocked\?\.\(\)\)\{v24SyncStorage\?\.\(\);const cap=getHeirloomSlots\(\);meta\.heirlooms=\(meta\.heirlooms\|\|\[\]\)\.slice\(0,cap\)\.map\(normalizeSavedItem\);\}else meta\.heirlooms=\(meta\.heirlooms\|\|\[\]\)\.slice\(0,getHeirloomSlots\(\)\)\.map\(normalizeSavedItem\);saveMeta\(\);checkDynamicClassUnlocks\(\);sfx\.holy\(\);showToast\(`Prestige gained \$\{rewards\} unspent Prestige Point\$\{rewards===1\?'':'s'\}`\);renderTalents\(\);updateMetaUI\(\);openStartScreen\(\);return true;\}''',
'''  function v27CompletePrestigeNoChoice(total){return dbProgression.completePrestige(total);}''','final Prestige reset adapter')
DICE.write_text(dice,encoding='utf-8',newline='\n')

oracle=ORACLE.read_text(encoding='utf-8')
oracle=replace_once(oracle,"document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundProgressionOracleTest&&!!window.DiceboundRng&&!!window.DiceboundPrestige","document.readyState==='complete'&&!!window.DiceboundRunResumeTest&&!!window.DiceboundProgressionOracleTest&&!!window.DiceboundRng&&!!window.DiceboundPrestige&&!!window.DiceboundProgression",'Progression oracle owner readiness')
ORACLE.write_text(oracle,encoding='utf-8',newline='\n')

OWNER_TEST.write_text(r'''#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const lifecycle=fs.readFileSync(path.join(root,"runtime/js/progression/lifecycle.js"),"utf8");
const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"runtime/js/module-manifest.json"),"utf8"));
const entry=manifest.modules.find(module=>module.id==="progression-lifecycle");
assert.ok(entry,"progression-lifecycle manifest owner is missing");
assert.deepEqual(entry.provides,["DiceboundProgression"]);
assert.match(lifecycle,/owner:OWNER,apiVersion:1/);
for(const adapter of [
  "const talentRank=id=>dbProgression.talentRank(id);",
  "function gameplayTalentRank(id){return dbProgression.gameplayTalentRank(id);}",
  "function grantLegacyXp(amount){return dbProgression.grantLegacyXp(amount);}",
  "function finalizeRun(){return dbProgression.finalizeRun();}",
  "function allocatedTalentPoints(){return dbProgression.allocatedTalentPoints();}",
  "function talentAvailable(t){return dbProgression.talentAvailable(t);}",
  "function purchaseTalentNode(id){return dbProgression.purchaseTalent(id);}",
  "function v27CompletePrestigeNoChoice(total){return dbProgression.completePrestige(total);}"
])assert.ok(monolith.includes(adapter),`missing thin Progression adapter: ${adapter}`);
for(const shadow of [
  "const talentRank=id=>Math.max(0,Number(meta.purchased[id])||0);",
  "function gameplayTalentRank(id){const source=runTalentSnapshot||meta.purchased||{};",
  "meta.xp+=amount;\n    while(meta.xp>=meta.xpNext)",
  "const travelAward=Math.max(0,Math.round(tilesMovedThisRun*(1+player.legacyXpBonus)))",
  "function v27CompletePrestigeNoChoice(total){const rewards="
])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);
console.log("Progression owner PASS: Talent/Legacy/final Prestige semantics route through DiceboundProgression.");
''',encoding='utf-8',newline='\n')

print('Progression Talent/Legacy/Prestige ownership slice staged.')
