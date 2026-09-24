/* DiceBound Info / Roadkeeper's Guide presentation owner.
 *
 * Runtime rules, save transfer, class unlock state and
 * equipment-set data remain authoritative in their existing domains. This
 * module owns the player-facing Guide destination: surface, tabs, guide
 * composition, responsive rendering and persistent dismissal chrome.
 */
(function(root){
  'use strict';

  const OWNER='ui/info-guide';
  const STYLE_ID='dicebound-info-guide-ui-owner';
  const RARITY_TIERS=Object.freeze([
    ['poor','Poor','#c4c8cf','light grey','lowest ordinary tier'],
    ['common','Common','#ffffff','white','reliable ordinary rewards'],
    ['uncommon','Uncommon','#a9dbff','light blue','stronger ordinary rewards'],
    ['rare','Rare','#438bd8','blue','high ordinary tier'],
    ['epic','Epic','#f5e9a8','pale yellow','top ordinary generated gear and powerful powers'],
    ['legendary','Legendary','#ffd45f','gold','very rare powers and handcrafted equipment'],
    ['artifact','Artifact','#ff9c38','orange','Impossible Road chase set'],
    ['mythical','Mythical','#bd83ff','purple','extreme handcrafted chase tier'],
    ['omega','Omega','#ffffff','white/purple','highest secret equipment tier']
  ]);
  let runtime={};

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
  function classes(){return runtime.getClasses?.()||[];}
  function elements(){return runtime.getElements?.()||{};}
  function isClassUnlocked(classId){return runtime.isClassUnlocked?.(classId)!==false;}
  function artifactSet(){return runtime.getArtifactSet?.()||{count:0,tiers:[]};}

  function installStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById(STYLE_ID))return;
    const style=documentRef.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #infoOverlay.info-guide-overlay{z-index:145;padding:clamp(8px,2vw,22px);align-items:center;justify-content:center;background:rgba(3,7,16,.78);backdrop-filter:blur(8px)}
      #infoOverlay.info-guide-overlay.hidden{display:none}
      #infoOverlay .info-guide-shell{width:min(1180px,100%);max-height:calc(100vh - clamp(16px,4vw,44px));overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:22px;background:linear-gradient(145deg,#111b34,#172747 55%,#10182c);box-shadow:0 28px 75px rgba(0,0,0,.55);scrollbar-color:#657ca9 transparent}
      #infoOverlay .info-guide-chrome{position:sticky;top:0;z-index:5;display:flex;align-items:flex-start;gap:14px;padding:16px clamp(14px,3vw,28px);border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(16,27,50,.99),rgba(16,27,50,.93));backdrop-filter:blur(12px)}
      #infoOverlay .info-guide-kicker{display:block;color:#91c5ff;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      #infoOverlay .info-guide-chrome h2{margin:3px 0 0;font-size:clamp(20px,3vw,30px)}
      #infoOverlay .info-guide-done{margin-left:auto;flex:0 0 auto;position:relative;z-index:6;min-width:88px}
      #infoOverlay .info-guide-content{padding:clamp(14px,3vw,28px) clamp(14px,3vw,30px) 28px}
      #infoOverlay .info-guide-subtitle{margin:0 0 14px;color:#dce7fb;font-size:12px;line-height:1.45}
      #infoOverlay .info-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0 0 12px}
      #infoOverlay .info-tabs .small-btn.active{background:linear-gradient(180deg,rgba(101,169,255,.28),rgba(181,140,255,.16));box-shadow:inset 0 0 0 1px rgba(101,169,255,.42)}
      #infoOverlay .info-tab-panel{display:none}#infoOverlay .info-tab-panel.active{display:block}
      #infoOverlay .info-section{display:block;margin-bottom:9px;padding:0;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035)}
      #infoOverlay .info-section summary{cursor:pointer;list-style:none;padding:13px 15px;font-size:14px;font-weight:900;background:rgba(255,255,255,.035)}
      #infoOverlay .info-section summary::-webkit-details-marker{display:none}#infoOverlay .info-section summary::after{content:'+';float:right;color:var(--muted)}#infoOverlay .info-section[open] summary::after{content:'-'}
      #infoOverlay .info-body{padding:4px 15px 13px;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch}#infoOverlay .info-body p{margin:8px 0;line-height:1.48}
      #infoOverlay .info-class-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px}#infoOverlay .info-class{padding:9px 10px;border-radius:11px;background:rgba(0,0,0,.17);border:1px solid rgba(255,255,255,.055);font-size:10px;line-height:1.5}#infoOverlay .info-class b{font-size:11px}
      #infoOverlay .info-tag-row{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}#infoOverlay .info-tag{padding:2px 5px;border-radius:999px;background:rgba(115,185,255,.14);border:1px solid rgba(115,185,255,.24);font-size:8px;color:#d8eaff}
      #infoOverlay .element-guide{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px}#infoOverlay .element-row{padding:10px;border-radius:10px;background:rgba(0,0,0,.17);border:1px solid rgba(255,255,255,.06);font-size:10px;line-height:1.45}
      #infoOverlay .save-tools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}#infoOverlay .save-textarea{width:100%;height:120px;background:#080d17;color:#eaf0ff;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px;font:11px ui-monospace,monospace;resize:vertical}
      #infoOverlay .rarity-guide-grid{display:grid;gap:6px;margin:10px 0}#infoOverlay .rarity-guide-row{display:grid;grid-template-columns:14px 92px 1fr;gap:8px;align-items:center;padding:7px 8px;border-radius:9px;background:rgba(255,255,255,.035);font-size:10px;color:var(--muted)}#infoOverlay .rarity-swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(255,255,255,.35)}
      #infoOverlay .set-tier-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:7px;margin-top:9px}#infoOverlay .set-tier{padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:9px;color:var(--muted);font-size:10px}#infoOverlay .set-tier b,#infoOverlay .set-tier span{display:block}#infoOverlay .set-tier.active{border-color:rgba(255,172,56,.65);background:rgba(255,156,56,.1);color:#ffe7c0}
      @media(max-width:700px){#infoOverlay.info-guide-overlay{padding:0;align-items:stretch}#infoOverlay .info-guide-shell{width:100%;max-height:100vh;min-height:100vh;border-radius:0;border-width:0}#infoOverlay .info-guide-chrome{padding:14px 16px}#infoOverlay .info-guide-chrome h2{font-size:22px}#infoOverlay .info-guide-content{padding:14px 16px 28px}#infoOverlay .info-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}#infoOverlay .info-class-grid,#infoOverlay .element-guide{grid-template-columns:1fr}#infoOverlay .lifetime-wide{grid-column:auto}#infoOverlay .save-tools{grid-template-columns:1fr}}
    `;
    documentRef.head?.appendChild(style);
  }

  function ensureSurface(){
    const documentRef=doc();
    let overlay=find('infoOverlay');
    if(!documentRef)return null;
    if(!overlay){overlay=documentRef.createElement('div');overlay.id='infoOverlay';documentRef.body?.appendChild(overlay);}
    installStyles();
    overlay.classList.add('overlay','info-guide-overlay');
    overlay.dataset.infoGuideOwner=OWNER;
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',"Roadkeeper's Guide");
    if(overlay.dataset.infoGuideSurface!=='1'){
      overlay.dataset.infoGuideSurface='1';
      overlay.innerHTML=`<section class="info-guide-shell"><header class="info-guide-chrome"><div><span class="info-guide-kicker">Roadkeeper's Guide</span><h2>Info</h2></div><button type="button" class="small-btn info-guide-done" data-info-done data-app-dismiss>Done</button></header><div class="info-guide-content"><p class="info-guide-subtitle">Current rules, progression, classes, elements and save tools. Career Stats and Run History now live in the Campsite Career book. Secrets remain deliberately vague until discovered.</p><nav class="info-tabs" id="infoTabs" data-info-tabs aria-label="Guide sections"><button type="button" class="small-btn active" data-info-tab="guide">Guide</button><button type="button" class="small-btn" data-info-tab="elements">Elements</button><button type="button" class="small-btn" data-info-tab="save">Save</button></nav><section class="info-tab-panel active" data-info-panel="guide"><div id="infoSections" data-info-sections></div></section><section class="info-tab-panel" data-info-panel="elements"><div class="element-guide" id="elementGuide" data-element-guide></div></section><section class="info-tab-panel" data-info-panel="save"><h3>Transfer save</h3><p class="info-guide-subtitle">Export a portable save string or import one into the current profile.</p><textarea class="save-textarea" id="saveTransferText" data-save-transfer placeholder="Exported save data appears here. Paste save data here to import."></textarea><div class="save-tools"><button type="button" class="small-btn" data-save-export>Export save</button><button type="button" class="small-btn" data-save-import>Import save</button></div></section></div></section>`;
      overlay.querySelector('[data-info-done]')?.addEventListener('click',close);
      overlay.querySelector('[data-info-tabs]')?.addEventListener('click',event=>{const button=event.target.closest('[data-info-tab]');if(button)activateTab(button.dataset.infoTab);});
      overlay.querySelector('[data-save-export]')?.addEventListener('click',exportSave);
      overlay.querySelector('[data-save-import]')?.addEventListener('click',importSave);
    }
    return overlay;
  }

  function detail(id,label,html,open=false){return `<details class="info-section" data-guide-section="${escapeHtml(id)}"${open?' open':''}><summary>${label}</summary><div class="info-body">${html}</div></details>`;}
  function classRows(){return classes().filter(entry=>!entry.secret||isClassUnlocked(entry.id)).map(entry=>{
    const tags=(entry.tags||[]).map(tag=>`<span class="info-tag">${escapeHtml(tag)}</span>`).join('');
    const passive=entry.passive?`<p><b>${escapeHtml(entry.passive.name)}:</b> ${escapeHtml(entry.passive.desc)}</p>`:'';
    return `<div class="info-class"><b>${escapeHtml(entry.icon||'')} ${escapeHtml(entry.name||entry.id)}</b>${tags?`<div class="info-tag-row">${tags}</div>`:''}<p>${escapeHtml(entry.desc||'')}</p><span>${escapeHtml(entry.scaleNotes||entry.stats||'')}</span>${passive}</div>`;
  }).join('');}
  function invokerCodexHtml(){
    if(!isClassUnlocked('invoker'))return '';
    const recipes=window.DiceboundInvoker?.RECIPE;
    if(!recipes)return '';
    const names={b:'Blue',g:'Green',r:'Red'};
    const rows=Object.entries(recipes).map(([formula,recipe])=>`<div class="info-class"><b>${formula.split('').map(key=>names[key]?.[0]||key.toUpperCase()).join(' + ')} — ${escapeHtml(recipe.name)}</b><p>${escapeHtml(recipe.tip)}</p></div>`).join('');
    return `<h4>Invoker Formula Codex</h4><p>Blue comes from Defend, Green from Arcane Current and Red from Elemental Lance. Invoke reads the current three-orb formula; the oldest orb rotates out when a fourth forms.</p><div class="info-class-grid">${rows}</div>`;
  }
  function artifactSetHtml(){
    const set=artifactSet(),count=Math.max(0,Number(set.count)||0),tiers=Array.isArray(set.tiers)?set.tiers:[],total=Math.max(0,...tiers.map(tier=>Number(tier.pieces)||0));
    return `<strong>Impossible Road set · Artifact</strong><br><span style="color:var(--muted)">${count}/${total||count} pieces active.</span><div class="set-tier-grid">${tiers.map(tier=>`<div class="set-tier${count>=Number(tier.pieces)?' active':''}"><b>${escapeHtml(tier.pieces)}-piece bonus</b><span>${escapeHtml(tier.text)}</span></div>`).join('')}</div>`;
  }
  function rarityGuideHtml(){return `<p>Equipment and powerups use the same rarity language. Ordinary generated equipment stops at <b>Epic</b>; Legendary and above are special chase tiers.</p><div class="rarity-guide-grid">${RARITY_TIERS.map(([id,name,color,label,note])=>`<div class="rarity-guide-row"><span class="rarity-swatch" style="background:${color};${id==='omega'?'box-shadow:0 0 8px #b56cff':''}"></span><b style="color:${color}">${name}</b><span>${label} · ${note}</span></div>`).join('')}</div><p><b>Unique</b> is separate from rarity. A Unique power changes a rule or cannot safely stack; most ordinary Legendary stat powers can appear more than once.</p>`;}
  function guideHtml(){return [
    detail('rarity','Rarity tiers & colours',rarityGuideHtml()),
    detail('gear','Equipment & guardian loot','<p><b>Generated gear:</b> ordinary equipment progresses from Poor through Epic, while Legendary equipment can carry a build-changing Legendary Effect. Later roads improve expected quality.</p><p><b>Mythical</b> items are named handcrafted relics. Guardians can reveal Impossible Road Artifact pieces from their own weighted loot rules, and later-road Treasure can produce exceptional generated gear.</p>'),
    detail('travel','Travel & the six roads','<p>Roll to move along each road. Crossed tiles grant run XP, and high rolls grant Fast Travel XP. Minibosses intercept movement when you cross their tile, so a large roll cannot skip them.</p><p>Clearing Board 5 permanently unlocks Double Dice, allowing either 1d6 or 2d6. Board 6 is the hardest ordinary road and expects a mature build.</p>',true),
    detail('combat','Combat, Guard & status effects','<p>Attack, Guard, potions, class actions and Ultimates all consume actions. Guard reduces incoming ordinary attacks and Guardian specials and builds more Ultimate; Mana classes also recover a little Mana while guarding.</p><p><b>Defense</b> uses diminishing percentage reduction rather than flat subtraction. <b>Crit Chance</b>, <b>Echo Strike</b> and <b>Poison-on-hit</b> can exceed 100%: each full 100% guarantees another tier, hit or stack and the remainder rolls for one more. Echo Strikes roll their own Crit and elemental activations.</p><p>Barriers block individual normal hits, so multi-hit attacks can remove several barriers. Guardian specials ignore ordinary barriers but Guard still reduces them. Haste cannot proc again until an enemy response occurs.</p>'),
    detail('signature','Signature Burst & Arcane Surge','<p><b>Signature Burst</b> is a class-specific proc chance used by some identities. When the chance succeeds, that class triggers its own special basic or Echo-strike effect.</p><p>For <b>Sorcerer</b>, Signature Burst is called <b>Arcane Surge</b>. Every basic strike and Echo strike independently rolls its chance; when it procs, that strike deals <b>50% more damage</b>. Other classes use the same underlying stat for different effects.</p>'),
    detail('poison','Poison identities & overflow','<p>Poison stacks tick once per combat round and each stack deals a percentage of your Attack. Poison application uses overflow scaling: every full 100% guarantees another stack and any remainder rolls for one more.</p><p>Classes tagged <b>Poison</b> receive the full Poison-damage bonus from Throne of Venom; other classes receive half. Ninja Smoke counts critical tiers, including Echo Strikes.</p>'),
    detail('powerups','Powerups & rarity','<p>Level-ups normally offer three eligible powerups; talents can add rerolls and a fourth choice. Eligibility respects class tags, achievements, mastery gates and Unique powers already taken.</p><p>Powerup tiers follow: <b>Poor → Common → Uncommon → Rare → Epic → Legendary</b>, with higher tiers becoming progressively less common.</p>'),
    detail('equipment','Equipment & special rarity','<p>Ordinary equipment rolls hidden quality budgets, prefixes and suffixes from <b>Poor, Common, Uncommon, Rare and Epic</b>. Later roads improve expected quality. Elemental weapons trade some raw budget for their proc potential.</p><p><b>Legendary</b> equipment is handcrafted and found through unusual discoveries. <b>Artifact</b> includes the Impossible Road set. <b>Mythical</b> and <b>Omega</b> are rarer handcrafted chase tiers rather than ordinary random gear.</p><p>Replacing normal gear automatically sells the displaced item. Sale value follows actual item quality; Merchant receives its class resale bonus.</p>'),
    detail('artifact-set','Impossible Road Artifact set',artifactSetHtml()),
    detail('companions','Companions','<p>Companions attack after player actions and gain permanent Bond levels from cookies. Elemental companions unlock by building progress with their corresponding element. Their active bonus scales slowly with Bond.</p><p>Only pet-tagged classes such as Beastmaster, Summoner and Pokémon Trainer may switch companions during a run; everyone else chooses at the Campsite.</p>'),
    detail('legacy','Legacy, Talents & Prestige','<p>Run distance and banked gold become Legacy XP. Legacy levels grant talent points. Talents purchased during a run activate on the <b>next</b> run.</p><p>Prestige converts enough talent progression into unspent Prestige Points, then resets Legacy level and the talent tree. Lifetime Prestige Points permanently accelerate Legacy XP gain; currently unspent points also grant held stat power. The Prestige Moon can buy permanent Heirloom Loadout and Vault Expansion ranks or convert refundable points into persisted five-stat random bundles. <b>The Heirloom Vault and everything stored inside it survive automatically.</b></p>'),
    detail('modes','Nightmare & Hell','<p>Nightmare dramatically strengthens enemies. Nightmare guardians begin with a Barrier and enemies gain a small amount of Dodge.</p><p>Hell is harsher again: from Board 2 onward every enemy begins with at least one Barrier, enemy Dodge is slightly higher, and later combat patterns become increasingly hostile.</p>'),
    detail('classes','Classes & scaling',`<div class="info-class-grid">${classRows()}</div>${invokerCodexHtml()}<p>Later and secret unlocks are not intended to have equal fresh-run power. Some are deliberately stranger or stronger rewards.</p>`),
    detail('achievements','Achievements & unlocks','<p>Achievements track permanent milestones and show their rewards when revealing that reward does not spoil a secret. Some powerful class powers require clearing later boards with that class.</p>')
  ].join('');}
  function elementsHtml(){return Object.entries(elements()).map(([key,entry])=>`<div class="element-row"><b>${escapeHtml(entry.icon||'')} ${escapeHtml(entry.name||key)} — ${escapeHtml(entry.spell||'')}</b><br>${escapeHtml(entry.description||'')}<br><span style="color:var(--muted)">Element Power improves the effect. Matching weaknesses increase activation and strength.${key==='ice'?' Guardians gain temporary resistance after being frozen, preventing permanent freeze loops.':''}</span></div>`).join('');}
  function render(){
    const overlay=ensureSurface();if(!overlay)return viewModel();
    const sections=overlay.querySelector('[data-info-sections]'),elementGuide=overlay.querySelector('[data-element-guide]');
    if(sections)sections.innerHTML=guideHtml();if(elementGuide)elementGuide.innerHTML=elementsHtml();runtime.afterRender?.();return viewModel();
  }
  function viewModel(){return Object.freeze({owner:OWNER,guideSections:Object.freeze(['rarity','gear','travel','combat','signature','poison','powerups','equipment','artifact-set','companions','legacy','modes','classes','achievements']),elementCount:Object.keys(elements()).length,classCount:classes().filter(entry=>!entry.secret||isClassUnlocked(entry.id)).length});}
  function activateTab(name='guide'){
    const overlay=ensureSurface(),tab=['guide','elements','save'].includes(name)?name:'guide';if(!overlay)return tab;
    overlay.querySelectorAll('[data-info-tab]').forEach(button=>button.classList.toggle('active',button.dataset.infoTab===tab));
    overlay.querySelectorAll('[data-info-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.infoPanel===tab));
    return tab;
  }
  function open(){const overlay=ensureSurface();render();activateTab('guide');if(overlay){overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');}runtime.onOpen?.();return overlay;}
  function close(){const overlay=find('infoOverlay');if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}runtime.onClose?.();return overlay||null;}
  function exportSave(){const value=runtime.exportSave?.();const apply=text=>{const field=ensureSurface()?.querySelector('[data-save-transfer]');if(field&&typeof text==='string')field.value=text;};if(value&&typeof value.then==='function')value.then(apply);else apply(value);return value;}
  function importSave(){const field=ensureSurface()?.querySelector('[data-save-transfer]'),result=runtime.importSave?.(field?.value||'');if(result!==false)close();return result;}
  function bindTrigger(){const trigger=find('infoBtn');if(!trigger||trigger.dataset.infoGuideWired==='1')return;trigger.dataset.infoGuideWired='1';trigger.addEventListener('click',open);}
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};bindTrigger();return api;}
  function inspect(){const overlay=find('infoOverlay');return Object.freeze({owner:overlay?.dataset.infoGuideOwner||null,open:!!overlay&&!overlay.classList.contains('hidden'),hasDone:!!overlay?.querySelector?.('[data-info-done]'),activeTab:overlay?.querySelector?.('[data-info-tab].active')?.dataset.infoTab||null,sections:overlay?.querySelectorAll?.('[data-guide-section]').length||0});}
  const api=Object.freeze({configure,open,close,render,activateTab,viewModel,inspect,owner:OWNER});
  window.DiceboundInfoGuide=api;
  window.DiceboundInfoGuideTest=Object.freeze({viewModel,guideSections:()=>viewModel().guideSections});
})(window);
