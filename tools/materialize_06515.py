#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8", newline="\n")


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} occurrence(s), found {count}: {old[:120]!r}")
    write(path, text.replace(old, new))


def regex_replace(path: str, pattern: str, replacement: str, expected: int = 1, flags: int = 0) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=expected, flags=flags)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} regex replacement(s), found {count}: {pattern!r}")
    write(path, updated)


# ---------------------------------------------------------------------------
# Prestige owner: permanent Heirloom purchases + refundable stat purchases.
# ---------------------------------------------------------------------------
prestige_path = "runtime/js/progression/prestige.js"
prestige = read(prestige_path)
start = prestige.index("  const NODES = Object.freeze([")
end = prestige.index("\n\n  const finite = value =>", start)
nodes = '''  const NODES = Object.freeze([
    Object.freeze({
      id: 'five-random-stats',
      label: 'Buy Stats',
      detail: 'Spend 1 Prestige Point to gain 5 permanent random stat points.',
      cost: 1,
      repeatable: true,
      refundable: true,
      kind: 'random-stat-bundle',
      placement: 'top'
    }),
    Object.freeze({
      id: 'heirloom-storage',
      label: 'Unlock Heirloom Storage',
      detail: 'Permanently unlock Heirloom Storage at Camp with one slot per equipment slot.',
      cost: 1,
      repeatable: false,
      refundable: false,
      kind: 'heirloom-storage',
      placement: 'right-upper'
    }),
    Object.freeze({
      id: 'heirloom-slot-i',
      label: 'Heirloom Storage Slot I',
      detail: 'Permanently add one extra Heirloom Storage slot.',
      cost: 2,
      repeatable: false,
      refundable: false,
      requires: 'heirloom-storage',
      kind: 'heirloom-storage-slot',
      placement: 'right-middle'
    }),
    Object.freeze({
      id: 'heirloom-slot-ii',
      label: 'Heirloom Storage Slot II',
      detail: 'Permanently add one more Heirloom Storage slot.',
      cost: 5,
      repeatable: false,
      refundable: false,
      requires: 'heirloom-storage',
      kind: 'heirloom-storage-slot',
      placement: 'right-lower'
    }),
    Object.freeze({
      id: 'moon-forge',
      label: 'Build Moon Forge',
      detail: 'A persistent lunar smithy will become the home of Prestige crafting.',
      cost: null,
      repeatable: false,
      refundable: false,
      kind: 'structure',
      placement: 'left',
      unavailableReason: 'Moon Forge cost is awaiting balance approval.'
    })
  ]);'''
prestige = prestige[:start] + nodes + prestige[end:]
write(prestige_path, prestige)

replace_exact(
    prestige_path,
    "  function unspent(prestige) {\n    const state = normalize(prestige);\n    return Math.max(0, state.count - spent(state));\n  }\n",
    "  function unspent(prestige) {\n    const state = normalize(prestige);\n    return Math.max(0, state.count - spent(state));\n  }\n\n  function hasPurchase(prestige, id) {\n    const state = normalize(prestige);\n    return state.moon.purchases.some(purchase => purchase.nodeId === id);\n  }\n\n  function refundableSpent(prestige) {\n    const state = normalize(prestige);\n    return state.moon.purchases.reduce((total, purchase) => {\n      const node = nodeFor(purchase.nodeId);\n      return total + (node?.refundable === false ? 0 : finite(purchase.cost));\n    }, 0);\n  }\n"
)

