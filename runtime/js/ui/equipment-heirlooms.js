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
  let campStorageTab='all';
  const VAULT_TAB_SLOTS=Object.freeze({all:null,weapons:Object.freeze(['weapon','offhand']),armour:Object.freeze(['hat','chest','legs','boots']),accessories:Object.freeze(['amulet','ring'])});

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function escapeHtml(value){return String(value??'').replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));}
  function slots(){return runtime.getSlots?.()||[];}
  function label(slot){return runtime.getSlotLabel?.(slot)||slot||'Equipment';}
  function rarity(item){return runtime.getRarityInfo?.(item?.rarity)||{label:item?.rarity||'Unknown'};}
  function bonuses(item){return runtime.formatBonuses?.(item)||'No bonuses';}
  function state(){return runtime.getState?.()||{};}
  function setModel(){return runtime.getArtifactSet?.()||{count:0,tiers:[]};}
  function vaultTabForSlot(slot){
    if(VAULT_TAB_SLOTS.weapons.includes(slot))return 'weapons';
    if(VAULT_TAB_SLOTS.armour.includes(slot))return 'armour';
    if(VAULT_TAB_SLOTS.accessories.includes(slot))return 'accessories';
    return 'all';
  }
  function vaultMatchesTab(item,tab=campStorageTab){
    const allowed=VAULT_TAB_SLOTS[tab]||null;
    return !allowed||allowed.includes(item?.slot);
  }
  function vaultSlotMarkup(slot,activeBySlot){
    const item=activeBySlot.get(slot),slotId=escapeHtml(slot);
    return `<div class="vault-paper-slot vault-slot-${slotId} ${item?.rarity||'empty'}" data-vault-slot="${slotId}" title="${escapeHtml(item?`${item.name}: ${bonuses(item)}`:`Empty ${label(slot)} slot`)}"><span class="vault-paper-slot-label">${escapeHtml(label(slot))}</span><span class="vault-paper-slot-item">${item?itemNameMarkup(item,'db-vault-slot-art'):'— Empty —'}</span></div>`;
  }
  function vaultPaperDoll(active){
    const activeBySlot=new Map((active||[]).filter(Boolean).map(item=>[item.slot,item]));
    return `<section class="vault-loadout" aria-label="Active Heirlooms for next run"><div class="vault-section-title"><div><b>Next-run loadout</b><span>One active Heirloom per equipment slot</span></div></div><div class="vault-paper-doll">${slots().map(slot=>vaultSlotMarkup(slot,activeBySlot)).join('')}</div></section>`;
  }
  function vaultTabButtons(storage){
    const tabs=[['all','All'],['weapons','Weapons'],['armour','Armour'],['accessories','Accessories']];
    return tabs.map(([id,name])=>{
      const count=(storage||[]).filter(item=>vaultMatchesTab(item,id)).length;
      return `<button type="button" class="small-btn vault-tab${campStorageTab===id?' active':''}" data-vault-tab="${id}" aria-pressed="${campStorageTab===id?'true':'false'}">${name} <span>${count}</span></button>`;
    }).join('');
  }

  function installStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById(STYLE_ID))return;
    const style=documentRef.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .db-equipment-art{display:block;object-fit:contain}.slot-item:has(.db-equipment-slot-art){display:flex;align-items:center;gap:4px}.db-equipment-slot-art{width:20px;height:20px;flex:0 0 20px}.loot-icon:has(.db-equipment-loot-art){width:58px;height:58px}.db-equipment-loot-art{width:58px;height:58px;filter:drop-shadow(0 5px 6px rgba(0,0,0,.42))}
      .db-equipment-card-art{width:48px;height:48px;max-width:48px;max-height:48px;flex:0 0 48px;filter:drop-shadow(0 4px 5px rgba(0,0,0,.35))}.heirloom-storage-item b:has(.db-equipment-card-art),.end-storage-card b:has(.db-equipment-card-art),.gear-keep-btn strong:has(.db-equipment-card-art){display:flex;align-items:center;gap:8px;min-width:0}.db-rarity-name{font:inherit;text-shadow:0 1px 2px rgba(0,0,0,.72)}.db-rarity-poor{color:#c4c8cf}.db-rarity-common{color:#fff}.db-rarity-uncommon{color:#a9dbff}.db-rarity-rare{color:#438bd8}.db-rarity-epic{color:#f5e9a8}.db-rarity-legendary{color:#ffd45f}.db-rarity-artifact{color:#ff9c38}.db-rarity-mythical{color:#bd83ff}.db-rarity-omega{color:#e7d6ff}
      .heirloom-storage-wrap{margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(0,0,0,.13)}
      .heirloom-storage-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.heirloom-storage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}.heirloom-storage-item{padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:13px;background:rgba(255,255,255,.035);color:var(--ink);text-align:left}.heirloom-storage-item.active{border-color:var(--gold);box-shadow:inset 0 0 20px rgba(245,200,91,.08)}.heirloom-storage-item b,.heirloom-storage-item span{display:block}.heirloom-storage-item span{font-size:9px;color:var(--muted);margin-top:4px;line-height:1.4}.heirloom-storage-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:stretch;margin-top:8px}.heirloom-storage-actions .small-btn{width:auto;margin-top:0!important;min-height:34px}.heirloom-storage-actions .danger{border-color:rgba(255,100,118,.34)!important;background:rgba(106,24,42,.28)!important;color:#ffd3da!important}
      .heirloom-storage-wrap{margin-top:0;padding:0;border:0;background:transparent}
      .vault-overview,.vault-inventory{padding:16px;border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(0,0,0,.16)}.vault-inventory{margin-top:14px}
      .vault-summary{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:14px}.vault-summary>div:first-child{display:grid;gap:3px}.vault-kicker{font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.vault-summary b{font-size:18px}.vault-summary span{font-size:10px;color:var(--muted)}.vault-milestones{max-width:55%;font-size:9px;color:var(--muted);line-height:1.5;text-align:right}
      .vault-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.vault-section-title>div{display:grid;gap:2px}.vault-section-title b{font-size:13px}.vault-section-title span{font-size:9px;color:var(--muted)}
      .vault-loadout{position:relative;padding:14px;border-radius:16px;background:linear-gradient(180deg,rgba(181,140,255,.08),rgba(255,255,255,.025));border:1px solid rgba(181,140,255,.15);overflow:hidden}.vault-paper-doll{position:relative;display:grid;grid-template-columns:repeat(5,minmax(90px,1fr));grid-template-areas:". . hat . ." ". amulet chest ring ." "weapon . chest . offhand" ". . legs . ." ". . boots . .";gap:8px;align-items:stretch}.vault-paper-doll::before{content:"♙";position:absolute;inset:50% auto auto 50%;translate:-50% -50%;font-size:190px;line-height:1;color:rgba(255,255,255,.035);pointer-events:none}.vault-paper-slot{position:relative;z-index:1;min-height:72px;padding:8px;border-radius:12px;border:1px solid rgba(255,255,255,.09);background:rgba(4,8,17,.56);display:grid;align-content:center;gap:5px;text-align:center}.vault-paper-slot:not(.empty){border-color:rgba(245,200,91,.26);box-shadow:inset 0 0 18px rgba(245,200,91,.05)}.vault-paper-slot-label{font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.vault-paper-slot-item{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;font-size:9px;font-weight:800}.db-vault-slot-art{width:34px;height:34px;max-width:34px;max-height:34px;object-fit:contain;filter:drop-shadow(0 3px 5px rgba(0,0,0,.4))}.vault-slot-hat{grid-area:hat}.vault-slot-amulet{grid-area:amulet}.vault-slot-chest{grid-area:chest}.vault-slot-weapon{grid-area:weapon}.vault-slot-offhand{grid-area:offhand}.vault-slot-ring{grid-area:ring}.vault-slot-legs{grid-area:legs}.vault-slot-boots{grid-area:boots}
      .vault-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.vault-tab{width:auto!important;margin:0!important}.vault-tab span{display:inline-flex;min-width:18px;justify-content:center;margin-left:4px;padding:1px 5px;border-radius:999px;background:rgba(255,255,255,.08)}.vault-tab.active{border-color:var(--gold);background:rgba(245,200,91,.12)}
      .vault-active-badge{display:inline-flex;width:max-content;margin-top:7px;padding:3px 7px;border-radius:999px;font-size:8px;font-style:normal;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#dff7e9;background:rgba(98,215,154,.12);border:1px solid rgba(98,215,154,.22)}.vault-empty{grid-column:1/-1;padding:26px;text-align:center;color:var(--muted);border:1px dashed rgba(255,255,255,.12);border-radius:14px}
      @media(max-width:760px){.vault-summary{display:grid}.vault-milestones{max-width:none;text-align:left}.vault-paper-doll{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:none}.vault-paper-slot{grid-area:auto!important}.vault-paper-doll::before{display:none}}
      .end-storage-manager{margin:16px 0;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(0,0,0,.13)}.end-storage-manager h3{margin:0 0 6px}.end-storage-summary{font-size:11px;color:var(--muted);margin-bottom:10px}.end-storage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:9px;max-height:400px;overflow:auto;padding-right:4px}.end-storage-card{padding:10px;border-radius:13px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035)}.end-storage-card.active{border-color:var(--gold);box-shadow:inset 0 0 18px rgba(245,200,91,.08)}.end-storage-card b,.end-storage-card span{display:block}.end-storage-card span{font-size:9px;color:var(--muted);line-height:1.4;margin-top:4px}.end-storage-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
    `;
    documentRef.head?.appendChild(style);
  }

  function artMarkup(item,klass){
    const entry=runtime.resolveEquipmentArt?.(item);
    if(!entry?.image)return '';
    return `<img class=\"db-equipment-art ${klass}\" src=\"${escapeHtml(entry.image)}\" alt=\"${escapeHtml(entry.alt||item?.name||'Equipment')}\" draggable=\"false\">`;
  }
  function rarityNameMarkup(item){
    const rarityId=escapeHtml(String(item?.rarity||"common").toLowerCase());
    return `<span class="db-rarity-name db-rarity-${rarityId}">${escapeHtml(item?.name||"Equipment")}</span>`;
  }
  function itemNameMarkup(item,klass=''){const art=artMarkup(item,klass),name=rarityNameMarkup(item);return art?`${art}${name}`:`${escapeHtml(item?.icon||'')} ${name}`;}
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
    if(!current.storageUnlocked){host.innerHTML='<div class="storage-locked"><b>🗄️ Heirloom Vault locked</b><br>Purchase Heirloom Vault on the Prestige Moon for 1 Prestige Point. It begins with 8 slots; Vault Expansion adds 4 per rank, and Board 5, the Road Merchant, the Blood Mage and the Pale Devil each add one.</div>';return Object.freeze({owner:OWNER,unlocked:false});}
    const storage=current.storage||[],active=current.heirlooms||[],cap=Math.max(0,Number(current.storageCapacity)||0),activeCap=Math.max(0,Number(current.activeCapacity)||0),milestones=current.storageMilestones||[];
    if(!Object.hasOwn(VAULT_TAB_SLOTS,campStorageTab))campStorageTab='all';
    const filtered=storage.filter(item=>vaultMatchesTab(item));
    host.innerHTML=`<section class="vault-overview"><div class="vault-summary"><div><span class="vault-kicker">Heirloom Vault</span><b>${storage.length} / ${cap} stored</b><span>${active.length} / ${activeCap} active for the next run</span></div><div class="vault-milestones">Base 8 · ${milestones.map(entry=>`${entry.on?'✅':'⬜'} ${escapeHtml(entry.text)}`).join(' · ')}</div></div>${vaultPaperDoll(active)}</section><section class="vault-inventory"><div class="vault-section-title"><div><b>Stored gear</b><span>Choose what to take into the next run</span></div></div><nav class="vault-tabs" aria-label="Heirloom Vault gear categories">${vaultTabButtons(storage)}</nav><div class="heirloom-storage-grid" data-heirloom-storage-grid></div></section>`;
    host.querySelectorAll?.('[data-vault-tab]').forEach(button=>button.addEventListener('click',()=>{
      const next=button.dataset.vaultTab;if(!Object.hasOwn(VAULT_TAB_SLOTS,next)||next===campStorageTab)return;
      campStorageTab=next;renderCampStorage();
    }));
    const grid=host.querySelector('[data-heirloom-storage-grid]');
    if(grid&&!filtered.length)grid.innerHTML=`<div class="vault-empty">No ${campStorageTab==='all'?'stored Heirlooms':campStorageTab} in the Vault yet.</div>`;
    filtered.forEach(item=>{
      const on=active.some(entry=>entry?.id===item?.id),card=doc()?.createElement('div');if(!card||!grid)return;
      card.className=`heirloom-storage-item ${on?'active':''} ${item.rarity||''}`;
      card.innerHTML=`<b>${itemNameMarkup(item,'db-equipment-card-art')}</b><span>${escapeHtml(rarity(item).label||item.rarity||'Unknown')} · ${escapeHtml(label(item.slot))}<br>${escapeHtml(bonuses(item))}</span>${on?'<em class="vault-active-badge">Active next run</em>':''}<div class="heirloom-storage-actions"><button class="small-btn" data-storage-toggle>${on?'Remove from active loadout':'Use next run'}</button><button class="small-btn danger" data-storage-discard>Remove from chest</button></div>`;
      card.querySelector('[data-storage-toggle]')?.addEventListener('click',()=>{if(runtime.toggleStoredActive?.(item)!==false)refreshAfterStorageChange();});
      card.querySelector('[data-storage-discard]')?.addEventListener('click',async()=>{if(!(await runtime.confirm?.(`Remove ${item.name} from Heirloom Vault?`,{title:'Remove stored heirloom?',confirmLabel:'Remove',danger:true})))return;if(runtime.discardStored?.(item)!==false)refreshAfterStorageChange();});
      grid.appendChild(card);
    });
    return Object.freeze({owner:OWNER,unlocked:true,stored:storage.length,active:active.length,tab:campStorageTab,visible:filtered.length});
  }

  function renderEndGear(){
    installStyles();runtime.syncStorage?.();
    const grid=find('endGearGrid'),status=find('endHeirloomStatus'),current=state(),items=slots().map(slot=>current.equipment?.[slot]).filter(Boolean);
    if(!grid)return null;
    grid.replaceChildren();
    if(current.storageUnlocked){
      if(status)status.innerHTML=`Heirloom Vault: <strong>${(current.storage||[]).length}/${Math.max(0,Number(current.storageCapacity)||0)}</strong>. Click surviving run gear to store it. Choose the active next-run loadout from the Campsite chest.`;
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
    if(!current.storageUnlocked){host.innerHTML='<h3>🗄️ Heirloom Vault</h3><div class=\"storage-locked\">Storage is not unlocked yet. Surviving equipment can still be handled with your normal heirloom slots.</div>';return Object.freeze({owner:OWNER,unlocked:false});}
    const storage=current.storage||[],active=current.heirlooms||[],cap=Math.max(0,Number(current.storageCapacity)||0),activeCap=Math.max(0,Number(current.activeCapacity)||0);
    host.innerHTML=`<h3>🗄️ Heirloom Vault</h3><div class=\"end-storage-summary\">${storage.length}/${cap} stored · ${active.length}/${activeCap} equipped for the next run. Store surviving gear above, then manage the next-run loadout here before returning to camp.</div><div class=\"end-storage-grid\" data-end-storage-grid></div>`;
    const grid=host.querySelector('[data-end-storage-grid]');
    storage.forEach(item=>{
      const on=active.some(entry=>entry?.id===item?.id),card=doc()?.createElement('div');if(!card||!grid)return;
      card.className=`end-storage-card ${on?'active':''} ${item.rarity||''}`;
      card.innerHTML=`<b>${itemNameMarkup(item,'db-equipment-card-art')}</b><span>${escapeHtml(rarity(item).label||item.rarity||'Unknown')} · ${escapeHtml(label(item.slot))}<br>${escapeHtml(bonuses(item))}</span><div class=\"end-storage-actions\"><button class=\"small-btn\" data-end-storage-toggle>${on?'Unequip':'Use next run'}</button><button class=\"small-btn\" data-end-storage-discard>Discard</button></div>`;
      card.querySelector('[data-end-storage-toggle]')?.addEventListener('click',()=>{if(runtime.toggleStoredActive?.(item)!==false)refreshAfterStorageChange();});
      card.querySelector('[data-end-storage-discard]')?.addEventListener('click',async()=>{if(!(await runtime.confirm?.(`Discard ${item.name} from Heirloom Vault?`,{title:'Discard stored heirloom?',confirmLabel:'Discard',danger:true})))return;if(runtime.discardStored?.(item)!==false)refreshAfterStorageChange();});
      grid.appendChild(card);
    });
    return Object.freeze({owner:OWNER,unlocked:true,stored:storage.length,active:active.length});
  }

  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};installStyles();return api;}
  function inspect(){const overlay=find('lootOverlay'),grid=find('equipmentGrid'),storage=find('campHeirloomStorage');return Object.freeze({owner:OWNER,hasEquipmentGrid:!!grid,lootOpen:!!overlay&&!overlay.classList.contains('hidden'),campStorage:!!storage,semanticArtCount:grid?.querySelectorAll?.('.db-equipment-slot-art').length||0});}
  const api=Object.freeze({configure,renderEquipment,renderLoot,renderCampStorage,renderEndGear,renderEndStorageManager,campView,rarityNameMarkup,inspect,owner:OWNER});
  window.DiceboundEquipmentHeirlooms=api;
  window.DiceboundEquipmentHeirloomsTest=Object.freeze({campView,inspect});
})(window);
