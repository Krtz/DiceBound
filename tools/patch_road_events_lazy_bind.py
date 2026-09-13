#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def cut(text,start,end,label):
    a=text.find(start)
    if a<0: raise SystemExit(f'{label}: start marker missing')
    b=text.find(end,a+len(start))
    if b<0: raise SystemExit(f'{label}: end marker missing')
    return text[:a]+text[b:]

p=ROOT/'runtime/js/events/lifecycle.js'
text=p.read_bytes().decode('utf-8').replace('\r\n','\n')
old="function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};bind();return api;}"
new="function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}"
if text.count(old)!=1: raise SystemExit(f'configure eager-bind marker count {text.count(old)}')
text=text.replace(old,new,1)
for name in ['openSlot','openWheel','openBlessing','openMystic','openBloodwell','openGambler']:
    old=f'function {name}(){{'
    new=f'function {name}(){{bind();'
    if text.count(old)!=1: raise SystemExit(f'{name} marker count {text.count(old)}')
    text=text.replace(old,new,1)
bind_anchor="    node('declineMysticBtn').addEventListener('click',declineMystic);\n"
bind_extra=bind_anchor+"    node('bloodwellLeaveBtn').addEventListener('click',()=>{clearTile();node('bloodwellOverlay').classList.add('hidden');requireFn('returnToRoad')();});\n    node('gamblerLeaveBtn').addEventListener('click',()=>{node('gamblerOverlay').classList.add('hidden');clearTile();requireFn('returnToRoad')();});\n"
if text.count(bind_anchor)!=1: raise SystemExit(f'leave-listener bind anchor count {text.count(bind_anchor)}')
text=text.replace(bind_anchor,bind_extra,1)
p.write_bytes(text.encode('utf-8'))

mono=ROOT/'runtime/js/dicebound.js'
source=mono.read_bytes().decode('utf-8').replace('\r\n','\n')
startup='generateBoard();buildBoard();renderClassChoices();renderEquipment();syncWheelIcons();updateHUD();updateMetaUI();'
replacement='generateBoard();buildBoard();renderClassChoices();renderEquipment();updateHUD();updateMetaUI();'
if source.count(startup)!=1: raise SystemExit(f'stale Wheel startup marker count {source.count(startup)}')
source=source.replace(startup,replacement,1)
for old in [
    '  $("bloodwellLeaveBtn").addEventListener("click",()=>{tiles[player.position].type="empty";tiles[player.position].cleared=true;refreshTile(player.position);$("bloodwellOverlay").classList.add("hidden");returnToRoad();});\n',
    '  $("gamblerLeaveBtn").addEventListener("click",()=>{$("gamblerOverlay").classList.add("hidden");tiles[player.position].type="empty";tiles[player.position].cleared=true;refreshTile(player.position);returnToRoad();});\n'
]:
    if source.count(old)!=1: raise SystemExit(f'stale leave listener count {source.count(old)}')
    source=source.replace(old,'',1)
source=cut(source,'  // ---- Slot rewards scale modestly -----------------------------------------','  // ---- Sovereign Relic: force a visible choice flow ------------------------','retired v16 Slot reward override')

# The historical Slot/Wheel/Blessing/Mystic block happened to contain the small
# Merchant presentation adapter between Wheel and Blessing. Restore that unrelated
# adapter verbatim; Road Events must not steal or delete Merchant ownership.
if 'let dbMerchantUi=null;' not in source:
    marker='  function grantLegacyXp(amount){'
    if source.count(marker)!=1: raise SystemExit(f'grantLegacyXp marker count {source.count(marker)}')
    merchant="""  // Merchant presentation is owned by ui/merchant.js; this lexical adapter
  // remains only for legacy callers inside the compatibility monolith.
  let dbMerchantUi=null;
  function renderMerchant(){
    if(!dbMerchantUi)throw new Error('Merchant UI owner is not configured.');
    return dbMerchantUi.render();
  }

"""
    source=source.replace(marker,merchant+marker,1)
mono.write_bytes(source.encode('utf-8'))
print('Road Events lifecycle drain preserves Merchant and owns its startup/leave hooks.')
