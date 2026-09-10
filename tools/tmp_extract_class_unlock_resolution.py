#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONO=ROOT/'runtime/js/dicebound.js'
REGISTRY=ROOT/'runtime/js/classes/registry.js'
RULES=ROOT/'runtime/js/progression/class-unlock-rules.js'
TEST0631=ROOT/'tools/test_0631_progression_slime_gear.js'


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one occurrence, found {count}')
    return text.replace(old,new,1)


def cut_between(text,start,end,label,keep_end=True):
    a=text.find(start)
    if a<0: raise SystemExit(f'{label}: start marker missing')
    b=text.find(end,a+len(start))
    if b<0: raise SystemExit(f'{label}: end marker missing')
    return text[:a]+(text[b:] if keep_end else text[b+len(end):])

text=MONO.read_text(encoding='utf-8')

# Wire the existing extracted owner once near the other core domain services.
text=replace_once(text,
'''  const DB_PRESTIGE=window.DiceboundPrestige;\n  if(!DB_PRESTIGE)throw new Error("DiceboundPrestige must load before dicebound.js");\n''',
'''  const DB_PRESTIGE=window.DiceboundPrestige;\n  if(!DB_PRESTIGE)throw new Error("DiceboundPrestige must load before dicebound.js");\n  const DB_CLASS_UNLOCK_RULES=window.DiceboundClassUnlockRules;\n  if(!DB_CLASS_UNLOCK_RULES)throw new Error("DiceboundClassUnlockRules must load before dicebound.js");\n''','class unlock owner wiring')

# Keep persistence/feedback as composition, but move all commit eligibility into
# class-unlock-rules. Bloodmage's historical legacy flag / no-standard-toast
# transaction is preserved exactly here as transaction behavior, not policy.
text=replace_once(text,
'''  function unlockClass(id){\n    if(!CLASSES[id]||meta.unlocks?.[id])return false;\n    meta.unlocks=meta.unlocks||{};meta.unlocks[id]=true;saveMeta();\n    const cls=CLASSES[id],unlockFeedback=window.DiceboundClassUnlockFeedback?.onClassUnlocked?.(id);if(gameStarted)addLog(`<b>Class unlocked:</b> ${cls.icon} ${cls.name}!`);showToast(unlockFeedback?.toast||`NEW CLASS UNLOCKED · ${cls.icon} ${cls.name}`,3400,true);renderClassChoices();return true;\n  }\n''',
'''  function commitClassUnlock(id){\n    if(id==="bloodmage"){meta.bloodmageUnlocked=true;meta.unlocks=meta.unlocks||{};meta.unlocks.bloodmage=true;saveMeta();renderClassChoices();return true;}\n    if(!CLASSES[id]||meta.unlocks?.[id])return false;\n    meta.unlocks=meta.unlocks||{};meta.unlocks[id]=true;saveMeta();\n    const cls=CLASSES[id],unlockFeedback=window.DiceboundClassUnlockFeedback?.onClassUnlocked?.(id);if(gameStarted)addLog(`<b>Class unlocked:</b> ${cls.icon} ${cls.name}!`);showToast(unlockFeedback?.toast||`NEW CLASS UNLOCKED · ${cls.icon} ${cls.name}`,3400,true);renderClassChoices();return true;\n  }\n  function unlockClass(id){if(!DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,dbClassUnlockContext()))return false;return commitClassUnlock(id);}\n''','unlock transaction adapter')

# The old broad isClassUnlocked Slime policy becomes a thin rules-owner adapter.
text=replace_once(text,
'''  function isClassUnlocked(id){\n    if(meta.unlocks?.[id])return true;\n    if(id==="slime")return Object.keys(CLASSES).filter(k=>!PUBLIC_SLIME_EXEMPT.has(k)&&!CLASSES[k].secret).every(baseClassUnlocked);\n    return baseClassUnlocked(id);\n  }\n''',
'''  function isClassUnlocked(id){return DB_CLASS_UNLOCK_RULES.isUnlocked(id,dbClassUnlockContext());}\n''','isClassUnlocked adapter')