replace_exact(
    prestige_path,
    "    const purchasedNodes = state.moon.purchases.map(purchase => purchase.nodeId);\n    return Object.freeze({\n",
    "    const purchasedNodes = state.moon.purchases.map(purchase => purchase.nodeId);\n    return Object.freeze({\n"
)
replace_exact(
    prestige_path,
    "      spent: spent(state),\n      unspent: unspent(state),\n",
    "      spent: spent(state),\n      refundableSpent: refundableSpent(state),\n      unspent: unspent(state),\n"
)
replace_exact(
    prestige_path,
    "      nodes: Object.freeze(NODES.map(node => ({...node, purchased: purchasedNodes.includes(node.id), affordable: node.cost !== null && unspent(state) >= node.cost})))\n",
    "      nodes: Object.freeze(NODES.map(node => {\n        const available = !node.requires || purchasedNodes.includes(node.requires);\n        return {...node, purchased: purchasedNodes.includes(node.id), available, affordable: available && node.cost !== null && unspent(state) >= node.cost, unavailableReason: available ? node.unavailableReason : `Requires ${nodeFor(node.requires)?.label || node.requires}.`};\n      }))\n"
)
replace_exact(
    prestige_path,
    "    if (node.cost === null) return Object.freeze({ok: false, reason: node.unavailableReason || 'This node is not available yet.', prestige: state});\n    if (!node.repeatable && state.moon.purchases.some(entry => entry.nodeId === id)) return Object.freeze({ok: false, reason: 'Already purchased.', prestige: state});\n",
    "    if (node.cost === null) return Object.freeze({ok: false, reason: node.unavailableReason || 'This node is not available yet.', prestige: state});\n    if (node.requires && !hasPurchase(state, node.requires)) return Object.freeze({ok: false, reason: `Requires ${nodeFor(node.requires)?.label || node.requires}.`, prestige: state});\n    if (!node.repeatable && state.moon.purchases.some(entry => entry.nodeId === id)) return Object.freeze({ok: false, reason: 'Already purchased.', prestige: state});\n"
)
replace_exact(
    prestige_path,
    "  function refundAll(prestige) {\n    const state = normalize(prestige), refunded = state.moon.purchases.reduce((total, purchase) => total + finite(purchase.cost), 0);\n    state.moon.purchases = [];\n    return Object.freeze({prestige: state, refunded});\n  }\n",
    "  function grantLegacyPurchase(prestige, id) {\n    const state = normalize(prestige), node = nodeFor(id);\n    if (!node || node.repeatable || hasPurchase(state, id)) return state;\n    state.moon.purchases.push({nodeId: id, cost: 0, stats: blankStats()});\n    return state;\n  }\n\n  function refundAll(prestige) {\n    const state = normalize(prestige);\n    let refunded = 0;\n    state.moon.purchases = state.moon.purchases.filter(purchase => {\n      const node = nodeFor(purchase.nodeId);\n      if (node?.refundable === false) return true;\n      refunded += finite(purchase.cost);\n      return false;\n    });\n    return Object.freeze({prestige: state, refunded});\n  }\n"
)
replace_exact(
    prestige_path,
    "    inspect,\n    unspent,\n",
    "    inspect,\n    unspent,\n    hasPurchase,\n    refundableSpent,\n"
)
replace_exact(
    prestige_path,
    "    purchase,\n    refundAll,\n",
    "    purchase,\n    grantLegacyPurchase,\n    refundAll,\n"
)

# ---------------------------------------------------------------------------
# Rouge class: first Prestige instead of Prestige 10.
# ---------------------------------------------------------------------------
replace_exact("runtime/js/classes/registry.js", '"unlock": "Reach 10 Prestige points"', '"unlock": "Prestige once"')
replace_exact("runtime/js/classes/registry.js", 'rouge:{type:"prestige",count:10}', 'rouge:{type:"prestige",count:1}')

# ---------------------------------------------------------------------------
# Camp: move Class and Pet authored controls 10 percentage points down.
# ---------------------------------------------------------------------------
replace_exact("runtime/js/ui/camp.js", "['#campClassBtn','left:39%;top:45%;translate:none']", "['#campClassBtn','left:39%;top:55%;translate:none']", expected=2)
replace_exact("runtime/js/ui/camp.js", "['#campClassBtn','left:39%;top:58%;translate:none']", "['#campClassBtn','left:39%;top:68%;translate:none']")
replace_exact("runtime/js/ui/camp.js", "campClassBtn:Object.freeze({x:.39,y:.45,w:235})", "campClassBtn:Object.freeze({x:.39,y:.55,w:235})")
replace_exact("runtime/js/ui/camp.js", "campPetBtn:Object.freeze({x:.39,y:.70,w:220})", "campPetBtn:Object.freeze({x:.39,y:.80,w:220})")
replace_exact("runtime/js/ui/camp.js", "campPetBtn:Object.freeze({x:.39,y:.70})", "campPetBtn:Object.freeze({x:.39,y:.80})", expected=2)

