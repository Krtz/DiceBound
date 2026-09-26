(() => {
  "use strict";

  const OWNER="classes/necromancer";
  const BASE_GRAVE_THRESHOLD=5;
  const MIN_GRAVE_THRESHOLD=2;
  const SKELETON_MANA_COST=40;
  let runtime=null;

  function configure(next={}){
    const required=[
      "getPlayer","isActive","getCombatBusy","setCombatBusy","getEncounterTurn",
      "getCurrentEnemy","getCurrentEnemies","livingEnemies","selectEnemy",
      "spawnAlly","livingAllies","allyEffectDamage","damageAlly","damageHero",
      "allyBasicAttack","graveCoil","summonAction","ultimateAction","resolveEnemyResponse","handleHeroDeath","setCombatText",
      "addCombatHistory","updateCombatUI","playEffect","delay"
    ];
    for(const name of required)if(typeof next[name]!=="function")throw new Error("Necromancer runtime missing "+name+"().");
    runtime=next;
    return api;
  }
  function rt(){if(!runtime)throw new Error("DiceboundClasses Necromancer owner must be configured before use.");return runtime;}
  function player(){return rt().getPlayer();}
  function active(){return !!rt().isActive("necromancer");}
  const integer=value=>Math.max(0,Math.floor(Number(value)||0));

  function graveThreshold(){
    const p=player();
    return Math.max(MIN_GRAVE_THRESHOLD,integer(p.graveCountThreshold||BASE_GRAVE_THRESHOLD));
  }
  function graveCount(){return Math.max(0,integer(player().graveCount));}
  function graveReady(){return graveCount()>=graveThreshold();}

  function skeletonSpec(){
    const p=player();
    const maxHp=Math.max(1,8+Math.round(Math.max(1,Number(p.maxHp)||1)*.30));
    return Object.freeze({
      archetypeId:"skeleton-warrior",
      name:"Skeleton Warrior",
      sourceId:"necromancer:summon-skeleton",
      ownerClassId:"necromancer",
      controlMode:"automatic",
      persistence:"encounter",
      actsOnSummonTurn:true,
      targetable:true,
      healable:true,
      threatWeight:1,
      countsAsSummon:true,
      maxHp,
      hp:maxHp,
      attack:Math.max(1,2+Math.round(Math.max(0,Number(p.attack)||0)*.35)),
      defense:Math.max(0,1+Math.floor(Math.max(0,Number(p.defense)||0)*.33)),
      crit:.05,
      dodge:.02,
      echo:0,
      lifeSteal:0,
      elementProcChance:0,
      automaticActionId:"basic-attack",
      onDeathId:"necromancer:bone-shrapnel",
      tags:["summon","undead","skeleton","warrior"],
      artId:"skeleton-warrior"
    });
  }

  function addGraveCount(amount=1){
    const p=player(),gain=Math.max(0,integer(amount));
    if(!gain)return graveCount();
    p.graveCount=graveCount()+gain;
    return p.graveCount;
  }

  async function summonSkeleton(){
    const r=rt(),p=player();
    if(!active()||r.getCombatBusy()||!r.getCurrentEnemy())return Object.freeze({ok:false,reason:"unavailable"});
    if((Number(p.mana)||0)<SKELETON_MANA_COST)return Object.freeze({ok:false,reason:"mana",required:SKELETON_MANA_COST,current:Number(p.mana)||0});

    r.setCombatBusy(true);
    p.guardCooldown=0;
    p.mana-=SKELETON_MANA_COST;
    p.combatActionCount=(p.combatActionCount||0)+1;
    const out=r.spawnAlly(skeletonSpec(),{turn:r.getEncounterTurn(),replacement:"fifo"});
    if(!out.entity){
      p.mana+=SKELETON_MANA_COST;
      p.combatActionCount=Math.max(0,(p.combatActionCount||1)-1);
      r.setCombatBusy(false);
      return Object.freeze({ok:false,reason:out.reason||"spawn-failed"});
    }

    const count=addGraveCount(1),threshold=graveThreshold();
    const replaced=out.replaced?" "+out.replaced.name+" is dismissed as the oldest summon.":"";
    r.addCombatHistory("☠️ Summon Skeleton raises "+out.entity.name+" for "+SKELETON_MANA_COST+" Mana. Grave Count "+count+"/"+threshold+"."+replaced);
    r.setCombatText("☠️ A Skeleton Warrior claws its way onto your side."+replaced+" Grave Count: "+count+"/"+threshold+".");
    r.updateCombatUI();
    await r.playEffect("summonCircle",{durationMs:340});
    await r.delay(120);

    if(!r.livingEnemies().length)return Object.freeze({ok:true,entity:out.entity,replaced:out.replaced,graveCount:count});
    await r.resolveEnemyResponse(false);
    return Object.freeze({ok:true,entity:out.entity,replaced:out.replaced,graveCount:count});
  }

  function boneShrapnel(entity){
    const r=rt(),p=player();
    if(!entity||entity.onDeathId!=="necromancer:bone-shrapnel")return Object.freeze({triggered:false});
    const enemyRaw=Math.max(1,Math.round(Math.max(0,Number(p.attack)||0)*.20));
    const friendlyRaw=Math.max(1,Math.round(Math.max(0,Number(p.attack)||0)*.10));
    let enemyDamage=0,allyDamage=0,heroDamage=0;

    for(const enemy of [...r.livingEnemies()]){
      const hit=r.allyEffectDamage(entity,enemy,enemyRaw,{source:"bone-shrapnel",deathEffect:true});
      enemyDamage+=Math.max(0,Number(hit?.total)||0);
    }
    for(const ally of [...r.livingAllies()].filter(ally=>ally.instanceId!==entity.instanceId)){
      const hit=r.damageAlly(ally.instanceId,friendlyRaw,{source:"bone-shrapnel",sourceEntityId:entity.instanceId});
      allyDamage+=Math.max(0,Number(hit?.total)||0);
    }
    if(p.hp>0){
      const hit=r.damageHero(friendlyRaw,{source:"bone-shrapnel",sourceEntityId:entity.instanceId});
      heroDamage=Math.max(0,Number(hit?.total)||0);
    }

    r.playEffect("boneShrapnel",{durationMs:320});
    const note="🦴 Bone Shrapnel! "+entity.name+" explodes for "+enemyDamage+" enemy damage and "+(allyDamage+heroDamage)+" allied-side damage.";
    r.addCombatHistory(note);
    r.setCombatText(note);
    r.updateCombatUI();
    if(p.hp<=0)r.handleHeroDeath();
    return Object.freeze({triggered:true,enemyDamage,allyDamage,heroDamage});
  }

  async function armyOfTheDead({livingMultiplier=2.5,spectralMultiplier=1.5}={}){
    const r=rt(),p=player();
    if(!active()||r.getCombatBusy()||!r.getCurrentEnemy()||!graveReady())return Object.freeze({ok:false,reason:"unavailable"});
    r.setCombatBusy(true);
    await r.playEffect("graveBurst",{durationMs:420});
    const allies=[...r.livingAllies()].filter(ally=>ally.ownerClassId==="necromancer");
    let total=0,attacks=0;
    for(const ally of allies){
      if(!r.livingEnemies().length)break;
      const result=await r.allyBasicAttack(ally,{multiplier:livingMultiplier,label:ally.name+" · Army of the Dead"});
      total+=Math.max(0,Number(result?.total)||0);attacks++;
    }
    const empty=Math.max(0,Math.min(Number(p.maxActiveAllies)||2,2)-allies.length);
    for(let i=0;i<empty;i++){
      if(!r.livingEnemies().length)break;
      const spectral={...skeletonSpec(),instanceId:"spectral-"+(i+1),name:"Spectral Skeleton",hp:1,maxHp:1};
      const result=await r.allyBasicAttack(spectral,{multiplier:spectralMultiplier,label:"Spectral Skeleton · Army of the Dead",spectral:true});
      total+=Math.max(0,Number(result?.total)||0);attacks++;
    }
    p.graveCount=0;
    r.addCombatHistory("💀⚔️ Army of the Dead surges for "+total+" total damage across "+attacks+" strike"+(attacks===1?"":"s")+".");
    r.setCombatText("💀⚔️ Army of the Dead deals "+total+" total damage. Grave Count resets to 0/"+graveThreshold()+".");
    r.updateCombatUI();
    await r.delay(360);
    if(!r.livingEnemies().length)return Object.freeze({ok:true,total,attacks});
    await r.resolveEnemyResponse(false);
    return Object.freeze({ok:true,total,attacks});
  }

  function actionDescriptors(){
    if(!active())return [];
    return [
      Object.freeze({
        id:"grave-coil",
        label:"Grave Coil",
        icon:"🟣",
        description:"Attack with grave magic and generate your live resolved Mana-builder amount.",
        category:"class",
        order:20,
        targetPolicy:"selectedEnemy",
        enabled:()=>!rt().getCombatBusy()&&!!rt().getCurrentEnemy(),
        cost:()=>null,
        metadata:Object.freeze({fixedSlot:"attack",source:"class"}),
        execute:()=>rt().graveCoil()
      }),
      Object.freeze({
        id:"summon-skeleton",
        label:"Summon Skeleton",
        icon:"☠️",
        description:"Spend 40 Mana to raise a targetable Skeleton Warrior. At the ally cap, the oldest summon is replaced.",
        category:"class",
        order:30,
        targetPolicy:"none",
        enabled:()=>!rt().getCombatBusy()&&!!rt().getCurrentEnemy()&&(Number(player().mana)||0)>=SKELETON_MANA_COST,
        cost:()=>({resource:"mana",amount:SKELETON_MANA_COST}),
        metadata:Object.freeze({fixedSlot:"special",source:"class"}),
        execute:()=>rt().summonAction()
      }),
      Object.freeze({
        id:"army-of-the-dead",
        label:"Army of the Dead",
        icon:"💀⚔️",
        description:"When Grave Count is ready, living summons strike at 250% and empty ally slots contribute spectral strikes.",
        category:"ultimate",
        order:80,
        targetPolicy:"selectedEnemy",
        enabled:()=>!rt().getCombatBusy()&&!!rt().getCurrentEnemy()&&graveReady(),
        cost:()=>({resource:"grave-count",amount:graveThreshold()}),
        metadata:Object.freeze({fixedSlot:"ultimate",source:"class",readiness:"grave-count"}),
        execute:()=>rt().ultimateAction()
      })
    ];
  }

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,
    configure,
    skeletonSpec,
    graveCount,
    graveThreshold,
    graveReady,
    summonSkeleton,
    boneShrapnel,
    armyOfTheDead,
    actionDescriptors,
    manaCost:SKELETON_MANA_COST,
    baseGraveThreshold:BASE_GRAVE_THRESHOLD,
    minimumGraveThreshold:MIN_GRAVE_THRESHOLD
  });
  window.DiceboundNecromancer=api;
  const facade=window.DiceboundClasses;
  if(!facade?._installNecromancer)throw new Error("classes/necromancer.js requires DiceboundClasses facade before loading.");
  facade._installNecromancer(api);
})();