# Replace the first historical policy implementation with explicit context and
# thin adapters. Function declarations referenced here are hoisted; the runtime
# continues to supply current state and board-clear semantics as composition.
old='''  function baseClassUnlocked(id){\n    if(id==="ranger")return true;if(meta.unlocks?.[id])return true;\n    if(id==="rouge")return (meta.prestige?.count||0)>=10;\n    if(id==="berserker")return (meta.damageTaken||0)>=1000;\n    if(id==="d20")return (meta.pets?.neutral?.level||1)>=30;\n    if(id==="ceo")return false;if(id==="merchant")return (meta.merchantKills||0)>=5;\n    return false;\n  }\n  function checkDynamicClassUnlocks(){\n    if((meta.pets?.neutral?.level||1)>=30)unlockClass("d20");\n    if(gameStarted&&player.defense>40)unlockClass("turtle");\n    if(gameStarted&&player.doubleStrike>=1.5)unlockClass("frog");\n    if(gameStarted&&player.lifeSteal>1)unlockClass("vampire");\n    if(gameStarted&&player.crit>1)unlockClass("ninja");\n    if(gameStarted&&player.bossDamage>=1.5)unlockClass("ceo");\n    if((meta.prestige?.count||0)>=10)unlockClass("rouge");\n    if((meta.damageTaken||0)>=1000)unlockClass("berserker");\n    if((meta.merchantKills||0)>=5)unlockClass("merchant");\n    if(Object.keys(CLASSES).filter(k=>!PUBLIC_SLIME_EXEMPT.has(k)&&!CLASSES[k].secret).every(baseClassUnlocked))unlockClass("slime");\n  }\n'''
new='''  function dbClassUnlockFacts(){meta.classUnlockFacts=DB_CLASS_UNLOCK_RULES.normalizeFacts(meta.classUnlockFacts||{});return meta.classUnlockFacts;}\n  function dbClassUnlockContext(){\n    const stats=ensureAlphaMeta(),facts=dbClassUnlockFacts(),petIds=Object.keys(PETS),petLevels={},petUnlocked={},classIds=Object.keys(CLASSES),classSecret={};\n    petIds.forEach(id=>{petLevels[id]=meta.pets?.[id]?.level||1;petUnlocked[id]=!!meta.pets?.[id]?.unlocked;});\n    classIds.forEach(id=>classSecret[id]=!!CLASSES[id]?.secret);\n    const currentPlayer=player||{};\n    return {\n      classIds,classSecret,persistedUnlocks:meta.unlocks||{},bloodmageUnlocked:!!meta.bloodmageUnlocked,\n      prestigeCount:Number(meta.prestige?.count)||0,damageTaken:Number(meta.damageTaken)||0,merchantKills:Number(meta.merchantKills)||0,\n      stats:{healingDone:Number(stats.healingDone)||0,highestGold:Number(stats.highestGold)||0,potionsUsed:Number(stats.potionsUsed)||0},\n      storedHighestGold:Number(stats.highestGold)||0,highestGold:Math.max(Number(stats.highestGold)||0,gameStarted?(Number(currentPlayer.gold)||0):0),facts,\n      petIds,petLevels,petUnlocked,beastmasterNightmareBoard5:!!meta.beastmasterNightmareBoard5,gameStarted:!!gameStarted,\n      player:{gold:Number(currentPlayer.gold)||0,defense:Number(currentPlayer.defense)||0,doubleStrike:Number(currentPlayer.doubleStrike)||0,lifeSteal:Number(currentPlayer.lifeSteal)||0,crit:Number(currentPlayer.crit)||0,bossDamage:Number(currentPlayer.bossDamage)||0},\n      hasBoardClear:(classId,board)=>hasBoardClear(classId,board)\n    };\n  }\n  function baseClassUnlocked(id){return DB_CLASS_UNLOCK_RULES.isBaseUnlocked(id,dbClassUnlockContext());}\n  function checkDynamicClassUnlocks(){\n    const observed=DB_CLASS_UNLOCK_RULES.recordObservedProgress(dbClassUnlockContext());\n    if(observed.changed){const stats=ensureAlphaMeta();stats.highestGold=observed.highestGold;meta.classUnlockFacts=observed.facts;}\n    DB_CLASS_UNLOCK_RULES.resolveDynamic({getContext:()=>dbClassUnlockContext(),unlock:id=>unlockClass(id)});\n    if(observed.changed)saveMeta();\n  }\n'''
text=replace_once(text,old,new,'base/dynamic rules adapters')

