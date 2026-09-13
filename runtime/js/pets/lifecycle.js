(() => {
  "use strict";

  const OWNER="pets/lifecycle";
  const UNLOCK_REQUIREMENT=500;
  let runtime=null;

  function configure(nextRuntime){
    if(!nextRuntime||typeof nextRuntime!=="object")throw new Error("Pet lifecycle runtime is required.");
    const required=[
      "getMeta","getPlayer","getPets","getElements","isRunActive","classHasMechanic","talentRank","rand",
      "saveMeta","checkDynamicClassUnlocks","sfxLevel","sfxCoin","sfxHoly","showToast","addLog","updateMetaUI","updateHUD"
    ];
    for(const name of required)if(typeof nextRuntime[name]!=="function")throw new Error(`Pet lifecycle runtime missing ${name}().`);
    runtime=nextRuntime;
    return api;
  }

  function rt(){if(!runtime)throw new Error("DiceboundPetLifecycle must be configured before use.");return runtime;}
  function meta(){return rt().getMeta();}
  function player(){return rt().getPlayer();}
  function pets(){return rt().getPets();}
  function elements(){return rt().getElements();}

  function activeDefinition(){const m=meta(),registry=pets();return registry[m.activePet]||registry.neutral;}
  function activeState(){const m=meta();return m.pets?.[m.activePet]||m.pets?.neutral;}
  function bondLevel(id){return Math.max(1,Number(meta().pets?.[id]?.level)||1);}
  function bonusScale(id){return 1+Math.min(.50,Math.floor((bondLevel(id)-1)/5)*.08);}
  function damageExtra(id){return id&&id!=="neutral"?2+Math.floor((bondLevel(id)-1)/10):0;}
  function displayDamage(id){const state=meta().pets?.[id]||{level:1};return 1+Math.ceil((state.level||1)*.8)+(id!=="neutral"?damageExtra(id):0);}

  const BONUS_DEFS=Object.freeze({
    fire:{label:"+1 Attack",v:1,apply(p,s){p.attack+=s;},remove(p,s){p.attack-=s;}},
    ice:{label:"+1 Defense",v:1,apply(p,s){p.defense+=s;},remove(p,s){p.defense-=s;}},
    electric:{label:"+3% Crit",v:.03,apply(p,s){p.crit+=s;},remove(p,s){p.crit-=s;}},
    light:{label:"+5 Max HP",v:5,apply(p,s){p.maxHp+=s;p.hp+=s;},remove(p,s){p.maxHp=Math.max(1,p.maxHp-s);p.hp=Math.min(p.hp,p.maxHp);}},
    void:{label:"+3% Echo",v:.03,apply(p,s){p.doubleStrike+=s;},remove(p,s){p.doubleStrike-=s;}},
    nature:{label:"+10% Potion Healing",v:.10,apply(p,s){p.potionPower+=s;},remove(p,s){p.potionPower-=s;}},
    donut:{label:"+3 Max HP & +5% Potion Healing",v:0},
    tech:{label:"+8% Boss Damage",v:.08,apply(p,s){p.bossDamage+=s;},remove(p,s){p.bossDamage-=s;}},
    metal:{label:"+1 Flat Damage Reduction",v:1,apply(p,s){p.flatReduction+=s;},remove(p,s){p.flatReduction-=s;}},
    coffee:{label:"+4 Luck",v:.04,apply(p,s){p.luck+=s;},remove(p,s){p.luck-=s;}},
    radiation:{label:"+6% Element Power",v:.06,apply(p,s){p.elementDamageBonus+=s;},remove(p,s){p.elementDamageBonus-=s;}},
    gun:{label:"+5% Crit & +2 Luck",v:1,apply(p,s){p.crit+=.05*s;p.luck+=.02*s;},remove(p,s){p.crit-=.05*s;p.luck-=.02*s;}}
  });

  function bonusText(id){
    const bonus=BONUS_DEFS[id],level=bondLevel(id),scale=bonusScale(id);
    if(!bonus)return `Bonus: +${damageExtra(id)} base pet damage · Bond Lv ${level}`;
    return `Bonus: +${damageExtra(id)} base pet damage · ${bonus.label} (${Math.round(scale*100)}% bond scaling) · Bond Lv ${level}`;
  }

  function removeBonus(id,scale){
    if(!id||id==="neutral")return;
    const bonus=BONUS_DEFS[id],p=player();if(!bonus)return;
    if(id==="donut"){
      p.maxHp=Math.max(1,p.maxHp-3*scale);
      p.hp=Math.min(p.hp,p.maxHp);
      p.potionPower-=.05*scale;
      return;
    }
    bonus.remove?.(p,bonus.v*scale);
  }
  function applyBonus(id,scale){
    if(!id||id==="neutral")return;
    const bonus=BONUS_DEFS[id],p=player();if(!bonus)return;
    if(id==="donut"){
      p.maxHp+=3*scale;
      p.hp+=3*scale;
      p.potionPower+=.05*scale;
      return;
    }
    bonus.apply?.(p,bonus.v*scale);
  }
  function syncActiveBonus(force=false){
    const r=rt();if(!r.isRunActive()&&!force)return;
    const m=meta(),p=player(),next=m.activePet||"neutral",prev=p._activePetBonusId,prevScale=p._v17PetBonusScale||1;
    removeBonus(prev,prevScale);
    p._activePetBonusId=next;
    p._v17PetBonusScale=bonusScale(next);
    applyBonus(next,p._v17PetBonusScale);
  }

  function canSwitch(petId){const r=rt(),m=meta();return !r.isRunActive()||r.classHasMechanic("pet")||m.activePet===petId;}
  function select(petId){
    const r=rt(),m=meta();
    if(!canSwitch(petId)||m.activePet===petId||!m.pets?.[petId]?.unlocked)return false;
    const def=pets()[petId]||pets().neutral;m.activePet=petId;r.saveMeta();
    if(r.isRunActive())syncActiveBonus();
    r.updateMetaUI();r.updateHUD();r.showToast(`${def.icon} ${def.name} selected`);return true;
  }

  function feed(count=1){
    const r=rt(),m=meta(),p=player(),state=activeState(),def=activeDefinition(),actual=Math.min(count,m.petCookies);
    if(actual<=0)return;
    m.petCookies-=actual;state.xp+=actual*(1+p.cookieBondBonus);let levels=0;
    while(state.xp>=state.xpNext){state.xp-=state.xpNext;state.level++;state.xpNext=2+Math.floor(state.level*.7);levels++;}
    r.saveMeta();r.checkDynamicClassUnlocks();levels?r.sfxLevel():r.sfxCoin();
    r.showToast(levels?`${def.name} gained ${levels} level${levels===1?"":"s"}!`:`${def.name} ate ${actual} cookie${actual===1?"":"s"}`);
    r.updateMetaUI();
  }

  function trackElementProgress(key,amount){
    const r=rt(),m=meta(),elementRegistry=elements();
    if(!key||!elementRegistry[key]||amount<=0)return;
    m.elementProgress[key]=(m.elementProgress[key]||0)+amount;const state=m.pets[key];
    if(state&&!state.unlocked&&m.elementProgress[key]>=UNLOCK_REQUIREMENT){
      state.unlocked=true;r.saveMeta();r.sfxHoly();
      const def=pets()[key];r.showToast(`NEW PET UNLOCKED · ${def.icon} ${def.name}`,3400,true);
      r.addLog(`<b>Elemental companion unlocked:</b> ${def.name} after ${Math.floor(m.elementProgress[key])} ${elementRegistry[key].name} damage/healing.`);
    }else r.saveMeta();
  }

  function shuffledPetIds(){
    const arr=Object.keys(pets()),r=rt();
    for(let i=arr.length-1;i>0;i--){const j=r.rand(0,i),value=arr[i];arr[i]=arr[j];arr[j]=value;}
    return arr;
  }

  function chooserState(){
    const m=meta();
    return {pets:Object.values(pets()),petStates:m.pets||{},elementProgress:m.elementProgress||{},activePetId:m.activePet,cookies:m.petCookies||0,unlockRequirement:UNLOCK_REQUIREMENT,runActive:!!rt().isRunActive()};
  }
  function elementName(id){return elements()[id]?.name||"elemental";}
  function neutralBonusText(){return "Neutral companion · no stat bonus";}

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,unlockRequirement:UNLOCK_REQUIREMENT,configure,
    activeDefinition,activeState,bondLevel,bonusScale,damageExtra,displayDamage,bonusText,neutralBonusText,
    syncActiveBonus,canSwitch,select,feed,trackElementProgress,shuffledPetIds,chooserState,elementName
  });
  window.DiceboundPetLifecycle=api;
})();
