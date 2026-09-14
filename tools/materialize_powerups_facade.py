#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
MANIFEST=ROOT/'runtime/js/module-manifest.json'
INDEX=ROOT/'runtime/index.html'
PROJECT=ROOT/'wrapper-source/config/project.json'
TEST=ROOT/'tools/test_powerups_facade.js'

source=MONOLITH.read_text(encoding='utf-8')

def replace_once(old:str,new:str,label:str):
    global source
    count=source.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one exact match, found {count}')
    source=source.replace(old,new,1)

def regex_once(pattern:str,repl:str,label:str,flags=re.S):
    global source
    source2,count=re.subn(pattern,repl,source,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'{label}: expected one regex match, found {count}')
    source=source2

# Bind the public subsystem before ordinary runtime composition.
replace_once(
'''  const dbProgressionOwner=window.DiceboundProgression;\n  if(!dbProgressionOwner)throw new Error("dicebound.js requires DiceboundProgression before loading.");\n  let dbProgression=null;\n''',
'''  const dbProgressionOwner=window.DiceboundProgression;\n  if(!dbProgressionOwner)throw new Error("dicebound.js requires DiceboundProgression before loading.");\n  let dbProgression=null;\n  const dbPowerups=window.DiceboundPowerups;\n  if(!dbPowerups)throw new Error("dicebound.js requires DiceboundPowerups before loading.");\n''',
'Powerups facade binding')

# Registry construction is now composed through the public owner.
replace_once(
'''  const DB317_POWERUPS_RAW=window.DiceboundPowerupRegistry?.createRegistry(DB_POWERUP_SERVICES);\n  if(!DB317_POWERUPS_RAW)throw new Error("DiceboundPowerupRegistry must load before dicebound.js");\n''',
'''  const DB317_POWERUPS_RAW=dbPowerups.createRegistry(DB_POWERUP_SERVICES);\n  if(!DB317_POWERUPS_RAW)throw new Error("DiceboundPowerups must provide the powerup registry before dicebound.js");\n''',
'registry composition route')

# Core policy collaborators. Class-specific capability checks stay in the
# compatibility runtime; Powerups owns the decision/order using those ports.
anchor='  function achievementGateUnlocked(gate){return dbProgression.achievementGateUnlocked(gate);}\n'
if source.count(anchor)!=1:
    raise SystemExit('Powerups configure anchor missing or duplicated')
config='''  function achievementGateUnlocked(gate){return dbProgression.achievementGateUnlocked(gate);}\n  dbPowerups.configure({\n    getPlayer:()=>player,getMeta:()=>meta,getRarityInfo:()=>rarityInfo,achievementGateUnlocked:gate=>achievementGateUnlocked(gate),\n    slimeIdentityActive:()=>classIdentityActive("slime"),\n    slimePowerCompatible:u=>{const unlocked=["slime",...Object.keys(CLASSES).filter(id=>id!=="slime"&&isClassUnlocked(id))],tags=inferUpgradeTags(u),caps=new Set(classMechanicsFor("slime"));return dbPowerups.ownershipAllowed(u,"slime",unlocked)&&!tags.includes("ultimate")&&db32PowerMechanicsCompatible(u,caps);},\n    slimeRougePowerCompatible:u=>v318SlimeRougePowerCompatible(u),\n    filterPowerupPoolForLuck:(pool,luck)=>DB_RARITIES.filterPowerupPoolForLuck?.(pool,luck),\n    getBoardLevel:()=>boardLevel,currentTileCount:()=>currentTileCount(),random:()=>random(),rand:(min,max)=>rand(min,max),pick:list=>pick(list),clamp:(value,min,max)=>clamp(value,min,max),\n    classIdentityActive:id=>classIdentityActive(id),hasLegendaryEffect:id=>db060HasEffect(id),saveMeta:()=>saveMeta(),addLog:html=>addLog(html),showToast:(...args)=>showToast(...args),\n    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),recordRunBuff:(...args)=>recordRunBuff(...args),recordPowerupTaken:()=>{ensureAlphaMeta().powerupsTaken++;saveMeta();},syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),\n    isNightmare:()=>!!nightmareMode,isHell:()=>!!hellMode,isGameStarted:()=>!!gameStarted\n  });\n'''
source=source.replace(anchor,config,1)

