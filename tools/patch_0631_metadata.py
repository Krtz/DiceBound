#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(rel, old, new):
    text = read(rel)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"METADATA PATCH FAILED: {rel}: expected 1 match, found {count}: {old[:140]!r}")
    write(rel, text.replace(old, new, 1))


# Core-state owns the clean persisted defaults/normalization for the new career facts.
replace_once(
    "runtime/js/core/state.js",
    '    const defaultSettings=()=>({masterVolume:.70,soundPack:"synth"});\n    const defaultMeta=()=>({level:1,xp:0,xpNext:legacyXpForLevel(1),points:0,runs:0,bestTiles:0,purchased:{},heirlooms:[],pets:defaultPets(),activePet:"neutral",petCookies:0,elementProgress:Object.fromEntries(elementIds.map(id=>[id,0])),damageTaken:0,prestige:defaultPrestige(),nightmareUnlocked:false,settings:defaultSettings(),unlocks:Object.fromEntries(classIds.map(id=>[id,id==="ranger"]))});',
    '    const defaultSettings=()=>({masterVolume:.70,soundPack:"synth"});\n    const defaultClassUnlockFacts=()=>({board3MinibossDefeated:false,board3BossDefeated:false,board4MinibossDefeated:false,beastmasterBoard5Cleared:false,roadMerchantSecretBossDefeated:false,maxLifesteal:0,manaSpenderCasts:0});\n    const defaultMeta=()=>({level:1,xp:0,xpNext:legacyXpForLevel(1),points:0,runs:0,bestTiles:0,purchased:{},heirlooms:[],pets:defaultPets(),activePet:"neutral",petCookies:0,elementProgress:Object.fromEntries(elementIds.map(id=>[id,0])),damageTaken:0,prestige:defaultPrestige(),nightmareUnlocked:false,settings:defaultSettings(),classUnlockFacts:defaultClassUnlockFacts(),unlocks:Object.fromEntries(classIds.map(id=>[id,id==="ranger"]))});',
)
replace_once(
    "runtime/js/core/state.js",
    '      const settings={...defaultSettings(),...(parsed?.settings||{})};\n      settings.masterVolume=clamp(Number(settings.masterVolume),0,1);\n      settings.soundPack=settings.soundPack==="custom"?"custom":"synth";\n      return {...base,...parsed,xpNext:legacyXpForLevel(parsed?.level||1),purchased:normalizePurchased(parsed?.purchased||{}),heirlooms:(parsed?.heirlooms||[]).map(normalizeSavedItem),pets,elementProgress,prestige,unlocks,settings};',
    '      const settings={...defaultSettings(),...(parsed?.settings||{})};\n      const classUnlockFacts={...defaultClassUnlockFacts(),...(parsed?.classUnlockFacts||{})};\n      settings.masterVolume=clamp(Number(settings.masterVolume),0,1);\n      settings.soundPack=settings.soundPack==="custom"?"custom":"synth";\n      return {...base,...parsed,xpNext:legacyXpForLevel(parsed?.level||1),purchased:normalizePurchased(parsed?.purchased||{}),heirlooms:(parsed?.heirlooms||[]).map(normalizeSavedItem),pets,elementProgress,prestige,unlocks,settings,classUnlockFacts};',
)

# Route the compatibility runtime to that top-level career owner rather than nesting facts in legacy lifetime stats.
replace_once(
    "runtime/js/dicebound.js",
    '  function db0631Facts(){\n    const stats=ensureAlphaMeta();stats.classUnlockFacts=db0631Rules.normalizeFacts(stats.classUnlockFacts||{});return stats.classUnlockFacts;\n  }',
    '  function db0631Facts(){\n    meta.classUnlockFacts=db0631Rules.normalizeFacts(meta.classUnlockFacts||{});return meta.classUnlockFacts;\n  }',
)
replace_once(
    "runtime/js/dicebound.js",
    "    const defeated=currentEncounterLead||currentEnemy,board=boardLevel,classId=player.classId,isFinal=!!defeated?.finalBoss||v16CombatKind==='final'||tiles[currentEnemyTile]?.type==='boss',stats=ensureAlphaMeta();\n    stats.classUnlockFacts=db0631Rules.recordCombatFacts(db0631Facts(),{board,classId,miniBoss:!!defeated?.miniBoss,finalBoss:isFinal,merchantBoss:!!defeated?.merchantBoss,mode:hellMode?'hell':nightmareMode?'nightmare':'normal'});saveMeta();",
    "    const defeated=currentEncounterLead||currentEnemy,board=boardLevel,classId=player.classId,isFinal=!!defeated?.finalBoss||v16CombatKind==='final'||tiles[currentEnemyTile]?.type==='boss';\n    meta.classUnlockFacts=db0631Rules.recordCombatFacts(db0631Facts(),{board,classId,miniBoss:!!defeated?.miniBoss,finalBoss:isFinal,merchantBoss:!!defeated?.merchantBoss,mode:hellMode?'hell':nightmareMode?'nightmare':'normal'});saveMeta();",
)
replace_once(
    "runtime/js/dicebound.js",
    '  occultSpellAttack=async function(...args){const beforeMana=Number(player.mana)||0,beforeActions=Number(player.combatActionCount)||0,result=await db0631OccultSpellAttackBase.apply(this,args),spent=beforeMana>(Number(player.mana)||0)&&(Number(player.combatActionCount)||0)>beforeActions;if(spent){const stats=ensureAlphaMeta();stats.classUnlockFacts=db0631Rules.recordManaSpenderCast(db0631Facts(),true);saveMeta();checkDynamicClassUnlocks();}return result;};',
    '  occultSpellAttack=async function(...args){const beforeMana=Number(player.mana)||0,beforeActions=Number(player.combatActionCount)||0,result=await db0631OccultSpellAttackBase.apply(this,args),spent=beforeMana>(Number(player.mana)||0)&&(Number(player.combatActionCount)||0)>beforeActions;if(spent){meta.classUnlockFacts=db0631Rules.recordManaSpenderCast(db0631Facts(),true);saveMeta();checkDynamicClassUnlocks();}return result;};',
)

