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
      tagName:tag.toUpperCase(),id:"",className:"",title:"",textContent:"",hidden:false,children:[],classList:classList(),
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
  equipment:{weapon:{id:"w1",slot:"weapon",name:"Ash Bow",icon:"🏹",rarity:"rare",seedCode:"ash-1"},hat:{id:"h1",slot:"hat",name:"Road Hat",icon:"🎩",rarity:"common"}},
  heirlooms:[{id:"w1",slot:"weapon",name:"Ash Bow",icon:"🏹",rarity:"rare"}],
  storage:[{id:"w1",slot:"weapon",name:"Ash Bow",icon:"🏹",rarity:"rare"},{id:"h1",slot:"hat",name:"Road Hat",icon:"🎩",rarity:"common"}],
  storageUnlocked:true,storageCapacity:8,activeCapacity:2,storageMilestones:[{on:true,text:"Board 5"}]
};
let storageSyncs=0;
ui.configure({
  getSlots:()=>["weapon","hat"],getSlotLabel:slot=>({weapon:"Weapon",hat:"Hat"})[slot],
  getRarityInfo:rarity=>({label:String(rarity||"unknown").toUpperCase()}),formatBonuses:item=>`+${item.slot==="weapon"?8:3} Attack`,
  getState:()=>state,getArtifactSet:()=>({count:2,tiers:[{pieces:2,text:"Damage"},{pieces:4,text:"Barrier"}]}),
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
assert.match(document.getElementById("equipmentGrid").children[0].innerHTML,/db-equipment-slot-art/,"HUD must resolve semantic equipment art");
assert.match(document.getElementById("mythicSetStatus").innerHTML,/Impossible Road set/);

const loot=ui.renderLoot(state.equipment.weapon);
assert.equal(loot.owner,"ui/equipment-heirlooms");
assert.equal(loot.hasArt,true);
assert.match(document.getElementById("lootCard").innerHTML,/db-equipment-loot-art/,"loot card must resolve semantic equipment art");
assert.match(document.getElementById("lootCard").innerHTML,/Item seed: ash-1/,"seed presentation must survive the extraction");
assert.equal(document.getElementById("sellLootBtn").textContent,"Sell for 42 gold");

const storage=ui.renderCampStorage();
assert.equal(storage.unlocked,true);
assert.equal(document.getElementById("campHeirloomStorage").storageGrid.children.length,2);
assert.ok(storageSyncs>0,"storage synchronization must remain a domain callback");

const end=ui.renderEndGear();
assert.equal(end.storage,true);
assert.equal(document.getElementById("endGearGrid").children.length,2);
assert.ok(document.getElementById("endOverlay").modal.children.some(child=>child.id==="endStorageManager"),"end storage manager must remain owned by the UI module");

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "function renderEquipment(){\n    beta043RefreshEquipmentArt?.();return dbEquipmentUi.renderEquipment();\n  }",
  "function renderEndGear(){\n    return dbEquipmentUi.renderEndGear();\n  }",
  "function openLoot(item,callback){if(!dbEquipmentPrepareLoot(item,callback))return;pendingLootItem=item;pendingLootCallback=callback;return dbEquipmentUi.renderLoot(item);}"
])assert.ok(monolith.includes(adapter),`missing thin equipment/Heirloom UI adapter: ${adapter}`);
for(const retired of ["renderEquipment=function","renderEndGear=function","openLoot=function","renderEquipmentV110Base","renderEquipmentV23Base","renderEquipmentV24Base","v24RenderHeirloomStorage","v25RenderEndStorageManager","db06314RenderEquipmentBase","db06314OpenLootBase","dicebound-06314-equipment-identity-style"])assert.ok(!monolith.includes(retired),`retired equipment/Heirloom UI layer remains: ${retired}`);

console.log("Equipment/Heirloom UI owner PASS: semantic art, loot, Camp storage, end-run storage and monolith drain guards");