# Effective eligibility is owned by the facade. Retire every historical
# monolith redefinition/wrapper while keeping one tiny compatibility adapter.
regex_once(
 r'  function eligibleUpgrades\(filter=\(\)=>true\)\{.*?\}\n\n  function dbClassUnlockFacts',
 '  function eligibleUpgrades(filter=()=>true){return dbPowerups.eligible(filter);}\n\n  function dbClassUnlockFacts',
 'initial eligibility implementation')
regex_once(
 r'^  eligibleUpgrades=function\(filter=\(\)=>true\)\{return upgrades\.filter\(u=>\{const classOk=.*?\}\);\};$',
 '  // Powerup eligibility is owned by DiceboundPowerups.',
 'late ordinary eligibility override',re.M)
regex_once(
 r'  eligibleUpgrades=function\(filter=\(\)=>true\)\{return upgrades\.filter\(u=>\{let classOk=.*?\}\);\};\n\n  // ---- core class identity hooks',
 '  // Slime borrowing eligibility is owned by DiceboundPowerups.\n\n  // ---- core class identity hooks',
 'Slime eligibility override')
regex_once(
 r'  const eligibleUpgradesV28Base=eligibleUpgrades;\n  eligibleUpgrades=function\(filter=\(\)=>true\)\{\n    if\(player\.classId!==\'slimerouge\'\)return eligibleUpgradesV28Base\(filter\);\n    return upgrades\.filter\(u=>v318SlimeRougePowerCompatible\(u\)&&achievementGateUnlocked\(u\.achievementGate\)&&\(!u\.unique\|\|!\(player\.upgradeCounts\?\.\[u\.id\]\)\)&&filter\(u\)\);\n  \};',
 '  // Slime Rouge Powerup eligibility is owned by DiceboundPowerups.',
 'Slime Rouge eligibility wrapper')
source=source.replace('window.DiceboundPowerupBorrowing.ownershipAllowed','dbPowerups.ownershipAllowed')

# Application ordering (D20 -> base apply -> career/save -> Ouro sync -> Sword
# and Shield cross-feed) is moved intact into the facade.
regex_once(
 r'  function applyUpgrade\(up,source="Powerup"\)\{.*?\n  \}\n  function weightedUpgrade\(pool\)\{',
 '  function applyUpgrade(up,source="Powerup"){return dbPowerups.apply(up,source);}\n  function weightedUpgrade(pool){',
 'base Powerup application')
replace_once(
 '  const applyUpgradeV15=applyUpgrade;applyUpgrade=function(up,source="Powerup"){const result=applyUpgradeV15(up,source);ensureAlphaMeta().powerupsTaken++;saveMeta();return result;};\n',
 '  // Powerup career accounting/save ordering is owned by DiceboundPowerups.\n',
 'v15 Powerup application wrapper')
replace_once(
 '  const applyUpgradeV27Base=applyUpgrade;applyUpgrade=function(up,source){const r=applyUpgradeV27Base(up,source);v27SyncOuroborosEconomy();return r;};\n',
 '  // Ouroboros post-Powerup economy sync is owned by DiceboundPowerups.\n',
 'v27 Powerup application wrapper')
replace_once(
 '  const db060ApplyUpgradeBase=applyUpgrade;\n  applyUpgrade=function(up,source){const active=db060HasEffect(\'sword_and_shield\'),a0=player.attack,d0=player.defense,r=db060ApplyUpgradeBase(up,source);if(active){const a=Math.max(0,player.attack-a0),d=Math.max(0,player.defense-d0);if(a>0)player.defense+=a;if(d>0)player.attack+=d;if(a||d){addLog(`<b>⚔️🛡️ Sword and Shield:</b> converts the upgrade into +${d} Attack and +${a} Defense.`);showToast(\'⚔️🛡️ Sword and Shield\');}}return r;};\n',
 '  // Sword-and-Shield Powerup cross-feed is owned by DiceboundPowerups.\n',
 '0.6 Sword-and-Shield application wrapper')

# Weighted selection is the final v24 curve plus v26 high-Luck filtering.
regex_once(
 r'  function weightedUpgrade\(pool\)\{.*?\n  \}\n  function getUpgradeChoices',
 '  function weightedUpgrade(pool){return dbPowerups.weighted(pool);}\n  function getUpgradeChoices',
 'base weighted selection')