# Remove the Alpha-v1 direct replacement: its final behavior now lives in the
# extracted owner. Preserve the following class-copy tweaks.
start='''  baseClassUnlocked=function(id){\n    ensureAlphaMeta();if(id==="ranger")return true;'''
end='''  CLASSES.ceo.unlock="Secret: reach 300% Boss Damage";'''
text=cut_between(text,start,end,'Alpha v1 unlock replacement')

# Bloodmage wrapper semantics were folded into isUnlocked + commitClassUnlock.
text=cut_between(text,
'''  const isClassUnlockedV11=isClassUnlocked;''',
'''  const portraitPalette={''','Bloodmage unlock wrappers')

# Summoner / Pokemon Trainer policy is now owned by class-unlock-rules.
text=cut_between(text,
'''  function petLevel10Count(){return Object.values(meta.pets||{}).filter(p=>(p?.level||1)>=10).length;}''',
'''  // ---- Defense becomes diminishing percentage reduction''','Summoner/Pokemon unlock wrappers')

# Historical Alchemist 100 wrapper.
text=cut_between(text,
'''  const baseClassUnlockedV16=baseClassUnlocked;''',
'''  function v16PotionHealValue''','Alchemist 100 unlock wrappers')

# Ouroboros base/dynamic wrapper pair.
text=cut_between(text,
'''  // ---- Dynamic secret unlock and class-selection clarity -------------------''',
'''  const classPortraitV18Base=classPortraitSVG;''','Ouroboros unlock wrappers')

# Duplicate CEO dynamic wrapper; the exact >=3 rule lives in resolveDynamic.
text=cut_between(text,
'''  const checkDynamicClassUnlocksV19Base=checkDynamicClassUnlocks;''',
'''  // ---- Gear point budgets''','CEO unlock wrapper')

# Alpha v2 Alchemist 50 wrapper. Later final display text is preserved below.
text=cut_between(text,
'''  const alchemistRequirement=50;''',
'''  generatePhilosophersStone=function''','Alchemist 50 unlock wrappers')

# Beta-v0.4 Alchemist 25 + Slime Rouge base wrapper.
text=cut_between(text,
'''  /* ALCHEMIST: REAL PLAYTEST PACING --------------------------------------- */''',
'''  /* HEAVY PURSE / VAMPIRIC EDGE ------------------------------------------- */''','Alchemist 25 / Slime Rouge base wrappers')

# Slime Rouge's persisted-only rule is part of the central resolver now.
text=cut_between(text,
'''  const isClassUnlockedV28Base=isClassUnlocked;''',
'''  /* SLIME ROUGE 3.1.8 — real random identity + real borrowed ultimate ------- */''','Slime Rouge isClassUnlocked wrapper')

# First final 15-potion wrapper: retain only the final shipped player-facing text.
start='''  // Alchemist should unlock much earlier and the UI should say so.\n  if(CLASSES.alchemist){CLASSES.alchemist.unlock='Use 15 potions in total';}\n  const db046BaseClassUnlocked=baseClassUnlocked;'''
end='''  if(window.DiceboundV16Debug?.prepareAlchemist)'''
a=text.find(start)
if a<0: raise SystemExit('Alchemist 15 db046 block start missing')
b=text.find(end,a)
if b<0: raise SystemExit('Alchemist 15 db046 block end missing')
text=text[:a]+'''  // Alchemist's final shipped unlock copy is presentation only; resolution lives in class-unlock-rules.\n  if(CLASSES.alchemist)CLASSES.alchemist.unlock='Use 15 potions across all runs';\n''' + text[b:]