# ---------------------------------------------------------------------------
# Prestige Moon: title to upper-left, add Heirloom nodes on right side.
# ---------------------------------------------------------------------------
replace_exact(
    "runtime/js/ui/prestige-moon.js",
    "#prestigeMoonOverlay .prestige-moon-intro{position:absolute;z-index:5;top:clamp(18px,4vh,58px);left:50%;width:min(600px,calc(100% - 150px));transform:translateX(-50%);text-align:center;pointer-events:none}",
    "#prestigeMoonOverlay .prestige-moon-intro{position:absolute;z-index:5;top:clamp(14px,2.4vh,30px);left:clamp(14px,2.6vw,40px);width:min(390px,calc(100% - 170px));transform:none;text-align:left;pointer-events:none}"
)
replace_exact(
    "runtime/js/ui/prestige-moon.js",
    ".prestige-moon-node.left{left:3%;top:51%}.prestige-moon-node.forge-built",
    ".prestige-moon-node.left{left:3%;top:51%}.prestige-moon-node.right-upper{right:2%;top:31%}.prestige-moon-node.right-middle{right:-1%;top:51%}.prestige-moon-node.right-lower{right:2%;top:71%}.prestige-moon-node.forge-built"
)
replace_exact(
    "runtime/js/ui/prestige-moon.js",
    "@media(max-width:760px){#prestigeMoonOverlay .prestige-moon-intro{top:54px;width:min(500px,calc(100% - 30px))}",
    "@media(max-width:760px){#prestigeMoonOverlay .prestige-moon-intro{top:12px;left:12px;width:min(330px,calc(100% - 130px));transform:none;text-align:left}"
)
replace_exact(
    "runtime/js/ui/prestige-moon.js",
    ".prestige-moon-node.left{left:-1%;top:59%}.prestige-moon-node.top{top:4%}",
    ".prestige-moon-node.left{left:-1%;top:59%}.prestige-moon-node.right-upper{right:-2%;top:31%}.prestige-moon-node.right-middle{right:-5%;top:53%}.prestige-moon-node.right-lower{right:-2%;top:75%}.prestige-moon-node.top{top:4%}"
)
replace_exact(
    "runtime/js/ui/prestige-moon.js",
    "const prestige = state.prestige || {unspent: 0, heldSummary: 'Unavailable', permanentSummary: 'Unavailable', nodes: []};",
    "const prestige = state.prestige || {unspent: 0, spent: 0, refundableSpent: 0, heldSummary: 'Unavailable', permanentSummary: 'Unavailable', nodes: []};"
)
replace_exact(
    "runtime/js/ui/prestige-moon.js",
    "data-prestige-refund ${prestige.spent > 0 ? '' : 'disabled'}>Refund All</button>",
    "data-prestige-refund ${(prestige.refundableSpent ?? prestige.spent) > 0 ? '' : 'disabled'}>Refund Stats</button>"
)

# ---------------------------------------------------------------------------
# Storage UI copy: Moon purchase replaces the retired Talent unlock.
# ---------------------------------------------------------------------------
replace_exact(
    "runtime/js/ui/equipment-heirlooms.js",
    "After defeating Board 3, a one-rank talent appears beyond Living Legend. Purchase it once to permanently unlock storage.",
    "Purchase Heirloom Storage on the Prestige Moon for 1 Prestige Point. It begins with one slot per equipment slot; Board 5, two permanent Moon slot purchases, and the Road Merchant can expand it."
)