# Keep declarative class-unlock metadata aligned with the authoritative 0.6.3.1 rules.
for old, new in [
    ('    slime:{type:"allNonSecretClasses"},', '    slime:{type:"unlockedClassCount",minimum:10},'),
    ('    vampire:{type:"runStat",stat:"lifeSteal",greaterThan:1},', '    vampire:{type:"compound",requirements:[{type:"careerStat",stat:"maxLifesteal",greaterThan:1},{type:"guardianDefeat",board:3,guardian:"boss"}]},'),
    ('    merchant:{type:"secretBossKills",boss:"road-merchant",minimum:5},', '    merchant:{type:"secretBossKills",boss:"road-merchant",minimum:1},'),
    ('    rogue:{type:"lifetimeStat",stat:"highestGold",minimum:4000},', '    rogue:{type:"compound",requirements:[{type:"lifetimeStat",stat:"highestGold",minimum:5000},{type:"guardianDefeat",board:3,guardian:"miniboss"}]},'),
    ('    pokemontrainer:{type:"compound",requirements:[{type:"allPetsAtLevel",level:10},{type:"boardClear",classId:"beastmaster",board:5,difficulty:"nightmare"}]},', '    pokemontrainer:{type:"compound",requirements:[{type:"allPetsAtLevel",level:10},{type:"boardClear",classId:"beastmaster",board:5}]},'),
]:
    replace_once("runtime/js/classes/registry.js", old, new)

# Semantic assertions prevent snapshot refreshes from silently blessing stale metadata/state ownership.
replace_once(
    "tools/test_class_registry.js",
    'assert.equal(unlocks.sorcerer.guardian, "miniboss");\nassert.equal(unlocks.slimerouge.requirements[1].board, 6);',
    'assert.equal(unlocks.sorcerer.guardian, "miniboss");\nassert.equal(unlocks.slimerouge.requirements[1].board, 6);\nassert.deepEqual(unlocks.slime,{type:"unlockedClassCount",minimum:10});\nassert.equal(unlocks.merchant.minimum,1);\nassert.equal(unlocks.rogue.requirements[0].minimum,5000);\nassert.equal(unlocks.rogue.requirements[1].board,3);\nassert.equal(unlocks.vampire.requirements[0].stat,"maxLifesteal");\nassert.equal(unlocks.vampire.requirements[0].greaterThan,1);\nassert.equal(unlocks.vampire.requirements[1].board,3);\nassert.equal(unlocks.pokemontrainer.requirements[1].board,5);\nassert.equal(Object.hasOwn(unlocks.pokemontrainer.requirements[1],"difficulty"),false);',
)
replace_once(
    "tools/test_core_state.js",
    '  settings:{masterVolume:2,soundPack:"custom"},\n};',
    '  settings:{masterVolume:2,soundPack:"custom"},\n  classUnlockFacts:{board3BossDefeated:true,manaSpenderCasts:12},\n};',
)
replace_once(
    "tools/test_core_state.js",
    'assert.deepEqual({...defaults.unlocks},{ranger:true,sorcerer:false,fighter:false});',
    'assert.deepEqual({...defaults.unlocks},{ranger:true,sorcerer:false,fighter:false});\nassert.deepEqual({...defaults.classUnlockFacts},{board3MinibossDefeated:false,board3BossDefeated:false,board4MinibossDefeated:false,beastmasterBoard5Cleared:false,roadMerchantSecretBossDefeated:false,maxLifesteal:0,manaSpenderCasts:0});',
)
replace_once(
    "tools/test_core_state.js",
    'assert.equal(meta.settings.soundPack,"custom");',
    'assert.equal(meta.settings.soundPack,"custom");\nassert.equal(meta.classUnlockFacts.board3BossDefeated,true);\nassert.equal(meta.classUnlockFacts.board3MinibossDefeated,false);\nassert.equal(meta.classUnlockFacts.manaSpenderCasts,12);\nassert.equal(meta.classUnlockFacts.maxLifesteal,0);',
)
replace_once(
    "tools/test_0631_progression_slime_gear.js",
    'assert(mono.includes("db0631RecordObservedProgress"),"0.6.3.1 progression wiring missing");',
    'assert(mono.includes("db0631RecordObservedProgress"),"0.6.3.1 progression wiring missing");assert(mono.includes("meta.classUnlockFacts=db0631Rules.recordCombatFacts"),"combat facts are not persisted by core career owner");assert(!mono.includes("stats.classUnlockFacts"),"class unlock facts leaked into legacy lifetime stats");const state=fs.readFileSync(path.join(root,"runtime/js/core/state.js"),"utf8");assert(state.includes("classUnlockFacts:defaultClassUnlockFacts()"),"core state does not own class unlock fact defaults");',
)

print("PATCH 0.6.3.1 metadata/state READY")
