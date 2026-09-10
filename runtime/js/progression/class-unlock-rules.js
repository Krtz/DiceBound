(() => {
  "use strict";

  /*
   * Authoritative class-unlock policy / resolution owner.
   *
   * Beta 0.6.6.22 folds the live historical baseClassUnlocked /
   * isClassUnlocked / checkDynamicClassUnlocks policy ladder into this file.
   * The compatibility runtime still owns the persistence + toast/log/render
   * transaction performed when an unlock is committed; this module decides
   * whether a class is currently considered unlocked/eligible and the exact
   * order in which the historical dynamic scan attempts unlocks.
   */

  // These seven classes were already protected by the 0.6.3.1 eligibility
  // gate. Keep this list public for compatibility and for direct unlock calls:
  // unlike older classes, callers may not force-persist them before the rule
  // has actually become true.
  const TARGET_IDS=Object.freeze(["pokemontrainer","rogue","merchant","slime","vampire","invoker","dragoon"]);
  const TARGET_ID_SET=new Set(TARGET_IDS);

  const number=value=>Number(value)||0;
  const integer=value=>Math.max(0,Math.floor(number(value)));
  const classExists=(id,ctx={})=>{
    const ids=Array.isArray(ctx.classIds)?ctx.classIds:null;
    return ids?ids.includes(id):true;
  };
  const persisted=(id,ctx={})=>!!ctx.persistedUnlocks?.[id]||(id==="bloodmage"&&!!ctx.bloodmageUnlocked);
  const playerValue=(ctx,key)=>number(ctx.player?.[key]);
  const statsValue=(ctx,key)=>number(ctx.stats?.[key]);
  const petLevel=(ctx,id)=>number(ctx.petLevels?.[id])||1;

  function normalizeFacts(facts={}){
    return {
      board3MinibossDefeated:!!facts.board3MinibossDefeated,
      board3BossDefeated:!!facts.board3BossDefeated,
      board4MinibossDefeated:!!facts.board4MinibossDefeated,
      beastmasterBoard5Cleared:!!facts.beastmasterBoard5Cleared,
      roadMerchantSecretBossDefeated:!!facts.roadMerchantSecretBossDefeated,
      maxLifesteal:number(facts.maxLifesteal),
      manaSpenderCasts:integer(facts.manaSpenderCasts),
    };
  }

  function allPetsLevel10(ctx={}){
    const ids=Array.isArray(ctx.petIds)?ctx.petIds:[];
    return ids.length>0&&ids.every(id=>petLevel(ctx,id)>=10);
  }

  function petLevel10Count(ctx={}){
    const ids=Array.isArray(ctx.petIds)?ctx.petIds:[];
    return ids.filter(id=>petLevel(ctx,id)>=10).length;
  }

  function allPetsUnlocked(ctx={}){
    const ids=Array.isArray(ctx.petIds)?ctx.petIds:[];
    // Historical runtime used Object.values(meta.pets).every(...). The default
    // career always has the Pet registry, but Array#every's empty=true behavior
    // is intentionally retained here rather than adding a new length gate.
    return ids.every(id=>!!ctx.petUnlocked?.[id]);
  }

  function hasBoardClear(ctx,classId,board){
    if(typeof ctx.hasBoardClear==="function")return !!ctx.hasBoardClear(classId,board);
    return !!ctx.boardClears?.[`${classId}:b${board}`];
  }

  // 0.6.3.1's public predicate is retained exactly for compatibility tests and
  // callers that need to evaluate one of the gated compound rules in isolation.
  // Full runtime resolution is provided by isBaseUnlocked()/isUnlocked() below.
  function isEligible(id,ctx={}){
    const f=normalizeFacts(ctx.facts);
    switch(id){
      case "pokemontrainer":return allPetsLevel10(ctx)&&f.beastmasterBoard5Cleared;
      case "rogue":return number(ctx.highestGold)>=5000&&f.board3MinibossDefeated;
      case "merchant":return f.roadMerchantSecretBossDefeated;
      case "slime":return new Set(ctx.unlockedClassIds||[]).size>=10;
      case "vampire":return f.maxLifesteal>1&&f.board3BossDefeated;
      case "invoker":return f.manaSpenderCasts>=100;
      case "dragoon":return f.board4MinibossDefeated;
      default:return null;
    }
  }

  // Final pre-0.6.3.1 baseClassUnlocked behavior after every historical layer
  // except the seven gated rules above. Event-driven classes intentionally stay
  // persisted-only: their guardian/secret-boss event commits the unlock rather
  // than baseClassUnlocked predicting it ahead of that transaction.
  function legacyBaseEligible(id,ctx={}){
    if(persisted(id,ctx))return true;
    switch(id){
      case "ranger":return true;
      case "rouge":return number(ctx.prestigeCount)>=10;
      case "berserker":return number(ctx.damageTaken)>=1000;
      case "d20":return petLevel(ctx,"neutral")>=30;
      case "cleric":return statsValue(ctx,"healingDone")>=1000;
      case "paladin":return hasBoardClear(ctx,"fighter",3)&&hasBoardClear(ctx,"cleric",3);
      case "beastmaster":return allPetsUnlocked(ctx);
      case "summoner":return petLevel10Count(ctx)>=3;
      case "alchemist":return statsValue(ctx,"potionsUsed")>=15;
      // These are intentionally dynamic-only until their unlock transaction has
      // persisted them, matching the shipped wrapper stack.
      case "turtle":case "frog":case "ninja":case "ceo":case "ouroboros":
      case "sorcerer":case "fighter":case "monk":case "clown":case "slimerouge":
        return false;
      // Bloodmage's legacy flag is handled by persisted().
      case "bloodmage":return false;
      default:return false;
    }
  }

  function eligibleWithoutSlime(id,ctx={}){
    if(!classExists(id,ctx)||id==="slime")return false;
    if(persisted(id,ctx))return true;
    if(TARGET_ID_SET.has(id))return !!isEligible(id,ctx);
    return legacyBaseEligible(id,ctx);
  }

  function eligibleClassIds(ctx={}){
    const ids=Array.isArray(ctx.classIds)?ctx.classIds:[];
    return ids.filter(id=>id!=="slime"&&eligibleWithoutSlime(id,ctx));
  }

  function targetEligible(id,ctx={}){
    if(id!=="slime")return !!isEligible(id,ctx);
    return !!isEligible("slime",{...ctx,unlockedClassIds:eligibleClassIds(ctx)});
  }

  function isBaseUnlocked(id,ctx={}){
    if(!classExists(id,ctx))return false;
    if(persisted(id,ctx))return true;
    if(TARGET_ID_SET.has(id))return targetEligible(id,ctx);
    return legacyBaseEligible(id,ctx);
  }

  // Final shipped isClassUnlocked behavior is the final base resolver for every
  // class; the older special Slime and Bloodmage wrappers have been folded in.
  function isUnlocked(id,ctx={}){return isBaseUnlocked(id,ctx);}

  function mayCommitUnlock(id,ctx={}){
    if(!classExists(id,ctx))return false;
    // The 0.6.3.1 target gate wrapped unlockClass itself. Non-target event
    // unlocks remain intentionally permissive so guardian/secret-boss callers
    // can commit them at the exact point they historically did.
    return !TARGET_ID_SET.has(id)||targetEligible(id,ctx);
  }

  function recordObservedProgress(ctx={}){
    const facts=normalizeFacts(ctx.facts),storedHighestGold=number(ctx.storedHighestGold);
    if(!ctx.gameStarted)return Object.freeze({facts,highestGold:storedHighestGold,changed:false});
    const highestGold=Math.max(storedHighestGold,playerValue(ctx,"gold"));
    const maxLifesteal=Math.max(number(facts.maxLifesteal),playerValue(ctx,"lifeSteal"));
    const changed=highestGold!==storedHighestGold||maxLifesteal!==number(facts.maxLifesteal);
    facts.maxLifesteal=maxLifesteal;
    return Object.freeze({facts,highestGold,changed});
  }

  function legacyPublicSlimeReady(ctx={}){
    const ids=Array.isArray(ctx.publicSlimeCandidateIds)?ctx.publicSlimeCandidateIds:[];
    return ids.every(id=>isBaseUnlocked(id,ctx));
  }

  // Preserve the *attempt order* of the final 0.6.6.21 wrapper tower. Most
  // duplicate attempts immediately become no-ops after the first successful
  // commit, but keeping their order makes simultaneous unlock/reveal behavior
  // mechanically identical and documents exactly what was collapsed.
  function resolveDynamic({getContext,unlock}={}){
    if(typeof getContext!=="function"||typeof unlock!=="function")throw new TypeError("Class unlock dynamic resolution requires getContext and unlock callbacks.");
    const attempted=[],unlocked=[];
    const attempt=(id,predicate)=>{
      const ctx=getContext();
      if(!classExists(id,ctx)||!predicate(ctx))return false;
      attempted.push(id);
      if(unlock(id)){unlocked.push(id);return true;}
      return false;
    };

    // Alpha v1 replacement order.
    attempt("d20",ctx=>petLevel(ctx,"neutral")>=30);
    attempt("turtle",ctx=>!!ctx.gameStarted&&playerValue(ctx,"defense")>40);
    attempt("frog",ctx=>!!ctx.gameStarted&&playerValue(ctx,"doubleStrike")>=1.5);
    attempt("vampire",ctx=>!!ctx.gameStarted&&playerValue(ctx,"lifeSteal")>1);
    attempt("ninja",ctx=>!!ctx.gameStarted&&playerValue(ctx,"crit")>1);
    attempt("ceo",ctx=>!!ctx.gameStarted&&playerValue(ctx,"bossDamage")>=3);
    attempt("rouge",ctx=>number(ctx.prestigeCount)>=10);
    attempt("berserker",ctx=>number(ctx.damageTaken)>=1000);
    attempt("merchant",ctx=>number(ctx.merchantKills)>=5);
    attempt("cleric",ctx=>statsValue(ctx,"healingDone")>=1000);
    attempt("paladin",ctx=>hasBoardClear(ctx,"fighter",3)&&hasBoardClear(ctx,"cleric",3));
    attempt("beastmaster",ctx=>allPetsUnlocked(ctx));
    attempt("rogue",ctx=>statsValue(ctx,"highestGold")>=4000||(!!ctx.gameStarted&&playerValue(ctx,"gold")>=4000));
    attempt("slime",ctx=>legacyPublicSlimeReady(ctx));

    // Later wrapper append order.
    attempt("summoner",ctx=>petLevel10Count(ctx)>=3);
    attempt("pokemontrainer",ctx=>allPetsLevel10(ctx)&&!!ctx.beastmasterNightmareBoard5);
    attempt("alchemist",ctx=>statsValue(ctx,"potionsUsed")>=100);
    attempt("ouroboros",ctx=>!!ctx.gameStarted&&playerValue(ctx,"doubleStrike")>=4);
    attempt("ceo",ctx=>!!ctx.gameStarted&&playerValue(ctx,"bossDamage")>=3);
    attempt("alchemist",ctx=>statsValue(ctx,"potionsUsed")>=50);
    attempt("alchemist",ctx=>statsValue(ctx,"potionsUsed")>=25);
    attempt("alchemist",ctx=>statsValue(ctx,"potionsUsed")>=15);
    attempt("alchemist",ctx=>statsValue(ctx,"potionsUsed")>=15);

    // Final 0.6.3.1 target-rule scan. Context is fetched immediately before
    // each attempt so earlier commits can make Slime's 10-class condition true.
    for(const id of TARGET_IDS)attempt(id,ctx=>targetEligible(id,ctx));

    return Object.freeze({attempted:Object.freeze(attempted),unlocked:Object.freeze(unlocked)});
  }

  function recordCombatFacts(facts={},event={}){
    const out=normalizeFacts(facts),board=number(event.board);
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

  window.DiceboundClassUnlockRules=Object.freeze({
    apiVersion:2,
    targetIds:TARGET_IDS,
    normalizeFacts,
    allPetsLevel10,
    petLevel10Count,
    allPetsUnlocked,
    isEligible,
    isBaseUnlocked,
    isUnlocked,
    eligibleClassIds,
    mayCommitUnlock,
    recordObservedProgress,
    resolveDynamic,
    recordCombatFacts,
    recordManaSpenderCast
  });
})();
