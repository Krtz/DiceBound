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
  const DETAIL_POPOVER_ID='dbEquipmentDetailPopover';
  let runtime={};
  let campStorageTab='all';
  let characterTab='stats';
  const VAULT_TAB_SLOTS=Object.freeze({all:null,weapons:Object.freeze(['weapon','offhand']),armour:Object.freeze(['hat','chest','legs','boots']),accessories:Object.freeze(['amulet','ring'])});

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function escapeHtml(value){return String(value??'').replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));}
  function slots(){return runtime.getSlots?.()||[];}
  function label(slot){return runtime.getSlotLabel?.(slot)||slot||'Equipment';}
  function rarity(item){return runtime.getRarityInfo?.(item?.rarity)||{label:item?.rarity||'Unknown'};}
  function identity(item){return runtime.getEquipmentIdentity?.(item)||null;}
  function specialIdentity(item){return runtime.getSpecialEquipmentIdentity?.(item)||null;}
  function displayName(item,slot=item?.slot){
    const semantic=specialIdentity(item)||identity(item),raw=String(item?.name||'').trim(),slotName=String(label(slot)||'').trim();
    const generic=!raw||/^equipment$/i.test(raw)||/^item$/i.test(raw)||(slotName&&raw.toLowerCase()===slotName.toLowerCase());
    if(!generic)return raw;
    const artAlt=String(runtime.resolveEquipmentArt?.(item)?.alt||'').trim();
    if(semantic?.displayName)return semantic.displayName;
    if(artAlt&&!/^equipment$/i.test(artAlt)&&(!slotName||artAlt.toLowerCase()!==slotName.toLowerCase()))return artAlt;
    const rarityLabel=String(rarity(item).label||item?.rarity||'').trim();
    return [rarityLabel,slotName].filter(Boolean).join(' ')||'Equipment';
  }
  function safeIcon(item){return String(runtime.getSafeEquipmentIcon?.(item)||item?.icon||'◇').trim()||'◇';}
  function bonuses(item){return runtime.formatBonuses?.(item)||'No bonuses';}
  function detailBonuses(item){
    const raw=String(runtime.formatDetailBonuses?.(item)||'').trim(),detail=raw.replace(/^No bonuses\s*·\s*/i,'').trim();
    if(detail&&detail!=='No bonuses')return detail;
    const total=runtime.getAllBonuses?.(item)||{},parts=Object.entries(total).filter(([,value])=>Number(value)!==0).map(([key,value])=>runtime.formatBonus?.(key,value)||`${key}: ${value}`);
    return parts.length?parts.join(' · '):(detail||bonuses(item));
  }
  function state(){return runtime.getState?.()||{};}
  function setModel(){return runtime.getArtifactSet?.()||{count:0,tiers:[]};}
  function characterLayout(){return runtime.getCharacterLayout?.()==='classic'?'classic':'modern';}
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
  function gearIconMarkup(item,klass=''){
    if(!item)return '';
    return artMarkup(item,klass)||`<span class="db-equipment-icon-fallback" aria-hidden="true">${escapeHtml(safeIcon(item))}</span>`;
  }
  function itemDetail(item,slot=item?.slot){
    if(!item)return `Empty ${label(slot)} slot`;
    const rarityLabel=rarity(item).label||item.rarity||'Unknown',stats=detailBonuses(item);
    return `${displayName(item,slot)}\n${String(rarityLabel).toUpperCase()} · ${String(label(slot)).toUpperCase()}\n${stats}`;
  }
  function vaultSlotMarkup(slot,activeBySlot){
    const item=activeBySlot.get(slot),slotId=escapeHtml(slot),detail=escapeHtml(itemDetail(item,slot));
    return `<div class="vault-paper-slot vault-slot-${slotId} ${item?.rarity||'empty'}" data-vault-slot="${slotId}" title="${detail}" aria-label="${detail}">${item?gearIconMarkup(item,'db-vault-slot-art'):`<span class="vault-paper-slot-label">${escapeHtml(label(slot))}</span>`}</div>`;
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
      .db-equipment-art{display:block;object-fit:contain}.loot-icon:has(.db-equipment-loot-art){width:58px;height:58px}.db-equipment-loot-art{width:58px;height:58px;filter:drop-shadow(0 5px 6px rgba(0,0,0,.42))}
      .db-equipment-detail-popover{position:fixed;z-index:3200;display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;width:min(390px,calc(100vw - 16px));padding:12px 14px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:#080d17;box-shadow:0 18px 56px rgba(0,0,0,.68);color:#f5f1e8;pointer-events:none}.db-equipment-detail-popover.hidden{display:none!important}.db-equipment-detail-popover.poor{border-color:#8f949c}.db-equipment-detail-popover.common{border-color:#d9dde5}.db-equipment-detail-popover.uncommon{border-color:#62d79a}.db-equipment-detail-popover.rare{border-color:#65a9ff}.db-equipment-detail-popover.epic{border-color:#b58cff}.db-equipment-detail-popover.legendary{border-color:#f5c85b}.db-equipment-detail-popover.artifact{border-color:#ff9c38}.db-equipment-detail-popover.mythical{border-color:#bd83ff}.db-equipment-detail-popover.omega{border-color:#e7d6ff}.db-equipment-detail-popover-art{width:64px;height:64px;display:grid;place-items:center;align-self:start}.db-equipment-detail-popover-art .db-equipment-detail-art{width:64px;height:64px;max-width:64px;max-height:64px;object-fit:contain;filter:drop-shadow(0 5px 6px rgba(0,0,0,.48))}.db-equipment-detail-popover-art .db-equipment-icon-fallback{font-size:40px}.db-equipment-detail-name{font-size:14px;font-weight:950;line-height:1.2;color:#f5f1e8}.db-equipment-detail-popover.rare .db-equipment-detail-name{color:#65a9ff}.db-equipment-detail-popover.epic .db-equipment-detail-name{color:#d7bcff}.db-equipment-detail-popover.legendary .db-equipment-detail-name{color:#f5c85b}.db-equipment-detail-popover.artifact .db-equipment-detail-name{color:#ffad5c}.db-equipment-detail-popover.mythical .db-equipment-detail-name{color:#d6b4ff}.db-equipment-detail-popover.omega .db-equipment-detail-name{color:#f2eaff}.db-equipment-detail-meta{margin-top:4px;font-size:9px;font-weight:900;letter-spacing:.08em;color:#b9c1d2}.db-equipment-detail-stats{grid-column:1/-1;margin-top:1px;padding-top:10px;border-top:1px solid rgba(255,255,255,.09);font-size:10px;line-height:1.55;color:#e7ebf3;white-space:normal}.db-equipment-detail-stats span{display:block}.db-equipment-detail-stats span+span{margin-top:3px}@media(max-width:620px){.db-equipment-detail-popover{grid-template-columns:54px minmax(0,1fr)}.db-equipment-detail-popover-art,.db-equipment-detail-popover-art .db-equipment-detail-art{width:54px;height:54px;max-width:54px;max-height:54px}}
      .character-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.character-card-head h2{margin:0}.character-classic-title{display:none}.character-card[data-character-layout="modern"] .character-layout-card{padding:0;border:0;background:transparent;box-shadow:none;border-radius:0}.character-card[data-character-layout="classic"]{display:contents}.character-card[data-character-layout="classic"] .character-card-head{display:none}.character-card[data-character-layout="classic"] .character-layout-card{display:block!important;margin:0}.character-card[data-character-layout="classic"] .character-classic-title{display:block}.character-card[data-character-layout="classic"] .character-gear-copy{display:none}.character-tabs{display:flex;gap:6px}.character-tabs .small-btn{width:auto!important;margin:0!important;padding:6px 10px}.character-tabs .small-btn.active{border-color:rgba(101,169,255,.62);background:linear-gradient(180deg,rgba(101,169,255,.24),rgba(181,140,255,.12));box-shadow:inset 0 0 0 1px rgba(101,169,255,.18)}.character-tab-panel[hidden]{display:none!important}.character-tab-panel{margin-top:10px}.character-gear-copy{margin:0 0 9px;color:var(--muted);font-size:9px;line-height:1.4}
      .character-gear-grid{position:relative;display:grid!important;grid-template-columns:repeat(5,minmax(42px,1fr))!important;grid-template-areas:". . hat . ." "amulet . chest . ring" "weapon . chest . offhand" ". . legs . ." ". . boots . .";gap:7px!important;min-height:250px;align-items:stretch;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.045),transparent 42%),rgba(0,0,0,.12)}
      .character-gear-grid::before{content:"♙";position:absolute;left:50%;top:49%;translate:-50% -50%;font-size:150px;line-height:1;color:rgba(255,255,255,.035);pointer-events:none}.character-gear-slot{position:relative;z-index:1;min-width:0!important;min-height:58px!important;aspect-ratio:1/1;padding:5px!important;display:grid;place-items:center;border-width:2px!important;border-style:solid!important;background:rgba(5,9,17,.72)!important;overflow:visible!important}.character-gear-slot.slot-hat{grid-area:hat}.character-gear-slot.slot-amulet{grid-area:amulet}.character-gear-slot.slot-chest{grid-area:chest}.character-gear-slot.slot-weapon{grid-area:weapon}.character-gear-slot.slot-offhand{grid-area:offhand}.character-gear-slot.slot-ring{grid-area:ring}.character-gear-slot.slot-legs{grid-area:legs}.character-gear-slot.slot-boots{grid-area:boots}.db-equipment-slot-art{width:100%;height:100%;max-width:48px;max-height:48px;object-fit:contain;filter:drop-shadow(0 4px 5px rgba(0,0,0,.5))}.db-equipment-icon-fallback{font-size:28px;line-height:1}.character-empty-slot{font-size:7px;line-height:1.1;text-align:center;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.28);font-weight:900}
      .character-gear-slot.empty{border-color:rgba(255,255,255,.10)!important}.character-gear-slot.poor,.vault-paper-slot.poor{border-color:#8f949c!important}.character-gear-slot.common,.vault-paper-slot.common{border-color:#d9dde5!important}.character-gear-slot.uncommon,.vault-paper-slot.uncommon{border-color:#62d79a!important}.character-gear-slot.rare,.vault-paper-slot.rare{border-color:#65a9ff!important}.character-gear-slot.epic,.vault-paper-slot.epic{border-color:#b58cff!important}.character-gear-slot.legendary,.vault-paper-slot.legendary{border-color:#f5c85b!important;box-shadow:0 0 10px rgba(245,200,91,.12),inset 0 0 14px rgba(245,200,91,.05)!important}.character-gear-slot.artifact,.vault-paper-slot.artifact{border-color:#ff9c38!important;box-shadow:0 0 10px rgba(255,156,56,.16)!important}.character-gear-slot.mythical,.vault-paper-slot.mythical{border-color:#bd83ff!important;box-shadow:0 0 12px rgba(189,131,255,.18)!important}.character-gear-slot.omega,.vault-paper-slot.omega{border-color:#e7d6ff!important;box-shadow:0 0 12px rgba(181,108,255,.28),inset 0 0 12px rgba(231,214,255,.08)!important}
      body[data-hud-flow="landscape-2"] .character-gear-grid,body[data-hud-flow="landscape-3"] .character-gear-grid{grid-template-columns:repeat(4,minmax(42px,1fr))!important;grid-template-areas:"hat amulet ring offhand" "weapon chest legs boots"!important;grid-template-rows:repeat(2,58px)!important;min-height:0;background:rgba(0,0,0,.12)}body[data-hud-flow="landscape-2"] .character-gear-grid::before,body[data-hud-flow="landscape-3"] .character-gear-grid::before{display:none}body[data-hud-flow="landscape-2"] .character-gear-slot,body[data-hud-flow="landscape-3"] .character-gear-slot{grid-area:auto!important;height:58px!important;aspect-ratio:auto}\n      @media(max-width:620px){.character-card-head{align-items:flex-start;flex-direction:column}.character-tabs{width:100%}.character-tabs .small-btn{flex:1}.character-gear-grid{grid-template-columns:repeat(4,minmax(42px,1fr))!important;grid-template-areas:"hat amulet ring offhand" "weapon chest legs boots"!important;grid-template-rows:repeat(2,58px)!important;min-height:0;background:rgba(0,0,0,.12)}.character-gear-grid::before{display:none}.character-gear-slot{grid-area:auto!important;height:58px!important;aspect-ratio:auto}}
      .db-equipment-card-art{width:48px;height:48px;max-width:48px;max-height:48px;flex:0 0 48px;filter:drop-shadow(0 4px 5px rgba(0,0,0,.35))}.heirloom-storage-item b:has(.db-equipment-card-art),.end-storage-card b:has(.db-equipment-card-art),.gear-keep-btn strong:has(.db-equipment-card-art){display:flex;align-items:center;gap:8px;min-width:0}.db-rarity-name{font:inherit;text-shadow:0 1px 2px rgba(0,0,0,.72)}.db-rarity-poor{color:#c4c8cf}.db-rarity-common{color:#fff}.db-rarity-uncommon{color:#a9dbff}.db-rarity-rare{color:#438bd8}.db-rarity-epic{color:#f5e9a8}.db-rarity-legendary{color:#ffd45f}.db-rarity-artifact{color:#ff9c38}.db-rarity-mythical{color:#bd83ff}.db-rarity-omega{color:#e7d6ff}
      .heirloom-storage-wrap{margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(0,0,0,.13)}
      .heirloom-storage-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.heirloom-storage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}.heirloom-storage-item{padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:13px;background:rgba(255,255,255,.035);color:var(--ink);text-align:left}.heirloom-storage-item.active{border-color:var(--gold);box-shadow:inset 0 0 20px rgba(245,200,91,.08)}.heirloom-storage-item b,.heirloom-storage-item span{display:block}.heirloom-storage-item span{font-size:9px;color:var(--muted);margin-top:4px;line-height:1.4}.heirloom-storage-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:stretch;margin-top:8px}.heirloom-storage-actions .small-btn{width:auto;margin-top:0!important;min-height:34px}.heirloom-storage-actions .danger{border-color:rgba(255,100,118,.34)!important;background:rgba(106,24,42,.28)!important;color:#ffd3da!important}
      .heirloom-storage-wrap{margin-top:0;padding:0;border:0;background:transparent}
      .vault-overview,.vault-inventory{padding:16px;border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(0,0,0,.16)}.vault-inventory{margin-top:14px}
      .vault-summary{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:14px}.vault-summary>div:first-child{display:grid;gap:3px}.vault-kicker{font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.vault-summary b{font-size:18px}.vault-summary span{font-size:10px;color:var(--muted)}.vault-milestones{max-width:55%;font-size:9px;color:var(--muted);line-height:1.5;text-align:right}
      .vault-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.vault-section-title>div{display:grid;gap:2px}.vault-section-title b{font-size:13px}.vault-section-title span{font-size:9px;color:var(--muted)}
      .vault-loadout{position:relative;padding:14px;border-radius:16px;background:linear-gradient(180deg,rgba(181,140,255,.08),rgba(255,255,255,.025));border:1px solid rgba(181,140,255,.15);overflow:hidden}.vault-paper-doll{position:relative;display:grid;grid-template-columns:repeat(5,minmax(90px,1fr));grid-template-areas:". . hat . ." ". amulet chest ring ." "weapon . chest . offhand" ". . legs . ." ". . boots . .";gap:8px;align-items:stretch}.vault-paper-doll::before{content:"♙";position:absolute;inset:50% auto auto 50%;translate:-50% -50%;font-size:190px;line-height:1;color:rgba(255,255,255,.035);pointer-events:none}.vault-paper-slot{position:relative;z-index:1;min-height:72px;padding:7px;border-radius:12px;border:2px solid rgba(255,255,255,.09);background:rgba(4,8,17,.56);display:grid;place-items:center;text-align:center}.vault-paper-slot-label{font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.30)}.db-vault-slot-art{width:100%;height:100%;max-width:52px;max-height:52px;object-fit:contain;filter:drop-shadow(0 3px 5px rgba(0,0,0,.4))}.vault-slot-hat{grid-area:hat}.vault-slot-amulet{grid-area:amulet}.vault-slot-chest{grid-area:chest}.vault-slot-weapon{grid-area:weapon}.vault-slot-offhand{grid-area:offhand}.vault-slot-ring{grid-area:ring}.vault-slot-legs{grid-area:legs}.vault-slot-boots{grid-area:boots}
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
    return `<img class=\"db-equipment-art ${klass}\" src=\"${escapeHtml(entry.image)}\" alt=\"${escapeHtml(entry.alt||displayName(item))}\" draggable=\"false\">`;
  }

  function detailPopover(){
    const documentRef=doc();if(!documentRef)return null;
    let pop=documentRef.getElementById(DETAIL_POPOVER_ID);
    if(!pop){
      pop=documentRef.createElement('div');
      pop.id=DETAIL_POPOVER_ID;
      pop.className='db-equipment-detail-popover hidden';
      pop.setAttribute('role','tooltip');
      documentRef.body?.appendChild(pop);
    }
    return pop;
  }
  function detailStatsMarkup(item){
    const raw=detailBonuses(item),parts=String(raw||'No bonuses').split(/\s+·\s+/).map(part=>part.trim()).filter(Boolean);
    return (parts.length?parts:['No bonuses']).map(part=>`<span>${escapeHtml(part)}</span>`).join('');
  }
  function positionDetailPopover(target,pop){
    if(!target||!pop||pop.classList.contains('hidden'))return false;
    const rect=target.getBoundingClientRect(),box=pop.getBoundingClientRect(),gap=10,margin=8;
    let left=rect.left+rect.width/2-box.width/2,top=rect.top-box.height-gap;
    left=Math.min(root.innerWidth-box.width-margin,Math.max(margin,left));
    if(top<margin)top=Math.min(root.innerHeight-box.height-margin,rect.bottom+gap);
    pop.style.left=`${Math.round(left)}px`;
    pop.style.top=`${Math.round(Math.max(margin,top))}px`;
    return true;
  }
  function hideDetailPopover(){
    const pop=detailPopover();if(!pop)return false;
    pop.classList.add('hidden');pop.removeAttribute('data-slot');return true;
  }
  function showDetailPopover(target){
    const slot=target?.dataset?.equipmentSlot,item=slot?state().equipment?.[slot]:null,pop=detailPopover();
    if(!slot||!item||!pop)return hideDetailPopover();
    const rarityId=String(item.rarity||'common').toLowerCase(),tier=rarity(item),name=displayName(item,slot);
    const art=artMarkup(item,'db-equipment-detail-art')||`<span class="db-equipment-icon-fallback" aria-hidden="true">${escapeHtml(safeIcon(item))}</span>`;
    pop.className=`db-equipment-detail-popover ${escapeHtml(rarityId)}`;
    pop.dataset.slot=slot;
    pop.innerHTML=`<div class="db-equipment-detail-popover-art">${art}</div><div><div class="db-equipment-detail-name">${escapeHtml(name)}</div><div class="db-equipment-detail-meta">${escapeHtml(String(tier.label||item.rarity||'Unknown').toUpperCase())} · ${escapeHtml(String(label(slot)).toUpperCase())}</div></div><div class="db-equipment-detail-stats">${detailStatsMarkup(item)}</div>`;
    find('appTooltipLayer')?.classList.add('hidden');
    find('touchTipPopover')?.classList.add('hidden');
    positionDetailPopover(target,pop);
    return true;
  }
  function bindCharacterGearPopover(){
    const grid=find('equipmentGrid');if(!grid||grid.dataset?.dbEquipmentPopoverWired==='1')return;
    if(grid.dataset)grid.dataset.dbEquipmentPopoverWired='1';
    const targetFor=event=>event.target?.closest?.('.character-gear-slot[data-equipment-slot]');
    grid.addEventListener?.('pointerover',event=>{
      const target=targetFor(event);if(!target)return;
      event.stopPropagation();showDetailPopover(target);
    });
    grid.addEventListener?.('pointerout',event=>{
      const target=targetFor(event);if(!target)return;
      event.stopPropagation();if(!target.contains(event.relatedTarget))hideDetailPopover();
    });
    grid.addEventListener?.('focusin',event=>{
      const target=targetFor(event);if(!target)return;
      event.stopPropagation();showDetailPopover(target);
    });
    grid.addEventListener?.('focusout',event=>{
      const target=targetFor(event);if(!target)return;
      event.stopPropagation();hideDetailPopover();
    });
    grid.addEventListener?.('pointerdown',event=>{
      if(!event.pointerType||event.pointerType==='mouse')return;
      const target=targetFor(event);if(!target)return;
      event.stopPropagation();showDetailPopover(target);
    });
  }

  function rarityNameMarkup(item){
    const rarityId=escapeHtml(String(item?.rarity||"common").toLowerCase());
    return `<span class="db-rarity-name db-rarity-${rarityId}">${escapeHtml(displayName(item))}</span>`;
  }
  function itemNameMarkup(item,klass=''){const art=artMarkup(item,klass),name=rarityNameMarkup(item);return art?`${art}${name}`:`${escapeHtml(safeIcon(item))} ${name}`;}
  function artifactSetHtml(model=setModel()){
    const count=Math.max(0,Number(model.count)||0),tiers=Array.isArray(model.tiers)?model.tiers:[];
    return `<strong>🌈 Impossible Road set · Artifact</strong><br><span style=\"color:var(--muted)\">${count}/7 pieces active.</span><div class=\"set-tier-grid\">${tiers.map(tier=>`<div class=\"set-tier${count>=Number(tier.pieces)?' active':''}\"><b>${escapeHtml(tier.pieces)}-piece bonus</b><span>${escapeHtml(tier.text)}</span></div>`).join('')}</div>`;
  }
  function campHeirloomHtml(){
    const current=state(),items=current.heirlooms||[],capacity=Math.max(0,Number(current.activeCapacity)||0);
    return items.length?`<div class=\"camp-heirloom-card\"><strong>Bound heirlooms (${items.length}/${capacity})</strong><br>${items.map(item=>`<strong>${escapeHtml(safeIcon(item))} ${escapeHtml(displayName(item))}</strong> — ${escapeHtml(bonuses(item))}`).join('<br>')}</div>`:`<div class=\"camp-heirloom-card\">No heirlooms are currently bound. You have ${capacity} permanent slot${capacity===1?'':'s'}.</div>`;
  }
  function campView(){return Object.freeze({owner:OWNER,heirloomHtml:campHeirloomHtml(),setHtml:artifactSetHtml()});}

  function activateCharacterTab(name='stats'){
    characterTab=name==='gear'?'gear':'stats';
    const layout=characterLayout(),tabs=find('characterTabs'),stats=find('characterStatsPanel'),gear=find('characterGearPanel');
    tabs?.querySelectorAll?.('[data-character-tab]').forEach(button=>{
      const active=button.dataset.characterTab===characterTab;
      button.classList.toggle('active',active);
      button.setAttribute?.('aria-selected',active?'true':'false');
    });
    if(layout==='classic'){
      if(stats){stats.hidden=false;stats.classList?.add?.('active');}
      if(gear){gear.hidden=false;gear.classList?.add?.('active');}
    }else{
      if(stats){stats.hidden=characterTab!=='stats';stats.classList?.toggle?.('active',characterTab==='stats');}
      if(gear){gear.hidden=characterTab!=='gear';gear.classList?.toggle?.('active',characterTab==='gear');}
    }
    runtime.afterCharacterPresentationChange?.();
    return characterTab;
  }
  function syncCharacterLayout(){
    const layout=characterLayout(),card=find('characterCard'),grid=find('equipmentGrid');
    if(card)card.dataset.characterLayout=layout;
    doc()?.body?.setAttribute?.('data-character-layout',layout);
    grid?.classList?.toggle?.('character-gear-grid',layout==='modern');
    activateCharacterTab(characterTab);
    return layout;
  }
  function setCharacterLayout(layout){
    runtime.setCharacterLayout?.(layout==='classic'?'classic':'modern');
    syncCharacterLayout();
    renderEquipment();
    return characterLayout();
  }
  function bindCharacterTabs(){
    const tabs=find('characterTabs');
    if(!tabs||tabs.dataset?.dbCharacterTabsWired==='1')return;
    if(tabs.dataset)tabs.dataset.dbCharacterTabsWired='1';
    tabs.addEventListener?.('click',event=>{
      const button=event.target?.closest?.('[data-character-tab]');
      if(button)activateCharacterTab(button.dataset.characterTab);
    });
  }

  function renderEquipment(){
    installStyles();
    bindCharacterTabs();
    const layout=syncCharacterLayout(),grid=find('equipmentGrid'),current=state(),equipped=current.equipment||{};
    if(grid){
      grid.replaceChildren();
      slots().forEach(slot=>{
        const item=equipped[slot],entry=doc()?.createElement('div');if(!entry)return;
        const detail=itemDetail(item,slot);
        if(entry.dataset)entry.dataset.tip=detail;
        entry.setAttribute?.('aria-label',detail);
        entry.tabIndex=0;
        if(layout==='classic'){
          entry.className=`equipment-slot ${item?.rarity||'empty'}`;
          entry.innerHTML=`<span class="slot-label">${escapeHtml(label(slot))}</span><span class="slot-item">${item?itemNameMarkup(item,'db-equipment-slot-art'):'— Empty —'}</span>`;
        }else{
          entry.className=`equipment-slot character-gear-slot slot-${slot} ${item?.rarity||'empty'}`;
          entry.innerHTML=item?gearIconMarkup(item,'db-equipment-slot-art'):`<span class="character-empty-slot">${escapeHtml(label(slot))}</span>`;
        }
        grid.appendChild(entry);
      });
    }
    const setBox=find('mythicSetStatus'),set=setModel();
    if(setBox){setBox.hidden=(Number(set.count)||0)<1;if(!setBox.hidden)setBox.innerHTML=artifactSetHtml(set);}
    renderCampStorage();
    return Object.freeze({owner:OWNER,layout,slots:slots().length,equipped:slots().filter(slot=>!!equipped[slot]).length,setPieces:Number(set.count)||0});
  }

  function renderLoot(item){
    installStyles();
    const overlay=find('lootOverlay'),card=find('lootCard'),title=find('lootTitle'),subtitle=find('lootSubtitle'),sell=find('sellLootBtn'),current=state().equipment?.[item?.slot]||null,copy=runtime.lootCopy?.(item)||{};
    if(!item||!overlay||!card)return null;
    const tier=rarity(item),special=['legendary','artifact','mythical','omega'].includes(item.rarity);
    if(title){title.textContent=copy.title||({omega:'OMEGA ITEM FOUND!',mythical:'MYTHICAL ITEM FOUND!',artifact:'ARTIFACT ITEM FOUND!',legendary:'LEGENDARY RELIC FOUND!'})[item.rarity]||'Equipment found';title.className=copy.titleClass||({omega:'omega-title',artifact:'artifact-title',legendary:'legendary-title',mythical:'mythic-drop-title'})[item.rarity]||'';}
    if(subtitle)subtitle.textContent=copy.subtitle||({omega:'A near-impossible Omega item claws its way into reality.',artifact:'An Artifact-tier relic of the Impossible Road refuses to obey ordinary item rules.',legendary:'This handcrafted Legendary cannot roll from ordinary equipment tables.',mythical:'A Mythical item tears its way out of the road.'})[item.rarity]||'Equip it now or sell it. Stored heirlooms can be managed at the Campsite.';
    overlay.classList.toggle('mythic-found',special);card.className=`loot-card ${item.rarity||''}`;
    card.innerHTML=`<div class=\"loot-top\"><div class=\"loot-icon\">${artMarkup(item,'db-equipment-loot-art')||escapeHtml(safeIcon(item))}</div><div><div class=\"rarity-badge\">${escapeHtml(tier.label||item.rarity||'Unknown')}</div><div class=\"loot-name\">${escapeHtml(displayName(item))}</div><div class=\"loot-slot\">${escapeHtml(label(item.slot))}</div></div></div><div class=\"loot-bonuses\">${escapeHtml(bonuses(item))}</div><div class=\"loot-current\">${current?`Currently equipped: <b>${escapeHtml(displayName(current))}</b> — ${escapeHtml(bonuses(current))}`:`The ${escapeHtml(label(item.slot))} slot is empty.`}</div>${item.seedCode?`<div class=\"seed-code\">Item seed: ${escapeHtml(item.seedCode)}</div>`:''}`;
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

  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};installStyles();bindCharacterTabs();syncCharacterLayout();return api;}
  function inspect(){const overlay=find('lootOverlay'),grid=find('equipmentGrid'),storage=find('campHeirloomStorage');return Object.freeze({owner:OWNER,hasEquipmentGrid:!!grid,lootOpen:!!overlay&&!overlay.classList.contains('hidden'),campStorage:!!storage,semanticArtCount:grid?.querySelectorAll?.('.db-equipment-slot-art').length||0});}
  const api=Object.freeze({configure,renderEquipment,renderLoot,renderCampStorage,renderEndGear,renderEndStorageManager,campView,rarityNameMarkup,activateCharacterTab,syncCharacterLayout,setCharacterLayout,inspect,owner:OWNER});
  window.DiceboundEquipmentHeirlooms=api;
  window.DiceboundEquipmentHeirloomsTest=Object.freeze({campView,inspect});
})(window);
