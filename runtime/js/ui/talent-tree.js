/* DiceBound Talent constellation presentation owner.
 *
 * This module owns the full-screen Talent destination: its constellation
 * layout, rendering, controls, pan/zoom, persistent dismissal chrome and
 * purchase interaction. Talent definitions, rank/prerequisite rules,
 * persistence, prestige calculations and gameplay effects remain supplied by
 * the authoritative progression/runtime owners through configure().
 */
(function(root){
  'use strict';

  const OWNER='ui/talent-tree';
  const STYLE_ID='dicebound-talent-tree-owner';
  const WIDTH=4200;
  const HEIGHT=3600;
  const CARD_WIDTH=230;
  const CARD_HEIGHT=142;
  const MIN_ZOOM=.28;
  const MAX_ZOOM=2.3;
  const LABELS=Object.freeze({Survival:[1800,1580],Power:[2020,1685],Fortune:[2020,1945],Heirlooms:[1800,2035],Companion:[1580,1945],Elements:[1580,1685]});
  // Coordinates and routes belong to this presentation owner, not the Talent
  // registry. They are the accepted constellation composition from the old
  // renderer, with Counter Reserve intentionally absent after its removal.
  const POSITIONS=Object.freeze({"roadborn":[1800,1800],"survival_vitality":[1800,1410],"survival_armor":[1520,1020],"survival_dodge":[1800,1020],"survival_prepared":[2080,1020],"survival_alchemy":[1660,630],"survival_double_dose":[1380,240],"survival_recovery":[1940,630],"survival_revive":[1800,240],"power_attack":[2138,1605],"power_boss":[2475,1410],"power_crit":[2615,1652],"power_lifesteal":[2743,1094],"power_ultimate_start":[2883,1336],"power_ultimate_flow":[3151,1020],"power_apex":[3419,704],"power_echo":[3559,946],"monk_flow_ceiling":[3826,630],"fortune_gold":[2138,1995],"fortune_blessing":[2545,2069],"fortune_discount":[2405,2311],"fortune_luck":[2813,2385],"fortune_cookie":[3291,2338],"fortune_omens":[3151,2580],"fortune_powerup_rerolls":[3011,2822],"fortune_extra_choice":[3559,2654],"fortune_impossible":[3419,2896],"legacy_heirloom":[1800,2190],"legacy_travel":[1940,2580],"legacy_xp":[1660,2580],"legacy_scholar":[1800,2970],"legacy_storage":[1380,2970],"companion_damage":[1462,1995],"companion_bond":[1195,2311],"companion_double":[1055,2069],"companion_ascendant":[857,2506],"companion_recovery":[717,2264],"companion_element_proc":[1050,3250],"element_attunement":[1462,1605],"element_power":[915,1774],"element_prismatic":[1055,1531],"element_weakness":[1195,1289],"turtle_guard_element":[350,1800],"element_conduit":[717,1336],"element_echo":[857,1094]});
  const ROUTES=Object.freeze({"power_attack>power_boss":[[2120,1600],[2120,1400],[2480,1400]],"companion_bond>companion_ascendant":[[1200,2320],[1200,2520],[840,2520]],"roadborn>element_attunement":[[1800,1800],[1800,1600],[1480,1600]],"roadborn>survival_vitality":[[1800,1800],[1840,1800],[1840,1400],[1800,1400]],"survival_vitality>survival_dodge":[[1800,1400],[1800,1040]],"roadborn>legacy_heirloom":[[1800,1800],[1800,2200]],"roadborn>companion_damage":[[1800,1800],[1480,1800],[1480,2000]],"roadborn>power_attack":[[1800,1800],[2120,1800],[2120,1600]],"roadborn>fortune_gold":[[1800,1800],[1800,1840],[2120,1840],[2120,2000]],"fortune_luck>fortune_omens":[[2800,2400],[2800,2560],[3160,2560]],"companion_double>companion_recovery":[[1040,2080],[1040,2280],[720,2280]],"element_weakness>element_echo":[[1200,1280],[1200,1080],[840,1080]],"fortune_discount>fortune_luck":[[2400,2320],[2400,2400],[2800,2400]],"fortune_omens>fortune_impossible":[[3160,2560],[3160,2880],[3400,2880]],"power_echo>monk_flow_ceiling":[[3560,960],[3840,960],[3840,640]],"power_ultimate_start>power_ultimate_flow":[[2880,1320],[3160,1320],[3160,1040]],"element_attunement>element_prismatic":[[1480,1600],[1480,1520],[1040,1520]],"power_crit>power_ultimate_start":[[2600,1640],[2880,1640],[2880,1320]],"companion_damage>companion_double":[[1480,2000],[1480,2080],[1040,2080]],"survival_recovery>survival_revive":[[1920,640],[1920,240],[1800,240]],"survival_alchemy>survival_revive":[[1680,640],[1680,240],[1800,240]],"survival_alchemy>survival_double_dose":[[1640,640],[1380,640],[1380,240]],"legacy_heirloom>legacy_xp":[[1800,2200],[1680,2200],[1680,2560]],"legacy_heirloom>legacy_travel":[[1800,2200],[1920,2200],[1920,2560]],"legacy_travel>legacy_scholar":[[1920,2560],[1920,2960],[1800,2960]],"legacy_xp>legacy_storage":[[1660,2580],[1400,2580],[1400,2960],[1380,2960]],"element_attunement>element_weakness":[[1480,1600],[1200,1600],[1200,1280]],"power_boss>power_lifesteal":[[2480,1400],[2720,1400],[2720,1080],[2760,1080]],"fortune_gold>fortune_discount":[[2120,2000],[2120,2320],[2400,2320]],"fortune_gold>fortune_blessing":[[2120,2000],[2560,2000],[2560,2080]],"companion_damage>companion_bond":[[1480,2000],[1520,2000],[1520,2320],[1200,2320]],"power_ultimate_flow>power_apex":[[3160,1040],[3160,720],[3400,720]],"power_ultimate_flow>power_echo":[[3160,1040],[3560,1040],[3560,960]],"power_attack>power_crit":[[2120,1600],[2600,1600],[2600,1640]],"survival_vitality>survival_armor":[[1800,1400],[1520,1400],[1520,1040]],"survival_vitality>survival_prepared":[[1800,1400],[2040,1400],[2040,1040],[2080,1040]],"fortune_luck>fortune_cookie":[[2800,2400],[2800,2320],[3280,2320]],"companion_double>companion_ascendant":[[1040,2080],[880,2080],[880,2480],[840,2480],[840,2520]],"element_weakness>element_conduit":[[1200,1280],[720,1280],[720,1320]],"fortune_luck>fortune_powerup_rerolls":[[2800,2400],[3000,2400],[3000,2840]],"survival_armor>survival_recovery":[[1520,1040],[1520,760],[1920,760],[1920,640]],"survival_prepared>survival_alchemy":[[2080,1040],[2120,1040],[2120,120],[1640,120],[1640,640],[1680,640]],"element_attunement>element_power":[[1480,1600],[1480,1760],[920,1760]],"fortune_powerup_rerolls>fortune_extra_choice":[[3000,2840],[3000,3040],[3600,3040],[3600,2640],[3560,2640]],"element_power>element_echo":[[920,1760],[560,1760],[560,1080],[840,1080]],"companion_ascendant>companion_element_proc":[[840,2520],[840,3240],[1040,3240]],"fortune_blessing>fortune_omens":[[2560,2080],[3440,2080],[3440,2520],[3160,2520],[3160,2560]],"element_attunement>turtle_guard_element":[[1480,1600],[1440,1600],[1440,1880],[360,1880],[360,1800]],"power_boss>power_apex":[[2480,1400],[2480,1280],[2560,1280],[2560,680],[3400,680],[3400,720]],"survival_armor>turtle_guard_element":[[1520,1040],[1040,1040],[1040,960],[360,960],[360,1800]],"element_attunement>companion_element_proc":[[1480,1600],[1480,1640],[1080,1640],[1080,1960],[560,1960],[560,3280],[1040,3280],[1040,3240]]});

  let runtime={};
  let zoom=.75;
  let returnOverlay=null;
  let hasOpened=false;
  let drag=null;
  let keyboardBound=false;

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
  function talents(){return (runtime.getTalents?.()||[]).filter(t=>t?.id&&runtime.isVisible?.(t)!==false);}
  function rankFor(id){return Math.max(0,Number(runtime.rankFor?.(id)||0));}
  function available(t){return runtime.isAvailable?.(t)!==false;}
  function canPurchase(t){return runtime.canPurchase?.(t)!==false;}
  function positionFor(id){return POSITIONS[id]||[3900,3300];}
  function routeFor(from,to){return ROUTES[`${from}>${to}`]||[positionFor(from),positionFor(to)];}

  function installStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById(STYLE_ID))return;
    const style=documentRef.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #talentOverlay.talent-tree-overlay{z-index:160;padding:clamp(6px,1.5vw,20px);align-items:stretch;justify-content:stretch;background:radial-gradient(circle at 50% 42%,rgba(43,34,66,.65),rgba(2,4,10,.96) 72%);backdrop-filter:blur(7px)}
      #talentOverlay.talent-tree-overlay.hidden{display:none}
      #talentOverlay .talent-tree-shell{position:relative;display:grid;grid-template-rows:auto minmax(0,1fr);width:100%;height:100%;min-height:0;overflow:hidden;border:1px solid rgba(218,174,83,.42);border-radius:20px;background:linear-gradient(180deg,rgba(15,17,30,.985),rgba(4,6,13,.995));box-shadow:0 28px 90px rgba(0,0,0,.72),inset 0 0 0 1px rgba(255,232,170,.035)}
      #talentOverlay .talent-tree-chrome{position:relative;z-index:7;display:flex;align-items:flex-start;gap:12px;padding:13px clamp(14px,2.2vw,28px);border-bottom:1px solid rgba(218,174,83,.2);background:linear-gradient(180deg,rgba(22,22,38,.99),rgba(13,15,27,.94));backdrop-filter:blur(12px)}
      #talentOverlay .talent-tree-kicker{display:block;color:#e5c370;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
      #talentOverlay .talent-tree-title{margin:3px 0 0;color:#f2d995;font-size:clamp(18px,2.3vw,27px);letter-spacing:.06em;text-transform:uppercase;text-shadow:0 2px 14px rgba(232,185,83,.18)}
      #talentOverlay .talent-tree-subtitle{max-width:760px;margin:4px 0 0;color:#aeb7cb;font-size:11px;line-height:1.4}
      #talentOverlay .talent-tree-done{margin-left:auto;flex:0 0 auto;min-width:88px}
      #talentOverlay .talent-tree-body{position:relative;min-height:0;overflow:hidden}
      #talentOverlay .talent-tree-hud{position:absolute;z-index:6;top:12px;left:12px;right:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;pointer-events:none}
      #talentOverlay .talent-tree-meta,#talentOverlay .talent-tree-tools{display:flex;flex-wrap:wrap;gap:6px;pointer-events:auto}
      #talentOverlay .talent-tree-meta span,#talentOverlay .talent-tree-tools{padding:6px 9px;border:1px solid rgba(218,174,83,.2);border-radius:999px;background:rgba(7,9,18,.88);box-shadow:0 7px 20px rgba(0,0,0,.28);color:#ece3c9;font-size:10px}
      #talentOverlay .talent-tree-meta b{color:#f2ce79}
      #talentOverlay .talent-tree-tools{padding:3px 4px;align-items:center}.talent-tree-tools .small-btn{padding:5px 8px!important;border-radius:999px!important}.talent-tree-zoom-label{min-width:44px;text-align:center;color:#efcf7e;line-height:28px}
      #talentOverlay .talent-tree-viewport{width:100%;height:100%;overflow:scroll;overscroll-behavior:contain;scrollbar-width:none;-ms-overflow-style:none;touch-action:none;cursor:grab;background-color:#050711;background-image:radial-gradient(circle at 18% 24%,rgba(241,213,143,.24) 0 1px,transparent 1.5px),radial-gradient(circle at 67% 73%,rgba(137,180,255,.18) 0 1px,transparent 1.4px),radial-gradient(circle at 81% 17%,rgba(241,213,143,.18) 0 1px,transparent 1.5px),radial-gradient(circle at 48% 46%,rgba(60,70,113,.26),transparent 44%),radial-gradient(circle at 50% 50%,rgba(16,20,38,.65),rgba(3,5,10,.94) 70%);background-size:83px 83px,113px 113px,151px 151px,100% 100%,100% 100%;box-shadow:inset 0 0 70px rgba(0,0,0,.68)}
      #talentOverlay .talent-tree-viewport::-webkit-scrollbar{display:none;width:0;height:0}#talentOverlay .talent-tree-viewport.dragging{cursor:grabbing;user-select:none}
      #talentOverlay .talent-tree-world{position:relative;min-width:1px;min-height:1px}.talent-tree-canvas{position:absolute;left:0;top:0;width:${WIDTH}px;height:${HEIGHT}px;transform-origin:0 0}
      #talentOverlay .talent-links{position:absolute;inset:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:visible;pointer-events:none}.talent-tree-link{fill:none;stroke:rgba(151,118,72,.30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 2px rgba(0,0,0,.8))}.talent-tree-link.active{stroke:rgba(232,187,88,.78);stroke-width:4;filter:drop-shadow(0 0 5px rgba(214,164,70,.28))}
      #talentOverlay .talent-tree-label{position:absolute;transform:translate(-50%,-50%);padding:6px 9px;border:1px solid rgba(225,183,89,.42);border-radius:999px;background:linear-gradient(180deg,rgba(40,31,20,.96),rgba(17,15,15,.96));box-shadow:0 0 20px rgba(205,153,63,.08);color:#f1d58e;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;pointer-events:none}
      #talentOverlay .talent-tree-node{position:absolute;transform:translate(-50%,-50%);display:grid;gap:5px;width:${CARD_WIDTH}px;min-height:${CARD_HEIGHT}px;padding:12px;border:1px solid rgba(169,139,86,.28);border-radius:13px;background:linear-gradient(180deg,rgba(28,31,43,.98),rgba(12,15,24,.99));box-shadow:0 8px 22px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.035);color:#f0e7d3;text-align:left;cursor:pointer;transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease,filter .14s ease}
      #talentOverlay .talent-tree-node:not(:disabled):hover,#talentOverlay .talent-tree-node:focus-visible{transform:translate(-50%,-50%) scale(1.035);border-color:rgba(239,198,105,.72);box-shadow:0 10px 28px rgba(0,0,0,.50),0 0 18px rgba(224,178,78,.14)}
      #talentOverlay .talent-tree-node.bought{border-color:rgba(102,218,161,.58);background:linear-gradient(180deg,rgba(25,54,45,.97),rgba(10,28,25,.98));box-shadow:0 0 18px rgba(80,204,145,.12),inset 0 1px 0 rgba(154,255,211,.06)}#talentOverlay .talent-tree-node.partial{border-color:rgba(105,169,241,.54);background:linear-gradient(180deg,rgba(29,48,70,.97),rgba(13,26,42,.98))}#talentOverlay .talent-tree-node.locked{opacity:.42;filter:grayscale(.62) brightness(.72);cursor:not-allowed}#talentOverlay .talent-tree-node.root{border-color:rgba(244,201,101,.78);box-shadow:0 0 34px rgba(225,175,74,.17),inset 0 0 20px rgba(225,175,74,.04)}
      #talentOverlay .talent-tree-node-head{display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:900}.talent-tree-node-cost{flex:0 0 auto;color:#edc86f;font-size:10px}.talent-tree-node-rank{width:max-content;padding:3px 5px;border:1px solid rgba(218,174,83,.11);border-radius:5px;background:rgba(218,174,83,.08);color:#d9c392;font-size:9px}.talent-tree-node-desc{color:#c7cde0;font-size:10px;line-height:1.35}.talent-tree-node-req{color:#f2c87d;font-size:9px;line-height:1.3}
      #talentOverlay .talent-tree-footer{position:absolute;z-index:6;right:12px;bottom:12px;left:12px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;pointer-events:none}.talent-tree-prestige{max-width:min(710px,75%);padding:9px 12px;border:1px solid rgba(218,174,83,.22);border-radius:12px;background:rgba(14,12,17,.9);box-shadow:0 8px 28px rgba(0,0,0,.32);color:#d8d9df;font-size:10px;line-height:1.4;pointer-events:auto}.talent-tree-prestige b{color:#f2ce79}.talent-tree-prestige-stats{margin-top:3px;color:#bfc7db}.talent-tree-footer-actions{display:grid;gap:6px;justify-items:end;pointer-events:auto}.talent-tree-prestige-btn{pointer-events:auto}.talent-tree-reset{font-size:9px;color:#d7adbd!important}
      @media(max-width:780px){#talentOverlay.talent-tree-overlay{padding:0}#talentOverlay .talent-tree-shell{border-width:0;border-radius:0}#talentOverlay .talent-tree-chrome{padding:12px 14px}#talentOverlay .talent-tree-subtitle{display:none}#talentOverlay .talent-tree-hud{top:8px;left:8px;right:8px;align-items:flex-start}.talent-tree-meta span:nth-child(n+4){display:none}.talent-tree-tools [data-talent-zoom-out],.talent-tree-tools [data-talent-zoom-in]{display:none}#talentOverlay .talent-tree-footer{right:8px;bottom:8px;left:8px}.talent-tree-prestige{max-width:72%;font-size:9px}.talent-tree-prestige-btn{padding:7px 9px!important;font-size:10px!important}}
      @media(max-height:590px){#talentOverlay .talent-tree-chrome{padding-top:8px;padding-bottom:8px}#talentOverlay .talent-tree-title{font-size:17px}#talentOverlay .talent-tree-meta span:nth-child(n+3){display:none}.talent-tree-prestige{display:none}}
    `;
    documentRef.head?.appendChild(style);
  }

  function ensureSurface(){
    const documentRef=doc();
    let overlay=find('talentOverlay');
    if(!documentRef)return null;
    if(!overlay){overlay=documentRef.createElement('div');overlay.id='talentOverlay';documentRef.body?.appendChild(overlay);}
    installStyles();
    overlay.classList.add('overlay','talent-tree-overlay');
    overlay.dataset.talentTreeOwner=OWNER;
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Legacy Constellation');
    if(overlay.dataset.talentTreeSurface!=='1'){
      overlay.dataset.talentTreeSurface='1';
      overlay.innerHTML=`<section class="talent-tree-shell"><header class="talent-tree-chrome"><div><span class="talent-tree-kicker">Legacy progression</span><h2 class="talent-tree-title">Legacy Constellation</h2><p class="talent-tree-subtitle">Chart the permanent paths between expeditions. Purchased nodes activate on your next expedition.</p></div><button type="button" class="small-btn talent-tree-done" data-talent-done>Done</button></header><div class="talent-tree-body"><div class="talent-tree-hud"><div class="talent-tree-meta" data-talent-meta></div><div class="talent-tree-tools"><button type="button" class="small-btn" data-talent-zoom-out aria-label="Zoom out">−</button><span class="talent-tree-zoom-label" data-talent-zoom-label>75%</span><button type="button" class="small-btn" data-talent-zoom-in aria-label="Zoom in">+</button><button type="button" class="small-btn" data-talent-fit>Fit tree</button></div></div><div class="talent-tree-viewport" data-talent-viewport><div class="talent-tree-world" data-talent-world><div class="talent-tree-canvas" data-talent-canvas></div></div></div><div class="talent-tree-footer"><div class="talent-tree-prestige" data-talent-prestige></div><div class="talent-tree-footer-actions"><button type="button" class="main-btn talent-tree-prestige-btn" data-talent-prestige-btn></button><button type="button" class="linklike talent-tree-reset" data-talent-reset>Reset permanent progress</button></div></div></div></section>`;
      overlay.querySelector('[data-talent-done]')?.addEventListener('click',close);
      overlay.querySelector('[data-talent-zoom-out]')?.addEventListener('click',()=>zoomAtCenter(-.12));
      overlay.querySelector('[data-talent-zoom-in]')?.addEventListener('click',()=>zoomAtCenter(.12));
      overlay.querySelector('[data-talent-fit]')?.addEventListener('click',fit);
      overlay.querySelector('[data-talent-prestige-btn]')?.addEventListener('click',()=>runtime.prestige?.());
      overlay.querySelector('[data-talent-reset]')?.addEventListener('click',()=>runtime.resetProgress?.());
      bindViewport(overlay.querySelector('[data-talent-viewport]'));
    }
    return overlay;
  }

  function nodeMarkup(t){
    const rank=rankFor(t.id);
    const maxed=rank>=Number(t.maxRank||1);
    const unlocked=available(t);
    const purchasable=!maxed&&unlocked&&canPurchase(t);
    const pos=positionFor(t.id);
    const requirement=runtime.requirementText?.(t)||'';
    return `<button type="button" class="talent-tree-node${maxed?' bought':rank?' partial':''}${!unlocked?' locked':''}${t.branch==='Root'?' root':''}" data-talent-id="${escapeHtml(t.id)}" style="left:${pos[0]}px;top:${pos[1]}px" ${purchasable?'':'disabled'}><span class="talent-tree-node-head"><span>${escapeHtml(t.icon||'✦')} ${escapeHtml(t.name||t.id)}</span><span class="talent-tree-node-cost">${maxed?'MAX':`${Number(t.cost)||0} pt`}</span></span><span class="talent-tree-node-rank">Rank ${rank} / ${Number(t.maxRank)||1}</span><span class="talent-tree-node-desc">${escapeHtml(t.desc||'')}</span>${!unlocked&&requirement?`<span class="talent-tree-node-req">Requires: ${escapeHtml(requirement)}</span>`:''}</button>`;
  }

  function render(){
    const overlay=ensureSurface();
    const list=talents();
    if(!overlay)return Object.freeze({owner:OWNER,nodeCount:list.length});
    const meta=overlay.querySelector('[data-talent-meta]');
    const state=runtime.getState?.()||{};
    if(meta){
      const values=[['Legacy',state.level],['Points',state.points],['Runs',state.runs],['Pet',state.petLabel],['Heirlooms',state.heirlooms],['Prestige',state.prestige]];
      meta.innerHTML=values.map(([name,value])=>`<span>${escapeHtml(name)} <b>${escapeHtml(value??'—')}</b></span>`).join('');
    }
    const allocated=Math.max(0,Number(runtime.allocated?.()||0));
    const total=allocated+Math.max(0,Number(state.points)||0);
    const rewards=Math.floor(total/9);
    const prestige=overlay.querySelector('[data-talent-prestige]');
    if(prestige)prestige.innerHTML=`<b>Prestige the tree</b><br>Every 9 total Talent Points becomes one permanent random stat point. Prestige resets Talent ranks and Legacy level, returns to class selection, and preserves the current Heirloom Storage rules.<div class="talent-tree-prestige-stats">${escapeHtml(runtime.prestigeSummary?.()||'No permanent Prestige stats yet.')} · ${allocated} allocated · 9 total points = 1 Prestige point.</div>`;
    const prestigeButton=overlay.querySelector('[data-talent-prestige-btn]');
    if(prestigeButton){prestigeButton.disabled=rewards<1;prestigeButton.textContent=rewards?`Prestige for ${rewards} point${rewards===1?'':'s'}`:'Need 9 total points';}
    const canvas=overlay.querySelector('[data-talent-canvas]');
    if(canvas){
      const ids=new Set(list.map(t=>t.id));
      const links=list.flatMap(t=>(t.requires||[]).filter(r=>ids.has(r.id)).map(r=>{
        const route=routeFor(r.id,t.id);
        return `<polyline class="talent-tree-link${rankFor(r.id)>=Number(r.rank||1)?' active':''}" data-from-talent="${escapeHtml(r.id)}" data-to-talent="${escapeHtml(t.id)}" points="${route.map(point=>point.join(',')).join(' ')}"></polyline>`;
      })).join('');
      const labels=Object.entries(LABELS).map(([name,pos])=>`<span class="talent-tree-label" style="left:${pos[0]}px;top:${pos[1]}px">${escapeHtml(name)}</span>`).join('');
      canvas.innerHTML=`<svg class="talent-links" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${links}</svg>${labels}${list.map(nodeMarkup).join('')}`;
      canvas.querySelectorAll('[data-talent-id]').forEach(button=>button.addEventListener('click',()=>purchase(button.dataset.talentId)));
    }
    applyZoom();
    runtime.afterRender?.();
    return Object.freeze({owner:OWNER,nodeCount:list.length,allocated,rewards,zoom});
  }

  function purchase(id){
    const node=talents().find(t=>t.id===id);
    if(!node||!canPurchase(node))return false;
    const result=runtime.purchase?.(id,node);
    if(result!==false)render();
    return result!==false;
  }

  function viewport(){return ensureSurface()?.querySelector('[data-talent-viewport]')||null;}
  function applyZoom(){
    const overlay=ensureSurface();
    const world=overlay?.querySelector('[data-talent-world]');
    const canvas=overlay?.querySelector('[data-talent-canvas]');
    const label=overlay?.querySelector('[data-talent-zoom-label]');
    if(world){world.style.width=`${WIDTH*zoom}px`;world.style.height=`${HEIGHT*zoom}px`;}
    if(canvas)canvas.style.transform=`scale(${zoom})`;
    if(label)label.textContent=`${Math.round(zoom*100)}%`;
  }
  function setZoom(next,focusX,focusY){
    const view=viewport();
    if(!view)return zoom;
    const old=zoom;
    zoom=clamp(Number(next)||old,MIN_ZOOM,MAX_ZOOM);
    if(zoom===old)return zoom;
    const x=Number.isFinite(focusX)?focusX:view.clientWidth/2;
    const y=Number.isFinite(focusY)?focusY:view.clientHeight/2;
    const worldX=(view.scrollLeft+x)/old;
    const worldY=(view.scrollTop+y)/old;
    applyZoom();
    view.scrollLeft=worldX*zoom-x;
    view.scrollTop=worldY*zoom-y;
    return zoom;
  }
  function zoomAtCenter(delta){return setZoom(zoom+delta);}
  function fit(){
    const view=viewport();
    if(!view)return zoom;
    zoom=clamp(Math.min((view.clientWidth-150)/WIDTH,(view.clientHeight-150)/HEIGHT),MIN_ZOOM,MAX_ZOOM);
    applyZoom();
    view.scrollLeft=Math.max(0,(WIDTH*zoom-view.clientWidth)/2);
    view.scrollTop=Math.max(0,(HEIGHT*zoom-view.clientHeight)/2);
    return zoom;
  }
  function bindViewport(view){
    if(!view||view.dataset.talentTreeBound==='1')return;
    view.dataset.talentTreeBound='1';
    view.addEventListener('wheel',event=>{event.preventDefault();const rect=view.getBoundingClientRect();setZoom(zoom+(event.deltaY<0?.08:-.08),event.clientX-rect.left,event.clientY-rect.top);},{passive:false});
    view.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;drag={x:event.clientX,y:event.clientY,left:view.scrollLeft,top:view.scrollTop,moved:false};view.setPointerCapture?.(event.pointerId);view.classList.add('dragging');});
    view.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)>4||Math.abs(dy)>4)drag.moved=true;view.scrollLeft=drag.left-dx;view.scrollTop=drag.top-dy;});
    const stopDrag=()=>{drag=null;view.classList.remove('dragging');};
    view.addEventListener('pointerup',stopDrag);view.addEventListener('pointercancel',stopDrag);
  }
  function bindKeyboard(){
    if(keyboardBound||!doc())return;
    keyboardBound=true;
    doc().addEventListener('keydown',event=>{
      const overlay=find('talentOverlay');
      if(!overlay||overlay.classList.contains('hidden'))return;
      if(event.key==='Escape'){event.preventDefault();close();}
      if(event.key==='+'||event.key==='='){event.preventDefault();zoomAtCenter(.12);}
      if(event.key==='-'){event.preventDefault();zoomAtCenter(-.12);}
      if(event.key==='Home'){event.preventDefault();fit();}
    });
  }
  function open(nextReturnOverlay=null){
    const overlay=ensureSurface();
    returnOverlay=nextReturnOverlay;
    if(returnOverlay&&find(returnOverlay))find(returnOverlay).classList.add('hidden');
    render();
    overlay?.classList.remove('hidden');
    overlay?.setAttribute('aria-hidden','false');
    requestAnimationFrame?.(()=>{if(!hasOpened){fit();hasOpened=true;}else applyZoom();});
    return overlay||null;
  }
  function close(){
    const overlay=find('talentOverlay');
    if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}
    if(returnOverlay&&find(returnOverlay))find(returnOverlay).classList.remove('hidden');
    returnOverlay=null;
    runtime.onClose?.();
    return overlay||null;
  }

  function segments(route){const out=[];for(let index=1;index<route.length;index++)out.push([route[index-1],route[index]]);return out;}
  function segmentRect(a,b,rect){let x=a[0],y=a[1],dx=b[0]-x,dy=b[1]-y,u1=0,u2=1;const p=[-dx,dx,-dy,dy],q=[x-rect[0],rect[2]-x,y-rect[1],rect[3]-y];for(let index=0;index<4;index++){if(Math.abs(p[index])<1e-9){if(q[index]<0)return false;}else{const time=q[index]/p[index];if(p[index]<0){if(time>u2)return false;if(time>u1)u1=time;}else{if(time<u1)return false;if(time<u2)u2=time;}}}return true;}
  function segmentCrosses(a,b,c,d){const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);const c1=cross(a,b,c),c2=cross(a,b,d),c3=cross(c,d,a),c4=cross(c,d,b);return ((c1===0&&c2===0&&c3===0&&c4===0)?false:((c1===0||c2===0||Math.sign(c1)!==Math.sign(c2))&&(c3===0||c4===0||Math.sign(c3)!==Math.sign(c4))));}
  function layoutAudit(){
    const ids=Object.keys(POSITIONS),rects={},boxOverlaps=[],pathThroughBoxes=[],connectorCrossings=[];
    ids.forEach(id=>{const [x,y]=POSITIONS[id];rects[id]=[x-CARD_WIDTH/2,y-CARD_HEIGHT/2,x+CARD_WIDTH/2,y+CARD_HEIGHT/2];});
    for(let left=0;left<ids.length;left++)for(let right=left+1;right<ids.length;right++){const a=rects[ids[left]],b=rects[ids[right]];if(!(a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1]))boxOverlaps.push([ids[left],ids[right]]);}
    for(const [key,route] of Object.entries(ROUTES)){const [from,to]=key.split('>');for(const segment of segments(route))for(const id of ids){if(id!==from&&id!==to&&segmentRect(segment[0],segment[1],rects[id]))pathThroughBoxes.push([key,id]);}}
    const entries=Object.entries(ROUTES);for(let left=0;left<entries.length;left++)for(let right=left+1;right<entries.length;right++){const [keyA,routeA]=entries[left],[keyB,routeB]=entries[right],endsA=keyA.split('>'),endsB=keyB.split('>');if(endsA.some(id=>endsB.includes(id)))continue;outer:for(const segmentA of segments(routeA))for(const segmentB of segments(routeB))if(segmentCrosses(segmentA[0],segmentA[1],segmentB[0],segmentB[1])){connectorCrossings.push([keyA,keyB]);break outer;}}
    return Object.freeze({ok:boxOverlaps.length===0&&pathThroughBoxes.length===0&&connectorCrossings.length===0,boxOverlaps,pathThroughBoxes,connectorCrossings,nodeCount:ids.length,connectorCount:Object.keys(ROUTES).length});
  }
  function inspect(){const overlay=find('talentOverlay');return Object.freeze({owner:overlay?.dataset.talentTreeOwner||null,open:!!overlay&&!overlay.classList.contains('hidden'),zoom,nodeCount:overlay?.querySelectorAll?.('[data-talent-id]').length||0,hasDone:!!overlay?.querySelector?.('[data-talent-done]')});}
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};bindKeyboard();return api;}
  const api=Object.freeze({configure,open,close,render,refresh:render,purchase,resetProgress:()=>runtime.resetProgress?.(),setZoom,fit,zoomAtCenter,layoutAudit,inspect,layout:Object.freeze({positions:POSITIONS,routes:ROUTES,cardWidth:CARD_WIDTH,cardHeight:CARD_HEIGHT,canvasWidth:WIDTH,canvasHeight:HEIGHT}),owner:OWNER});
  window.DiceboundTalentTree=api;
})(window);
