/* DiceBound Class chooser presentation owner.
 *
 * This module owns the Camp class-selection destination: roster rendering,
 * selected-class detail, semantic class art, Random selection state, and the
 * compact-screen dismissal chrome.  It deliberately receives class data,
 * unlock policy, persistence, RNG and Camp navigation through configure();
 * those systems remain authoritative in their existing owners.
 */
(function(root){
  'use strict';

  const DEFAULT_ORDER=Object.freeze([
    'ranger','sorcerer','fighter','monk','berserker','cleric','clown','rogue',
    'alchemist','beastmaster','paladin','bloodmage','rouge','frog','turtle','vampire',
    'ninja','d20','slime','ceo','merchant','summoner','pokemontrainer','ouroboros',
    'slimerouge'
  ]);
  const RANDOM_MINIMUM=5;

  let runtime={};
  let randomMode=false;
  let randomLastClass=null;

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function state(){return runtime.getState?.()||{classes:[],selectedClassId:'ranger'};}
  function classArt(classId){return runtime.resolveClassArt?.(classId)||root.DiceboundAssets?.resolveClassArt?.(classId)||null;}
  function orderedClasses(input){
    const classes=Array.isArray(input)?input:[];
    const byId=new Map(classes.map(entry=>[entry?.id,entry]));
    const known=(runtime.order||DEFAULT_ORDER).map(id=>byId.get(id)).filter(Boolean);
    return [...known,...classes.filter(entry=>entry?.id&&!known.includes(entry))];
  }
  function unlockedPool(current=state()){
    return (current.classes||[]).filter(entry=>runtime.isUnlocked?.(entry.id));
  }
  function classIdentityNote(entry,current){
    const note=runtime.identityNote?.(entry,current);
    return note||(entry.passive?`Identity: ${entry.passive.name}.`:'');
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[char]);
  }
  function classImage(entry,kind,extraClass=''){
    const art=classArt(entry.id),src=kind==='battle'?(art?.battle||art?.campsite||art?.headshot):(art?.headshot||art?.campsite||art?.battle);
    return src?`<img class="class-chooser-art class-chooser-art-${kind} ${extraClass}" src="${escapeHtml(src)}" alt="${escapeHtml(art?.alt||entry.name)}" draggable="false">`:`<span class="class-chooser-emoji" aria-hidden="true">${escapeHtml(entry.icon||'🎲')}</span>`;
  }
  function tagHtml(entry){return runtime.tagChips?.(entry.tags||[],'class')||'';}
  function cardCopy(entry,unlocked,currentSelected){
    const lock=unlocked?'Unlocked':(entry.unlock||'Locked');
    return `<button type="button" class="class-choice-card${currentSelected?' selected':''}${unlocked?'':' locked'}" data-class-choice="${escapeHtml(entry.id)}" aria-pressed="${currentSelected?'true':'false'}">
      <span class="class-choice-portrait">${classImage(entry,'headshot')}</span>
      <span class="class-choice-copy"><span class="class-choice-name">${escapeHtml(entry.name)}</span><span class="class-choice-role">${escapeHtml(entry.desc||'')}</span><span class="class-choice-lock">${unlocked?'✓ Unlocked':`🔒 ${escapeHtml(lock)}`}</span></span>
    </button>`;
  }
  function randomCard(current,selected){
    const pool=unlockedPool(current);
    if(pool.length<RANDOM_MINIMUM)return '';
    const art=runtime.resolveRandomClassArt?.()||root.DiceboundAssets?.resolveRandomClassArt?.(),image=art?.campsite||art?.image;
    return `<button type="button" class="class-choice-card class-choice-random random-class-card${selected?' selected':''}" data-class-choice="random" aria-pressed="${selected?'true':'false'}">
      <span class="class-choice-random-art" aria-hidden="true">${image?`<img src="${escapeHtml(image)}" alt="" draggable="false">`:'<span>🎲</span><i>?</i>'}</span>
      <span class="class-choice-copy"><span class="class-choice-name">Random</span><span class="class-choice-role">Let the Campsite choose one of your currently unlocked classes when the expedition begins.</span><span class="class-choice-lock">${pool.length} unlocked classes in the current pool</span></span>
    </button>`;
  }
  function detailCopy(entry,unlocked,current){
    if(!entry)return '<div class="class-chooser-empty">Choose an adventurer to inspect their expedition identity.</div>';
    const identity=classIdentityNote(entry,current);
    const lock=unlocked?'Ready for an expedition':(entry.unlock||'This class is still locked.');
    const alchemist=entry.id==='alchemist'?runtime.getAlchemistProgress?.():null;
    return `<div class="class-detail-art">${classImage(entry,'battle')}</div>
      <div class="class-detail-copy"><div class="class-detail-kicker">${unlocked?'Selected roster entry':'Locked roster entry'}</div><h4>${escapeHtml(entry.name)}</h4><p class="class-detail-desc">${escapeHtml(entry.desc||'')}</p>
      <div class="class-detail-tags">${tagHtml(entry)}</div>
      ${identity?`<p class="class-detail-identity">${escapeHtml(identity)}</p>`:''}
      ${entry.passive?`<p class="class-detail-passive"><b>Innate — ${escapeHtml(entry.passive.name)}:</b> ${escapeHtml(entry.passive.desc||'')}</p>`:''}
      <dl class="class-detail-facts"><div><dt>Starting profile</dt><dd>${escapeHtml(entry.stats||'')}</dd></div><div><dt>Ultimate</dt><dd>${escapeHtml(entry.ultimate?.icon||'')} ${escapeHtml(entry.ultimate?.name||'')}</dd></div>${alchemist?`<div><dt>Potion uses</dt><dd>${escapeHtml(alchemist.used)} / ${escapeHtml(alchemist.required)}</dd></div>`:''}<div><dt>Status</dt><dd>${escapeHtml(lock)}</dd></div></dl>
      ${unlocked?`<button type="button" class="small-btn class-detail-select" data-class-select="${escapeHtml(entry.id)}">${current.selectedClassId===entry.id&&!randomMode?'Selected for next expedition':`Choose ${escapeHtml(entry.name)}`}</button>`:''}
      </div>`;
  }
  function randomDetail(current){
    const pool=unlockedPool(current);
    const art=runtime.resolveRandomClassArt?.()||root.DiceboundAssets?.resolveRandomClassArt?.(),image=art?.campsite||art?.image;
    return `<div class="class-detail-art class-detail-random-art" aria-hidden="true">${image?`<img class="class-chooser-art class-chooser-art-battle" src="${escapeHtml(image)}" alt="" draggable="false">`:'<span>🎲</span><i>?</i>'}</div><div class="class-detail-copy"><div class="class-detail-kicker">Camp choice</div><h4>Random</h4><p class="class-detail-desc">At the start of the next expedition, DiceBound chooses one unlocked class from your current roster.</p><dl class="class-detail-facts"><div><dt>Current pool</dt><dd>${pool.length} unlocked classes</dd></div><div><dt>Selection</dt><dd>Exactly one normal class choice when the run begins</dd></div></dl><button type="button" class="small-btn class-detail-select" data-class-select="random">${randomMode?'Random selected':'Choose Random'}</button></div>`;
  }
  function currentDetailClass(current){
    const classes=orderedClasses(current.classes);
    const id=randomMode?'random':(runtime.inspectedClassId||current.selectedClassId);
    return id==='random'?null:classes.find(entry=>entry.id===id)||classes.find(entry=>entry.id===current.selectedClassId)||classes[0]||null;
  }
  function updateLegacyControls(current){
    const start=find('startBtn');
    if(start){
      const selected=(current.classes||[]).find(entry=>entry.id===current.selectedClassId);
      start.textContent=randomMode?'Begin as a random unlocked class':`Begin as ${selected?.name||'Ranger'}`;
    }
    const box=find('nightmareBox'),toggle=find('nightmareToggle');
    if(box&&toggle){
      box.classList.toggle('locked',!current.nightmareUnlocked);toggle.disabled=!current.nightmareUnlocked;
      toggle.textContent=!current.nightmareUnlocked?'Locked':current.nightmareMode?'Nightmare ON':'Nightmare OFF';
      toggle.classList.toggle('active',!!current.nightmareMode);
    }
  }
  function selectClass(id){
    const current=state();
    if(id==='random'){
      if(unlockedPool(current).length<RANDOM_MINIMUM)return false;
      randomMode=true;runtime.inspectedClassId='random';render();return true;
    }
    const entry=(current.classes||[]).find(candidate=>candidate.id===id);
    if(!entry)return false;
    runtime.inspectedClassId=id;
    if(!runtime.isUnlocked?.(id)){render();return false;}
    randomMode=false;runtime.setSelectedClassId?.(id);render();return true;
  }
  function render(){
    runtime.ensureDynamicUnlocks?.();
    const current=state();
    const selected=(current.classes||[]).find(entry=>entry.id===current.selectedClassId);
    if(!selected||!runtime.isUnlocked?.(selected.id))runtime.setSelectedClassId?.('ranger');
    const refreshed=state(),grid=find('classGrid');
    if(!grid)return null;
    updateLegacyControls(refreshed);
    const classes=orderedClasses(refreshed.classes).filter(entry=>!(entry.secret&&!runtime.isUnlocked?.(entry.id)));
    const detail=currentDetailClass(refreshed),detailRandom=randomMode||runtime.inspectedClassId==='random';
    grid.className='class-chooser';
    grid.dataset.classChooserOwner='ui/class-chooser';
    grid.innerHTML=`<section class="class-chooser-shell" aria-label="Choose your class"><header class="class-chooser-header"><div><span class="class-chooser-eyebrow">Next expedition</span><h3>Choose your adventurer</h3><p>Browse the roster, inspect each identity, then select the class that leaves camp.</p></div><button type="button" class="small-btn class-chooser-done" data-class-chooser-done>Done</button></header><div class="class-chooser-layout"><nav class="class-chooser-roster" aria-label="Class roster">${randomCard(refreshed,detailRandom)}${classes.map(entry=>cardCopy(entry,!!runtime.isUnlocked?.(entry.id),!detailRandom&&detail?.id===entry.id)).join('')}</nav><aside class="class-chooser-detail" aria-live="polite">${detailRandom?randomDetail(refreshed):detailCopy(detail,!!detail&&!!runtime.isUnlocked?.(detail.id),refreshed)}</aside></div></section>`;
    grid.querySelectorAll('[data-class-choice]').forEach(button=>button.addEventListener('click',()=>selectClass(button.dataset.classChoice)));
    grid.querySelectorAll('[data-class-select]').forEach(button=>button.addEventListener('click',()=>selectClass(button.dataset.classSelect)));
    grid.querySelector('[data-class-chooser-done]')?.addEventListener('click',()=>runtime.dismiss?.());
    runtime.afterRender?.({randomMode,selectedClassId:state().selectedClassId,inspectedClassId:runtime.inspectedClassId||state().selectedClassId});
    return grid;
  }
  function resolveRandomForRun(){
    randomLastClass=null;
    if(!randomMode)return null;
    const pool=unlockedPool(state());
    if(!pool.length)return null;
    const chosen=runtime.pick?.(pool)||pool[0];
    if(!chosen?.id)return null;
    runtime.setSelectedClassId?.(chosen.id);randomLastClass=chosen.id;
    return chosen;
  }
  function setRandomMode(enabled){
    randomMode=!!enabled;
    runtime.inspectedClassId=randomMode?'random':state().selectedClassId;
    return randomMode;
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function inspect(){
    const grid=find('classGrid');
    return Object.freeze({
      owner:grid?.dataset.classChooserOwner||null,
      cards:grid?.querySelectorAll?.('.class-choice-card').length||0,
      selectedClassId:state().selectedClassId||null,
      randomMode,
      randomCard:!!grid?.querySelector?.('.class-choice-random'),
      hasDone:!!grid?.querySelector?.('[data-class-chooser-done]'),
      detail:runtime.inspectedClassId||state().selectedClassId||null
    });
  }
  const api=Object.freeze({configure,render,selectClass,resolveRandomForRun,setRandomMode,isRandomMode:()=>randomMode,lastRandomClass:()=>randomLastClass,alchemistProgress:()=>runtime.getAlchemistProgress?.()||null,unlockedPoolIds:()=>unlockedPool().map(entry=>entry.id),inspect,order:DEFAULT_ORDER,randomMinimum:RANDOM_MINIMUM});
  window.DiceboundClassChooser=api;
})(window);