# ---------------------------------------------------------------------------
# Compatibility runtime: retire storage Talent + Prestige-count slot gates,
# migrate existing saves once, and apply Moon purchase side effects.
# ---------------------------------------------------------------------------
monolith = "runtime/js/dicebound.js"
replace_exact(
    monolith,
    "    if(t.id==='legacy_storage'&&talentRank('legacy_storage')>0&&!meta.heirloomStorageUnlocked){meta.heirloomStorageUnlocked=true;v24SyncStorage();saveMeta();showToast('🗄️ Heirloom Storage permanently unlocked!',3000,true);dbEquipmentUi.renderCampStorage();}\n",
    ""
)
replace_exact(monolith, "    isVisible:t=>t.id!=='legacy_storage'||meta.nightmareUnlocked||meta.heirloomStorageUnlocked,", "    isVisible:()=>true,")
old_storage = '''  function v24StorageUnlocked(){return !!meta.heirloomStorageUnlocked;}
  function v24StorageCapacity(){if(!v24StorageUnlocked())return 0;let n=EQUIPMENT_SLOTS.length;if((meta.board5Clears||0)>0)n++;if((meta.prestige?.count||0)>=5)n++;if((meta.prestige?.count||0)>=50)n++;if((meta.merchantKills||0)>=1)n++;return n;}
  function v24SyncStorage(){
    if(!v24StorageUnlocked())return;const byId=new Map((meta.heirloomStorage||[]).map(i=>[i.id,normalizeSavedItem(i)]));(meta.heirlooms||[]).forEach(i=>byId.set(i.id,normalizeSavedItem(i)));meta.heirloomStorage=[...byId.values()].slice(0,v24StorageCapacity());const ids=new Set(meta.heirloomStorage.map(i=>i.id));meta.heirlooms=(meta.heirlooms||[]).filter(i=>ids.has(i.id)).slice(0,getHeirloomSlots());saveMeta();
  }
  const storageTalent={id:'legacy_storage',branch:'Heirlooms',icon:'🗄️',name:'Heirloom Storage',cost:3,maxRank:1,desc:'Permanently unlock Heirloom Storage at the Campsite. It begins with one storage slot per equipment slot; major milestones add more.',requires:[req('legacy_xp',1)]};
  if(!talents.some(t=>t.id===storageTalent.id))talents.push(storageTalent);
  function v24StorageMilestones(){return [{on:(meta.board5Clears||0)>0,text:'Board 5 cleared'},{on:(meta.prestige?.count||0)>=5,text:'Prestige 5'},{on:(meta.prestige?.count||0)>=50,text:'Prestige 50'},{on:(meta.merchantKills||0)>=1,text:'Road Merchant defeated'}];}
'''
new_storage = '''  const DB_HEIRLOOM_STORAGE_NODE='heirloom-storage',DB_HEIRLOOM_SLOT_I_NODE='heirloom-slot-i',DB_HEIRLOOM_SLOT_II_NODE='heirloom-slot-ii';
  function v24MigratePrestigeHeirloomPurchases(){
    if(meta.prestigeHeirloomPurchasesMigrated)return {changed:false,refundedTalentPoints:0};
    let prestige=DB_PRESTIGE.normalize(meta.prestige),refundedTalentPoints=0;
    const oldStorageRank=Math.max(0,Math.floor(Number(meta.purchased?.legacy_storage)||0));
    if(meta.heirloomStorageUnlocked||oldStorageRank>0){
      prestige=DB_PRESTIGE.grantLegacyPurchase(prestige,DB_HEIRLOOM_STORAGE_NODE);
      if((meta.prestige?.count||0)>=5)prestige=DB_PRESTIGE.grantLegacyPurchase(prestige,DB_HEIRLOOM_SLOT_I_NODE);
      if((meta.prestige?.count||0)>=50)prestige=DB_PRESTIGE.grantLegacyPurchase(prestige,DB_HEIRLOOM_SLOT_II_NODE);
      meta.heirloomStorageUnlocked=true;
    }
    if(oldStorageRank>0){refundedTalentPoints=oldStorageRank*3;meta.points=(meta.points||0)+refundedTalentPoints;delete meta.purchased.legacy_storage;}
    meta.prestige=prestige;meta.prestigeHeirloomPurchasesMigrated=1;
    return {changed:true,refundedTalentPoints};
  }
  function v24StorageUnlocked(){return DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_STORAGE_NODE);}
  function v24StorageCapacity(){if(!v24StorageUnlocked())return 0;let n=EQUIPMENT_SLOTS.length;if((meta.board5Clears||0)>0)n++;if(DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_SLOT_I_NODE))n++;if(DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_SLOT_II_NODE))n++;if((meta.merchantKills||0)>=1)n++;return n;}
  function v24SyncStorage(){
    if(!v24StorageUnlocked())return;const byId=new Map((meta.heirloomStorage||[]).map(i=>[i.id,normalizeSavedItem(i)]));(meta.heirlooms||[]).forEach(i=>byId.set(i.id,normalizeSavedItem(i)));meta.heirloomStorage=[...byId.values()].slice(0,v24StorageCapacity());const ids=new Set(meta.heirloomStorage.map(i=>i.id));meta.heirlooms=(meta.heirlooms||[]).filter(i=>ids.has(i.id)).slice(0,getHeirloomSlots());saveMeta();
  }
  function v24StorageMilestones(){return [{on:(meta.board5Clears||0)>0,text:'Board 5 cleared'},{on:DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_SLOT_I_NODE),text:'Storage Slot I purchased'},{on:DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_SLOT_II_NODE),text:'Storage Slot II purchased'},{on:(meta.merchantKills||0)>=1,text:'Road Merchant defeated'}];}
'''
replace_exact(monolith, old_storage, new_storage)

