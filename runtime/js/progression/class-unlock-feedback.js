(() => {
  "use strict";

  const classes=window.DiceboundClasses;
  const assets=window.DiceboundAssets;
  if(!classes)throw new Error("DiceboundClassUnlockFeedback requires DiceboundClasses");

  const classRegistry=classes.createRegistry();
  const unlockRegistry=classes.createUnlockRegistry();

  const number=value=>Number(value)||0;
  const integer=value=>Math.max(0,Math.floor(number(value)));
  const formatNumber=value=>integer(value).toLocaleString("en-US");

  function statLabel(stat){
    return ({damageTaken:"damage",healingDone:"HP",highestGold:"Gold",potionsUsed:"potions",defense:"Defense",doubleStrike:"Echo Strike",crit:"Crit",bossDamage:"Boss Damage",maxLifesteal:"Lifesteal"})[stat]||String(stat||"progress");
  }

  function formatPercent(value){return `${Math.round(number(value)*100)}%`;}

  function guardianName(requirement){
    const board=integer(requirement.board);
    const guardian=requirement.guardian==="boss"?"boss":"miniboss";
    return `the Board ${board} ${guardian}`;
  }

  function secretBossName(id){
    return ({"road-merchant":"hidden Road Merchant","bloodmage-boss":"hidden Bloodmage","pale-devil":"Pale Devil"})[id]||"hidden boss";
  }

  function className(id){return classRegistry[id]?.name||String(id||"class");}

  function requirementPhrase(requirement={}){
    switch(requirement.type){
      case "always": return "This class is always available.";
      case "guardianDefeat": return `You defeated ${guardianName(requirement)}.`;
      case "prestige": return `You reached ${formatNumber(requirement.count)} Prestige points.`;
      case "lifetimeStat": {
        const amount=requirement.minimum??requirement.greaterThan;
        if(requirement.stat==="damageTaken")return `You endured ${formatNumber(amount)} total damage.`;
        if(requirement.stat==="healingDone")return `You healed ${formatNumber(amount)} total HP.`;
        if(requirement.stat==="highestGold")return `You held at least ${formatNumber(amount)} Gold at once.`;
        if(requirement.stat==="potionsUsed")return `You drank ${formatNumber(amount)} potions.`;
        return `You reached ${formatNumber(amount)} ${statLabel(requirement.stat)} over your career.`;
      }
      case "careerStat": {
        const amount=requirement.minimum??requirement.greaterThan;
        if(requirement.stat==="maxLifesteal")return `You exceeded ${formatPercent(requirement.greaterThan)} Lifesteal.`;
        return `You reached ${formatNumber(amount)} ${statLabel(requirement.stat)} over your career.`;
      }
      case "runStat": {
        const amount=requirement.minimum??requirement.greaterThan;
        const comparison=requirement.greaterThan!==undefined?"more than ":"";
        const rendered=["doubleStrike","crit","bossDamage"].includes(requirement.stat)?formatPercent(amount):formatNumber(amount);
        return `You reached ${comparison}${rendered} ${statLabel(requirement.stat)} in a run.`;
      }
      case "petLevel": return `${requirement.pet==="neutral"?"DiBo":"A companion"} reached level ${formatNumber(requirement.minimum)}.`;
      case "unlockedClassCount": return `You unlocked ${formatNumber(requirement.minimum)} classes.`;
      case "secretBossKills": return `You defeated the ${secretBossName(requirement.boss)}.`;
      case "allPetsUnlocked": return "You unlocked every companion.";
      case "petsAtLevel": return `You raised ${formatNumber(requirement.count)} companions to level ${formatNumber(requirement.level)}.`;
      case "allPetsAtLevel": return `You raised every companion to level ${formatNumber(requirement.level)}.`;
      case "boardClear": return `You cleared Board ${formatNumber(requirement.board)} with ${className(requirement.classId)}.`;
      case "boardClears": {
        const reqs=Array.isArray(requirement.requirements)?requirement.requirements:[];
        if(reqs.length===2&&reqs[0].board===reqs[1].board)return `You cleared Board ${formatNumber(reqs[0].board)} with both ${className(reqs[0].classId)} and ${className(reqs[1].classId)}.`;
        return reqs.map(requirementPhrase).join(" ");
      }
      case "classUnlocked": return `You unlocked ${className(requirement.classId)}.`;
      case "randomRunBoardClear": return `You cleared Board ${formatNumber(requirement.board)} with the Random class.`;
      case "compound": return joinRequirements(requirement.requirements||[]);
      default: return "You completed this class's unlock challenge.";
    }
  }

  function stripYou(text){return String(text||"").replace(/^You\s+/i,"").replace(/^This class\s+/i,"this class ").replace(/\.$/,"");}

  function joinRequirements(requirements=[]){
    const parts=requirements.map(requirementPhrase).filter(Boolean);
    if(parts.length<=1)return parts[0]||"You completed this class's unlock challenge.";
    const cleaned=parts.map(stripYou);
    if(cleaned.length===2)return `You ${cleaned[0]} and ${cleaned[1]}.`;
    return `You ${cleaned.slice(0,-1).join(", ")}, and ${cleaned[cleaned.length-1]}.`;
  }

  function reasonFor(classId){
    const rule=unlockRegistry[classId];
    return rule?requirementPhrase(rule):"You completed this class's unlock challenge.";
  }

  function toastFor(classId){
    const name=className(classId);
    const reason=reasonFor(classId).replace(/\.$/,"");
    return `${reason}: ${name} unlocked!`;
  }

  function revealFor(classId){
    const data=classRegistry[classId];
    if(!data)return null;
    const art=assets?.resolveClassArt?.(classId)||null;
    return Object.freeze({
      id:classId,
      name:data.name,
      art:art?.campsite||art?.headshot||null,
      artAlt:data.name,
      why:reasonFor(classId),
      identity:data.desc||"A newly remembered Way of the Road.",
      howItPlays:data.passive?.desc||data.scaleNotes||data.ultimate?.desc||"Experiment with the class to discover its defining rhythm.",
      secret:!!data.secret,
    });
  }

  window.DiceboundClassUnlockFeedback=Object.freeze({apiVersion:1,reasonFor,toastFor,revealFor,requirementPhrase});
})();
