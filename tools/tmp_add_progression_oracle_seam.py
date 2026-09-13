from pathlib import Path
import re

PATH=Path('runtime/js/dicebound.js')
text=PATH.read_text(encoding='utf-8')
if 'window.DiceboundProgressionOracleTest=Object.freeze({' in text:
    raise SystemExit('Progression oracle seam already present')

surface=r'''

  // Test-only characterization surface for the Progression subsystem migration.
  // It exposes the final released 0.6.6.28 behavior without changing ordinary
  // callers so capture/replay can freeze Talent, Legacy, Prestige, Achievement
  // and class-unlock integration before ownership moves.
  window.DiceboundProgressionOracleTest=Object.freeze({
    snapshot:()=>({
      gameStarted:!!gameStarted,
      runTalentSnapshot:dbRunClone(runTalentSnapshot),
      meta:{
        level:meta.level,xp:meta.xp,xpNext:meta.xpNext,points:meta.points,
        purchased:dbRunClone(meta.purchased||{}),prestige:dbRunClone(meta.prestige||{}),
        heirlooms:dbRunClone(meta.heirlooms||[]),heirloomStorage:dbRunClone(meta.heirloomStorage||[]),heirloomStorageUnlocked:!!meta.heirloomStorageUnlocked,
        unlocks:dbRunClone(meta.unlocks||{}),classUnlockFacts:dbRunClone(meta.classUnlockFacts||{}),
        stats:dbRunClone(meta.stats||{}),elementProgress:dbRunClone(meta.elementProgress||{}),
        devilHornsFound:!!meta.devilHornsFound,nightmareUnlocked:!!meta.nightmareUnlocked,hellUnlocked:!!meta.hellUnlocked,
        runs:meta.runs,bestTiles:meta.bestTiles
      }
    }),
    setRunActive:value=>{gameStarted=!!value;return gameStarted;},
    patchMeta:patch=>{Object.assign(meta,dbRunClone(patch||{}));return true;},
    patchPlayer:patch=>{Object.assign(player,dbRunClone(patch||{}));return true;},
    setTalentState:({points,purchased}={})=>{if(points!==undefined)meta.points=Math.max(0,Number(points)||0);if(purchased!==undefined)meta.purchased=dbRunClone(purchased||{});return true;},
    setPurchasedRank:(id,rank)=>{meta.purchased=meta.purchased||{};meta.purchased[id]=Math.max(0,Number(rank)||0);return meta.purchased[id];},
    setLegacyState:({level,xp,xpNext,points}={})=>{if(level!==undefined)meta.level=Math.max(1,Number(level)||1);if(xp!==undefined)meta.xp=Math.max(0,Number(xp)||0);if(xpNext!==undefined)meta.xpNext=Math.max(1,Number(xpNext)||1);if(points!==undefined)meta.points=Math.max(0,Number(points)||0);return true;},
    setRunTalentSnapshot:value=>{runTalentSnapshot=value==null?null:dbRunClone(value);return dbRunClone(runTalentSnapshot);},
    talentRank:id=>talentRank(id),
    gameplayTalentRank:id=>gameplayTalentRank(id),
    talentAvailable:id=>{const talent=talents.find(entry=>entry.id===id);return !!talent&&talentAvailable(talent);},
    purchaseTalent:id=>purchaseTalentNode(id),
    repairTalentPrerequisites:()=>repairTalentPrerequisites(),
    allocatedTalentPoints:()=>allocatedTalentPoints(),
    legacyXpForLevel:level=>legacyXpForLevel(level),
    grantLegacyXp:amount=>grantLegacyXp(amount),
    finalizeRun:()=>finalizeRun(),
    prestigeOffer:total=>db0633PrestigeOfferPoints(total),
    completePrestige:total=>v27CompletePrestigeNoChoice(total),
    setPrestige:value=>{meta.prestige=DB_PRESTIGE.normalize(dbRunClone(value||{}));return dbRunClone(meta.prestige);},
    rawPrestige:()=>dbRunClone(meta.prestige||{}),
    prestigeInspect:()=>dbRunClone(DB_PRESTIGE.inspect(meta.prestige)),
    prestigeDomainPurchase:id=>{const result=DB_PRESTIGE.purchase(meta.prestige,id,random);if(result.ok)meta.prestige=result.prestige;return dbRunClone(result);},
    prestigeDomainRefund:()=>{const result=DB_PRESTIGE.refundAll(meta.prestige);meta.prestige=result.prestige;return dbRunClone(result);},
    checkpointHas:()=>DB_RUN_CHECKPOINT.has(),
    achievementDone:id=>{const achievement=ACHIEVEMENT_REGISTRY.find(entry=>entry.id===id);return !!achievement&&db317AchievementDone(achievement);},
    achievementConditionText:id=>{const achievement=ACHIEVEMENT_REGISTRY.find(entry=>entry.id===id);return achievement?db317AchievementConditionText(achievement):null;},
    achievementRewardText:id=>{const achievement=ACHIEVEMENT_REGISTRY.find(entry=>entry.id===id);return achievement?db317AchievementRewardText(achievement):null;},
    achievementGate:gate=>achievementGateUnlocked(gate),
    heroMastery:classId=>dbRunClone(db064HeroMasteryEntries(classId)),
    achievementCount:()=>db0633AchievementCount(),
    unlockClass:id=>unlockClass(id),
    classUnlockFeedbackState:()=>dbRunClone(window.DiceboundClassUnlockFeedback?.state?.()||null),
    logHtml:()=>String($('log')?.innerHTML||'')
  });
'''

match=re.search(r'\n\}\)\(\);\s*$',text)
if not match:
    raise SystemExit('outer dicebound IIFE closing marker not found')
text=text[:match.start()]+surface+text[match.start():]
PATH.write_text(text,encoding='utf-8',newline='\n')
print('Progression characterization seam added.')