regex_once(
 r'weightedUpgrade=function\(pool\)\{const weighted=pool\.map\(up=>\{let weight=rarityInfo\[up\.rarity\]\.weight.*?return weighted\[weighted\.length-1\]\.up;\};',
 'weightedUpgrade=function(pool){return dbPowerups.weighted(pool);};',
 'v15 weighted override')
regex_once(
 r'  weightedUpgrade=function\(pool\)\{\n    const order=\{poor:0,common:1,uncommon:2,rare:3,epic:4,legendary:5,artifact:6,mythical:7,omega:8\};.*?\n  \};',
 '  weightedUpgrade=function(pool){return dbPowerups.weighted(pool);};',
 'v24 weighted override')
replace_once(
 "  const weightedUpgradeV26Base=weightedUpgrade;weightedUpgrade=function(pool){const eligible=DB_RARITIES.filterPowerupPoolForLuck?.(pool,player.luck);return weightedUpgradeV26Base(Array.isArray(eligible)&&eligible.length?eligible:pool);};\n",
 "  // High-Luck Powerup pool filtering is owned by DiceboundPowerups.\n",
 'v26 weighted wrapper')
regex_once(
 r'  function getUpgradeChoices\(filter=\(\)=>true\)\{.*?\n  \}',
 '  function getUpgradeChoices(filter=()=>true){return dbPowerups.choices(filter,3);}',
 'three-choice selector')
regex_once(
 r'  function applyRandomHighRarity\(source="Sealed Relic",announce=true\)\{.*?\n  \}',
 '  function applyRandomHighRarity(source="Sealed Relic",announce=true){return dbPowerups.applyRandomHighRarity(source,announce);}',
 'high-rarity reward')

# Bonus level choice count and Legendary/miniboss policy become facade adapters.
regex_once(
 r'  function v18LevelChoices\(\)\{\n    const count=.*?return choices;\n  \}',
 '  function v18LevelChoices(){return dbPowerups.levelChoices();}',
 'v18 level choices')
replace_once(
 '  function v17LegendaryPool(){return eligibleUpgrades(u=>u.rarity==="legendary");}\n  function v17LegendaryChoices(){const pool=[...v17LegendaryPool()],out=[];while(pool.length&&out.length<3){const i=rand(0,pool.length-1);out.push(pool.splice(i,1)[0]);}return out;}\n',
 '  function v17LegendaryPool(){return dbPowerups.eligible(u=>u.rarity==="legendary");}\n  function v17LegendaryChoices(){return dbPowerups.legendaryChoices();}\n',
 'v17 Legendary selection')
replace_once(
 "  function db0410LegendaryChoices(){const pool=[...eligibleUpgrades(u=>u.rarity==='legendary')],out=[];while(pool.length&&out.length<3){const i=rand(0,pool.length-1);out.push(pool.splice(i,1)[0]);}return out;}\n",
 "  function db0410LegendaryChoices(){return dbPowerups.legendaryChoices();}\n",
 'Sovereign Legendary selection')
replace_once(
 "  function v27FallbackRarityPool(wanted){const order=['legendary','epic','rare','uncommon','common','poor'],start=Math.max(0,order.indexOf(wanted));for(let i=start;i<order.length;i++){const pool=eligibleUpgrades(u=>u.rarity===order[i]);if(pool.length)return {rarity:order[i],pool};}for(let i=start-1;i>=0;i--){const pool=eligibleUpgrades(u=>u.rarity===order[i]);if(pool.length)return {rarity:order[i],pool};}return {rarity:null,pool:[]};}\n",
 "  function v27FallbackRarityPool(wanted){return dbPowerups.fallbackRarityPool(wanted);}\n",
 'rarity fallback')
