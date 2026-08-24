(() => {
  "use strict";

  function createMetaService({classIds,petIds,elementIds,petUnlockRequirement=500,saveService=window.DiceboundSave}={}){
    if(!Array.isArray(classIds)||!classIds.length)throw new Error("DiceboundCoreState requires classIds.");
    if(!Array.isArray(petIds)||!petIds.length)throw new Error("DiceboundCoreState requires petIds.");
    if(!Array.isArray(elementIds)||!elementIds.length)throw new Error("DiceboundCoreState requires elementIds.");
    classIds=[...classIds];petIds=[...petIds];elementIds=[...elementIds];
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    const legacyXpForLevel=level=>Math.max(1,Math.ceil(level<=10?8+level*2:level<=25?28+(level-10)*4:level<=50?88+(level-25)*5:level<=100?213+(level-50)*8:613+(level-100)*11));
    const defaultPrestige=()=>({count:0,maxHp:0,attack:0,defense:0,crit:0,dodge:0,luck:0,lifeSteal:0});
    const defaultPetState=(unlocked=false)=>({level:1,xp:0,xpNext:2,unlocked,progress:0});
    const defaultPets=()=>Object.fromEntries(petIds.map(id=>[id,defaultPetState(id==="neutral")]));
    const defaultSettings=()=>({masterVolume:.70,soundPack:"synth"});
    const defaultClassUnlockFacts=()=>({board3MinibossDefeated:false,board3BossDefeated:false,board4MinibossDefeated:false,beastmasterBoard5Cleared:false,roadMerchantSecretBossDefeated:false,maxLifesteal:0,manaSpenderCasts:0});
    const defaultMeta=()=>({level:1,xp:0,xpNext:legacyXpForLevel(1),points:0,runs:0,bestTiles:0,purchased:{},heirlooms:[],pets:defaultPets(),activePet:"neutral",petCookies:0,elementProgress:Object.fromEntries(elementIds.map(id=>[id,0])),damageTaken:0,prestige:defaultPrestige(),nightmareUnlocked:false,settings:defaultSettings(),classUnlockFacts:defaultClassUnlockFacts(),unlocks:Object.fromEntries(classIds.map(id=>[id,id==="ranger"]))});
    function normalizePurchased(raw={}){const out={...raw};if(Object.keys(out).length&&!out.roadborn)out.roadborn=1;return out;}
    function normalizeSavedItem(item){return item?JSON.parse(JSON.stringify(item)):item;}
    function normalizeMeta(parsed={}){
      const base=defaultMeta(),pets=defaultPets();
      Object.entries(parsed?.pets||{}).forEach(([id,state])=>{if(pets[id])pets[id]={...pets[id],...state};});
      const elementProgress={...base.elementProgress,...(parsed?.elementProgress||{})};
      elementIds.forEach(id=>{if(elementProgress[id]>=petUnlockRequirement&&pets[id])pets[id].unlocked=true;});
      const prestige={...defaultPrestige(),...(parsed?.prestige||{})};
      const unlocks={...base.unlocks,...(parsed?.unlocks||{})};
      const settings={...defaultSettings(),...(parsed?.settings||{})};
      const classUnlockFacts={...defaultClassUnlockFacts(),...(parsed?.classUnlockFacts||{})};
      settings.masterVolume=clamp(Number(settings.masterVolume),0,1);
      settings.soundPack=settings.soundPack==="custom"?"custom":"synth";
      return {...base,...parsed,xpNext:legacyXpForLevel(parsed?.level||1),purchased:normalizePurchased(parsed?.purchased||{}),heirlooms:(parsed?.heirlooms||[]).map(normalizeSavedItem),pets,elementProgress,prestige,unlocks,settings,classUnlockFacts};
    }
    function load(){
      if(!saveService)return {meta:normalizeMeta(defaultMeta()),source:"new",recovered:false,error:null};
      return saveService.loadMeta({defaultFactory:defaultMeta,normalize:normalizeMeta});
    }
    function save(meta){try{return saveService?.saveMeta(meta)??false;}catch(error){console.error("Dicebound save failed",error);return false;}}
    return Object.freeze({legacyXpForLevel,defaultPrestige,defaultPetState,defaultPets,defaultSettings,defaultMeta,normalizePurchased,normalizeSavedItem,normalizeMeta,load,save});
  }

  function createEventBus(){
    const listeners=new Map();
    return Object.freeze({
      on(type,listener){
        if(typeof listener!=="function")throw new TypeError("Dicebound state listener must be a function");
        if(!listeners.has(type))listeners.set(type,new Set());
        listeners.get(type).add(listener);
        return()=>listeners.get(type)?.delete(listener);
      },
      emit(type,result){
        for(const listener of listeners.get(type)||[])try{listener(result);}catch(error){console.error(`Dicebound state listener failed: ${type}`,error);}
        return result;
      },
    });
  }

  window.DiceboundCoreState=Object.freeze({apiVersion:1,createMetaService,createEventBus});
})();
