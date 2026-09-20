/* DiceBound Career presentation owner.
 *
 * Full-screen Camp destination for lifetime Career overview, semantic enemy
 * defeat ledger and bounded Run History. It renders Progression-owned state
 * only; it owns no persistence or gameplay counters.
 */
(() => {
  "use strict";

  const OWNER="ui/career";
  let runtime={};

  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const fmt=value=>Math.round(Number(value)||0).toLocaleString();
  const pct=value=>`${Math.round((Number(value)||0)*100)}%`;
  const titleCase=value=>String(value||"").replace(/(^|[-_\s]+)([a-z])/g,(_,space,char)=>`${space?" ":""}${char.toUpperCase()}`);

  function doc(){return runtime.document?.()||document;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function stats(){return runtime.getCareerStats?.()||{};}
  function history(){return runtime.getRunHistory?.()||[];}
  function classes(){return runtime.getClasses?.()||[];}
  function enemies(){return runtime.getEnemies?.()||[];}
  function powerups(){return runtime.getPowerups?.()||[];}
  function classById(id){return classes().find(entry=>entry.id===id)||null;}
  function enemyById(id){return enemies().find(entry=>entry.id===id)||null;}
  function powerupById(id){return powerups().find(entry=>entry.id===id)||null;}

  function installStyles(){
    const documentRef=doc();if(!documentRef||documentRef.getElementById("dicebound-career-styles"))return;
    const style=documentRef.createElement("style");style.id="dicebound-career-styles";style.textContent=`
      #careerOverlay{position:fixed;inset:0;z-index:88;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,7,16,.90);backdrop-filter:blur(8px)}
      #careerOverlay.hidden{display:none}
      #careerOverlay .career-shell{width:min(1120px,96vw);height:min(880px,94vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:linear-gradient(180deg,#101a2d,#090f1c);box-shadow:0 24px 70px rgba(0,0,0,.55)}
      #careerOverlay .career-chrome{position:sticky;top:0;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px 12px;background:linear-gradient(180deg,rgba(16,26,45,.99),rgba(16,26,45,.94));border-bottom:1px solid rgba(255,255,255,.08)}
      #careerOverlay .career-kicker{display:block;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:900}
      #careerOverlay .career-chrome h2{margin:2px 0 0;font-size:25px}
      #careerOverlay .career-done{flex:0 0 auto;min-width:94px}
      #careerOverlay .career-body{overflow:auto;padding:14px 18px 28px}
      #careerOverlay .career-tabs{position:sticky;top:0;z-index:3;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:0 0 12px;background:#0d1626}
      #careerOverlay .career-tabs button.active{border-color:rgba(115,211,255,.75);box-shadow:0 0 0 1px rgba(115,211,255,.18) inset}
      #careerOverlay .career-panel{display:none}.career-panel.active{display:block}
      #careerOverlay .career-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      #careerOverlay .career-card{padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.045)}
      #careerOverlay .career-card span{display:block;color:var(--muted);font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
      #careerOverlay .career-card strong{display:block;margin-top:3px;font-size:19px}
      #careerOverlay .career-wide{grid-column:1/-1}
      #careerOverlay .career-section{margin-top:14px;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.075);background:rgba(0,0,0,.16)}
      #careerOverlay .career-section h3{margin:0 0 8px;font-size:15px}
      #careerOverlay .career-clear-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;font-size:10px;line-height:1.45}
      #careerOverlay .career-ledger{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      #careerOverlay .career-enemy{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.04)}
      #careerOverlay .career-enemy b{font-size:12px}.career-enemy strong{font-size:18px}
      #careerOverlay .career-empty{padding:24px;text-align:center;color:var(--muted);border:1px dashed rgba(255,255,255,.12);border-radius:14px}
      #careerOverlay .career-history{display:grid;gap:9px}
      #careerOverlay details.career-run{border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.04);overflow:hidden}
      #careerOverlay details.career-run summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;font-size:11px;font-weight:800}
      #careerOverlay .career-run-body{padding:0 14px 14px;border-top:1px solid rgba(255,255,255,.07)}
      #careerOverlay .career-run-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}
      #careerOverlay .career-mini{padding:8px;border-radius:10px;background:rgba(0,0,0,.19);font-size:10px}.career-mini b{display:block;margin-bottom:2px;color:#fff}
      #careerOverlay .career-list{font-size:10px;line-height:1.55;color:#dbe6f5}
      #careerOverlay .career-outcome-victory{color:#78e7a9}.career-outcome-death{color:#ff8a91}.career-outcome-abandoned{color:#f4c276}
      @media(max-width:760px){
        #careerOverlay{padding:0;align-items:stretch}
        #careerOverlay .career-shell{width:100%;height:100dvh;max-height:none;border-radius:0;border:0}
        #careerOverlay .career-body{padding:12px 14px 28px}
        #careerOverlay .career-stat-grid,#careerOverlay .career-run-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        #careerOverlay .career-ledger,#careerOverlay .career-clear-grid{grid-template-columns:1fr}
      }
      @media(max-width:440px){#careerOverlay .career-stat-grid,#careerOverlay .career-run-grid{grid-template-columns:1fr}}
    `;documentRef.head?.appendChild(style);
  }

  function ensureSurface(){
    const documentRef=doc();if(!documentRef)return null;installStyles();
    let overlay=find("careerOverlay");
    if(!overlay){overlay=documentRef.createElement("div");overlay.id="careerOverlay";overlay.className="hidden";overlay.setAttribute("aria-hidden","true");documentRef.body?.appendChild(overlay);}
    if(overlay.dataset.careerOwner!==OWNER){
      overlay.dataset.careerOwner=OWNER;
      overlay.innerHTML=`<section class="career-shell"><header class="career-chrome"><div><span class="career-kicker">The roads remember</span><h2>Career</h2></div><button type="button" class="small-btn career-done" data-career-done>Done</button></header><div class="career-body"><nav class="career-tabs" aria-label="Career sections"><button type="button" class="small-btn active" data-career-tab="overview">Overview</button><button type="button" class="small-btn" data-career-tab="enemies">Enemy Ledger</button><button type="button" class="small-btn" data-career-tab="runs">Run History</button></nav><section class="career-panel active" data-career-panel="overview"></section><section class="career-panel" data-career-panel="enemies"></section><section class="career-panel" data-career-panel="runs"></section></div></section>`;
      overlay.querySelector("[data-career-done]")?.addEventListener("click",close);
      overlay.querySelectorAll("[data-career-tab]").forEach(button=>button.addEventListener("click",()=>activateTab(button.dataset.careerTab)));
    }
    return overlay;
  }

  function highestClears(source){
    const highest=new Map();
    Object.entries(source.boardClears||{}).forEach(([key,value])=>{
      if(Number(value)<=0)return;
      const match=String(key).match(/^([^:]+):(normal|nightmare|hell):b(\d+)$/);if(!match)return;
      const [,classId,mode,boardRaw]=match,board=Number(boardRaw),group=highest.get(classId)||{normal:0,nightmare:0,hell:0};
      group[mode]=Math.max(group[mode]||0,board);highest.set(classId,group);
    });
    return [...highest.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([classId,modes])=>({classId,modes}));
  }

  function overviewHtml(){
    const s=stats(),played=Object.entries(s.classRuns||{}).sort((a,b)=>Number(b[1])-Number(a[1])),favorite=played[0],favoriteClass=favorite?classById(favorite[0]):null;
    const cards=[
      ["runsFinished","Runs finished"],["fullVictories","Full victories"],["deaths","Deaths"],["abandonedRuns","Abandoned"],
      ["tilesTraveled","Tiles traveled"],["rolls","Dice rolls"],["enemiesDefeated","Enemies defeated"],["bossesDefeated","Bosses defeated"],
      ["damageDealt","Damage dealt"],["largestHit","Largest hit"],["criticalStrikes","Critical strikes"],["echoStrikes","Echo strikes"],
      ["elementalProcs","Elemental procs"],["potionsUsed","Potions used"],["goldEarned","Gold earned"],["goldSpent","Gold spent"],
      ["healingDone","Healing done"],["highestGold","Highest gold held"],["powerupsTaken","Powerups taken"],["highestRunLevel","Highest run level"]
    ];
    const clears=highestClears(s);
    const clearRows=clears.map(({classId,modes})=>{const entry=classById(classId);return `<div><b>${escapeHtml(entry?.icon||"•")} ${escapeHtml(entry?.name||classId)}</b><br>Normal: ${modes.normal||"—"} · Nightmare: ${modes.nightmare||"—"} · Hell: ${modes.hell||"—"}</div>`;}).join("");
    return `<div class="career-stat-grid">${cards.map(([key,label])=>`<div class="career-card"><span>${escapeHtml(label)}</span><strong>${fmt(s[key])}</strong></div>`).join("")}<div class="career-card career-wide"><span>Most played class</span><strong>${favorite?`${escapeHtml(favoriteClass?.icon||"")} ${escapeHtml(favoriteClass?.name||favorite[0])} · ${fmt(favorite[1])} run${Number(favorite[1])===1?"":"s"}`:"No recorded runs yet"}</strong></div></div><div class="career-section"><h3>Highest Board cleared by class & difficulty</h3><div class="career-clear-grid">${clearRows||'<div class="career-empty">No recorded Board clears yet.</div>'}</div></div>`;
  }

  function enemiesHtml(){
    const entries=Object.entries(stats().enemyDefeats||{}).filter(([,count])=>Number(count)>0).sort((a,b)=>Number(b[1])-Number(a[1])||a[0].localeCompare(b[0]));
    if(!entries.length)return '<div class="career-empty">No semantic enemy defeats have been recorded yet. New defeat tracking begins with this Career release.</div>';
    return `<div class="career-ledger">${entries.map(([id,count])=>{const enemy=enemyById(id);return `<div class="career-enemy"><div><b>${escapeHtml(enemy?.icon||"⚔️")} ${escapeHtml(enemy?.name||titleCase(id))}</b><span>${escapeHtml(id)}</span></div><strong>×${fmt(count)}</strong></div>`;}).join("")}</div>`;
  }

  function statsSummary(entry){
    const s=entry.finalStats||{};
    return [
      `HP ${fmt(s.hp)} / ${fmt(s.maxHp)}`,`ATK ${fmt(s.attack)}`,`DEF ${fmt(s.defense)}`,
      `Crit ${pct(s.crit)}`,`Dodge ${pct(s.dodge)}`,`Lifesteal ${pct(s.lifeSteal)}`,
      `Luck ${fmt((Number(s.luck)||0)*100)}`,`Echo ${pct(s.echo)}`,`Boss ${pct(s.bossDamage)}`
    ].join(" · ");
  }

  function historyHtml(){
    const runs=history();if(!runs.length)return '<div class="career-empty">No completed runs recorded yet. Run History begins with this Career release.</div>';
    return `<div class="career-history">${runs.map(entry=>{
      const cls=classById(entry.classId),outcome=titleCase(entry.outcome),outcomeClass=`career-outcome-${entry.outcome}`;
      const gear=(entry.equipment||[]).map(item=>`${escapeHtml(item.slot)}: <b>${escapeHtml(item.name||item.id)}</b>${item.rarity?` (${escapeHtml(item.rarity)})`:""}`).join("<br>")||"No recorded equipment.";
      const powers=(entry.powerups||[]).map(item=>{const power=powerupById(item.id);return `${escapeHtml(power?.icon||"✨")} ${escapeHtml(power?.name||item.id)}${Number(item.count)>1?` ×${fmt(item.count)}`:""}`;}).join("<br>")||"No selected Powerups recorded.";
      return `<details class="career-run"><summary><span>#${fmt(entry.sequence)} · ${escapeHtml(cls?.icon||"")} ${escapeHtml(cls?.name||entry.classId)} · ${escapeHtml(titleCase(entry.mode))}</span><span class="${outcomeClass}">${escapeHtml(outcome)} · Board ${fmt(entry.boardReached)}</span></summary><div class="career-run-body"><div class="career-run-grid"><div class="career-mini"><b>Final level</b>${fmt(entry.level)}</div><div class="career-mini"><b>Gold</b>${fmt(entry.gold)}</div><div class="career-mini"><b>Dice rolls</b>${fmt(entry.rolls)}</div><div class="career-mini"><b>Legacy XP</b>${fmt(entry.legacyXp)}</div><div class="career-mini"><b>Tiles moved</b>${fmt(entry.tilesMoved)}</div><div class="career-mini"><b>Companion</b>${escapeHtml(entry.petId||"—")}</div><div class="career-mini"><b>Prestige</b>${fmt(entry.prestigeCount)}</div><div class="career-mini"><b>Game version</b>${escapeHtml(entry.version||"—")}</div></div><div class="career-section"><h3>Final effective stats</h3><div class="career-list">${escapeHtml(statsSummary(entry))}</div></div><div class="career-section"><h3>Equipment</h3><div class="career-list">${gear}</div></div><div class="career-section"><h3>Powerups</h3><div class="career-list">${powers}</div></div></div></details>`;
    }).join("")}</div>`;
  }

  function render(){
    const overlay=ensureSurface();if(!overlay)return inspect();
    const overview=overlay.querySelector('[data-career-panel="overview"]'),enemyPanel=overlay.querySelector('[data-career-panel="enemies"]'),runs=overlay.querySelector('[data-career-panel="runs"]');
    if(overview)overview.innerHTML=overviewHtml();if(enemyPanel)enemyPanel.innerHTML=enemiesHtml();if(runs)runs.innerHTML=historyHtml();
    return inspect();
  }

  function activateTab(name="overview"){
    const overlay=ensureSurface(),tab=["overview","enemies","runs"].includes(name)?name:"overview";if(!overlay)return tab;
    overlay.querySelectorAll("[data-career-tab]").forEach(button=>button.classList.toggle("active",button.dataset.careerTab===tab));
    overlay.querySelectorAll("[data-career-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.careerPanel===tab));
    return tab;
  }

  function open(tab="overview"){
    const overlay=ensureSurface();render();activateTab(tab);if(overlay){overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");}runtime.onOpen?.();return overlay;
  }
  function close(){const overlay=find("careerOverlay");if(overlay){overlay.classList.add("hidden");overlay.setAttribute("aria-hidden","true");}runtime.onClose?.();return overlay||null;}
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function inspect(){const overlay=find("careerOverlay");return Object.freeze({owner:overlay?.dataset.careerOwner||OWNER,open:!!overlay&&!overlay.classList.contains("hidden"),activeTab:overlay?.querySelector?.("[data-career-tab].active")?.dataset.careerTab||null,historyCount:history().length,enemyKinds:Object.keys(stats().enemyDefeats||{}).filter(id=>Number(stats().enemyDefeats[id])>0).length});}

  const api=Object.freeze({apiVersion:1,owner:OWNER,configure,open,close,render,activateTab,inspect});
  window.DiceboundCareerUi=api;
})();
