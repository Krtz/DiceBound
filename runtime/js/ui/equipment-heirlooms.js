/* DiceBound equipment and Heirloom presentation owner.
 *
 * Equipment generation, stats, rarity, storage capacity, persistence and
 * reward consequences remain in their existing runtime domains. This module
 * owns the player-facing equipment grid, loot card, Camp chest contents and
 * end-of-run Heirloom/storage surfaces.
 */
(function(root){
  'use strict';

  const OWNER='ui/equipment-heirlooms';
  const STYLE_ID='dicebound-equipment-heirloom-ui-owner';
  let runtime={};

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function escapeHtml(value){return String(value??'').replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));}
  function slots(){return runtime.getSlots?.()||[];}
  function label(slot){return runtime.getSlotLabel?.(slot)||slot||'Equipment';}
  function rarity(item){return runtime.getRarityInfo?.(item?.rarity)||{label:item?.rarity||'Unknown'};}
  function bonuses(item){return runtime.formatBonuses?.(item)||'No bonuses';}
  function state(){return runtime.getState?.()||{};}
  function setModel(){return runtime.getArtifactSet?.()||{count:0,tiers:[]};}

  function installStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById(STYLE_ID))return;
    const style=documentRef.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .db-equipment-art{display:block;object-fit:contain}.slot-item:has(.db-equipment-slot-art){display:flex;align-items:center;gap:4px}.db-equipment-slot-art{width:20px;height:20px;flex:0 0 20px}.loot-icon:has(.db-equipment-loot-art){width:58px;height:58px}.db-equipment-loot-art{width:58px;height:58px;filter:drop-shadow(0 5px 6px rgba(0,0,0,.42))}
      .db-equipment-card-art{width:48px;height:48px;max-width:48px;max-height:48px;flex:0 0 48px;filter:drop-shadow(0 4px 5px rgba(0,0,0,.35))}.heirloom-storage-item b:has(.db-equipment-card-art),.end-storage-card b:has(.db-equipment-card-art),.gear-keep-btn strong:has(.db-equipment-card-art){display:flex;align-items:center;gap:8px;min-width:0}
      .heirloom-storage-wrap{margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(0,0,0,.13)}
      .heirloom-storage-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.heirloom-storage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}.heirloom-storage-item{padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:13px;background:rgba(255,255,255,.035);color:var(--ink);text-align:left}.heirloom-storage-item.active{border-color:var(--gold);box-shadow:inset 0 0 20px rgba(245,200,91,.08)}.heirloom-storage-item b,.heirloom-storage-item span{display:block}.heirloom-storage-item span{font-size:9px;color:var(--muted);margin-top:4px;line-height:1.4}.heirloom-storage-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:stretch;margin-top:8px}.heirloom-storage-actions .small-btn{width:auto;margin-top:0!important;min-height:34px}.heirloom-storage-actions .danger{border-color:rgba(255,100,118,.34)!important;background:rgba(106,24,42,.28)!important;color:#ffd3da!important}
      .end-storage-manager{margin:16px 0;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(0,0,0,.13)}.end-storage-manager h3{margin:0 0 6px}.end-storage-summary{font-size:11px;color:var(--muted);margin-bottom:10px}.end-storage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:9px;max-height:400px;overflow:auto;padding-right:4px}.end-storage-card{padding:10px;border-radius:13px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035)}.end-storage-card.active{border-color:var(--gold);box-shadow:inset 0 0 18px rgba(245,200,91,.08)}.end-storage-card b,.end-storage-card span{display:block}.end-storage-card span{font-size:9px;color:var(--muted);line-height:1.4;margin-top:4px}.end-storage-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
    `;
    documentRef.head?.appendChild(style);
  }

  function artMarkup(item,klass){
    const entry=runtime.resolveEquipmentArt?.(item);
    if(!entry?.image)return '';
    return `<img class=\"db-equipment-art ${klass}\" src=\"${escapeHtml(entry.image)}\" alt=\"${escapeHtml(entry.alt||item?.name||'Equipment')}\" draggable=\"false\">`;
  }
  function itemNameMarkup(item,klass=''){const art=artMarkup(item,klass);return art?`${art}<span>${escapeHtml(item?.name||'Equipment')}</span>`:`${escapeHtml(item?.icon||'')} ${escapeHtml(item?.name||'Equipment')}`;}
  function artifactSetHtml(model=setModel()){
    const count=Math.max(0,Number(model.count)||0),tiers=Array.isArray(model.tiers)?model.tiers:[];
    return `<strong>🌈 Impossible Road set · Artifact</strong><br><span style=\"color:var(--muted)\">${count}/7 pieces active.</span><div class=\"set-tier-grid\">${tiers.map(tier=>`<div class=\"set-tier${count>=Number(tier.pieces)?' active':''}\"><b>${escapeHtml(tier.pieces)}-piece bonus</b><span>${escapeHtml(tier.text)}</span></div>`).join('')}</div>`;
  }
  function campHeirloomHtml(){
    const current=state(),items=current.heirlooms||[],capacity=Math.max(0,Number(current.activeCapacity)||0);
    return items.length?`<div class=\"camp-heirloom-card\"><strong>Bound heirlooms (${items.length}/${capacity})</strong><br>${items.map(item=>`<strong>${escapeHtml(item.icon||'')} ${escapeHtml(item.name||'Equipment')}</strong> — ${escapeHtml(bonuses(item))}`).join('<br>')}</div>`:`<div class=\"camp-heirloom-card\">No heirlooms are currently bound. You have ${capacity} permanent slot${capacity===1?'':'s'}.</div>`;
  }
  function campView(){return Object.freeze({owner:OWNER,heirloomHtml:campHeirloomHtml(),setHtml:artifactSetHtml()});}

  function renderEquipment(){
    installStyles();
    const grid=find('equipmentGrid'),current=state(),equipped=current.equipment||{};
    if(grid){
      grid.replaceChildren();
      slots().forEach(slot=>{
        const item=equipped[slot],entry=doc()?.createElement('div');if(!entry)return;
        entry.className=`equipment-slot ${item?.rarity||'empty'}`;
        entry.title=item?`${item.name}: ${bonuses(item)}`:`Empty ${label(slot)} slot`;
        entry.innerHTML=`<span class=\"slot-label\">${escapeHtml(label(slot))}</span><span class=\"slot-item\">${item?itemNameMarkup(item,'db-equipment-slot-art'):'— Empty —'}</span>`;
        grid.appendChild(entry);
      });
    }
    const setBox=find('mythicSetStatus'),set=setModel();
    if(setBox){setBox.hidden=(Number(set.count)||0)<1;if(!setBox.hidden)setBox.innerHTML=artifactSetHtml(set);}
    renderCampStorage();
    return Object.freeze({owner:OWNER,slots:slots().length,equipped:slots().filter(slot=>!!equipped[slot]).length,setPieces:Number(set.count)||0});
  }

  function renderLoot(item){
    installStyles();
    const overlay=find('lootOverlay'),card=find('lootCard'),title=find('lootTitle'),subtitle=find('lootSubtitle'),sell=find('sellLootBtn'),current=state().equipment?.[item?.slot]||null,copy=runtime.lootCopy?.(item)||{};
    if(!item||!overlay||!card)return null;
    const tier=rarity(item),special=['legendary','artifact','mythical','omega'].includes(item.rarity);
    if(title){title.textContent=copy.title||({omega:'OMEGA ITEM FOUND!',mythical:'MYTHICAL ITEM FOUND!',artifact:'ARTIFACT ITEM FOUND!',legendary:'LEGENDARY RELIC FOUND!'})[item.rarity]||'Equipment found';title.className=copy.titleClass||({omega:'omega-title',artifact:'artifact-title',legendary:'legendary-title',mythical:'mythic-drop-title'})[item.rarity]||'';}
    if(subtitle)subtitle.textContent=copy.subtitle||({omega:'A near-impossible Omega item claws its way into reality.',artifact:'An Artifact-tier relic of the Impossible Road refuses to obey ordinary item rules.',legendary:'This handcrafted Legendary cannot roll from ordinary equipment tables.',mythical:'A Mythical item tears its way out of the road.'})[item.rarity]||'Equip it now or sell it. Stored heirlooms can be managed at the Campsite.';
    overlay.classList.toggle('mythic-found',special);card.className=`loot-card ${item.rarity||''}`;
    card.innerHTML=`<div class=\"loot-top\"><div class=\"loot-icon\">${artMarkup(item,'db-equipment-loot-art')||escapeHtml(item.icon||'')}</div><div><div class=\"rarity-badge\">${escapeHtml(tier.label||item.rarity||'Unknown')}</div><div class=\"loot-name\">${escapeHtml(item.name||'Equipment')}</div><div class=\"loot-slot\">${escapeHtml(label(item.slot))}</div></div></div><div class=\"loot-bonuses\">${escapeHtml(bonuses(item))}</div><div class=\"loot-current\">${current?`Currently equipped: <b>${escapeHtml(current.name||'Equipment')}</b> — ${escapeHtml(bonuses(current))}`:`The ${escapeHtml(label(item.slot))} slot is empty.`}</div>${item.seedCode?`<div class=\"seed-code\">Item seed: ${escapeHtml(item.seedCode)}</div>`:''}`;
    if(sell)sell.textContent=`Sell for ${Math.max(0,Number(runtime.itemSellValue?.(item))||0)} gold`;
    overlay.classList.remove('hidden');
    return Object.freeze({owner:OWNER,rarity:item.rarity||null,slot:item.slot||null,hasArt:!!runtime.resolveEquipmentArt?.(item)});
  }

  function refreshAfterStorageChange(){runtime.afterStorageChange?.();renderEquipment();renderEndStorageManager();}
  function renderCampStorage(){
    installStyles();
    const panel=find('campChestPanel');if(!panel)return null;
    let host=find('campHeirloomStorage');
    if(!host){host=doc()?.createElement('div');if(!host)return null;host.id='campHeirloomStorage';host.className='heirloom-storage-wrap';panel.appendChild(host);}
    runtime.syncStorage?.();
    const current=state();
    if(!current.storageUnlocked){host.innerHTML='<div class=\"storage-locked\"><b>🗄️ Heirloom Storage locked</b><br>After defeating Board 3, a one-rank talent appears beyond Living Legend. Purchase it once to permanently unlock storage.</div>';return Object.freeze({owner:OWNER,unlocked:false});}
    const storage=current.storage||[],active=current.heirlooms||[],cap=Math.max(0,Number(current.storageCapacity)||0),activeCap=Math.max(0,Number(current.activeCapacity)||0),milestones=current.storageMilestones||[];
    host.innerHTML=`<div class=\"heirloom-storage-head\"><div><b>🗄️ Heirloom Storage</b><br><span style=\"color:var(--muted)\">${storage.length}/${cap} stored · ${active.length}/${activeCap} equipped for the next run</span></div><div style=\"font-size:9px;color:var(--muted)\">Base 8 · ${milestones.map(entry=>`${entry.on?'✅':'⬜'} ${escapeHtml(entry.text)}`).join(' · ')}</div></div><div class=\"heirloom-storage-grid\" data-heirloom-storage-grid></div>`;
    const grid=host.querySelector('[data-heirloom-storage-grid]');
    storage.forEach(item=>{
      const on=active.some(entry=>entry?.id===item?.id),card=doc()?.createElement('div');if(!card||!grid)return;
      card.className=`heirloom-storage-item ${on?'active':''} ${item.rarity||''}`;
      card.innerHTML=`<b>${itemNameMarkup(item,'db-equipment-card-art')}</b><span>${escapeHtml(rarity(item).label||item.rarity||'Unknown')} · ${escapeHtml(label(item.slot))}<br>${escapeHtml(bonuses(item))}</span><div class=\"heirloom-storage-actions\"><button class=\"small-btn\" data-storage-toggle>${on?'Remove from active loadout':'Use next run'}</button><button class=\"small-btn danger\" data-storage-discard>Remove from chest</button></div>`;
      card.querySelector('[data-storage-toggle]')?.addEventListener('click',()=>{if(runtime.toggleStoredActive?.(item)!==false)refreshAfterStorageChange();});
      card.querySelector('[data-storage-discard]')?.addEventListener('click',async()=>{if(!(await runtime.confirm?.(`Remove ${item.name} from Heirloom Storage?`,{title:'Remove stored heirloom?',confirmLabel:'Remove',danger:true})))return;if(runtime.discardStored?.(item)!==false)refreshAfterStorageChange();});
      grid.appendChild(card);
    });
    return Object.freeze({owner:OWNER,unlocked:true,stored:storage.length,active:active.length});
  }

  function renderEndGear(){
    installStyles();runtime.syncStorage?.();
    const grid=find('endGearGrid'),status=find('endHeirloomStatus'),current=state(),items=slots().map(slot=>current.equipment?.[slot]).filter(Boolean);
    if(!grid)return null;
    grid.replaceChildren();
    if(current.storageUnlocked){
      if(status)status.innerHTML=`Heirloom Storage: <strong>${(current.storage||[]).length}/${Math.max(0,Number(current.storageCapacity)||0)}</strong>. Click surviving run gear to store it. Choose the active next-run loadout from the Campsite chest.`;
      if(!items.length){grid.innerHTML='<div class=\"hint\">No equipment survived this run. Stored heirlooms remain safe.</div>';renderEndStorageManager();return Object.freeze({owner:OWNER,storage:true,items:0});}
      const stored=current.storage||[];
      items.forEach(item=>{
        const isStored=stored.some(entry=>entry?.id===item?.id),button=doc()?.createElement('button');if(!button)return;
        button.className=`gear-keep-btn${isStored?' kept':''} ${item.rarity||''}`;
        button.innerHTML=`<strong>${isStored?'✓ STORED · ':''}${itemNameMarkup(item,'db-equipment-card-art')}</strong><span>${escapeHtml(rarity(item).label||item.rarity||'Unknown')} · ${escapeHtml(label(item.slot))} · ${escapeHtml(bonuses(item))}</span>`;
        button.addEventListener('click',()=>{if(runtime.toggleRunStorage?.(item)!==false){renderEndGear();renderCampStorage();runtime.afterStorageChange?.();}});
        grid.appendChild(button);
      });
      renderEndStorageManager();return Object.freeze({owner:OWNER,storage:true,items:items.length});
    }
    const eligible=items.filter(item=>runtime.isHeirloomEligible?.(item)!==false),bound=current.heirlooms||[],capacity=Math.max(0,Number(current.activeCapacity)||0);
    if(status)status.innerHTML=`Bound heirlooms: <strong>${bound.length} / ${capacity}</strong>. Click equipped items to bind or unbind them. A new item in the same slot replaces the old one.`;
    if(!eligible.length){grid.innerHTML='<div class=\"hint\">No equipment survived this run. Your existing heirlooms remain bound.</div>';return Object.freeze({owner:OWNER,storage:false,items:0});}
    eligible.forEach(item=>{
      const kept=bound.some(entry=>entry?.id===item?.id),button=doc()?.createElement('button');if(!button)return;
      button.className=`gear-keep-btn${kept?' kept':''} ${item.rarity||''}`;
      button.innerHTML=`<strong>${itemNameMarkup(item,'db-equipment-card-art')} </strong><span>${escapeHtml(label(item.slot))} · ${escapeHtml(bonuses(item))}</span>`;
      button.addEventListener('click',()=>{if(runtime.toggleLegacyHeirloom?.(item)!==false){renderEndGear();runtime.afterStorageChange?.();}});
      grid.appendChild(button);
    });
    return Object.freeze({owner:OWNER,storage:false,items:eligible.length});
  }

  function renderEndStorageManager(){
    installStyles();const overlay=find('endOverlay'),modal=overlay?.querySelector('.modal');if(!modal)return null;
    let host=find('endStorageManager');if(!host){host=doc()?.createElement('div');if(!host)return null;host.id='endStorageManager';host.className='end-storage-manager';modal.insertBefore(host,find('endRestartBtn'));}
    const current=state();
    if(!current.storageUnlocked){host.innerHTML='<h3>🗄️ Heirloom Storage</h3><div class=\"storage-locked\">Storage is not unlocked yet. Surviving equipment can still be handled with your normal heirloom slots.</div>';return Object.freeze({owner:OWNER,unlocked:false});}
    const storage=current.storage||[],active=current.heirlooms||[],cap=Math.max(0,Number(current.storageCapacity)||0),activeCap=Math.max(0,Number(current.activeCapacity)||0);
    host.innerHTML=`<h3>🗄️ Heirloom Storage</h3><div class=\"end-storage-summary\">${storage.length}/${cap} stored · ${active.length}/${activeCap} equipped for the next run. Store surviving gear above, then manage the next-run loadout here before returning to camp.</div><div class=\"end-storage-grid\" data-end-storage-grid></div>`;
    const grid=host.querySelector('[data-end-storage-grid]');
    storage.forEach(item=>{
      const on=active.some(entry=>entry?.id===item?.id),card=doc()?.createElement('div');if(!card||!grid)return;
      card.className=`end-storage-card ${on?'active':''} ${item.rarity||''}`;
      card.innerHTML=`<b>${itemNameMarkup(item,'db-equipment-card-art')}</b><span>${escapeHtml(rarity(item).label||item.rarity||'Unknown')} · ${escapeHtml(label(item.slot))}<br>${escapeHtml(bonuses(item))}</span><div class=\"end-storage-actions\"><button class=\"small-btn\" data-end-storage-toggle>${on?'Unequip':'Use next run'}</button><button class=\"small-btn\" data-end-storage-discard>Discard</button></div>`;
      card.querySelector('[data-end-storage-toggle]')?.addEventListener('click',()=>{if(runtime.toggleStoredActive?.(item)!==false)refreshAfterStorageChange();});
      card.querySelector('[data-end-storage-discard]')?.addEventListener('click',async()=>{if(!(await runtime.confirm?.(`Discard ${item.name} from Heirloom Storage?`,{title:'Discard stored heirloom?',confirmLabel:'Discard',danger:true})))return;if(runtime.discardStored?.(item)!==false)refreshAfterStorageChange();});
      grid.appendChild(card);
    });
    return Object.freeze({owner:OWNER,unlocked:true,stored:storage.length,active:active.length});
  }

  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};installStyles();return api;}
  function inspect(){const overlay=find('lootOverlay'),grid=find('equipmentGrid'),storage=find('campHeirloomStorage');return Object.freeze({owner:OWNER,hasEquipmentGrid:!!grid,lootOpen:!!overlay&&!overlay.classList.contains('hidden'),campStorage:!!storage,semanticArtCount:grid?.querySelectorAll?.('.db-equipment-slot-art').length||0});}
  const api=Object.freeze({configure,renderEquipment,renderLoot,renderCampStorage,renderEndGear,renderEndStorageManager,campView,inspect,owner:OWNER});
  window.DiceboundEquipmentHeirlooms=api;
  window.DiceboundEquipmentHeirloomsTest=Object.freeze({campView,inspect});
})(window);
