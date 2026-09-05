/* DiceBound Pet chooser presentation owner.
 *
 * This module owns the Companion destination: surface composition, roster
 * rendering, semantic portrait art, viewport-safe Done chrome and chooser
 * interaction. Pet definitions, unlock/progress state, bond mechanics,
 * switching policy, persistence and HUD updates are supplied through
 * configure() and remain authoritative outside this UI owner.
 */
(function(root){
  'use strict';

  const OWNER='ui/pet-chooser';
  const STYLE_ID='dicebound-pet-chooser-owner';
  let runtime={};

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }
  function rawState(){return runtime.getState?.()||{};}
  function petArt(def){
    return runtime.resolvePetArt?.(def.id)||root.DiceboundAssets?.resolvePetArt?.(def.id)||null;
  }
  function isUnlocked(def,state){return !!state.petStates?.[def.id]?.unlocked;}
  function visiblePets(state){
    return (state.pets||[]).filter(def=>def?.id&&(!def.secret||isUnlocked(def,state)));
  }
  function switchAllowed(def,state){
    if(!isUnlocked(def,state))return false;
    if(def.id===state.activePetId)return true;
    return runtime.canSwitch?.(def.id,state)!==false;
  }
  function progressFor(def,state){
    if(!def.element)return state.unlockRequirement||0;
    return Math.min(state.unlockRequirement||0,Math.floor(state.elementProgress?.[def.element]||0));
  }
  function stateFor(def,state){return state.petStates?.[def.id]||{unlocked:false,level:1,xp:0,xpNext:2};}
  function damageFor(def,state){return runtime.damageFor?.(def.id,state)||0;}
  function bonusFor(def,state){return runtime.bonusFor?.(def.id,state)||'';}
  function elementName(def,state){return runtime.elementName?.(def.element,state)||def.element||'elemental';}

  function viewModel(){
    const current=rawState();
    const pets=visiblePets(current).map(def=>{
      const petState=stateFor(def,current);
      const active=def.id===current.activePetId;
      const unlocked=!!petState.unlocked;
      const canSwitch=switchAllowed(def,current);
      return Object.freeze({
        id:def.id,name:def.name||def.id,icon:def.icon||'🐾',desc:def.desc||'',element:def.element||null,
        active,unlocked,canSwitch,locked:!unlocked,level:Number(petState.level)||1,
        xp:Number(petState.xp)||0,xpNext:Number(petState.xpNext)||2,
        damage:damageFor(def,current),bonus:bonusFor(def,current),
        progress:progressFor(def,current),unlockRequirement:current.unlockRequirement||0,
        switchNote:current.runActive&&!canSwitch&&!active?'Switching is locked until this run ends.':''
      });
    });
    const active=pets.find(pet=>pet.active)||pets[0]||null;
    return Object.freeze({
      owner:OWNER,pets:Object.freeze(pets),activePet:active,cookies:Math.max(0,Number(current.cookies)||0),
      runActive:!!current.runActive,canFeed:!current.runActive
    });
  }

  function installStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById(STYLE_ID))return;
    const style=documentRef.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #petCollectionOverlay.pet-chooser-overlay{z-index:145;padding:clamp(8px,2vw,22px);align-items:center;justify-content:center;background:rgba(3,7,16,.78);backdrop-filter:blur(8px)}
      #petCollectionOverlay.pet-chooser-overlay.hidden{display:none}
      #petCollectionOverlay .pet-chooser-shell{width:min(1180px,100%);max-height:calc(100vh - clamp(16px,4vw,44px));overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:22px;background:linear-gradient(145deg,#111b34,#172747 55%,#10182c);box-shadow:0 28px 75px rgba(0,0,0,.55);scrollbar-color:#657ca9 transparent}
      #petCollectionOverlay .pet-chooser-chrome{position:sticky;top:0;z-index:5;display:flex;align-items:flex-start;gap:14px;padding:16px clamp(14px,3vw,28px);border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(16,27,50,.99),rgba(16,27,50,.93));backdrop-filter:blur(12px)}
      #petCollectionOverlay .pet-chooser-kicker{display:block;color:#91c5ff;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      #petCollectionOverlay .pet-chooser-chrome h2{margin:3px 0 0;font-size:clamp(20px,3vw,30px)}
      #petCollectionOverlay .pet-chooser-done{margin-left:auto;flex:0 0 auto;position:relative;z-index:6;min-width:88px}
      #petCollectionOverlay .pet-chooser-content{padding:clamp(14px,3vw,28px)}
      #petCollectionOverlay .pet-chooser-summary{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;color:#dce7fb;font-size:12px}
      #petCollectionOverlay .pet-chooser-summary span{padding:7px 10px;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.055)}
      #petCollectionOverlay .pet-chooser-feed{display:flex;flex-wrap:wrap;gap:9px;margin:0 0 16px}
      #petCollectionOverlay .pet-chooser-feed .small-btn{flex:1 1 190px}
      #petCollectionOverlay .pet-chooser-run-note{margin:0 0 16px;padding:10px 12px;border-left:3px solid #f2c86f;border-radius:8px;background:rgba(242,200,111,.09);color:#f6e7bc;font-size:12px;line-height:1.45}
      #petCollectionOverlay .pet-chooser-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;padding-bottom:18px}
      #petCollectionOverlay .pet-chooser-card{display:grid;grid-template-columns:74px minmax(0,1fr);gap:12px;align-items:center;min-height:132px;padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:linear-gradient(145deg,rgba(42,67,109,.78),rgba(20,33,60,.78));color:var(--ink);text-align:left;cursor:pointer;transition:transform .15s ease,border-color .15s ease,filter .15s ease,box-shadow .15s ease}
      #petCollectionOverlay .pet-chooser-card:hover:not(:disabled),#petCollectionOverlay .pet-chooser-card:focus-visible:not(:disabled){transform:translateY(-2px);border-color:rgba(245,200,91,.72);filter:brightness(1.08);box-shadow:0 12px 22px rgba(0,0,0,.24)}
      #petCollectionOverlay .pet-chooser-card.active{border-color:#f4c85e;box-shadow:0 0 0 2px rgba(244,200,94,.16) inset,0 0 24px rgba(244,200,94,.13)}
      #petCollectionOverlay .pet-chooser-card.locked{opacity:.55;filter:grayscale(.58);cursor:not-allowed}
      #petCollectionOverlay .pet-chooser-art{display:flex;align-items:center;justify-content:center;width:74px;height:74px;border-radius:16px;background:radial-gradient(circle,rgba(255,255,255,.14),rgba(255,255,255,.025));overflow:hidden}
      #petCollectionOverlay .pet-chooser-art img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 7px 8px rgba(0,0,0,.4));pointer-events:none;user-select:none}
      #petCollectionOverlay .pet-chooser-art span{font-size:42px;line-height:1}
      #petCollectionOverlay .pet-chooser-copy{min-width:0;display:grid;gap:5px}
      #petCollectionOverlay .pet-chooser-name{font-size:16px;font-weight:900}.pet-chooser-status{color:#f5d67e;font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
      #petCollectionOverlay .pet-chooser-desc,#petCollectionOverlay .pet-chooser-facts{font-size:11px;line-height:1.42;color:var(--muted)}
      #petCollectionOverlay .pet-chooser-facts{color:#e9e0c8;font-weight:750}.pet-chooser-bonus{color:#aee5d1}.pet-chooser-lock{color:#f0c37b}
      @media(max-width:640px){#petCollectionOverlay.pet-chooser-overlay{padding:0;align-items:stretch}#petCollectionOverlay .pet-chooser-shell{width:100%;max-height:100vh;border-radius:0;border-width:0;min-height:100vh}#petCollectionOverlay .pet-chooser-chrome{padding:14px 16px}#petCollectionOverlay .pet-chooser-chrome h2{font-size:22px}#petCollectionOverlay .pet-chooser-content{padding:14px 16px 28px}#petCollectionOverlay .pet-chooser-grid{grid-template-columns:1fr}#petCollectionOverlay .pet-chooser-card{grid-template-columns:62px minmax(0,1fr);min-height:110px}#petCollectionOverlay .pet-chooser-art{width:62px;height:62px}}
    `;
    documentRef.head?.appendChild(style);
  }

  function ensureSurface(){
    const documentRef=doc();
    let overlay=find('petCollectionOverlay');
    if(!documentRef)return null;
    if(!overlay){overlay=documentRef.createElement('div');overlay.id='petCollectionOverlay';documentRef.body?.appendChild(overlay);}
    installStyles();
    overlay.classList.add('overlay','pet-chooser-overlay');
    overlay.dataset.petChooserOwner=OWNER;
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Choose companion');
    if(overlay.dataset.petChooserSurface!=='1'){
      overlay.dataset.petChooserSurface='1';
      overlay.innerHTML=`<section class="pet-chooser-shell"><header class="pet-chooser-chrome"><div><span class="pet-chooser-kicker">Between expeditions</span><h2>Choose your companion</h2></div><button type="button" class="small-btn pet-chooser-done" data-pet-chooser-done>Done</button></header><div class="pet-chooser-content"><div class="pet-chooser-summary" data-pet-chooser-summary></div><div class="pet-chooser-feed" data-pet-chooser-feed></div><p class="pet-chooser-run-note" data-pet-chooser-run-note hidden></p><div class="pet-chooser-grid" data-pet-chooser-grid></div></div></section>`;
      overlay.querySelector('[data-pet-chooser-done]')?.addEventListener('click',close);
    }
    return overlay;
  }

  function cardMarkup(pet){
    const art=petArt(pet),src=art?.portrait||art?.image||'';
    const artHtml=src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(art?.alt||pet.name)}" draggable="false">`:`<span aria-hidden="true">${escapeHtml(pet.icon)}</span>`;
    const status=pet.active?'Current companion':pet.unlocked?'Unlocked':'Locked';
    const facts=pet.unlocked
      ?`Bond Lv ${pet.level} · ${pet.damage} base damage · ${pet.xp}/${pet.xpNext} bond${pet.bonus?`<br><span class="pet-chooser-bonus">${escapeHtml(pet.bonus)}</span>`:''}${pet.switchNote?`<br><span class="pet-chooser-lock">${escapeHtml(pet.switchNote)}</span>`:''}`
      :`<span class="pet-chooser-lock">Locked · ${pet.progress}/${pet.unlockRequirement} ${escapeHtml(elementName(pet,rawState()))} damage or healing</span>`;
    return `<button type="button" class="pet-chooser-card${pet.active?' active':''}${pet.locked?' locked':''}" data-pet-choice="${escapeHtml(pet.id)}" aria-pressed="${pet.active?'true':'false'}" ${(!pet.unlocked||!pet.canSwitch)?'disabled':''}><span class="pet-chooser-art">${artHtml}</span><span class="pet-chooser-copy"><span class="pet-chooser-name">${escapeHtml(pet.name)}</span><span class="pet-chooser-status">${status}</span><span class="pet-chooser-desc">${escapeHtml(pet.desc)}</span><span class="pet-chooser-facts">${facts}</span></span></button>`;
  }

  function render(){
    const model=viewModel();
    const overlay=ensureSurface();
    if(!overlay)return model;
    const summary=overlay.querySelector('[data-pet-chooser-summary]');
    if(summary){
      const active=model.activePet;
      summary.innerHTML=`<span>${escapeHtml(active?.icon||'🐾')} ${escapeHtml(active?.name||'No companion')} active</span><span>Bond Lv ${active?.level||1}</span><span>🍪 ${model.cookies} cookies</span>`;
    }
    const feedControls=overlay.querySelector('[data-pet-chooser-feed]');
    if(feedControls){
      const active=model.activePet;
      feedControls.hidden=!!model.runActive;
      feedControls.innerHTML=model.runActive?'':`<button type="button" class="small-btn" data-pet-feed="one" ${model.canFeed&&model.cookies>0?'':'disabled'}>🍪 Feed ${escapeHtml(active?.name||'active pet')} · 1</button><button type="button" class="small-btn" data-pet-feed="all" ${model.canFeed&&model.cookies>0?'':'disabled'}>🍪 Feed all · ${model.cookies}</button>`;
    }
    const note=overlay.querySelector('[data-pet-chooser-run-note]');
    if(note){note.hidden=!model.runActive;note.textContent='Only pet-specialist classes can switch companions during an active expedition. Your current companion remains available to inspect.';}
    const grid=overlay.querySelector('[data-pet-chooser-grid]');
    if(grid){
      grid.innerHTML=model.pets.map(cardMarkup).join('');
      grid.querySelectorAll('[data-pet-choice]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.petChoice)));
    }
    overlay.querySelectorAll('[data-pet-feed]').forEach(button=>button.addEventListener('click',()=>feed(button.dataset.petFeed==='all'?model.cookies:1)));
    runtime.afterRender?.(model);
    return model;
  }
  function open(){const overlay=ensureSurface();render();if(overlay){overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');}return overlay;}
  function close(){const overlay=find('petCollectionOverlay');if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}runtime.onClose?.();return overlay||null;}
  function select(id){
    const model=viewModel(),pet=model.pets.find(entry=>entry.id===id);
    if(!pet||!pet.unlocked||!pet.canSwitch||pet.active)return false;
    const selected=runtime.selectPet?.(id,model)!==false;
    if(selected)render();
    return selected;
  }
  function feed(count){
    if(rawState().runActive||!(Number(count)>0))return false;
    const result=runtime.feed?.(count);
    render();
    return result!==false;
  }
  function bindTrigger(){
    const trigger=find('petCollectionBtn');
    if(!trigger||trigger.dataset.petChooserWired==='1')return;
    trigger.dataset.petChooserWired='1';trigger.addEventListener('click',open);
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};bindTrigger();return api;}
  function inspect(){
    const overlay=find('petCollectionOverlay');
    return Object.freeze({owner:overlay?.dataset.petChooserOwner||null,open:!!overlay&&!overlay.classList.contains('hidden'),cards:overlay?.querySelectorAll?.('[data-pet-choice]').length||0,hasDone:!!overlay?.querySelector?.('[data-pet-chooser-done]'),activePet:viewModel().activePet?.id||null});
  }

  const api=Object.freeze({configure,open,close,render,refresh:render,select,feed,viewModel,inspect,owner:OWNER});
  window.DiceboundPetChooser=api;
})(window);