replace_once(
 "  function beta03MinibossBaseTable(level=boardLevel){return level<=1?{legendary:.08,epic:.32,rare:.76,uncommon:.95}:level===2?{legendary:.14,epic:.58,rare:.86,uncommon:.97}:{legendary:.22,epic:.58,rare:.86,uncommon:.97};}\n  function beta03MinibossOddsText(level=boardLevel){return level<=1?'8% Legendary · 24% Epic · 44% Rare · 19% Uncommon · 5% Common':level===2?'14% Legendary · 44% Epic · 28% Rare · 11% Uncommon · 3% Common':'22% Legendary · 36% Epic · 28% Rare · 11% Uncommon · 3% Common';}\n  function v27RollMinibossRarity(){const luck=Math.min(.12,Math.max(0,player.luck||0)*.025),bonus=(nightmareMode?.04:0)+(hellMode?.05:0),p=random(),t=beta03MinibossBaseTable();if(p<t.legendary+luck+bonus)return 'legendary';if(p<t.epic+luck+bonus)return 'epic';if(p<t.rare+luck*.5)return 'rare';if(p<t.uncommon)return 'uncommon';return 'common';}\n  function v27MinibossChoices(){const count=Math.max(3,3+(player.levelChoiceBonus||0)),out=[],used=new Set();for(let i=0;i<count;i++){let wanted=v27RollMinibossRarity(),found=v27FallbackRarityPool(wanted),pool=found.pool.filter(u=>!used.has(u.id));if(!pool.length)pool=found.pool;if(!pool.length)break;const u=pick(pool);used.add(u.id);out.push(u);}return out;}\n",
 "  function beta03MinibossBaseTable(level=boardLevel){return dbPowerups.minibossBaseTable(level);}\n  function beta03MinibossOddsText(level=boardLevel){return dbPowerups.minibossOddsText(level);}\n  function v27RollMinibossRarity(){return dbPowerups.rollMinibossRarity();}\n  function v27MinibossChoices(){return dbPowerups.minibossChoices();}\n",
 'miniboss Powerup policy')

# Cross-subsystem callers now consume the public Powerups boundary.
source=source.replace('eligibleUpgrades:filter=>eligibleUpgrades(filter),','eligibleUpgrades:filter=>dbPowerups.eligible(filter),')
source=source.replace('applyRandomHighRarity:(...args)=>applyRandomHighRarity(...args),','applyRandomHighRarity:(...args)=>dbPowerups.applyRandomHighRarity(...args),')
source=source.replace('applyUpgrade:(...args)=>applyUpgrade(...args),','applyUpgrade:(...args)=>dbPowerups.apply(...args),')
source=source.replace('fallbackRarityPool:wanted=>v27FallbackRarityPool(wanted),','fallbackRarityPool:wanted=>dbPowerups.fallbackRarityPool(wanted),')
source=source.replace('getSlotLabel:slot=>SLOT_LABELS[slot],clamp:(value,min,max)=>clamp(value,min,max),eligibleUpgrades:filter=>eligibleUpgrades(filter),','getSlotLabel:slot=>SLOT_LABELS[slot],clamp:(value,min,max)=>clamp(value,min,max),eligibleUpgrades:filter=>dbPowerups.eligible(filter),')
source=source.replace('applyUpgrade:(up,source)=>applyUpgrade(up,source),applyRandomHighRarity:(source,announce)=>applyRandomHighRarity(source,announce)','applyUpgrade:(up,source)=>dbPowerups.apply(up,source),applyRandomHighRarity:(source,announce)=>dbPowerups.applyRandomHighRarity(source,announce)')

# Replace the late monolith-owned public object with UI collaborator wiring.
replace_once(
'''  window.DiceboundPowerups=Object.freeze({\n    openAllEligible:(source='Special Powerup Selection',onComplete=()=>{},filter=()=>true)=>showAllEligiblePowerupSelection(source,onComplete,filter),\n    eligible:()=>eligibleUpgrades().slice(),\n    perfectedSignature:()=>({...perfectedSignatureForCurrentClass(),apply:undefined})\n  });\n''',
'''  dbPowerups.configure({\n    renderLevelUp:onComplete=>openLevelUp(onComplete),\n    renderPowerupChoice:(source,onComplete,filter,subtitle)=>showPowerupChoice(source,onComplete,filter,subtitle),\n    renderLegendaryChoice:(source,onComplete)=>showLegendaryChoice(source,onComplete),\n    renderAllEligible:(source,onComplete,filter)=>showAllEligiblePowerupSelection(source,onComplete,filter),\n    perfectedSignature:()=>({...perfectedSignatureForCurrentClass(),apply:undefined})\n  });\n''',
'late partial DiceboundPowerups global')

# Public/debug bridges use the subsystem boundary where they represent an
# ordinary Powerup operation.
source=source.replace('openLevelUp:done=>openLevelUp(done),','openLevelUp:done=>dbPowerups.openLevelUp(done),')
source=source.replace('showLegendaryChoice:(source,done)=>showLegendaryChoice(source,done),','showLegendaryChoice:(source,done)=>dbPowerups.openLegendary(source,done),')

