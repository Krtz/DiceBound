/* DiceBound Achievements / Trophy presentation owner.
 *
 * Achievement definitions, completion rules, unlock state, save persistence and
 * reward eligibility remain in the progression/runtime domains.  This module
 * owns only the player-facing Trophy destination: hierarchy composition,
 * secret-safe cards, responsive scrolling and persistent dismissal chrome.
 */
(function(root){
  'use strict';

  const OWNER='ui/achievements';
  const STYLE_ID='dicebound-achievements-ui-owner';
  let runtime={};

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }
  function achievementDomain(){return root.DiceboundAchievements||{};}
  function registry(){return runtime.getRegistry?.()||[];}
  function classes(){return runtime.getClasses?.()||[];}
  function isClassUnlocked(classId){return runtime.isClassUnlocked?.(classId)!==false;}
  function isDone(entry){return !!runtime.isDone?.(entry);}
  function descriptionFor(entry){return runtime.descriptionFor?.(entry)||'';}
  function heroMasteryEntries(classId){return runtime.heroMasteryEntries?.(classId)||[];}
  function openState(){return runtime.getOpenState?.()||{};}
  function groupOpen(id,defaultOpen=false){
    const value=openState()?.[id];
    return value===undefined?defaultOpen:!!value;
  }
  function cardModel(entry){
    const done=!!entry.done;
    const hidden=!!entry.hidden&&!done;
    return Object.freeze({
      id:String(entry.id||''),name:hidden?'???':String(entry.name||'Achievement'),
      description:hidden?'A secret achievement.':String(entry.description||''),done,hidden
    });
  }
  function countDone(entries){return entries.filter(entry=>entry.done).length;}
  function rootGroups(){
    return (achievementDomain().groups||[]).filter(group=>group?.id&&group.id!=='hero-mastery').map(group=>{
      const entries=registry().filter(entry=>entry?.hierarchy?.group===group.id).map(entry=>cardModel({
        id:entry.id,name:entry.name,description:descriptionFor(entry),done:isDone(entry),hidden:!!entry.secret
      }));
      return Object.freeze({
        id:`top:${group.id}`,groupId:group.id,label:String(group.label||group.id),
        entries:Object.freeze(entries),done:countDone(entries),total:entries.length,open:groupOpen(`top:${group.id}`,group.id==='roads')
      });
    });
  }
  function heroGroups(){
    return classes().filter(hero=>hero?.id).map(hero=>{
      const hidden=!!hero.secret&&!isClassUnlocked(hero.id);
      const milestones=registry().filter(entry=>entry?.hierarchy?.heroId===hero.id).map(entry=>cardModel({
        id:`milestone:${entry.id}`,name:entry.name,description:descriptionFor(entry),done:isDone(entry),hidden:!!entry.secret
      }));
      const talents=heroMasteryEntries(hero.id).map(entry=>cardModel(entry));
      const entries=hidden?[]:[...milestones,...talents];
      if(!hidden&&!entries.length){
        entries.push(cardModel({id:`empty:${hero.id}`,name:'No authored mastery unlocks yet',description:'This hero has a reserved mastery subgroup for future authored unlocks.'}));
      }
      return Object.freeze({
        id:`hero:${hero.id}`,heroId:hero.id,label:hidden?'❔ Unrevealed hero':`${hero.icon||'✨'} ${hero.name||hero.id}`,
        hidden,entries:Object.freeze(entries),done:countDone(entries),total:hidden?0:entries.length,open:groupOpen(`hero:${hero.id}`,false)
      });
    });
  }
  function viewModel(){
    const groups=rootGroups(),heroes=heroGroups();
    return Object.freeze({
      owner:OWNER,groups:Object.freeze(groups),heroes:Object.freeze(heroes),
      heroMastery:Object.freeze({id:'top:hero-mastery',label:'✨ Hero Mastery',done:heroes.reduce((total,group)=>total+group.done,0),total:heroes.reduce((total,group)=>total+group.total,0),open:groupOpen('top:hero-mastery',false)})
    });
  }

  function installStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById(STYLE_ID))return;
    const style=documentRef.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #achievementOverlay.achievements-overlay{z-index:145;padding:clamp(8px,2vw,22px);align-items:center;justify-content:center;background:rgba(3,7,16,.78);backdrop-filter:blur(8px)}
      #achievementOverlay.achievements-overlay.hidden{display:none}
      #achievementOverlay .achievements-shell{width:min(1180px,100%);max-height:calc(100vh - clamp(16px,4vw,44px));overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:22px;background:linear-gradient(145deg,#111b34,#172747 55%,#10182c);box-shadow:0 28px 75px rgba(0,0,0,.55);scrollbar-color:#657ca9 transparent}
      #achievementOverlay .achievements-chrome{position:sticky;top:0;z-index:5;display:flex;align-items:flex-start;gap:14px;padding:16px clamp(14px,3vw,28px);border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(16,27,50,.99),rgba(16,27,50,.93));backdrop-filter:blur(12px)}
      #achievementOverlay .achievements-kicker{display:block;color:#91c5ff;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      #achievementOverlay .achievements-chrome h2{margin:3px 0 0;font-size:clamp(20px,3vw,30px)}
      #achievementOverlay .achievements-done{margin-left:auto;flex:0 0 auto;position:relative;z-index:6;min-width:88px}
      #achievementOverlay .achievements-content{padding:clamp(14px,3vw,28px) clamp(14px,3vw,30px) 28px}
      #achievementOverlay .achievements-intro{margin:0 0 16px;color:#dce7fb;font-size:12px;line-height:1.45}
      #achievementOverlay .achievements-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding-bottom:18px}
      #achievementOverlay .achievement-group{grid-column:1/-1;border:1px solid rgba(181,140,255,.28);border-radius:12px;background:rgba(20,29,51,.56);overflow:hidden}
      #achievementOverlay .achievement-group>summary,#achievementOverlay .achievement-subgroup>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;padding:11px 13px;font-weight:900;letter-spacing:.04em;list-style:none}
      #achievementOverlay .achievement-group>summary::-webkit-details-marker,#achievementOverlay .achievement-subgroup>summary::-webkit-details-marker{display:none}
      #achievementOverlay .achievement-group>summary::before,#achievementOverlay .achievement-subgroup>summary::before{content:'▸';transition:transform .14s ease}
      #achievementOverlay .achievement-group[open]>summary::before,#achievementOverlay .achievement-subgroup[open]>summary::before{transform:rotate(90deg)}
      #achievementOverlay .achievement-group-count{margin-left:auto;color:#f6d881;font-size:11px;font-variant-numeric:tabular-nums}
      #achievementOverlay .achievement-group-body{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;padding:0 10px 10px}
      #achievementOverlay .achievement-subgroup{grid-column:1/-1;border:1px solid rgba(255,255,255,.11);border-radius:9px;background:rgba(7,12,25,.34)}
      #achievementOverlay .achievement-subgroup>.achievement-group-body{grid-template-columns:repeat(auto-fit,minmax(205px,1fr));padding:0 8px 8px}
      #achievementOverlay .achievement-subgroup.secret-locked>summary{color:var(--muted)}
      #achievementOverlay .achievement-group:focus-within,#achievementOverlay .achievement-subgroup:focus-within{border-color:rgba(245,200,91,.55)}
      #achievementOverlay .achievement{padding:11px;border-radius:13px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}
      #achievementOverlay .achievement.done{border-color:rgba(98,215,154,.55);background:rgba(98,215,154,.08)}
      #achievementOverlay .achievement.secret-locked{background:linear-gradient(145deg,rgba(80,45,105,.22),rgba(20,18,31,.55));border-color:rgba(181,140,255,.20)}
      #achievementOverlay .achievement b,#achievementOverlay .achievement span{display:block}
      #achievementOverlay .achievement span{font-size:10px;color:var(--muted);margin-top:5px;line-height:1.42}
      @media(max-width:700px){#achievementOverlay.achievements-overlay{padding:0;align-items:stretch}#achievementOverlay .achievements-shell{width:100%;max-height:100vh;min-height:100vh;border-radius:0;border-width:0}#achievementOverlay .achievements-chrome{padding:14px 16px}#achievementOverlay .achievements-chrome h2{font-size:22px}#achievementOverlay .achievements-content{padding:14px 16px 28px}#achievementOverlay .achievements-grid{grid-template-columns:1fr}}
    `;
    documentRef.head?.appendChild(style);
  }
  function ensureSurface(){
    const documentRef=doc();
    let overlay=find('achievementOverlay');
    if(!documentRef)return null;
    if(!overlay){overlay=documentRef.createElement('div');overlay.id='achievementOverlay';documentRef.body?.appendChild(overlay);}
    installStyles();
    overlay.classList.add('overlay','achievements-overlay');
    overlay.dataset.achievementsOwner=OWNER;
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Achievements');
    if(overlay.dataset.achievementsSurface!=='1'){
      overlay.dataset.achievementsSurface='1';
      overlay.innerHTML=`<section class="achievements-shell"><header class="achievements-chrome"><div><span class="achievements-kicker">Trophy hall</span><h2>🏆 Achievements</h2></div><button type="button" class="small-btn achievements-done" data-achievements-done>Done</button></header><div class="achievements-content"><p class="achievements-intro">Milestones are tracked by the current transferable save.</p><div class="achievements-grid" data-achievements-grid></div></div></section>`;
      overlay.querySelector('[data-achievements-done]')?.addEventListener('click',close);
    }
    return overlay;
  }
  function createCard(model){
    const documentRef=doc(),card=documentRef.createElement('div'),heading=documentRef.createElement('b'),body=documentRef.createElement('span');
    card.className=`achievement${model.done?' done':''}${model.hidden?' secret-locked':''}`;
    heading.textContent=`${model.done?'✅':'⬜'} ${model.name}`;
    body.textContent=model.description;
    card.append(heading,body);
    return card;
  }
  function createDetails(model,className='achievement-group'){
    const documentRef=doc(),details=documentRef.createElement('details'),summary=documentRef.createElement('summary'),count=documentRef.createElement('span'),body=documentRef.createElement('div');
    details.className=className;details.dataset.achievementGroup=model.id;details.open=!!model.open;
    summary.textContent=model.label;count.className='achievement-group-count';count.textContent=model.total?`${model.done}/${model.total}`:'—';summary.append(count);
    body.className='achievement-group-body';(model.entries||[]).forEach(entry=>body.append(createCard(entry)));
    details.append(summary,body);
    details.addEventListener('toggle',()=>runtime.setOpenState?.(model.id,details.open));
    return details;
  }
  function render(){
    const model=viewModel(),overlay=ensureSurface();
    if(!overlay)return model;
    const grid=overlay.querySelector('[data-achievements-grid]');
    if(grid){
      grid.replaceChildren();
      model.groups.forEach(group=>grid.append(createDetails(group)));
      const heroes=model.heroes.map(group=>createDetails(group,`achievement-subgroup${group.hidden?' secret-locked':''}`));
      grid.append(createDetails({...model.heroMastery,entries:[]},'achievement-group'));
      const heroContainer=grid.lastElementChild?.querySelector('.achievement-group-body');
      heroes.forEach(hero=>heroContainer?.append(hero));
    }
    runtime.afterRender?.(model);
    return model;
  }
  function open(){const overlay=ensureSurface();render();if(overlay){overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');}return overlay;}
  function close(){const overlay=find('achievementOverlay');if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}runtime.onClose?.();return overlay||null;}
  function bindTrigger(){const trigger=find('achievementBtn');if(!trigger||trigger.dataset.achievementsWired==='1')return;trigger.dataset.achievementsWired='1';trigger.addEventListener('click',open);}
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};bindTrigger();return api;}
  function inspect(){const overlay=find('achievementOverlay');return Object.freeze({owner:overlay?.dataset.achievementsOwner||null,open:!!overlay&&!overlay.classList.contains('hidden'),groups:overlay?.querySelectorAll?.('[data-achievement-group]').length||0,hasDone:!!overlay?.querySelector?.('[data-achievements-done]')});}
  const test=Object.freeze({groups:()=>registry().map(entry=>({id:entry.id,hierarchy:entry.hierarchy})),heroTalents:classId=>heroMasteryEntries(classId).map(entry=>({id:entry.id,done:!!entry.done})),groupOpen:id=>groupOpen(id),render:()=>viewModel().groups.map(group=>({id:group.id,label:group.label,subgroups:0})).concat([{id:'top:hero-mastery',label:'✨ Hero Mastery',subgroups:viewModel().heroes.length}])});
  const api=Object.freeze({configure,open,close,render,refresh:render,viewModel,inspect,owner:OWNER});
  window.DiceboundAchievementsUi=api;
  window.DiceboundAchievementsUiTest=test;
})(window);