replace_exact(
    monolith,
    "    storageTalentGate:()=>{const oldN=meta.nightmareUnlocked,oldU=meta.heirloomStorageUnlocked;meta.nightmareUnlocked=false;meta.heirloomStorageUnlocked=false;renderTalents();const before=!!document.querySelector('[data-talent-id=\"legacy_storage\"]');meta.nightmareUnlocked=true;renderTalents();const after=!!document.querySelector('[data-talent-id=\"legacy_storage\"]');meta.nightmareUnlocked=oldN;meta.heirloomStorageUnlocked=oldU;renderTalents();return {beforeBoard3:before,afterBoard3:after};},",
    "    storageTalentGate:()=>({beforeBoard3:false,afterBoard3:false,retired:true}),"
)
replace_exact(
    monolith,
    "    storageMilestones:()=>{const old={u:meta.heirloomStorageUnlocked,b5:meta.board5Clears,p:meta.prestige.count,m:meta.merchantKills};meta.heirloomStorageUnlocked=true;const vals=[];meta.board5Clears=0;meta.prestige.count=0;meta.merchantKills=0;vals.push(v24StorageCapacity());meta.board5Clears=1;vals.push(v24StorageCapacity());meta.prestige.count=5;vals.push(v24StorageCapacity());meta.prestige.count=50;vals.push(v24StorageCapacity());meta.merchantKills=1;vals.push(v24StorageCapacity());Object.assign(meta,{heirloomStorageUnlocked:old.u,board5Clears:old.b5,merchantKills:old.m});meta.prestige.count=old.p;return vals;},",
    "    storageMilestones:()=>{const old={u:meta.heirloomStorageUnlocked,b5:meta.board5Clears,p:DB_PRESTIGE.clone(meta.prestige),m:meta.merchantKills};let test=DB_PRESTIGE.normalize({count:20,moon:{legacySpent:0,purchases:[]}});test=DB_PRESTIGE.grantLegacyPurchase(test,DB_HEIRLOOM_STORAGE_NODE);meta.prestige=test;meta.heirloomStorageUnlocked=true;const vals=[];meta.board5Clears=0;meta.merchantKills=0;vals.push(v24StorageCapacity());meta.board5Clears=1;vals.push(v24StorageCapacity());meta.prestige=DB_PRESTIGE.grantLegacyPurchase(meta.prestige,DB_HEIRLOOM_SLOT_I_NODE);vals.push(v24StorageCapacity());meta.prestige=DB_PRESTIGE.grantLegacyPurchase(meta.prestige,DB_HEIRLOOM_SLOT_II_NODE);vals.push(v24StorageCapacity());meta.merchantKills=1;vals.push(v24StorageCapacity());Object.assign(meta,{heirloomStorageUnlocked:old.u,board5Clears:old.b5,merchantKills:old.m});meta.prestige=old.p;return vals;},"
)
replace_exact(
    monolith,
    "  setTimeout(()=>{if(talentRank('legacy_storage')>0&&!meta.heirloomStorageUnlocked){meta.heirloomStorageUnlocked=true;v24SyncStorage();}v24RefreshCamp();renderTalents();renderEquipment();v24EnsureShieldBars();},0);",
    "  setTimeout(()=>{const migration=v24MigratePrestigeHeirloomPurchases();if(migration.changed){saveMeta();if(migration.refundedTalentPoints)showToast(`🗄️ Heirloom Storage moved to the Prestige Moon · ${migration.refundedTalentPoints} Talent Points refunded.`,3600,true);}if(v24StorageUnlocked())v24SyncStorage();v24RefreshCamp();renderTalents();renderEquipment();v24EnsureShieldBars();},0);"
)
old_purchase = '''    purchase:id=>{
      if(gameStarted){showToast('Spend Prestige Points between runs.');return Object.freeze({ok:false,reason:'Prestige Moon purchases are available between runs.'});}
      const result=DB_PRESTIGE.purchase(meta.prestige,id,random);
      if(!result.ok){showToast(result.reason);return result;}
      meta.prestige=result.prestige;saveMeta();updateMetaUI();showToast(`${result.node.label}: ${DB_PRESTIGE.formatStats(result.stats)}.`);return result;
    },
    refundAll:async()=>{
      if(gameStarted){showToast('Refund Prestige Points between runs.');return false;}
      const current=DB_PRESTIGE.inspect(meta.prestige);
      if(!current.spent)return false;
      if(!(await diceboundConfirm(`Refund ${current.spent} spent Prestige Point${current.spent===1?'':'s'}? Their purchased bonuses and structures will be removed.`,{title:'Refund all Prestige Points?',confirmLabel:'Refund all',danger:true})))return false;
      const result=DB_PRESTIGE.refundAll(meta.prestige);meta.prestige=result.prestige;saveMeta();updateMetaUI();showToast(`Refunded ${result.refunded} Prestige Point${result.refunded===1?'':'s'}.`);return true;
    },'''
new_purchase = '''    purchase:id=>{
      if(gameStarted){showToast('Spend Prestige Points between runs.');return Object.freeze({ok:false,reason:'Prestige Moon purchases are available between runs.'});}
      const result=DB_PRESTIGE.purchase(meta.prestige,id,random);
      if(!result.ok){showToast(result.reason);return result;}
      meta.prestige=result.prestige;
      const storagePurchase=[DB_HEIRLOOM_STORAGE_NODE,DB_HEIRLOOM_SLOT_I_NODE,DB_HEIRLOOM_SLOT_II_NODE].includes(id);
      if(storagePurchase){if(id===DB_HEIRLOOM_STORAGE_NODE)meta.heirloomStorageUnlocked=true;v24SyncStorage();dbEquipmentUi.renderCampStorage();v24RefreshCamp();showToast(`${result.node.label} purchased.`);}else showToast(`${result.node.label}: ${DB_PRESTIGE.formatStats(result.stats)}.`);
      saveMeta();updateMetaUI();return result;
    },
    refundAll:async()=>{
      if(gameStarted){showToast('Refund Prestige Points between runs.');return false;}
      const current=DB_PRESTIGE.inspect(meta.prestige);
      if(!current.refundableSpent)return false;
      if(!(await diceboundConfirm(`Refund ${current.refundableSpent} refundable Prestige Point${current.refundableSpent===1?'':'s'}? Permanent Heirloom purchases stay unlocked.`,{title:'Refund Prestige stats?',confirmLabel:'Refund stats',danger:true})))return false;
      const result=DB_PRESTIGE.refundAll(meta.prestige);meta.prestige=result.prestige;saveMeta();updateMetaUI();showToast(`Refunded ${result.refunded} Prestige Point${result.refunded===1?'':'s'}.`);return true;
    },'''