# Second final 15-potion wrapper is fully superseded.
text=cut_between(text,
'''  // --- alchemist requirement hard override ---------------------------------''',
'''  // --- board pass: make the climb smoother and Board 5 > Board 4 ----------''','Alchemist db047 unlock wrappers')

# Replace the 0.6.3.1 compatibility policy bridge with only the non-unlock module
# prerequisites, final presentation copy, and the historical initial scan.
start='''  /* BETA 0.6.3.1 — class progression, Slime ownership, neutral ordinary gear */'''
end='''  /* BETA 0.6.3.3 — #109 progressive Camp reveals.'''
a=text.find(start)
if a<0: raise SystemExit('0.6.3.1 bridge start missing')
b=text.find(end,a)
if b<0: raise SystemExit('0.6.3.1 bridge end missing')
replacement='''  /* BETA 0.6.6.22 — class-unlock policy now resolves in progression/class-unlock-rules.js. */\n  if(!window.DiceboundPowerupBorrowing||!window.DiceboundEquipment?.pickOrdinaryAffix)throw new Error('Progression/equipment rule modules must load before dicebound.js');\n  if(CLASSES.pokemontrainer)CLASSES.pokemontrainer.unlock='Secret: raise every companion to level 10 and clear Board 5 with Beastmaster on any difficulty';\n  if(CLASSES.rogue)CLASSES.rogue.unlock='Hold 5,000 gold at one time and defeat the Board 3 miniboss';\n  if(CLASSES.merchant)CLASSES.merchant.unlock='Defeat the Road Merchant secret boss once';\n  if(CLASSES.slime)CLASSES.slime.unlock='Unlock 10 classes in total';\n  if(CLASSES.vampire)CLASSES.vampire.unlock='Exceed 100% Lifesteal and defeat the Board 3 final boss';\n  checkDynamicClassUnlocks();\n\n'''
text=text[:a]+replacement+text[b:]

# Composition callbacks should reference the authoritative owner directly.
text=text.replace('db0631Rules.recordCombatFacts','DB_CLASS_UNLOCK_RULES.recordCombatFacts')
text=text.replace('db0631Rules.recordManaSpenderCast','DB_CLASS_UNLOCK_RULES.recordManaSpenderCast')
text=text.replace('db0631Facts()','dbClassUnlockFacts()')

# Reconcile the rules owner's legacy public-Slime candidate calculation so the
# policy does not depend on PUBLIC_SLIME_EXEMPT living in the monolith.
rules=RULES.read_text(encoding='utf-8')
rules=replace_once(rules,
'''  const TARGET_ID_SET=new Set(TARGET_IDS);\n''',
'''  const TARGET_ID_SET=new Set(TARGET_IDS);\n  const LEGACY_PUBLIC_SLIME_EXEMPT=new Set(["slime","d20","ceo","merchant"]);\n''','rules Slime legacy constants')
rules=replace_once(rules,
'''  function legacyPublicSlimeReady(ctx={}){\n    const ids=Array.isArray(ctx.publicSlimeCandidateIds)?ctx.publicSlimeCandidateIds:[];\n    return ids.every(id=>isBaseUnlocked(id,ctx));\n  }\n''',
'''  function legacyPublicSlimeReady(ctx={}){\n    const ids=Array.isArray(ctx.publicSlimeCandidateIds)?ctx.publicSlimeCandidateIds:(Array.isArray(ctx.classIds)?ctx.classIds.filter(id=>!LEGACY_PUBLIC_SLIME_EXEMPT.has(id)&&!ctx.classSecret?.[id]):[]);\n    return ids.every(id=>isBaseUnlocked(id,ctx));\n  }\n''','rules legacy public Slime resolver')
RULES.write_text(rules,encoding='utf-8')

