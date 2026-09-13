from pathlib import Path
import re

ROOT=Path('.')
DICE=ROOT/'runtime/js/dicebound.js'
LIFECYCLE=ROOT/'runtime/js/progression/lifecycle.js'
OWNER_TEST=ROOT/'tools/test_progression_owner.js'


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
# Extend the public Progression owner with final Achievement policy.
# ---------------------------------------------------------------------------
lifecycle=LIFECYCLE.read_text(encoding='utf-8')
anchor="""  function inspect(){return Object.freeze({owner:OWNER,configured:Object.freeze(Object.fromEntries(Object.entries(runtime).map(([key,value])=>[key,typeof value==='function'])))});}\n"""
achievement_policy=r'''  function achievementRegistry(){return call('getAchievementRegistry');}
  function classes(){return call('getClasses');}
  function upgrades(){return call('getUpgrades');}
  function achievementById(id){return achievementRegistry().find(entry=>entry.id===id)||null;}
  function achievementEntry(input){return typeof input==='string'?achievementById(input):input||null;}

  function achievementDone(input){
    const a=achievementEntry(input);if(!a)return false;
    const state=meta(),stats=call('ensureAlphaMeta'),parts=String(a.condition||'').split(':'),kind=parts[0],player=call('getPlayer');
    if(kind==='runsStarted')return (stats.runsStarted||0)>0||call('getGameStarted');
    if(kind==='boardClear')return call('hasBoardClear',parts[1],Number(parts[2]));
    if(kind==='classUnlocked')return call('isClassUnlocked',parts[1]);
    if(kind==='nightmareUnlocked')return !!state.nightmareUnlocked;
    if(kind==='board4Clears')return (state.board4Clears||0)>0;
    if(kind==='board5Clears')return (state.board5Clears||0)>0;
    if(kind==='classLevel')return (stats.classMaxLevel?.[parts[1]]||0)>=Number(parts[2]||0);
    if(kind==='healingDone')return (stats.healingDone||0)>=Number(parts[1]||0);
    if(kind==='highestGold')return Math.max(stats.highestGold||0,player?.gold||0)>=Number(parts[1]||0);
    if(kind==='elementProgress')return (state.elementProgress?.[parts[1]]||0)>=Number(parts[2]||0);
    if(kind==='allPetsUnlocked')return Object.values(state.pets||{}).every(pet=>pet.unlocked);
    if(kind==='prestige')return (state.prestige?.count||0)>=Number(parts[1]||0);
    if(kind==='setPieces')return call('mythicalSetCount')>=Number(parts[1]||0);
    if(kind==='merchantKills')return (state.merchantKills||0)>=Number(parts[1]||0);
    if(kind==='hellUnlocked')return !!state.hellUnlocked;
    if(kind==='heirloomStorageUnlocked')return !!state.heirloomStorageUnlocked||call('storageUnlocked');
    if(kind==='legendaryRelics')return (state.legendaryRelics||[]).length>=Number(parts[1]||0);
    if(kind==='devilBossKills')return (state.devilBossKills||0)>=Number(parts[1]||0);
    if(kind==='devilHornsFound')return !!state.devilHornsFound;
    if(kind==='potionsUsed')return (stats.potionsUsed||0)>=Number(parts[1]||0);
    return !!state.achievements?.[a.id];
  }

  function achievementConditionText(input){
    const a=achievementEntry(input);if(!a)return null;
    const p=String(a.condition||'').split(':'),kind=p[0],classRegistry=classes(),elements=call('getElements');
    if(kind==='runsStarted')return 'Begin any run.';
    if(kind==='boardClear')return `Clear Board ${p[2]} as ${classRegistry[p[1]]?.name||p[1]}.`;
    if(kind==='classUnlocked')return `Unlock ${classRegistry[p[1]]?.name||p[1]}.`;
    if(kind==='nightmareUnlocked')return 'Unlock Nightmare Mode.';
    if(kind==='board4Clears')return 'Clear Board 4.';
    if(kind==='board5Clears')return 'Clear Board 5.';
    if(kind==='classLevel')return `Reach run level ${p[2]} as ${classRegistry[p[1]]?.name||p[1]}.`;
    if(kind==='healingDone')return `Heal ${Number(p[1]).toLocaleString()} HP across all runs.`;
    if(kind==='highestGold')return `Hold ${Number(p[1]).toLocaleString()} gold at once.`;
    if(kind==='elementProgress')return `Accumulate ${Number(p[2]).toLocaleString()} ${elements[p[1]]?.name||p[1]} damage/healing.`;
    if(kind==='allPetsUnlocked')return 'Unlock every companion.';
    if(kind==='prestige')return `Reach ${p[1]} Prestige.`;
    if(kind==='setPieces')return `Equip ${p[1]} pieces of the Impossible Road set.`;
    if(kind==='merchantKills')return `Defeat the Road Merchant ${p[1]} time${Number(p[1])===1?'':'s'}.`;
    if(kind==='hellUnlocked')return 'Unlock Hell Mode.';
    if(kind==='heirloomStorageUnlocked')return 'Unlock permanent Heirloom Storage.';
    if(kind==='legendaryRelics')return `Discover ${p[1]} named Mythical road relic${Number(p[1])===1?'':'s'}.`;
    if(kind==='devilBossKills')return `Defeat the Pale Devil ${p[1]} time${Number(p[1])===1?'':'s'}.`;
    if(kind==='devilHornsFound')return "Find the Devil's Horns Omega hat.";
    if(kind==='potionsUsed')return `Consume ${p[1]} potions across all runs.`;
    return 'Complete the listed achievement condition.';
  }

  function achievementRewardText(input){
    const a=achievementEntry(input);if(!a)return null;
    let base='';
    if(a.reward){
      const [type,id]=String(a.reward).split(':'),classRegistry=classes();
      if(type==='class')base=` · unlocks ${classRegistry[id]?.name||id}`;
      else if(type==='powerup')base=` · unlocks ${upgrades().find(upgrade=>upgrade.id===id)?.name||id}`;
    }
    const ids=call('getAchievementGateRewards')?.[a.id]||[];
    const names=ids.map(id=>upgrades().find(upgrade=>upgrade.id===id)?.name).filter(Boolean).filter(name=>!base.includes(name));
    if(!names.length)return base;
    return `${base}${base?' · also':' ·'} unlocks ${names.join(', ')}`;
  }

  function achievementGateUnlocked(gate){
    if(!gate)return true;
    const state=meta(),text=String(gate);
    if(text.startsWith('achievement:')){const achievement=achievementById(text.slice('achievement:'.length));return !!achievement&&achievementDone(achievement);}
    const classGate=/^class_b([2345]):(.*)$/.exec(text);if(classGate)return call('hasBoardClear',classGate[2],Number(classGate[1]));
    const spec=call('getPowerupGateRegistry')?.[text];
    if(spec){
      if(spec.type==='prestige')return (state.prestige?.count||0)>=Number(spec.minimum||0);
      if(spec.type==='classUnlocked')return call('isClassUnlocked',spec.classId);
      if(spec.type==='flag')return !!state[spec.field];
      if(spec.type==='counter')return (state[spec.field]||0)>=Number(spec.minimum||0);
      if(spec.type==='elementProgress')return (state.elementProgress?.[spec.element]||0)>=Number(spec.minimum||0);
      if(spec.type==='boardClear')return call('hasBoardClear',spec.classId,Number(spec.board));
      if(spec.type==='classLevel')return (call('ensureAlphaMeta').classMaxLevel?.[spec.classId]||0)>=Number(spec.minimum||0);
      if(spec.type==='lifetimeStat')return (call('ensureAlphaMeta')[spec.stat]||0)>=Number(spec.minimum||0);
      if(spec.type==='allPetsUnlocked')return Object.values(state.pets||{}).every(pet=>pet.unlocked);
      if(spec.type==='boardClears')return (spec.requirements||[]).every(requirement=>call('hasBoardClear',requirement.classId,Number(requirement.board)));
    }
    return !!state.achievements?.[gate];
  }

  function heroMasteryEntries(classId){
    return upgrades().filter(upgrade=>(upgrade.classId===classId||(upgrade.classIds||[]).includes(classId))&&!!upgrade.achievementGate)
      .map(upgrade=>{
        const gate=String(upgrade.achievementGate),match=/^class_b(\d+):/.exec(gate),achievement=gate.startsWith('achievement:')?achievementById(gate.slice('achievement:'.length)):achievementById(gate);
        const condition=match?`Clear Board ${match[1]} as this hero.`:achievement?achievementConditionText(achievement):'Complete this hero’s listed unlock condition.';
        return {id:`hero-talent:${classId}:${upgrade.id}`,name:`${upgrade.icon||'✨'} ${upgrade.name}`,description:`${condition} Unlocks this hero-specific talent.`,done:achievementGateUnlocked(gate)};
      });
  }

  function achievementCount(){return achievementRegistry().reduce((count,achievement)=>count+(achievementDone(achievement)?1:0),0);}

'''
if anchor not in lifecycle:
    raise SystemExit('Progression inspect anchor missing')