MONOLITH.write_text(source,encoding='utf-8')

# Authoritative module graph.
data=json.loads(MANIFEST.read_text(encoding='utf-8'))
if 'powerup-facade' not in data['loadOrder']:
    idx=data['loadOrder'].index('powerup-borrowing')+1
    data['loadOrder'].insert(idx,'powerup-facade')
if not any(m['id']=='powerup-facade' for m in data['modules']):
    idx=next(i for i,m in enumerate(data['modules']) if m['id']=='powerup-borrowing')+1
    data['modules'].insert(idx,{
        'id':'powerup-facade','path':'js/powerups/facade.js','domain':'powerups/public-subsystem-facade','status':'extracted',
        'requires':['powerup-registry','powerup-borrowing'],'provides':['DiceboundPowerups']
    })
MANIFEST.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

# Browser and native wrapper script order.
html=INDEX.read_text(encoding='utf-8')
needle='<script src="js/powerups/borrowing.js"></script>\n'
if html.count(needle)!=1: raise SystemExit('runtime/index.html Powerup borrowing script anchor is not unique')
html=html.replace(needle,needle+'<script src="js/powerups/facade.js"></script>\n',1)
INDEX.write_text(html,encoding='utf-8')

project=json.loads(PROJECT.read_text(encoding='utf-8'))
scripts=project.get('runtimeScripts')
if not isinstance(scripts,list): raise SystemExit('wrapper project runtimeScripts missing')
if 'js/powerups/facade.js' not in scripts:
    scripts.insert(scripts.index('js/powerups/borrowing.js')+1,'js/powerups/facade.js')
PROJECT.write_text(json.dumps(project,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

# Extend the focused contract with anti-shadow/caller-boundary assertions for
# the materialized candidate.
test=TEST.read_text(encoding='utf-8')
marker='console.log("Powerups facade owner PASS:'
if marker not in test: raise SystemExit('Powerups facade test completion marker missing')
extra='''\nconst monolith=fs.readFileSync(path.join(root,"runtime","js","dicebound.js"),"utf8");\nconst manifest=JSON.parse(fs.readFileSync(path.join(root,"runtime","js","module-manifest.json"),"utf8"));\nassert.match(monolith,/const dbPowerups=window\\.DiceboundPowerups/);\nassert.doesNotMatch(monolith,/window\\.DiceboundPowerups=Object\\.freeze/);\nassert.doesNotMatch(monolith,/window\\.DiceboundPowerupRegistry/);\nassert.doesNotMatch(monolith,/window\\.DiceboundPowerupBorrowing/);\nfor(const retired of ["applyUpgradeV15","applyUpgradeV27Base","db060ApplyUpgradeBase","weightedUpgradeV26Base","eligibleUpgradesV28Base"])assert.ok(!monolith.includes(retired),`retired Powerup wrapper remains: ${retired}`);\nassert.match(monolith,/eligibleUpgrades:filter=>dbPowerups\\.eligible\\(filter\\)/);\nassert.match(monolith,/applyUpgrade:\\(up,source\\)=>dbPowerups\\.apply\\(up,source\\)/);\nassert.match(monolith,/function applyUpgrade\\(up,source="Powerup"\\)\\{return dbPowerups\\.apply\\(up,source\\);\\}/);\nassert.match(monolith,/function weightedUpgrade\\(pool\\)\\{return dbPowerups\\.weighted\\(pool\\);\\}/);\nconst facadeModule=manifest.modules.find(m=>m.id==="powerup-facade");\nassert.ok(facadeModule);\nassert.deepEqual(facadeModule.requires,["powerup-registry","powerup-borrowing"]);\nassert.deepEqual(facadeModule.provides,["DiceboundPowerups"]);\nassert.ok(manifest.loadOrder.indexOf("powerup-borrowing")<manifest.loadOrder.indexOf("powerup-facade"));\nassert.ok(manifest.loadOrder.indexOf("powerup-facade")<manifest.loadOrder.indexOf("dicebound-monolith"));\n'''
if 'retired Powerup wrapper remains' not in test:
    test=test.replace(marker,extra+'\n'+marker,1)
TEST.write_text(test,encoding='utf-8')

print('Powerups facade candidate materialized: public owner wired, policy adapters drained, callers rerouted')
