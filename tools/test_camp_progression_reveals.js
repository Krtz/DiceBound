"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const source=fs.readFileSync(path.join(__dirname,"..","runtime","js","dicebound.js"),"utf8");
const start=source.indexOf("  const DB0633_CAMP_TROPHY_TIERS=");
const end=source.indexOf("  const db0633GrantLegacyXpBase=",start);
assert.ok(start>=0&&end>start,"#109 Camp progression implementation block is missing");
const implementation=source.slice(start,end);

class FakeNode{
  constructor(nodes,id=""){
    this.nodes=nodes;this._id="";this.children=[];this.parentElement=null;this.dataset={};this.events={};this.type="";this.className="";this.innerHTML="";this.id=id;
  }
  get id(){return this._id;}
  set id(value){
    if(this._id)delete this.nodes[this._id];
    this._id=String(value||"");if(this._id)this.nodes[this._id]=this;
  }
  register(){if(this._id)this.nodes[this._id]=this;}
  appendChild(child){child.remove();child.parentElement=this;child.register();this.children.push(child);return child;}
  insertBefore(child,reference){
    child.remove();child.parentElement=this;child.register();const index=reference?this.children.indexOf(reference):-1;
    this.children.splice(index<0?this.children.length:index,0,child);return child;
  }
  after(child){
    const parent=this.parentElement;if(!parent)return;
    child.remove();child.parentElement=parent;child.register();const index=parent.children.indexOf(this);parent.children.splice(index+1,0,child);
  }
  remove(){
    if(this.parentElement){const index=this.parentElement.children.indexOf(this);if(index>=0)this.parentElement.children.splice(index,1);this.parentElement=null;}
    if(this._id)delete this.nodes[this._id];
  }
  addEventListener(type,listener){(this.events[type]??=[]).push(listener);}
}

const nodes={};
const scene=new FakeNode(nodes,"campScene");
const ground=new FakeNode(nodes),stars=new FakeNode(nodes),info=new FakeNode(nodes,"campInfoBtn");
scene.querySelector=selector=>selector===".camp-ground"?ground:selector===".camp-sky .camp-stars"?stars:null;
stars.appendChild(info);
ground.appendChild(new FakeNode(nodes,"campAchievementBtn"));
stars.insertBefore(new FakeNode(nodes,"campTalentBtn"),info);
info.after(new FakeNode(nodes,"campMoonBtn"));

const context=vm.createContext({
  Math,Number,Object,
  meta:{campReveals:{}},
  window:{},
  $:id=>nodes[id]||null,
  document:{createElement:()=>new FakeNode(nodes)}
});
vm.runInContext(`${implementation}\nthis.campApi={tiers:DB0633_CAMP_TROPHY_TIERS,trophy:db0633TrophyTierForAchievementCount,prestige:db0633PrestigeOfferPoints,reconcile:db0633ReconcileCampRevealState,sync:db0633SyncCampObjects};`,context,{filename:"#109-camp-progression"});
const api=context.campApi;

assert.deepEqual(JSON.parse(JSON.stringify(api.tiers)),[{id:"current-trophy",minimumAchievementCount:2}],"Trophy tiers must expose the stable count-based future-art seam");
assert.equal(api.trophy(0),null);
assert.equal(api.trophy(1),null);
assert.equal(api.trophy(2).id,"current-trophy");
assert.equal(api.trophy(10).id,"current-trophy");

const fresh={achievementCount:0,legacyLevel:1,legacyLevelGained:false,prestigeCount:0,prestigeOfferPoints:0};
assert.deepEqual(JSON.parse(JSON.stringify(api.reconcile({},fresh))),{achievementTrophy:false,talentStar:false,prestigeMoon:false},"fresh career must not reveal Camp objects");
assert.equal(api.reconcile({}, {...fresh,achievementCount:1}).achievementTrophy,false,"one achievement must not reveal the Trophy");
assert.equal(api.reconcile({}, {...fresh,achievementCount:2}).achievementTrophy,true,"the second achievement must reveal the Trophy");
assert.equal(api.reconcile({}, {...fresh,legacyLevelGained:true}).talentStar,true,"the first actually-earned Legacy level must reveal the Star");
assert.equal(api.reconcile({}, {...fresh,legacyLevel:2}).talentStar,true,"advanced saves above fresh Legacy level must reconcile the Star");
assert.equal(api.reconcile({}, {...fresh,prestigeOfferPoints:0}).prestigeMoon,false,"no Prestige offer must keep the Moon hidden");
assert.equal(api.reconcile({}, {...fresh,prestigeOfferPoints:1}).prestigeMoon,true,"a one-point Prestige offer must reveal the Moon");
assert.equal(api.reconcile({}, {...fresh,prestigeCount:1}).talentStar,true,"a previously Prestiged save must reconcile the Star");
assert.equal(api.reconcile({}, {...fresh,prestigeCount:1}).prestigeMoon,true,"a previously Prestiged save must reconcile the Moon");
assert.equal(api.prestige(8),0);
assert.equal(api.prestige(9),1);

const permanent=api.reconcile({achievementTrophy:true,talentStar:true,prestigeMoon:true},fresh);
assert.deepEqual(JSON.parse(JSON.stringify(permanent)),{achievementTrophy:true,talentStar:true,prestigeMoon:true},"Camp reveals must never regress");

api.sync();
for(const id of ["campAchievementBtn","campTalentBtn","campMoonBtn"])assert.equal(nodes[id],undefined,`${id} must be removed rather than left as a hidden click/focus target`);
context.meta.campReveals={achievementTrophy:true,talentStar:true,prestigeMoon:true};
api.sync();
for(const id of ["campAchievementBtn","campTalentBtn","campMoonBtn"]){
  assert.ok(nodes[id],`${id} must be recreated after its permanent reveal`);
  assert.equal(nodes[id].type,"button");
  assert.equal(nodes[id].events.click.length,1,`${id} must retain an explicit click binding when recreated`);
}
assert.equal(nodes.campAchievementBtn.parentElement,ground,"Trophy position must remain in the Camp ground grid");
assert.equal(stars.children[0].id,"campTalentBtn","Star position must remain before Info");
assert.equal(stars.children[2].id,"campMoonBtn","Moon position must remain after Info");

assert.match(source,/DB0633_CAMP_OBJECT_IDS/);
assert.match(source,/\$\(id\)\?\.remove\(\)/,"hidden Camp objects must be physically removed from the DOM");
assert.match(source,/db0633PrestigeOfferPoints\(total\)/,"the live Prestige completion path must use the shared authoritative offer helper");
console.log("Camp progression reveals pass: thresholds, permanence, advanced-save reconciliation and absent hidden DOM controls");