lifecycle=lifecycle.replace(anchor,achievement_policy+anchor,1)
old_api="""    legacyXpForLevel,grantLegacyXp,finalizeRun,prestigeOffer,completePrestige\n"""
new_api="""    legacyXpForLevel,grantLegacyXp,finalizeRun,prestigeOffer,completePrestige,\n    achievementDone,achievementConditionText,achievementRewardText,achievementGateUnlocked,heroMasteryEntries,achievementCount\n"""
lifecycle=replace_once(lifecycle,old_api,new_api,'Progression Achievement API exports')
LIFECYCLE.write_text(lifecycle,encoding='utf-8',newline='\n')

# ---------------------------------------------------------------------------
# Drain Achievement semantics and historical gate wrapper ladders from monolith.
# ---------------------------------------------------------------------------
dice=DICE.read_text(encoding='utf-8')

# Configure the facade with live registry/state collaborators. The late-defined
# reward map is accessed lazily through a callback after bootstrap is complete.
old="""    storageUnlocked:()=>!!v24StorageUnlocked?.(),syncStorage:()=>v24SyncStorage?.(),getHeirloomSlots:()=>getHeirloomSlots(),normalizeSavedItem:item=>normalizeSavedItem(item),\n    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),sfxHoly:()=>sfx.holy(),openStartScreen:()=>openStartScreen()\n"""
new="""    storageUnlocked:()=>!!v24StorageUnlocked?.(),syncStorage:()=>v24SyncStorage?.(),getHeirloomSlots:()=>getHeirloomSlots(),normalizeSavedItem:item=>normalizeSavedItem(item),\n    getAchievementRegistry:()=>ACHIEVEMENT_REGISTRY,getPowerupGateRegistry:()=>POWERUP_GATE_REGISTRY,getClasses:()=>CLASSES,getUpgrades:()=>upgrades,getElements:()=>ELEMENTS,\n    ensureAlphaMeta:()=>ensureAlphaMeta(),hasBoardClear:(classId,board)=>hasBoardClear(classId,board),isClassUnlocked:id=>isClassUnlocked(id),mythicalSetCount:()=>mythicalSetCount(),getGameStarted:()=>!!gameStarted,getAchievementGateRewards:()=>db0512GateRewards,\n    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),sfxHoly:()=>sfx.holy(),openStartScreen:()=>openStartScreen()\n"""
dice=replace_once(dice,old,new,'Progression Achievement collaborators')

