(() => {
  "use strict";

  const OWNER='ui/info-guide';
  let runtime={};
  const RARITY_TIERS=[
    ['poor','Poor','#888888','11–25 points','ordinary generated'],
    ['common','Common','#ffffff','26–45 points','ordinary generated'],
    ['uncommon','Uncommon','#3ad36e','46–70 points','ordinary generated'],
    ['rare','Rare','#3da5ff','71–105 points','ordinary generated'],
    ['epic','Epic','#b65cff','106–150 points','ordinary generated'],
    ['legendary','Legendary','#ff9f43','151–210+ points + effect','special generated'],
    ['artifact','Artifact','#ff7a00','handcrafted set pieces','Impossible Road set'],
    ['mythical','Mythical','#ff4fd8','named handcrafted','ultra-rare'],
    ['omega','Omega','#b56cff','rule-breaking handcrafted','rarest chase tier']
  ];
  function doc(){return window.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function classes(){return runtime.getClasses?.()||[];}
  function isClassUnlocked(id){return !!runtime.isClassUnlocked?.(id);}
  function elements(){return runtime.getElements?.()||{};}
  function artifactSet(){return runtime.getArtifactSet?.()||{count:0,tiers:[]};}
  function stats(){return runtime.getLifetimeStats?.()||{};}
  function detail(id,title,body,open=false){return `<details class="info-section" data-guide-section="${escapeHtml(id)}"${open?' open':''}><summary>${escapeHtml(title)}</summary><div class="info-section-body">${body}</div></details>`;}
  function ensureSurface(){
    const overlay=find('infoOverlay');if(!overlay)return null;
    overlay.dataset.infoGuideOwner=OWNER;
    if(overlay.dataset.infoGuideBuilt==='1')return overlay;
    overlay.dataset.infoGuideBuilt='1';overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`<div class="modal info-modal"><div class="info-head"><div><h2>📘 Roadkeeper's Guide</h2><p>Rules, systems, progression and permanent statistics.</p></div><button class="small-btn" data-info-done>Done</button></div><div class="info-tabs"><button class="small-btn active" data-info-tab="guide">Guide</button><button class="small-btn" data-info-tab="stats">Lifetime stats</button><button class="small-btn" data-info-tab="elements">Elements</button><button class="small-btn" data-info-tab="save">Save</button></div><div class="info-panel active" data-info-panel="guide"><div data-info-sections></div></div><div class="info-panel" data-info-panel="stats"><div class="lifetime-grid" data-lifetime-stats></div></div><div class="info-panel" data-info-panel="elements"><div class="element-guide" data-element-guide></div></div><div class="info-panel" data-info-panel="save"><p>Export or import your permanent save. Imported saves are normalized before use.</p><textarea class="save-transfer" data-save-transfer rows="8" spellcheck="false"></textarea><div class="save-transfer-actions"><button class="small-btn" data-save-export>Export save</button><button class="small-btn" data-save-import>Import save</button></div></div></div>`;
    overlay.addEventListener('click',event=>{
      const tab=event.target.closest?.('[data-info-tab]');if(tab){activateTab(tab.dataset.infoTab);return;}
      if(event.target.closest?.('[data-info-done]')){close();return;}
      if(event.target.closest?.('[data-save-export]')){exportSave();return;}
      if(event.target.closest?.('[data-save-import]')){importSave();return;}
    });
    return overlay;
  }
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
    const set=artifactSet(),count=Math.max(0,Number(set.count)||0),tiers=Array.isArray(set.tiers)?set.tiers:[];
    return `<strong>Impossible Road set · Artifact</strong><br><span style="color:var(--muted)">${count}/7 pieces active.</span><div class="set-tier-grid">${tiers.map(tier=>`<div class="set-tier${count>=Number(tier.pieces)?' active':''}"><b>${escapeHtml(tier.pieces)}-piece bonus</b><span>${escapeHtml(tier.text)}</span></div>`).join('')}</div>`;
  }
  function rarityGuideHtml(){return `<p>Equipment and powerups use the same rarity language. Ordinary generated equipment stops at <b>Epic</b>; Legendary and above are special chase tiers.</p><div class="rarity-guide-grid">${RARITY_TIERS.map(([id,name,color,label,note])=>`<div class="rarity-guide-row"><span class="rarity-swatch" style="background:${color};${id==='omega'?'box-shadow:0 0 8px #b56cff':''}"></span><b style="color:${color}">${name}</b><span>${label} · ${note}</span></div>`).join('')}</div><p><b>Unique</b> is separate from rarity. A Unique power changes a rule or cannot safely stack; most ordinary Legendary stat powers can appear more than once.</p>`;}
  function guideHtml(){return [
    detail('rarity','Rarity tiers & colours',rarityGuideHtml()),
    detail('gear','Equipment & guardian loot','<p><b>Generated gear:</b> Poor 11–25 · Common 26–45 · Uncommon 46–70 · Rare 71–105 · Epic 106–150 · Legendary 151–210. Legendary equipment can also roll one build-changing Legendary Effect.</p><p><b>Mythical</b> items are named handcrafted relics. Guardians make one difficulty- and board-specific Artifact-table roll; if it succeeds, exactly one Impossible Road piece is selected from its weighted table. Board 4+ Treasure can become a guaranteed generated Legendary.</p>'),
    detail('travel','Travel & the six roads','<p>Roll to move along each road. Crossed tiles grant run XP, and high rolls grant Fast Travel XP. Minibosses intercept movement when you cross their tile, so a large roll cannot skip them.</p><p>Clearing Board 5 permanently unlocks Double Dice, allowing either 1d6 or 2d6. Board 6 is the hardest ordinary road and expects a mature build.</p>',true),
    detail('combat','Combat, Guard & status effects','<p>Attack, Guard, potions, class actions and Ultimates all consume actions. Guard reduces incoming ordinary attacks and Guardian specials and builds more Ultimate; Mana classes also recover a little Mana while guarding.</p><p><b>Defense</b> uses diminishing percentage reduction rather than flat subtraction. <b>Crit</b>, <b>Echo Strike</b> and <b>Poison-on-hit</b> can exceed 100%: each full 100% guarantees another tier, hit or stack and the remainder rolls for one more. Echo Strikes roll their own Crit and elemental activations.</p><p>Barriers block individual normal hits, so multi-hit attacks can remove several barriers. Guardian specials ignore ordinary barriers but Guard still reduces them. Haste cannot proc again until an enemy response occurs.</p>'),
    detail('signature','Signature Burst & Arcane Surge','<p><b>Signature Burst</b> is a class-specific proc chance used by some identities. When the chance succeeds, that class triggers its own special basic or Echo-strike effect.</p><p>For <b>Sorcerer</b>, Signature Burst is called <b>Arcane Surge</b>. Every basic strike and Echo strike independently rolls its chance; when it procs, that strike deals <b>50% more damage</b>. Other classes use the same underlying stat for different effects.</p>'),
    detail('poison','Poison identities & overflow','<p>Poison stacks tick once per combat round and each stack deals a percentage of your Attack. Poison application uses overflow scaling: 125% means one guaranteed stack plus a 25% chance for a second; 240% means two guaranteed plus a 40% chance for a third.</p><p>Classes tagged <b>Poison</b> receive the full Poison-damage bonus from Throne of Venom; other classes receive half. Ninja Smoke counts critical tiers, including Echo Strikes.</p>'),
    detail('powerups','Powerups & rarity','<p>Level-ups normally offer three eligible powerups; talents can add rerolls and a fourth choice. Eligibility respects class tags, achievements, mastery gates and Unique powers already taken.</p><p>Powerup tiers follow: <b>Poor → Common → Uncommon → Rare → Epic → Legendary</b>, with higher tiers becoming progressively less common.</p>'),
    detail('equipment','Equipment & special rarity','<p>Ordinary equipment rolls hidden quality budgets, prefixes and suffixes from <b>Poor, Common, Uncommon, Rare and Epic</b>. Later roads improve expected quality. Elemental weapons trade some raw budget for their proc potential.</p><p><b>Legendary</b> equipment is handcrafted and found through unusual discoveries. <b>Artifact</b> includes the Impossible Road set. <b>Mythical</b> and <b>Omega</b> are rarer handcrafted chase tiers rather than ordinary random gear.</p><p>Replacing normal gear automatically sells the displaced item. Sale value follows actual item quality; Merchant receives its class resale bonus.</p>'),
    detail('artifact-set','Impossible Road Artifact set',artifactSetHtml()),
    detail('companions','Companions','<p>Companions attack after player actions and gain permanent Bond levels from cookies. Elemental companions unlock by building progress with their corresponding element. Their active bonus scales slowly with Bond.</p><p>Only pet-tagged classes such as Beastmaster, Summoner and Pokémon Trainer may switch companions during a run; everyone else chooses at the Campsite.</p>'),
    detail('legacy','Legacy, Talents & Prestige','<p>Run distance and banked gold become Legacy XP. Legacy levels grant talent points. Talents purchased during a run activate on the <b>next</b> run.</p><p>Prestige converts every 9 total talent points into unspent Prestige Points, then resets Legacy level and the talent tree. Each unspent point grants one held stat point; the Prestige Moon can convert a point into a persisted five-stat random bundle. <b>Heirloom Storage and everything stored inside it survive automatically.</b></p>'),
    detail('modes','Nightmare & Hell','<p>Nightmare dramatically strengthens enemies. Nightmare guardians begin with a Barrier and enemies gain a small amount of Dodge.</p><p>Hell is harsher again: from Board 2 onward every enemy begins with at least one Barrier, enemy Dodge is slightly higher, and later combat patterns become increasingly hostile.</p>'),
    detail('classes','Classes & scaling',`<div class="info-class-grid">${classRows()}</div>${invokerCodexHtml()}<p>Later and secret unlocks are not intended to have equal fresh-run power. Some are deliberately stranger or stronger rewards.</p>`),
    detail('achievements','Achievements & unlocks','<p>Achievements track permanent milestones and show their rewards when revealing that reward does not spoil a secret. Some powerful class powers require clearing later boards with that class.</p>')
  ].join('');}
  function elementsHtml(){return Object.entries(elements()).map(([key,entry])=>`<div class="element-row"><b>${escapeHtml(entry.icon||'')} ${escapeHtml(entry.name||key)} — ${escapeHtml(entry.spell||'')}</b><br>${escapeHtml(entry.description||'')}<br><span style="color:var(--muted)">Element Power improves the effect. Matching weaknesses increase activation and strength.${key==='ice'?' Guardians gain temporary resistance after being frozen, preventing permanent freeze loops.':''}</span></div>`).join('');}
  function lifetimeModel(){
    const source=stats(),highest=new Map();
    Object.entries(source.boardClears||{}).filter(([,value])=>Number(value)>0).forEach(([key,value])=>{
      const modern=key.match(/^([^:]+):(normal|nightmare|hell):b(\d+)$/),legacy=key.match(/^([^:]+):b(\d+)$/),classId=modern?.[1]||legacy?.[1],mode=modern?.[2]||'normal',board=Number(modern?.[3]||legacy?.[2]||0);
      if(!classId||!board)return;const group=`${classId}:${mode}`;highest.set(group,Math.max(highest.get(group)||0,board));
    });
    const clears=[...highest.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,board])=>{const [classId,mode]=key.split(':'),entry=classes().find(candidate=>candidate.id===classId),label=mode[0].toUpperCase()+mode.slice(1);return `${entry?.icon||'•'} ${entry?.name||classId} — ${label}: Board ${board}`;});
    return Object.freeze({
      owner:OWNER,
      values:Object.freeze({runsStarted:source.runsStarted,runsFinished:source.runsFinished,fullVictories:source.fullVictories,tilesTraveled:source.tilesTraveled,rolls:source.rolls,highestRunLevel:source.highestRunLevel,damageDealt:source.damageDealt,damageTaken:Math.max(source.damageTaken||0,runtime.getMetaDamageTaken?.()||0),healingDone:source.healingDone,goldEarned:source.goldEarned,goldSpent:source.goldSpent,highestGold:source.highestGold,enemiesDefeated:source.enemiesDefeated,bossesDefeated:source.bossesDefeated,powerupsTaken:source.powerupsTaken}),
      clears:Object.freeze(clears)
    });
  }
  function renderStats(){
    const overlay=ensureSurface(),grid=overlay?.querySelector('[data-lifetime-stats]');
    const model=lifetimeModel();if(!grid)return model;
    const fmt=value=>Math.round(Number(value)||0).toLocaleString(),labels=[['runsStarted','Runs started'],['runsFinished','Runs finished'],['fullVictories','Full victories'],['tilesTraveled','Tiles traveled'],['rolls','Dice rolls'],['highestRunLevel','Highest run level'],['damageDealt','Damage dealt'],['damageTaken','Damage taken'],['healingDone','Healing done'],['goldEarned','Gold earned'],['goldSpent','Gold spent'],['highestGold','Highest gold held'],['enemiesDefeated','Enemies defeated'],['bossesDefeated','Bosses defeated'],['powerupsTaken','Powerups taken']];
    grid.innerHTML=labels.map(([key,label])=>`<div class="lifetime-stat"><span>${label}</span><strong>${fmt(model.values[key])}</strong></div>`).join('')+`<div class="lifetime-stat lifetime-wide"><span>Board clears by class</span><div class="class-clear-list">${model.clears.length?model.clears.map(escapeHtml).join('<br>'):'No recorded class-specific board clears yet.'}</div></div>`;
    return model;
  }
  function render(){
    const overlay=ensureSurface();if(!overlay)return viewModel();
    const sections=overlay.querySelector('[data-info-sections]'),elementGuide=overlay.querySelector('[data-element-guide]');
    if(sections)sections.innerHTML=guideHtml();if(elementGuide)elementGuide.innerHTML=elementsHtml();renderStats();runtime.afterRender?.();return viewModel();
  }
  function viewModel(){return Object.freeze({owner:OWNER,guideSections:Object.freeze(['rarity','gear','travel','combat','signature','poison','powerups','equipment','artifact-set','companions','legacy','modes','classes','achievements']),elementCount:Object.keys(elements()).length,classCount:classes().filter(entry=>!entry.secret||isClassUnlocked(entry.id)).length});}
  function activateTab(name='guide'){
    const overlay=ensureSurface(),tab=['guide','stats','elements','save'].includes(name)?name:'guide';if(!overlay)return tab;
    overlay.querySelectorAll('[data-info-tab]').forEach(button=>button.classList.toggle('active',button.dataset.infoTab===tab));
    overlay.querySelectorAll('[data-info-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.infoPanel===tab));
    if(tab==='stats')renderStats();return tab;
  }
  function open(){const overlay=ensureSurface();render();activateTab('guide');if(overlay){overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');}runtime.onOpen?.();return overlay;}
  function close(){const overlay=find('infoOverlay');if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}runtime.onClose?.();return overlay||null;}
  function exportSave(){const value=runtime.exportSave?.();const apply=text=>{const field=ensureSurface()?.querySelector('[data-save-transfer]');if(field&&typeof text==='string')field.value=text;};if(value&&typeof value.then==='function')value.then(apply);else apply(value);return value;}
  function importSave(){const field=ensureSurface()?.querySelector('[data-save-transfer]'),result=runtime.importSave?.(field?.value||'');if(result!==false)close();return result;}
  function bindTrigger(){const trigger=find('infoBtn');if(!trigger||trigger.dataset.infoGuideWired==='1')return;trigger.dataset.infoGuideWired='1';trigger.addEventListener('click',open);}
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};bindTrigger();return api;}
  function inspect(){const overlay=find('infoOverlay');return Object.freeze({owner:overlay?.dataset.infoGuideOwner||null,open:!!overlay&&!overlay.classList.contains('hidden'),hasDone:!!overlay?.querySelector?.('[data-info-done]'),activeTab:overlay?.querySelector?.('[data-info-tab].active')?.dataset.infoTab||null,sections:overlay?.querySelectorAll?.('[data-guide-section]').length||0});}
  const api=Object.freeze({configure,open,close,render,renderStats,activateTab,viewModel,inspect,owner:OWNER});
  window.DiceboundInfoGuide=api;
  window.DiceboundInfoGuideTest=Object.freeze({viewModel,lifetimeModel,guideSections:()=>viewModel().guideSections});
})(window);