# Registry metadata follows the actual shipped resolver so reveal/help copy no
# longer advertises historical thresholds.
registry=REGISTRY.read_text(encoding='utf-8')
registry=replace_once(registry,'"unlock": "Prestige once"','"unlock": "Reach 10 Prestige points"','Rouge unlock copy')
registry=replace_once(registry,'"unlock": "Use 25 potions across all runs"','"unlock": "Use 15 potions across all runs"','Alchemist unlock copy')
registry=replace_once(registry,'rouge:{type:"prestige",count:1}','rouge:{type:"prestige",count:10}','Rouge unlock metadata')
registry=replace_once(registry,'alchemist:{type:"lifetimeStat",stat:"potionsUsed",minimum:25}','alchemist:{type:"lifetimeStat",stat:"potionsUsed",minimum:15}','Alchemist unlock metadata')
REGISTRY.write_text(registry,encoding='utf-8')

# Existing 0.6.3.1 regression now asserts the new owner wiring rather than the
# retired compatibility bridge names.
test=TEST0631.read_text(encoding='utf-8')
test=test.replace('assert(mono.includes("db0631RecordObservedProgress"),"0.6.3.1 progression wiring missing");','assert(mono.includes("DB_CLASS_UNLOCK_RULES.recordObservedProgress"),"authoritative class unlock progression wiring missing");')
test=test.replace('assert(mono.includes("getClassUnlockFacts:()=>db0631Facts()"),"Victory composition does not expose current class-unlock facts");','assert(mono.includes("getClassUnlockFacts:()=>dbClassUnlockFacts()"),"Victory composition does not expose current class-unlock facts");')
test=test.replace('assert(mono.includes("recordCombatFacts:(facts,payload)=>db0631Rules.recordCombatFacts(facts,payload)"),"Victory composition does not route combat facts through class-unlock rules");','assert(mono.includes("recordCombatFacts:(facts,payload)=>DB_CLASS_UNLOCK_RULES.recordCombatFacts(facts,payload)"),"Victory composition does not route combat facts through class-unlock rules");')
TEST0631.write_text(test,encoding='utf-8')

# Architecture boundary assertions before writing the monolith.
retired=[
 'baseClassUnlocked=function','isClassUnlocked=function','unlockClass=function','checkDynamicClassUnlocks=function',
 'baseClassUnlockedV15Patch','baseClassUnlockedV16','baseClassUnlockedV18Base','baseClassUnlockedV110','baseClassUnlockedV28Base',
 'db046BaseClassUnlocked','db047BaseClassUnlocked','checkDynamicClassUnlocksV15Patch','checkDynamicClassUnlocksV16','checkDynamicClassUnlocksV18Base',
 'checkDynamicClassUnlocksV19Base','checkDynamicClassUnlocksV110','checkDynamicClassUnlocksV28Base','db046CheckDynamicClassUnlocks','db047CheckDynamicClassUnlocks',
 'db0631RuleEligible','db0631EligibleWithoutSlime','db0631TargetIds','db0631RecordObservedProgress','db0631CheckDynamicBase','db0631UnlockClassBase','db0631IsClassUnlockedBase',
 'isClassUnlockedV11','unlockClassV11','isClassUnlockedV28Base','DB047_ALCHEMIST_REQUIREMENT','V28_ALCHEMIST_REQUIREMENT'
]
for token in retired:
    if token in text: raise SystemExit(f'retired unlock ownership still present: {token}')
for required in [
 'function baseClassUnlocked(id){return DB_CLASS_UNLOCK_RULES.isBaseUnlocked(id,dbClassUnlockContext());}',
 'function isClassUnlocked(id){return DB_CLASS_UNLOCK_RULES.isUnlocked(id,dbClassUnlockContext());}',
 'function unlockClass(id){if(!DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,dbClassUnlockContext()))return false;return commitClassUnlock(id);}',
 'DB_CLASS_UNLOCK_RULES.resolveDynamic({getContext:()=>dbClassUnlockContext(),unlock:id=>unlockClass(id)})'
]:
    if required not in text: raise SystemExit(f'missing thin class unlock adapter: {required}')

MONO.write_text(text,encoding='utf-8')
print(f'class unlock extraction transformed dicebound.js -> {MONO.stat().st_size} bytes / {len(text.splitlines())} lines')
