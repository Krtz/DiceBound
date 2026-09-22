#!/usr/bin/env node
"use strict";

/* Deterministic contract checks for the extracted equipment/Heirloom UI owner. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/ui/equipment-heirlooms.js"),"utf8");

function classList(){
  const values=new Set();
  return {
    add:value=>values.add(value),remove:value=>values.delete(value),contains:value=>values.has(value),
    toggle:(value,force)=>{const enabled=force===undefined?!values.has(value):!!force;enabled?values.add(value):values.delete(value);return enabled;}
  };
}
function fakeDocument(){
  const byId=new Map();
  function node(tag="div"){
    const result={
      tagName:tag.toUpperCase(),id:"",className:"",title:"",textContent:"",hidden:false,children:[],dataset:{},attributes:{},classList:classList(),
      setAttribute(name,value){this.attributes[name]=String(value);},removeAttribute(name){delete this.attributes[name];},
      appendChild(child){this.children.push(child);if(child.id)byId.set(child.id,child);return child;},
      replaceChildren(...children){this.children=[...children];},
      insertBefore(child){return this.appendChild(child);},
      addEventListener(){},
      querySelector(selector){
        if(selector===".modal")return this.modal||null;
        if(selector.includes("data-heirloom-storage-grid"))return this.storageGrid||(this.storageGrid=node());
        if(selector.includes("data-end-storage-grid"))return this.endStorageGrid||(this.endStorageGrid=node());
        return null;
      },
      querySelectorAll(){return [];}
    };
    let html="";
    Object.defineProperty(result,"innerHTML",{get:()=>html,set:value=>{html=String(value);result.children=[];if(result.storageGrid)result.storageGrid.children=[];if(result.endStorageGrid)result.endStorageGrid.children=[];}});
    return result;
  }
  const document={
    head:node("head"),createElement:node,getElementById:id=>byId.get(id)||null,
    register(id,value=node()){value.id=id;byId.set(id,value);return value;}
  };
  return document;
}

const document=fakeDocument();
for(const id of ["equipmentGrid","mythicSetStatus","lootOverlay","lootCard","lootTitle","lootSubtitle","sellLootBtn","campChestPanel","endGearGrid","endHeirloomStatus","endRestartBtn"])document.register(id);
const endOverlay=document.register("endOverlay");
endOverlay.modal=document.createElement("section");

const window={document,window:null};window.window=window;
vm.runInNewContext(source,{window,console},{filename:"runtime/js/ui/equipment-heirlooms.js"});
const ui=window.DiceboundEquipmentHeirlooms;
assert.ok(ui,"equipment/Heirloom UI owner is not public");

const state={
  equipment:{weapon:{id:"w1",slot:"weapon",name:"Ash Bow",icon:"🏹",rarity:"rare",seedCode:"ash-1",bonuses:{attack:8}},hat:{id:"h1",slot:"hat",name:"",equipmentId:"bronze-full-helm",icon:"🎩",rarity:"common"}},
  heirlooms:[{id:"w1",slot:"weapon",name:"Ash Bow",icon:"🏹",rarity:"rare"}],
  storage:[{id:"w1",slot:"weapon",name:"Ash Bow",icon:"🏹",rarity:"rare"},{id:"h1",slot:"hat",name:"Road Hat",icon:"🎩",rarity:"common"}],
  storageUnlocked:true,storageCapacity:8,activeCapacity:2,storageMilestones:[{on:true,text:"Board 5"}]
};
let storageSyncs=0,characterLayout="modern";
ui.configure({
  getSlots:()=>["weapon","hat"],getSlotLabel:slot=>({weapon:"Weapon",hat:"Hat"})[slot],
  getRarityInfo:rarity=>({label:String(rarity||"unknown").toUpperCase()}),formatBonuses:item=>`+${item.slot==="weapon"?8:3} Attack`,getEquipmentIdentity:item=>item?.equipmentId==="bronze-full-helm"?{displayName:"Bronze Full Helm"}:null,
  getState:()=>state,getCharacterLayout:()=>characterLayout,getArtifactSet:()=>({count:2,tiers:[{pieces:2,text:"Damage"},{pieces:4,text:"Barrier"}]}),
  resolveEquipmentArt:item=>item?.id==="w1"?{image:"assets/equipment/weapon/ash-bow.png",alt:"Ash Bow art"}:null,
  itemSellValue:()=>42,syncStorage:()=>{storageSyncs++;},isHeirloomEligible:()=>true,confirm:async()=>true
});

const camp=ui.campView();
assert.equal(camp.owner,"ui/equipment-heirlooms");
assert.match(camp.heirloomHtml,/Ash Bow/);
assert.match(camp.setHtml,/2-piece bonus/);

const equipment=ui.renderEquipment();
assert.equal(equipment.equipped,2);
assert.equal(document.getElementById("equipmentGrid").children.length,2);
assert.match(document.getElementById("equipmentGrid").children[0].innerHTML,/db-equipment-slot-art/,"Character Gear paper doll must resolve semantic equipment art");
assert.match(document.getElementById("equipmentGrid").children[0].className,/character-gear-slot slot-weapon rare/,"occupied Character slot must carry slot identity and rarity frame class");
assert.ok(!document.getElementById("equipmentGrid").children[0].innerHTML.includes("db-rarity-name"),"occupied Character slot must not print the item name inside the WoW-style icon frame");
assert.ok(!document.getElementById("equipmentGrid").children[0].innerHTML.includes("slot-label"),"occupied Character slot must be image-only");
assert.match(document.getElementById("equipmentGrid").children[0].dataset.tip,/Ash Bow/,"Character gear must publish item identity through the shared root tooltip path");
assert.match(document.getElementById("equipmentGrid").children[0].dataset.tip,/\+8 Attack/,"Character gear tooltip must include authoritative item bonuses");
assert.match(document.getElementById("equipmentGrid").children[1].dataset.tip,/Bronze Full Helm/,"incomplete item records must fall back to semantic equipment identity");
assert.equal(document.getElementById("equipmentGrid").children[0].title,"","Modern gear must not rely on native title tooltips");
characterLayout="classic";
const classicEquipment=ui.renderEquipment();
assert.equal(classicEquipment.layout,"classic");
assert.match(document.getElementById("equipmentGrid").children[0].innerHTML,/slot-label/,"Classic layout must restore visible slot labels");
assert.match(document.getElementById("equipmentGrid").children[0].innerHTML,/db-rarity-name/,"Classic layout must restore named equipment rows");
assert.ok(!document.getElementById("equipmentGrid").children[0].className.includes("character-gear-slot"),"Classic equipment rows must not keep paper-doll slot layout");
characterLayout="modern";
ui.renderEquipment();
assert.match(document.getElementById("mythicSetStatus").innerHTML,/Impossible Road set/);

const loot=ui.renderLoot(state.equipment.weapon);
assert.equal(loot.owner,"ui/equipment-heirlooms");
assert.equal(loot.hasArt,true);
assert.match(document.getElementById("lootCard").innerHTML,/db-equipment-loot-art/,"loot card must resolve semantic equipment art");
assert.match(document.getElementById("lootCard").innerHTML,/Item seed: ash-1/,"seed presentation must survive the extraction");
assert.equal(document.getElementById("sellLootBtn").textContent,"Sell for 42 gold");

const storage=ui.renderCampStorage();
assert.equal(storage.unlocked,true);
assert.equal(storage.tab,"all");
assert.equal(storage.visible,2);
assert.match(document.getElementById("campHeirloomStorage").innerHTML,/vault-paper-doll/,"Camp Vault must show the active next-run paper doll");
assert.match(document.getElementById("campHeirloomStorage").innerHTML,/db-vault-slot-art/,"Vault occupied paper-doll slots must be image-first");
assert.ok(!document.getElementById("campHeirloomStorage").innerHTML.includes("db-rarity-name"),"Vault occupied paper-doll slots must not print item names inside icon frames");
assert.match(document.getElementById("campHeirloomStorage").innerHTML,/All <span>2<\/span>/,"Vault must expose the All inventory tab with a count");
assert.match(document.getElementById("campHeirloomStorage").innerHTML,/Weapons <span>1<\/span>/,"Vault must group Weapon and Offhand gear");
assert.match(document.getElementById("campHeirloomStorage").innerHTML,/Armour <span>1<\/span>/,"Vault must group armour slots");
assert.match(document.getElementById("campHeirloomStorage").innerHTML,/Accessories <span>0<\/span>/,"Vault must group accessory slots");
assert.equal(document.getElementById("campHeirloomStorage").storageGrid.children.length,2);
assert.match(document.getElementById("campHeirloomStorage").storageGrid.children[0].innerHTML,/db-equipment-card-art/,"Camp storage authored art must use bounded card sizing");
assert.ok(storageSyncs>0,"storage synchronization must remain a domain callback");

const end=ui.renderEndGear();
assert.equal(end.storage,true);
assert.equal(document.getElementById("endGearGrid").children.length,2);
assert.match(document.getElementById("endGearGrid").children[0].innerHTML,/db-equipment-card-art/,"end-of-run Heirloom choice art must use bounded card sizing");
assert.match(document.getElementById("endGearGrid").children[0].innerHTML,/db-rarity-name db-rarity-rare/,"end-of-run Heirloom item names must retain their rarity colour semantic class");
assert.ok(document.getElementById("endOverlay").modal.children.some(child=>child.id==="endStorageManager"),"end storage manager must remain owned by the UI module");
const endStorage=document.getElementById("endStorageManager");
assert.match(endStorage.endStorageGrid.children[0].innerHTML,/db-equipment-card-art/,"end storage manager art must use bounded card sizing");
assert.match(endStorage.endStorageGrid.children[0].innerHTML,/db-rarity-name db-rarity-rare/,"stored Heirloom item names must retain their rarity colour semantic class");
const ownerStyle=document.getElementById("dicebound-equipment-heirloom-ui-owner");
assert.match(ownerStyle.textContent,/\.db-equipment-card-art\{width:48px;height:48px;max-width:48px;max-height:48px;/,"Heirloom card art must have explicit maximum dimensions");
assert.match(ownerStyle.textContent,/\.db-rarity-rare\{color:#438bd8\}/,"Heirloom UI owner must own the rarity-name colour palette");
assert.match(ownerStyle.textContent,/\.vault-paper-doll\{/,"Heirloom UI owner must own the Vault paper-doll layout");
assert.match(ownerStyle.textContent,/\.vault-tab\.active\{/,"Heirloom UI owner must own Vault category-tab presentation");
assert.match(ownerStyle.textContent,/\.character-gear-grid\{/,"Equipment UI owner must own the in-run Character paper-doll layout");
assert.match(ownerStyle.textContent,/grid-template-columns:repeat\(4,minmax\(42px,1fr\)\).*grid-template-areas:"hat amulet ring offhand" "weapon chest legs boots"/s,"narrow Character Gear must use the compact two-row layout");
assert.match(ownerStyle.textContent,/\.character-gear-slot\.rare,.vault-paper-slot\.rare\{border-color:#65a9ff/,"Character and Vault paper dolls must share the rarity-frame language");
assert.ok(!source.includes("itemNameMarkup(item,'')"),"Heirloom/storage renderers must not fall back to unbounded semantic art");

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "function renderEquipment(){\n    beta043RefreshEquipmentArt?.();return dbEquipmentUi.renderEquipment();\n  }",
  "function openLoot(item,callback){if(!dbEquipmentPrepareLoot(item,callback))return;pendingLootItem=item;pendingLootCallback=callback;return dbEquipmentUi.renderLoot(item);}"
])assert.ok(monolith.includes(adapter),`missing thin equipment/Heirloom UI adapter: ${adapter}`);
assert.ok(monolith.includes("dbEquipmentUi.renderEndGear();"),"end-run gear rendering must route directly through the Equipment/Heirloom UI owner");
assert.ok(monolith.includes("formatBonuses,formatDetailBonuses:item=>formatBonuses(item)"),"Character detail must resolve the final live formatter without changing released loot/storage formatting");
assert.ok(monolith.includes("getEquipmentIdentity:item=>window.DiceboundEquipment?.identityForItem?.(item)"),"Equipment UI must receive semantic identity fallback from the canonical equipment owner");
assert.ok(!/function\s+renderEndGear\s*\(/.test(monolith),"retired renderEndGear call-only adapter returned to the monolith");
for(const retired of ["renderEquipment=function","renderEndGear=function","openLoot=function","renderEquipmentV110Base","renderEquipmentV23Base","renderEquipmentV24Base","v24RenderHeirloomStorage","v25RenderEndStorageManager","db06314RenderEquipmentBase","db06314OpenLootBase","dicebound-06314-equipment-identity-style"])assert.ok(!monolith.includes(retired),`retired equipment/Heirloom UI layer remains: ${retired}`);

console.log("Equipment/Heirloom UI owner PASS: semantic art, bounded card thumbnails, loot, Camp storage, end-run storage and direct owner routing");