replace_exact(monolith, old_purchase, new_purchase)

# Make Prestige warning accurate for locked/new storage careers.
replace_exact(monolith, "Heirloom Storage and your stored collection persist; there is no survivor-pick step.", "Purchased Heirloom Storage and your stored collection persist; there is no survivor-pick step.")

# ---------------------------------------------------------------------------
# Tests: progression semantics, class snapshots, and Camp positions.
# ---------------------------------------------------------------------------
prestige_test = "tools/test_prestige_module.js"
replace_exact(
    prestige_test,
    "const forge=prestige.purchase(refund.prestige,'moon-forge',()=>0);",
    '''let heirloomState=prestige.normalize({count:20,moon:{legacySpent:0,purchases:[]}});
let noRngCalls=0;
let lockedSlot=prestige.purchase(heirloomState,'heirloom-slot-i',()=>{noRngCalls++;return 0;});
assert.equal(lockedSlot.ok,false,'slot purchases must require Heirloom Storage first');
assert.match(lockedSlot.reason,/requires unlock heirloom storage/i);
let storage=prestige.purchase(heirloomState,'heirloom-storage',()=>{noRngCalls++;return 0;});
assert.equal(storage.ok,true);
assert.equal(storage.node.cost,1);
assert.equal(noRngCalls,0,'non-stat Prestige purchases must not consume RNG');
heirloomState=storage.prestige;
let slotOne=prestige.purchase(heirloomState,'heirloom-slot-i',()=>{noRngCalls++;return 0;});
assert.equal(slotOne.ok,true);assert.equal(slotOne.node.cost,2);heirloomState=slotOne.prestige;
let slotTwo=prestige.purchase(heirloomState,'heirloom-slot-ii',()=>{noRngCalls++;return 0;});
assert.equal(slotTwo.ok,true);assert.equal(slotTwo.node.cost,5);heirloomState=slotTwo.prestige;
assert.equal(noRngCalls,0);
assert.equal(prestige.inspect(heirloomState).unspent,12,'1 + 2 + 5 PP permanent Heirloom purchases must spend exactly 8 PP');
assert.equal(prestige.inspect(heirloomState).refundableSpent,0,'permanent Heirloom purchases are not refundable');
let statAfterStorage=prestige.purchase(heirloomState,'five-random-stats',()=>0);
assert.equal(statAfterStorage.ok,true);heirloomState=statAfterStorage.prestige;
assert.equal(prestige.inspect(heirloomState).refundableSpent,1);
const permanentRefund=prestige.refundAll(heirloomState);
assert.equal(permanentRefund.refunded,1,'Refund Stats must refund only refundable stat bundles');
assert.equal(prestige.hasPurchase(permanentRefund.prestige,'heirloom-storage'),true);
assert.equal(prestige.hasPurchase(permanentRefund.prestige,'heirloom-slot-i'),true);
assert.equal(prestige.hasPurchase(permanentRefund.prestige,'heirloom-slot-ii'),true);
assert.equal(prestige.inspect(permanentRefund.prestige).unspent,12,'permanent Heirloom spend must remain after a stat refund');
let grandfathered=prestige.normalize({count:50,moon:{legacySpent:0,purchases:[]}});
grandfathered=prestige.grantLegacyPurchase(grandfathered,'heirloom-storage');
grandfathered=prestige.grantLegacyPurchase(grandfathered,'heirloom-slot-i');
grandfathered=prestige.grantLegacyPurchase(grandfathered,'heirloom-slot-ii');
assert.equal(prestige.inspect(grandfathered).spent,0,'grandfathered legacy purchases must preserve earned capacity without retroactively charging PP');
assert.equal(prestige.hasPurchase(grandfathered,'heirloom-slot-ii'),true);

const forge=prestige.purchase(refund.prestige,'moon-forge',()=>0);'''
)
replace_exact(prestige_test, "console.log('Prestige progression owner PASS: currency, held stats, purchase bundles, refund and Forge TBD contract');", "console.log('Prestige progression owner PASS: currency, held stats, permanent Heirloom purchases, selective refund, migration and Forge TBD contract');")

