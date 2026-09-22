/* DiceBound Powerups public subsystem facade.
 *
 * Ordinary callers depend on DiceboundPowerups rather than coordinating the
 * registry, borrowing helpers and compatibility-monolith policy directly.
 * Focused registry/borrowing modules remain specialist internals. Mutable game
 * state and neighbouring subsystem mechanics are supplied through explicit
 * runtime capabilities so this owner can preserve released ordering/RNG without
 * absorbing Classes, Progression, Items or App-Shell authority.
 */
(() => {
  "use strict";

  const OWNER="powerups/facade";
  const REGISTRY=window.DiceboundPowerupRegistry;
  const BORROWING=window.DiceboundPowerupBorrowing;
  if(!REGISTRY?.createRegistry)throw new Error("DiceboundPowerups requires DiceboundPowerupRegistry.");
  if(!BORROWING?.ownershipAllowed)throw new Error("DiceboundPowerups requires DiceboundPowerupBorrowing.");

  let runtime=Object.freeze({});
  let registryServices=null;
  let catalog=[];

  function requireCapability(name){
    const fn=runtime[name];
    if(typeof fn!=="function")throw new Error(`DiceboundPowerups capability is not configured: ${name}`);
    return fn;
  }
  function call(name,...args){return requireCapability(name)(...args);}
  function configure(nextRuntime={}){runtime=Object.freeze({...runtime,...nextRuntime});return api;}

  function createRegistry(services){
    registryServices=services;
    catalog=REGISTRY.createRegistry(services);
    return catalog;
  }
  function entries(){return catalog.slice();}
  function describe(powerup){
    if(!registryServices)throw new Error("DiceboundPowerups registry is not initialized.");
    return REGISTRY.describe(powerup,registryServices);
  }
  function ownerIds(powerup){return BORROWING.ownerIds(powerup);}
  function ownershipAllowed(powerup,borrowerId,unlockedClassIds=[]){return BORROWING.ownershipAllowed(powerup,borrowerId,unlockedClassIds);}
  function player(){return call("getPlayer");}
  function meta(){return call("getMeta");}
  function rarityInfo(){return call("getRarityInfo");}
  function gateUnlocked(gate){return call("achievementGateUnlocked",gate);}

  function classEligible(powerup){
    const p=player();
    if(p.classId==="slimerouge")return !!call("slimeRougePowerCompatible",powerup);
    let classOk=(!powerup.classId&&!powerup.classIds)||powerup.classId===p.classId||(powerup.classIds||[]).includes(p.classId);
    if(!classOk&&call("slimeIdentityActive"))classOk=!!call("slimePowerCompatible",powerup);
    return classOk;
  }
  function eligible(filter=()=>true){
    return catalog.filter(powerup=>classEligible(powerup)&&gateUnlocked(powerup.achievementGate)&&(!powerup.unique||!(player().upgradeCounts?.[powerup.id]))&&filter(powerup));
  }

  function weighted(pool){
    const p=player(),source=Array.isArray(pool)?pool:[];
    const order={poor:0,common:1,uncommon:2,rare:3,epic:4,legendary:5,artifact:6,mythical:7,omega:8};
    const progression=Object.keys(order).sort((left,right)=>order[left]-order[right]);
    const info=rarityInfo();
    const depth=(call("getBoardLevel")-1)+p.position/Math.max(1,call("currentTileCount")-1);
    const rawLuck=Math.max(0,p.luck||0);
    const weightedPool=source.map(up=>{
      const tier=order[up.rarity]??0,base=Math.max(0,info[up.rarity]?.weight||0);
      let weight=base;
      if(tier<=1)weight*=Math.max(.30,1-depth*.018);
      else weight*=1+(tier-1)*(depth*.018);
      if(up.rarity==="legendary")weight+=Math.min(.018,p.level*.00035)+depth*.0016;
      return {up,weight};
    });
    const bucketTotals=new Map();
    for(const entry of weightedPool)bucketTotals.set(entry.up.rarity,(bucketTotals.get(entry.up.rarity)||0)+entry.weight);
    const baseRows=progression.filter(id=>bucketTotals.has(id)).map(id=>[id,bucketTotals.get(id)]);
    const shiftedRows=call("cascadeLuckRows",baseRows,rawLuck,progression);
    if(Array.isArray(shiftedRows)&&shiftedRows.length){
      const shifted=new Map(shiftedRows.map(row=>[row[0],Math.max(0,Number(row[1])||0)]));
      for(const entry of weightedPool){
        const baseTotal=bucketTotals.get(entry.up.rarity)||0,target=shifted.get(entry.up.rarity)||0;
        entry.weight=baseTotal>0?entry.weight*(target/baseTotal):0;
      }
    }
    const total=weightedPool.reduce((sum,entry)=>sum+entry.weight,0);
    if(total<=0)return source[0];
    let roll=call("random")*total,fallback=source[0];
    for(const entry of weightedPool){
      if(entry.weight<=0)continue;
      fallback=entry.up;
      roll-=entry.weight;
      if(roll<=0)return entry.up;
    }
    return fallback;
  }
  function choices(filter=()=>true,count=3){
    const pool=eligible(filter),out=[];
    while(out.length<count&&pool.length){const chosen=weighted(pool);out.push(chosen);pool.splice(pool.indexOf(chosen),1);}
    return out;
  }
  function levelChoices(){return choices(()=>true,3+(player().levelChoiceBonus?1:0));}

  function apply(powerup,source="Powerup"){
    const p=player(),m=meta(),swordAndShield=!!call("hasLegendaryEffect","sword_and_shield"),attackBefore=p.attack,defenseBefore=p.defense;
    p.upgradeCounts=p.upgradeCounts||{};p.upgradeCounts[powerup.id]=(p.upgradeCounts[powerup.id]||0)+1;
    let copies=1,chaosNote="";
    if(call("classIdentityActive","d20")){
      const roll=call("rand",1,20);
      if(roll===1){const hurt=Math.max(1,Math.ceil(p.maxHp*.10));p.hp=Math.max(1,p.hp-hurt);chaosNote=`Powerup d20 rolled 1: the gift works, but probability bites for ${hurt} HP.`;}
      else if(roll<=4){p.gold=Math.max(0,p.gold-call("rand",0,12));chaosNote=`Powerup d20 rolled ${roll}: the gift works with a small financial anomaly.`;}
      else if(roll<=9){chaosNote=`Powerup d20 rolled ${roll}: the gift resolves normally.`;}
      else if(roll<=13){const stat=call("pick",["attack","defense","maxHp","crit","luck"]);if(stat==="attack")p.attack++;if(stat==="defense")p.defense++;if(stat==="maxHp"){p.maxHp+=5;p.hp+=5;}if(stat==="crit")p.crit+=.04;if(stat==="luck")p.luck+=.05;chaosNote=`Powerup d20 rolled ${roll}: normal gift plus a random ${stat} bonus.`;}
      else if(roll<=17){copies=powerup.unique?1:2;chaosNote=`Powerup d20 rolled ${roll}: probability duplicates the gift${powerup.unique?" into a safe bonus":""}.`;if(powerup.unique)p.ultimateCharge=call("clamp",p.ultimateCharge+25,0,100);}
      else if(roll===18){copies=powerup.unique?1:2;p.potions+=2;chaosNote="Powerup d20 rolled 18: doubled gift and two potions.";}
      else if(roll===19){copies=powerup.unique?1:2;p.attack+=2;p.crit+=.10;chaosNote="Powerup d20 rolled 19: doubled gift, +2 Attack and +10% Crit.";}
      else{copies=powerup.unique?1:3;p.hp=p.maxHp;m.petCookies=(m.petCookies||0)+1;call("saveMeta");chaosNote=`NATURAL 20: ${powerup.unique?"the unique gift awakens":"the gift applies three times"}, full heal and +1 pet cookie.`;}
      call("addLog",`<b>Twenty-Sider powerup roll:</b> ${chaosNote}`);call("showToast",`🎲 ${chaosNote}`,3000,true);
    }
    for(let i=0;i<copies;i++)powerup.apply();
    call("checkDynamicClassUnlocks");
    call("recordRunBuff",powerup.icon,powerup.name,`${powerup.desc}${chaosNote?` · ${chaosNote}`:""}`,powerup.rarity,source);
    call("recordPowerupTaken");
    call("syncOuroborosEconomy");
    if(swordAndShield){
      const attackGain=Math.max(0,p.attack-attackBefore),defenseGain=Math.max(0,p.defense-defenseBefore);
      if(attackGain>0)p.defense+=attackGain;
      if(defenseGain>0)p.attack+=defenseGain;
      if(attackGain||defenseGain){call("addLog",`<b>⚔️🛡️ Sword and Shield:</b> converts the upgrade into +${defenseGain} Attack and +${attackGain} Defense.`);call("showToast","⚔️🛡️ Sword and Shield");}
    }
    return powerup;
  }

  function applyRandomHighRarity(source="Sealed Relic",announce=true){
    const pool=eligible(up=>call("isPowerupRarityAtLeast",up.rarity,"uncommon")),up=call("pick",pool);
    apply(up,source);
    if(announce){call("addLog",`A ${source.toLowerCase()} grants <b>${up.name}</b>.`);call("showToast",`${rarityInfo()[up.rarity].label}: ${up.name}`);}
    return up;
  }
  function legendaryChoices(){
    const pool=[...eligible(up=>up.rarity==="legendary")],out=[];
    while(pool.length&&out.length<3){const index=call("rand",0,pool.length-1);out.push(pool.splice(index,1)[0]);}
    return out;
  }
  function fallbackRarityPool(wanted,minimumRarity=null){
    const order=["legendary","epic","rare","uncommon","common","poor"],start=Math.max(0,order.indexOf(wanted));
    const floorIndex=minimumRarity==null?order.length-1:order.indexOf(minimumRarity);
    const lowest=floorIndex>=0?floorIndex:order.length-1;
    for(let i=start;i<=lowest;i++){const pool=eligible(up=>up.rarity===order[i]);if(pool.length)return {rarity:order[i],pool};}
    for(let i=start-1;i>=0;i--){const pool=eligible(up=>up.rarity===order[i]);if(pool.length)return {rarity:order[i],pool};}
    return {rarity:null,pool:[]};
  }
  function minibossBaseTable(level=call("getBoardLevel")){return level<=1?{legendary:.08,epic:.32,rare:.76,uncommon:.95}:level===2?{legendary:.14,epic:.58,rare:.86,uncommon:.97}:{legendary:.22,epic:.58,rare:.86,uncommon:.97};}
  function minibossOddsText(level=call("getBoardLevel")){return level<=1?"8% Legendary · 24% Epic · 44% Rare · 19% Uncommon · 5% Common":level===2?"14% Legendary · 44% Epic · 28% Rare · 11% Uncommon · 3% Common":"22% Legendary · 36% Epic · 28% Rare · 11% Uncommon · 3% Common";}
  function minibossRarityRows(level=call("getBoardLevel")){
    const table=minibossBaseTable(level),bonus=(call("isNightmare")?.04:0)+(call("isHell")?.05:0);
    const legendary=Math.min(1,table.legendary+bonus),epic=Math.max(legendary,Math.min(1,table.epic+bonus)),rare=Math.max(epic,table.rare),uncommon=Math.max(rare,table.uncommon);
    const rows=[
      ["legendary",legendary],
      ["epic",Math.max(0,epic-legendary)],
      ["rare",Math.max(0,rare-epic)],
      ["uncommon",Math.max(0,uncommon-rare)],
      ["common",Math.max(0,1-uncommon)]
    ];
    return call("cascadeLuckRows",rows,Math.max(0,player().luck||0),["common","uncommon","rare","epic","legendary"]);
  }
  function rollMinibossRarity(){
    const rows=minibossRarityRows(),total=rows.reduce((sum,row)=>sum+Math.max(0,Number(row?.[1])||0),0);
    let roll=call("random")*total,fallback="common";
    for(const row of rows){
      const weight=Math.max(0,Number(row?.[1])||0);
      if(weight<=0)continue;
      fallback=row[0];
      roll-=weight;
      if(roll<=0)return row[0];
    }
    return fallback;
  }
  function minibossChoices(){
    const p=player(),count=Math.max(3,3+(p.levelChoiceBonus||0)),out=[],used=new Set(),rows=minibossRarityRows();
    const minimumRarity=["common","uncommon","rare","epic","legendary"].find(id=>(rows.find(row=>row[0]===id)?.[1]||0)>1e-12)||null;
    for(let i=0;i<count;i++){
      const wanted=rollMinibossRarity(),found=fallbackRarityPool(wanted,minimumRarity);let pool=found.pool.filter(up=>!used.has(up.id));
      if(!pool.length)pool=found.pool;if(!pool.length)break;
      const up=call("pick",pool);used.add(up.id);out.push(up);
    }
    return out;
  }

  function openLevelUp(onComplete=null){
    const p=player();if(call("isGameStarted")&&p.v26ExpandedHorizons)p.levelChoiceBonus=1;
    return call("renderLevelUp",onComplete);
  }
  function openChoice(source,onComplete,filter=()=>true,subtitle="Choose one free rarity-based powerup. Your character level does not change."){return call("renderPowerupChoice",source,onComplete,filter,subtitle);}
  function openLegendary(source,onComplete=()=>{}){return call("renderLegendaryChoice",source,onComplete);}
  function openAllEligible(source="Special Powerup Selection",onComplete=()=>{},filter=()=>true){return call("renderAllEligible",source,onComplete,filter);}
  function perfectedSignature(){return call("perfectedSignature");}

  function inspect(){return Object.freeze({owner:OWNER,apiVersion:1,catalogCount:catalog.length,configured:Object.freeze(Object.fromEntries(Object.keys(runtime).map(key=>[key,typeof runtime[key]==="function"]))) });}

  const api=Object.freeze({
    apiVersion:1,owner:OWNER,configure,createRegistry,entries,describe,ownerIds,ownershipAllowed,
    eligible,weighted,choices,levelChoices,apply,applyRandomHighRarity,legendaryChoices,
    fallbackRarityPool,minibossBaseTable,minibossOddsText,minibossRarityRows,rollMinibossRarity,minibossChoices,
    openLevelUp,openChoice,openLegendary,openAllEligible,perfectedSignature,inspect
  });
  window.DiceboundPowerups=api;
})();
