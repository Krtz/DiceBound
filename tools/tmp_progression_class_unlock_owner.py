from pathlib import Path
import re

ROOT=Path('.')
DICE=ROOT/'runtime/js/dicebound.js'
LIFECYCLE=ROOT/'runtime/js/progression/lifecycle.js'
OWNER_TEST=ROOT/'tools/test_progression_owner.js'
CLASS_TEST=ROOT/'tools/test_progression_class_unlock_owner.js'


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)


def regex_once(text,pattern,replacement,label,flags=re.S):
    out,count=re.subn(pattern,replacement,text,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')
    return out

# ---------------------------------------------------------------------------
# Public Progression facade: own class-unlock transaction + orchestration while
# the existing focused rule and feedback modules keep their specialist jobs.
# ---------------------------------------------------------------------------
lifecycle=LIFECYCLE.read_text(encoding='utf-8')
lifecycle=replace_once(
    lifecycle,
    " * This is the semantic owner for Talent/Legacy progression and the final\n * Prestige reset transaction. Focused registries/domains remain separate:\n",
    " * This is the semantic owner for Talent/Legacy progression, final Prestige\n * reset, Achievement policy and class-unlock orchestration. Focused\n * registries/domains remain separate:\n",
    'Progression owner header'
)

# Achievement policy should consume the facade's own class-unlock boundary, not
# a round-trip callback into the compatibility monolith.
lifecycle=replace_once(lifecycle,"if(kind==='classUnlocked')return call('isClassUnlocked',parts[1]);","if(kind==='classUnlocked')return isClassUnlocked(parts[1]);",'Achievement class-unlocked condition')
lifecycle=replace_once(lifecycle,"if(spec.type==='classUnlocked')return call('isClassUnlocked',spec.classId);","if(spec.type==='classUnlocked')return isClassUnlocked(spec.classId);",'Achievement class gate')

# Prestige should invoke the same Progression-owned dynamic scan that all other
# callers use after this slice.
lifecycle=replace_once(lifecycle,"call('saveMeta');call('checkDynamicClassUnlocks');call('sfxHoly');","call('saveMeta');checkDynamicClassUnlocks();call('sfxHoly');",'Prestige dynamic class scan')

anchor="  function achievementCount(){return achievementRegistry().reduce((count,achievement)=>count+(achievementDone(achievement)?1:0),0);}\n\n"
class_policy=r'''  function classUnlockContext(){return call('getClassUnlockContext');}
  function isClassUnlocked(id){return call('classUnlockIsUnlocked',id,classUnlockContext());}
  function commitClassUnlock(id){
    const state=meta(),classRegistry=classes();
    if(id==='bloodmage'){
      state.bloodmageUnlocked=true;state.unlocks=state.unlocks||{};state.unlocks.bloodmage=true;call('saveMeta');call('renderClassChoices');return true;
    }
    if(!classRegistry[id]||state.unlocks?.[id])return false;
    state.unlocks=state.unlocks||{};state.unlocks[id]=true;call('saveMeta');
    const cls=classRegistry[id],unlockFeedback=call('classUnlockFeedback',id);
    if(call('getGameStarted'))call('addLog',`<b>Class unlocked:</b> ${cls.icon} ${cls.name}!`);
    call('showToast',unlockFeedback?.toast||`NEW CLASS UNLOCKED · ${cls.icon} ${cls.name}`,3400,true);call('renderClassChoices');return true;
  }
  function unlockClass(id){if(!call('classUnlockMayCommit',id,classUnlockContext()))return false;return commitClassUnlock(id);}
  function checkDynamicClassUnlocks(){
    const observed=call('classUnlockRecordObservedProgress',classUnlockContext());
    if(observed.changed){const stats=call('ensureAlphaMeta');stats.highestGold=observed.highestGold;meta().classUnlockFacts=observed.facts;}
    call('classUnlockResolveDynamic',{getContext:()=>classUnlockContext(),unlock:id=>unlockClass(id)});
    if(observed.changed)call('saveMeta');
  }

'''
if anchor not in lifecycle: raise SystemExit('Achievement count anchor missing')
lifecycle=lifecycle.replace(anchor,anchor+class_policy,1)
old_api="    achievementDone,achievementConditionText,achievementRewardText,achievementGateUnlocked,heroMasteryEntries,achievementCount\n"
new_api="    achievementDone,achievementConditionText,achievementRewardText,achievementGateUnlocked,heroMasteryEntries,achievementCount,\n    isClassUnlocked,commitClassUnlock,unlockClass,checkDynamicClassUnlocks\n"
lifecycle=replace_once(lifecycle,old_api,new_api,'Progression class-unlock API exports')
LIFECYCLE.write_text(lifecycle,encoding='utf-8',newline='\n')

# ---------------------------------------------------------------------------
# Compatibility monolith: drain class-unlock transaction/orchestration and keep
# only thin adapters used by the remaining composition surface.
# ---------------------------------------------------------------------------
dice=DICE.read_text(encoding='utf-8')
old='''  function commitClassUnlock(id){
    if(id==="bloodmage"){meta.bloodmageUnlocked=true;meta.unlocks=meta.unlocks||{};meta.unlocks.bloodmage=true;saveMeta();renderClassChoices();return true;}
    if(!CLASSES[id]||meta.unlocks?.[id])return false;
    meta.unlocks=meta.unlocks||{};meta.unlocks[id]=true;saveMeta();
    const cls=CLASSES[id],unlockFeedback=window.DiceboundClassUnlockFeedback?.onClassUnlocked?.(id);if(gameStarted)addLog(`<b>Class unlocked:</b> ${cls.icon} ${cls.name}!`);showToast(unlockFeedback?.toast||`NEW CLASS UNLOCKED · ${cls.icon} ${cls.name}`,3400,true);renderClassChoices();return true;
  }
  function unlockClass(id){if(!DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,dbClassUnlockContext()))return false;return commitClassUnlock(id);}
'''
new='''  function commitClassUnlock(id){return dbProgression.commitClassUnlock(id);}
  function unlockClass(id){return dbProgression.unlockClass(id);}
'''
dice=replace_once(dice,old,new,'class unlock commit transaction')

old='''  function baseClassUnlocked(id){return DB_CLASS_UNLOCK_RULES.isBaseUnlocked(id,dbClassUnlockContext());}
  function checkDynamicClassUnlocks(){
    const observed=DB_CLASS_UNLOCK_RULES.recordObservedProgress(dbClassUnlockContext());
    if(observed.changed){const stats=ensureAlphaMeta();stats.highestGold=observed.highestGold;meta.classUnlockFacts=observed.facts;}
    DB_CLASS_UNLOCK_RULES.resolveDynamic({getContext:()=>dbClassUnlockContext(),unlock:id=>unlockClass(id)});
    if(observed.changed)saveMeta();
  }
'''
new='''  function checkDynamicClassUnlocks(){return dbProgression.checkDynamicClassUnlocks();}
'''
dice=replace_once(dice,old,new,'dynamic class unlock orchestration')

dice=replace_once(dice,'  function isClassUnlocked(id){return DB_CLASS_UNLOCK_RULES.isUnlocked(id,dbClassUnlockContext());}','  function isClassUnlocked(id){return dbProgression.isClassUnlocked(id);}','isClassUnlocked facade adapter')

# Configuration supplies specialist rule/feedback capabilities. Remove the old
# recursive Achievement callback and the old dynamic-scan callback.
old="""    getAchievementRegistry:()=>ACHIEVEMENT_REGISTRY,getPowerupGateRegistry:()=>POWERUP_GATE_REGISTRY,getClasses:()=>CLASSES,getUpgrades:()=>upgrades,getElements:()=>ELEMENTS,
    ensureAlphaMeta:()=>ensureAlphaMeta(),hasBoardClear:(classId,board)=>hasBoardClear(classId,board),isClassUnlocked:id=>isClassUnlocked(id),mythicalSetCount:()=>mythicalSetCount(),getGameStarted:()=>!!gameStarted,getAchievementGateRewards:()=>db0512GateRewards,
    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),sfxHoly:()=>sfx.holy(),openStartScreen:()=>openStartScreen()
"""
new="""    getAchievementRegistry:()=>ACHIEVEMENT_REGISTRY,getPowerupGateRegistry:()=>POWERUP_GATE_REGISTRY,getClasses:()=>CLASSES,getUpgrades:()=>upgrades,getElements:()=>ELEMENTS,
    ensureAlphaMeta:()=>ensureAlphaMeta(),hasBoardClear:(classId,board)=>hasBoardClear(classId,board),mythicalSetCount:()=>mythicalSetCount(),getGameStarted:()=>!!gameStarted,getAchievementGateRewards:()=>db0512GateRewards,
    getClassUnlockContext:()=>dbClassUnlockContext(),classUnlockIsUnlocked:(id,ctx)=>DB_CLASS_UNLOCK_RULES.isUnlocked(id,ctx),classUnlockMayCommit:(id,ctx)=>DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,ctx),
    classUnlockRecordObservedProgress:ctx=>DB_CLASS_UNLOCK_RULES.recordObservedProgress(ctx),classUnlockResolveDynamic:options=>DB_CLASS_UNLOCK_RULES.resolveDynamic(options),
    classUnlockFeedback:id=>window.DiceboundClassUnlockFeedback?.onClassUnlocked?.(id),renderClassChoices:()=>renderClassChoices(),addLog:html=>addLog(html),
    sfxHoly:()=>sfx.holy(),openStartScreen:()=>openStartScreen()
"""
dice=replace_once(dice,old,new,'Progression class-unlock composition callbacks')

# Characterization surface should exercise the public boundary directly.
dice=replace_once(dice,'    unlockClass:id=>unlockClass(id),','    unlockClass:id=>dbProgression.unlockClass(id),','Progression oracle class unlock routing')
DICE.write_text(dice,encoding='utf-8',newline='\n')

# ---------------------------------------------------------------------------
# Static ownership guards.
# ---------------------------------------------------------------------------
test=OWNER_TEST.read_text(encoding='utf-8')
old='''  "function db064HeroMasteryEntries(classId)"\n])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);\nfor(const owned of ["achievementDone","achievementConditionText","achievementRewardText","achievementGateUnlocked","heroMasteryEntries","achievementCount"])assert.ok(lifecycle.includes(owned),`Progression Achievement owner capability missing: ${owned}`);\nassert.ok(monolith.includes("function achievementGateUnlocked(gate){return dbProgression.achievementGateUnlocked(gate);}"),"ordinary powerup gates must route through DiceboundProgression");\nassert.ok(monolith.includes("isDone:achievement=>dbProgression.achievementDone(achievement)"),"Achievements UI must consume Progression completion policy");\nconsole.log("Progression owner PASS: Talent/Legacy/Prestige/Achievement semantics route through DiceboundProgression.");\n'''
new='''  "function db064HeroMasteryEntries(classId)",\n  "DB_CLASS_UNLOCK_RULES.mayCommitUnlock(id,dbClassUnlockContext())",\n  "DB_CLASS_UNLOCK_RULES.recordObservedProgress(dbClassUnlockContext())",\n  "DB_CLASS_UNLOCK_RULES.resolveDynamic({getContext:()=>dbClassUnlockContext()",\n  "function baseClassUnlocked(id){return DB_CLASS_UNLOCK_RULES",\n  "if(id===\\\"bloodmage\\\"){meta.bloodmageUnlocked=true"\n])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);\nfor(const owned of ["achievementDone","achievementConditionText","achievementRewardText","achievementGateUnlocked","heroMasteryEntries","achievementCount","isClassUnlocked","commitClassUnlock","unlockClass","checkDynamicClassUnlocks"])assert.ok(lifecycle.includes(owned),`Progression owner capability missing: ${owned}`);\nassert.ok(monolith.includes("function achievementGateUnlocked(gate){return dbProgression.achievementGateUnlocked(gate);}"),"ordinary powerup gates must route through DiceboundProgression");\nassert.ok(monolith.includes("isDone:achievement=>dbProgression.achievementDone(achievement)"),"Achievements UI must consume Progression completion policy");\nassert.ok(monolith.includes("function isClassUnlocked(id){return dbProgression.isClassUnlocked(id);}"),"ordinary class eligibility must route through DiceboundProgression");\nassert.ok(monolith.includes("function unlockClass(id){return dbProgression.unlockClass(id);}"),"ordinary class unlock commits must route through DiceboundProgression");\nassert.ok(monolith.includes("function checkDynamicClassUnlocks(){return dbProgression.checkDynamicClassUnlocks();}"),"dynamic class scans must route through DiceboundProgression");\nconsole.log("Progression owner PASS: Talent/Legacy/Prestige/Achievement/class-unlock orchestration routes through DiceboundProgression.");\n'''
test=replace_once(test,old,new,'Progression owner class-unlock anti-shadow contract')
OWNER_TEST.write_text(test,encoding='utf-8',newline='\n')

# ---------------------------------------------------------------------------
# Focused transaction test for normal, denied, duplicate, Bloodmage and dynamic
# orchestration behavior. Rules and feedback are stubbed: this test is about the
# facade transaction boundary, not re-testing their specialist logic.
# ---------------------------------------------------------------------------
CLASS_TEST.write_text(r'''#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/progression/lifecycle.js"),"utf8");
const sandbox={window:{DiceboundPrestige:{award:(state,count)=>({...state,count:(state?.count||0)+count})}},console};
sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:"progression/lifecycle.js"});
const P=sandbox.window.DiceboundProgression;
assert.ok(P,"Progression facade did not publish");

const classes={ranger:{id:"ranger",icon:"🏹",name:"Ranger"},invoker:{id:"invoker",icon:"🔮",name:"Invoker"},bloodmage:{id:"bloodmage",icon:"🩸",name:"Bloodmage"},fighter:{id:"fighter",icon:"⚔️",name:"Fighter"}};
const meta={unlocks:{},classUnlockFacts:{},stats:{highestGold:10},purchased:{},points:0,prestige:{count:0}};
let gameStarted=true,saves=0,renders=0,feedbackCalls=0,logs=[],toasts=[],resolved=0;
let allowInvoker=false;
const ctx=()=>({persistedUnlocks:meta.unlocks,facts:meta.classUnlockFacts,gameStarted,storedHighestGold:meta.stats.highestGold});
P.configure({
  getMeta:()=>meta,getClasses:()=>classes,getGameStarted:()=>gameStarted,getClassUnlockContext:ctx,
  saveMeta:()=>{saves++;return true;},renderClassChoices:()=>{renders++;},addLog:html=>logs.push(html),showToast:(...args)=>toasts.push(args),
  classUnlockFeedback:id=>{feedbackCalls++;return {toast:`feedback:${id}`};},
  classUnlockIsUnlocked:(id,context)=>!!context.persistedUnlocks?.[id]||(id==='bloodmage'&&!!meta.bloodmageUnlocked),
  classUnlockMayCommit:(id)=>id!=='invoker'||allowInvoker,
  ensureAlphaMeta:()=>meta.stats,
  classUnlockRecordObservedProgress:()=>({changed:true,highestGold:99,facts:{observed:true}}),
  classUnlockResolveDynamic:({unlock})=>{resolved++;unlock('fighter');return {attempted:['fighter'],unlocked:['fighter']};}
});

assert.equal(P.isClassUnlocked('invoker'),false);
assert.equal(P.unlockClass('invoker'),false,"gated class must not commit before rule owner allows it");
assert.equal(saves,0);assert.equal(feedbackCalls,0);
allowInvoker=true;
assert.equal(P.unlockClass('invoker'),true);
assert.equal(meta.unlocks.invoker,true);assert.equal(P.isClassUnlocked('invoker'),true);
assert.equal(saves,1);assert.equal(renders,1);assert.equal(feedbackCalls,1);
assert.deepEqual(logs,["<b>Class unlocked:</b> 🔮 Invoker!"]);
assert.deepEqual(toasts,[["feedback:invoker",3400,true]]);
assert.equal(P.unlockClass('invoker'),false,"duplicate normal unlock must be a no-op");
assert.equal(saves,1);assert.equal(feedbackCalls,1);

const beforeFeedback=feedbackCalls,beforeLogs=logs.length,beforeToasts=toasts.length;
assert.equal(P.commitClassUnlock('bloodmage'),true,"Bloodmage legacy commit remains intentionally idempotent-true");
assert.equal(meta.bloodmageUnlocked,true);assert.equal(meta.unlocks.bloodmage,true);
assert.equal(feedbackCalls,beforeFeedback,"Bloodmage legacy path must not enqueue normal feedback");
assert.equal(logs.length,beforeLogs);assert.equal(toasts.length,beforeToasts);
assert.equal(saves,2);assert.equal(renders,2);
assert.equal(P.commitClassUnlock('bloodmage'),true,"repeated Bloodmage commit preserves shipped true result");
assert.equal(saves,3);assert.equal(renders,3);

P.checkDynamicClassUnlocks();
assert.equal(resolved,1);assert.equal(meta.stats.highestGold,99);assert.deepEqual(meta.classUnlockFacts,{observed:true});
assert.equal(meta.unlocks.fighter,true,"dynamic resolver must commit through the same facade transaction");
assert.equal(saves,5,"dynamic change persists once after the committed class save");
assert.equal(feedbackCalls,2);assert.equal(renders,4);

console.log("Progression class-unlock owner PASS: eligibility, commit feedback, Bloodmage quirk and dynamic coordination preserved");
''',encoding='utf-8',newline='\n')

print('Progression class-unlock ownership slice staged.')