# Replace original base gate semantics with one stable compatibility adapter.
dice=regex_once(
    dice,
    r"  function achievementGateUnlocked\(gate\)\{.*?\n  \}\n(?=  function eligibleUpgrades)",
    "  function achievementGateUnlocked(gate){return dbProgression.achievementGateUnlocked(gate);}\n",
    'base achievement gate policy'
)

# Remove the registry-driven semantic implementation block; the registry itself
# remains focused and the public Progression owner now consumes it.
dice=regex_once(
    dice,
    r"  /\* ========================================================================\n     Alpha v3\.1\.7 — registry-driven achievement presentation.*?(?=  /\* ========================================================================\n     Alpha v3\.2\.4 — touch/mobile UI contract)",
    "  /* Alpha v3.1.7 Achievement policy is now owned by DiceboundProgression. */\n",
    'Achievement semantic block'
)

# Historical gate wrapper generations are superseded by the consolidated facade.
dice=regex_once(dice,r"  const gateV15=achievementGateUnlocked;\n  achievementGateUnlocked=function\(gate\)\{.*?\};\n\n(?=  CLASSES\.ceo\.unlock)","",'V15 Achievement gate wrapper')
dice=regex_once(dice,r"  const achievementGateUnlockedV19Base=achievementGateUnlocked;\n  achievementGateUnlocked=function\(gate\)\{.*?\n  \};\n(?=  v19AssignMasteryGates\(\);)","",'V19 Achievement gate wrapper')
dice=regex_once(dice,r"  const db0512AchievementGateBase=achievementGateUnlocked;\n  achievementGateUnlocked=function\(gate\)\{.*?\n  \};\n\n","",'0.5.12 Achievement gate wrapper')
dice=regex_once(dice,r"  // Achievement completion state also controls the newly-gated powerups\.\n  const db0512AchievementRewardBase=db317AchievementRewardText;\n  db317AchievementRewardText=function\(a\)\{.*?\n  \};\n","  // Achievement-gated reward copy is resolved by DiceboundProgression.\n",'0.5.12 Achievement reward wrapper')

