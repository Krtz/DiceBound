/* DiceBound Echo Crucible progression domain.
 *
 * Owns the permanent learned Legendary-effect library, one global selected
 * Echo, Moon Metal and the pure sacrifice transaction. Persistence, UI and
 * active-run locking are composition concerns.
 */
(() => {
  "use strict";

  const OWNER="progression/echo-crucible";
  const clone=value=>JSON.parse(JSON.stringify(value));
  const finite=value=>Math.max(0,Math.floor(Number(value)||0));

  function createController({effects=[]}={}){
    const effectList=Object.freeze([...(effects||[])]);
    const effectById=Object.freeze(Object.fromEntries(effectList.map(effect=>[String(effect.id),effect])));
    const effectIds=new Set(Object.keys(effectById));

    function normalize(raw={}){
      const learned=[];
      for(const id of Array.isArray(raw?.learnedEffectIds)?raw.learnedEffectIds:[]){
        const key=String(id||"");
        if(effectIds.has(key)&&!learned.includes(key))learned.push(key);
      }
      const selected=String(raw?.selectedEffectId||"");
      return {
        learnedEffectIds:learned,
        selectedEffectId:learned.includes(selected)?selected:null,
        moonMetal:finite(raw?.moonMetal)
      };
    }

    function effect(id){return effectById[String(id||"")]||null;}
    function effectCompatible(id,classId){
      const entry=effect(id);
      if(!entry)return false;
      return !Array.isArray(entry.classes)||!entry.classes.length||entry.classes.includes(String(classId||""));
    }
    function runEffectId(raw){return normalize(raw).selectedEffectId;}
    function select(raw,id){
      const state=normalize(raw);
      if(id==null||id===""){state.selectedEffectId=null;return Object.freeze({ok:true,state:Object.freeze(state),effect:null});}
      const key=String(id),entry=effect(key);
      if(!entry)return Object.freeze({ok:false,reason:"Unknown Legendary Effect.",state:Object.freeze(state)});
      if(!state.learnedEffectIds.includes(key))return Object.freeze({ok:false,reason:"Sacrifice this Legendary Effect before selecting it.",state:Object.freeze(state)});
      state.selectedEffectId=key;
      return Object.freeze({ok:true,state:Object.freeze(state),effect:entry});
    }
    function isEligibleItem(item){
      return !!item&&String(item.rarity||"").toLowerCase()==="legendary"&&item.legendaryGenerated===true&&!!effect(item.legendaryEffectId);
    }
    function sacrifice({state:rawState,storage=[],activeHeirlooms=[],itemId}={}){
      const state=normalize(rawState),id=String(itemId||""),source=Array.isArray(storage)?storage:[];
      const matches=source.map((item,index)=>({item,index})).filter(entry=>String(entry.item?.id||"")===id);
      if(!id||matches.length!==1)return Object.freeze({ok:false,reason:matches.length>1?"Ambiguous stored item identity.":"Legendary item is no longer in the Vault.",state:Object.freeze(state),storage:clone(source)});
      const {item,index}=matches[0];
      if(!isEligibleItem(item))return Object.freeze({ok:false,reason:"Only generated Legendary gear with a stable Legendary Effect can be sacrificed.",state:Object.freeze(state),storage:clone(source)});
      if((activeHeirlooms||[]).some(active=>String(active?.id||"")===id))return Object.freeze({ok:false,reason:"Remove this item from the active Heirloom loadout before sacrificing it.",state:Object.freeze(state),storage:clone(source)});
      const effectId=String(item.legendaryEffectId),entry=effect(effectId),known=state.learnedEffectIds.includes(effectId);
      if(known)state.moonMetal+=1;
      else state.learnedEffectIds.push(effectId);
      const nextStorage=clone(source);nextStorage.splice(index,1);
      return Object.freeze({
        ok:true,
        state:Object.freeze(state),
        storage:Object.freeze(nextStorage),
        item:Object.freeze(clone(item)),
        effect:entry,
        outcome:known?"moon-metal":"learned",
        moonMetalGained:known?1:0
      });
    }
    function inspect(raw,{classId=null}={}){
      const state=normalize(raw),selected=effect(state.selectedEffectId);
      return Object.freeze({
        owner:OWNER,
        learnedEffectIds:Object.freeze([...state.learnedEffectIds]),
        learnedEffects:Object.freeze(state.learnedEffectIds.map(effect).filter(Boolean)),
        selectedEffectId:state.selectedEffectId,
        selectedEffect:selected,
        selectedCompatible:selected?effectCompatible(selected.id,classId):true,
        moonMetal:state.moonMetal,
        effects:effectList
      });
    }
    function warning(raw,{classId=null,randomClass=false}={}){
      const state=normalize(raw),selected=effect(state.selectedEffectId);
      if(!selected||!Array.isArray(selected.classes)||!selected.classes.length)return null;
      if(randomClass)return `${selected.name} is class-specific (${selected.classes.join(", ")}). Random Class may roll an incompatible hero, in which case the Echo will do nothing for that run.`;
      if(effectCompatible(selected.id,classId))return null;
      return `${selected.name} is incompatible with ${classId||"the selected class"}. The Echo will remain selected but do nothing for this run.`;
    }
    return Object.freeze({owner:OWNER,normalize,effect,effectCompatible,runEffectId,select,isEligibleItem,sacrifice,inspect,warning});
  }

  window.DiceboundEchoCrucible=Object.freeze({apiVersion:1,owner:OWNER,createController});
})();