camp_test = "tools/test_camp_ui.js"
replace_exact(camp_test, "assert.deepStrictEqual({...camp.stageAnchors.campClassBtn},{x:.39,y:.45,w:235},'Class must retain its approved full-body stage anchor');", "assert.deepStrictEqual({...camp.stageAnchors.campClassBtn},{x:.39,y:.55,w:235},'Class Choice must sit 10% lower on the authored Camp stage');")
replace_exact(camp_test, "assert.deepStrictEqual({...camp.stageAnchors.campChestBtn},{x:.64,y:.76,w:245,h:150},'Chest must remain lower-middle/right without overlapping Start Run');", "assert.deepStrictEqual({...camp.stageAnchors.campChestBtn},{x:.64,y:.76,w:245,h:150},'Chest must remain lower-middle/right without overlapping Start Run');\nassert.deepStrictEqual({...camp.stageAnchors.campPetBtn},{x:.39,y:.80,w:220},'Pet Choice must sit 10% lower on the authored Camp stage');")
replace_exact(camp_test, "assert.equal(rules['#campClassBtn'],'left:39%;top:45%;translate:none',`${layout.id} must use the approved Class figure anchor`);", "assert.equal(rules['#campClassBtn'],'left:39%;top:55%;translate:none',`${layout.id} must place Class Choice 10% lower`);")
replace_exact(camp_test, "assert.equal(shortRules['#campMoonBtn'],'left:48%;top:20%;translate:none','short Camp layout must keep Prestige entirely onscreen');", "assert.equal(shortRules['#campMoonBtn'],'left:48%;top:20%;translate:none','short Camp layout must keep Prestige entirely onscreen');\nassert.equal(shortRules['#campClassBtn'],'left:39%;top:68%;translate:none','short Camp layout must move Class Choice 10% downward');")

class_test = "tools/test_class_registry.js"
replace_exact(class_test, "assert.equal(registry.rouge.name, \"Rouge\");", "assert.equal(registry.rouge.name, \"Rouge\");\nassert.equal(registry.rouge.unlock, \"Prestige once\");")
replace_exact(class_test, "assert.equal(unlocks.slime.minimum,10);", "assert.equal(unlocks.slime.minimum,10);\nassert.equal(unlocks.rouge.type,\"prestige\");\nassert.equal(unlocks.rouge.count,1);")

# Recalculate only the strict snapshots intentionally changed by Rouge data.
node_script = r'''
const crypto=require('crypto'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('runtime/js/classes/registry.js','utf8');
const context=vm.createContext({window:{}});vm.runInContext(source,context);
const classes=context.window.DiceboundClasses;
const reg=JSON.stringify(classes.createRegistry()), unlock=JSON.stringify(classes.createUnlockRegistry());
console.log(JSON.stringify({classBytes:Buffer.byteLength(reg),classSha:crypto.createHash('sha256').update(reg).digest('hex'),unlockBytes:Buffer.byteLength(unlock),unlockSha:crypto.createHash('sha256').update(unlock).digest('hex')}));
'''
snapshot = json.loads(subprocess.check_output(["node", "-e", node_script], cwd=ROOT, text=True))
text = read(class_test)
text, n = re.subn(r'assert\.equal\(Buffer\.byteLength\(serialized\), \d+, "canonical class registry byte snapshot drifted"\);', f'assert.equal(Buffer.byteLength(serialized), {snapshot["classBytes"]}, "canonical class registry byte snapshot drifted");', text, count=1)
if n != 1: raise SystemExit('could not update class registry byte snapshot')
text, n = re.subn(r'crypto\.createHash\("sha256"\)\.update\(serialized\)\.digest\("hex"\),\n  "[0-9a-f]+",', f'crypto.createHash("sha256").update(serialized).digest("hex"),\n  "{snapshot["classSha"]}",', text, count=1)
if n != 1: raise SystemExit('could not update class registry hash snapshot')
text, n = re.subn(r'snapshot\(unlocks, \d+, "[0-9a-f]+", "class unlock registry"\);', f'snapshot(unlocks, {snapshot["unlockBytes"]}, "{snapshot["unlockSha"]}", "class unlock registry");', text, count=1)
if n != 1: raise SystemExit('could not update class unlock snapshot')
write(class_test, text)