# Hero mastery and Trophy UI call the public Progression boundary directly.
dice=regex_once(dice,r"  function db064PowerupGateDone\(gate\)\{.*?\n  \}\n(?=  const dbAchievementsUi=window\.DiceboundAchievementsUi;)","",'Hero mastery semantic helpers')
old="""    isClassUnlocked,\n    isDone:db317AchievementDone,\n    descriptionFor:achievement=>db317AchievementConditionText(achievement)+db317AchievementRewardText(achievement),\n    heroMasteryEntries:db064HeroMasteryEntries,\n"""
new="""    isClassUnlocked,\n    isDone:achievement=>dbProgression.achievementDone(achievement),\n    descriptionFor:achievement=>dbProgression.achievementConditionText(achievement)+dbProgression.achievementRewardText(achievement),\n    heroMasteryEntries:classId=>dbProgression.heroMasteryEntries(classId),\n"""
dice=replace_once(dice,old,new,'Achievements UI Progression routing')

# Camp reveal logic keeps a tiny name-compatible adapter only.
dice=regex_once(
    dice,
    r"  function db0633AchievementCount\(\)\{\n    return ACHIEVEMENT_REGISTRY\.reduce\(\(count,achievement\)=>count\+\(db317AchievementDone\(achievement\)\?1:0\),0\);\n  \}",
    "  function db0633AchievementCount(){return dbProgression.achievementCount();}",
    'Camp Achievement count adapter',
    flags=0
)

# Oracle surface now proves the facade itself, not retired monolith helpers.
old="""    achievementDone:id=>{const achievement=ACHIEVEMENT_REGISTRY.find(entry=>entry.id===id);return !!achievement&&db317AchievementDone(achievement);},\n    achievementConditionText:id=>{const achievement=ACHIEVEMENT_REGISTRY.find(entry=>entry.id===id);return achievement?db317AchievementConditionText(achievement):null;},\n    achievementRewardText:id=>{const achievement=ACHIEVEMENT_REGISTRY.find(entry=>entry.id===id);return achievement?db317AchievementRewardText(achievement):null;},\n    achievementGate:gate=>achievementGateUnlocked(gate),\n    heroMastery:classId=>dbRunClone(db064HeroMasteryEntries(classId)),\n    achievementCount:()=>db0633AchievementCount(),\n"""
new="""    achievementDone:id=>dbProgression.achievementDone(id),\n    achievementConditionText:id=>dbProgression.achievementConditionText(id),\n    achievementRewardText:id=>dbProgression.achievementRewardText(id),\n    achievementGate:gate=>dbProgression.achievementGateUnlocked(gate),\n    heroMastery:classId=>dbRunClone(dbProgression.heroMasteryEntries(classId)),\n    achievementCount:()=>dbProgression.achievementCount(),\n"""
dice=replace_once(dice,old,new,'Progression oracle Achievement routing')
DICE.write_text(dice,encoding='utf-8',newline='\n')

# ---------------------------------------------------------------------------
# Static anti-shadow contract: final semantic policy may not drift back.
# ---------------------------------------------------------------------------
test=OWNER_TEST.read_text(encoding='utf-8')
old='''  "v27CompletePrestigeNoChoice"\n])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);\nconsole.log("Progression owner PASS: Talent/Legacy/final Prestige semantics route through DiceboundProgression.");\n'''
new='''  "v27CompletePrestigeNoChoice",\n  "function db317AchievementDone(a)",\n  "function db317AchievementConditionText(a)",\n  "function db317AchievementRewardText(a)",\n  "const gateV15=achievementGateUnlocked",\n  "achievementGateUnlockedV19Base",\n  "db0512AchievementGateBase",\n  "db0512AchievementRewardBase",\n  "function db064HeroMasteryEntries(classId)"\n])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);\nfor(const owned of ["achievementDone","achievementConditionText","achievementRewardText","achievementGateUnlocked","heroMasteryEntries","achievementCount"])assert.ok(lifecycle.includes(owned),`Progression Achievement owner capability missing: ${owned}`);\nassert.ok(monolith.includes("function achievementGateUnlocked(gate){return dbProgression.achievementGateUnlocked(gate);}"),"ordinary powerup gates must route through DiceboundProgression");\nassert.ok(monolith.includes("isDone:achievement=>dbProgression.achievementDone(achievement)"),"Achievements UI must consume Progression completion policy");\nconsole.log("Progression owner PASS: Talent/Legacy/Prestige/Achievement semantics route through DiceboundProgression.");\n'''
test=replace_once(test,old,new,'Progression owner Achievement anti-shadow contract')
OWNER_TEST.write_text(test,encoding='utf-8',newline='\n')

print('Progression Achievement ownership slice staged.')
