(() => {
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