# Lightweight static regression test for the six requested patch behaviors.
regression = r'''#!/usr/bin/env node
const assert=require('assert'),fs=require('fs');
const read=p=>fs.readFileSync(p,'utf8');
const mono=read('runtime/js/dicebound.js'), prestige=read('runtime/js/progression/prestige.js'), camp=read('runtime/js/ui/camp.js'), moon=read('runtime/js/ui/prestige-moon.js'), classes=read('runtime/js/classes/registry.js'), equipment=read('runtime/js/ui/equipment-heirlooms.js');
assert.doesNotMatch(mono,/const storageTalent=\{id:'legacy_storage'/,'Heirloom Storage Talent owner must be retired');
assert.doesNotMatch(mono,/prestige\?\.count\|\|0\)>=5/,'Prestige 5 must not auto-expand storage');
assert.doesNotMatch(mono,/prestige\?\.count\|\|0\)>=50/,'Prestige 50 must not auto-expand storage');
assert.match(prestige,/id: 'heirloom-storage'[\s\S]*?cost: 1/);
assert.match(prestige,/id: 'heirloom-slot-i'[\s\S]*?cost: 2/);
assert.match(prestige,/id: 'heirloom-slot-ii'[\s\S]*?cost: 5/);
assert.match(prestige,/refundable: false/);
assert.match(classes,/rouge:\{type:"prestige",count:1\}/);
assert.match(classes,/"unlock": "Prestige once"/);
assert.match(camp,/campClassBtn:Object\.freeze\(\{x:\.39,y:\.55,w:235\}\)/);
assert.match(camp,/campPetBtn:Object\.freeze\(\{x:\.39,y:\.80,w:220\}\)/);
assert.match(moon,/prestige-moon-intro\{[^}]*left:clamp\(14px,2\.6vw,40px\)[^}]*text-align:left/);
assert.match(equipment,/Purchase Heirloom Storage on the Prestige Moon for 1 Prestige Point/);
assert.match(mono,/prestigeHeirloomPurchasesMigrated/,'old saves need a one-time Heirloom migration');
assert.match(mono,/oldStorageRank\*3/,'retired Storage Talent must refund its 3 Talent Points');
console.log('Beta 0.6.5.15 requested progression/UI patch contract PASS');
'''
write('tools/test_06515_prestige_heirloom_ui.js', regression)

# ---------------------------------------------------------------------------
# Release-facing notes/version metadata.
# ---------------------------------------------------------------------------
replace_exact(
    "CHANGELOG.md",
    "## Beta 0.6.5.14\n",
    "## Beta 0.6.5.15\n\n### Prestige Heirlooms and Camp layout\n- Heirloom Storage is now a permanent 1-Prestige-Point Moon purchase instead of a Legacy Talent; existing Storage owners are grandfathered and the retired 3 Talent Point purchase is refunded once.\n- The former automatic Prestige 5/50 Storage slots are permanent Moon purchases costing 2 and 5 Prestige Points. Board 5 and Road Merchant slot rewards remain unchanged.\n- Rouge now unlocks after the first Prestige. Prestige Moon title placement no longer collides with Buy Stats, and the Camp Class/Pet choice controls move 10% lower.\n\n## Beta 0.6.5.14\n"
)
replace_exact("runtime/PATCH_NOTES.md", "# Unreleased — Beta 0.6.5.14\n", "# Unreleased — Beta 0.6.5.15\n")
replace_exact(
    "runtime/PATCH_NOTES.md",
    "## Beta 0.6.5.14 Fresh-run lifecycle ownership (#40, #209)\n",
    "## Beta 0.6.5.15 Prestige Heirlooms and Camp layout\n- Heirloom Storage now costs 1 Prestige Point on the Prestige Moon; the retired Legacy Talent is removed, existing owners keep Storage, and its old 3 Talent Point cost is refunded once.\n- The former Prestige 5 and Prestige 50 automatic Storage slots are now permanent 2 PP and 5 PP purchases. Board 5 and Road Merchant slot rewards remain automatic.\n- Rouge unlocks after one Prestige. The Prestige Moon title moves away from Buy Stats, while Camp Class Choice and Pet Choice move 10% downward.\n\n## Beta 0.6.5.14 Fresh-run lifecycle ownership (#40, #209)\n"
)

# Version stamp and corrected current subtitle.
subprocess.run(["python", "tools/set_project_version.py", "--version", "0.6.5.15", "--channel", "Beta"], cwd=ROOT, check=True)
replace_exact("runtime/index.html", "Beta v0.6.5.15 · Board transition ownership.", "Beta v0.6.5.15 · Prestige Heirlooms & Camp layout.")
subprocess.run(["python", "tools/refresh_runtime_manifest.py", "--version", "0.6.5.15", "--channel", "Beta", "--development-state", "Unreleased"], cwd=ROOT, check=True)
subprocess.run(["python", "tools/prepare_release.py", "--version", "0.6.5.15", "--channel", "Beta"], cwd=ROOT, check=True)

# Targeted tests before the branch commit. Full authoritative suite runs on PR CI.
for test in [
    "tools/test_prestige_module.js",
    "tools/test_class_registry.js",
    "tools/test_camp_ui.js",
    "tools/test_06515_prestige_heirloom_ui.js",
]:
    subprocess.run(["node", test], cwd=ROOT, check=True)
for path in [
    "runtime/js/progression/prestige.js",
    "runtime/js/classes/registry.js",
    "runtime/js/ui/camp.js",
    "runtime/js/ui/prestige-moon.js",
    "runtime/js/ui/equipment-heirlooms.js",
    "runtime/js/dicebound.js",
]:
    subprocess.run(["node", "--check", path], cwd=ROOT, check=True)

print(json.dumps({"version":"0.6.5.15","classSnapshots":snapshot,"status":"materialized and targeted tests passed"}, indent=2))
