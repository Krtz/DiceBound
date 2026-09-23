"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime","js","dicebound.js"),"utf8");
const campSource=fs.readFileSync(path.join(root,"runtime","js","ui","camp.js"),"utf8");
const achievementSource=fs.readFileSync(path.join(root,"runtime","js","progression","achievements.js"),"utf8");
const start=source.indexOf("  function db0633TrophyTierForAchievementCount(");
const end=source.indexOf("  const db0633GrantLegacyXpBase=",start);
assert.ok(start>=0&&end>start,"Camp progression composition block is missing");
const implementation=source.slice(start,end);

class FakeNode{
  constructor(nodes,id=""){
    this.nodes=nodes;this._id="";this.children=[];this.parentElement=null;this.dataset={};this.events={};this.type="";this.className="";this.innerHTML="";this.title="";this.id=id;
  }
  get id(){return this._id;}
  set id(value){if(this._id)delete this.nodes[this._id];this._id=String(value||"");if(this._id)this.nodes[this._id]=this;}
  register(){if(this._id)this.nodes[this._id]=this;}
  appendChild(child){child.remove();child.parentElement=this;child.register();this.children.push(child);return child;}
  insertBefore(child,reference){child.remove();child.parentElement=this;child.register();const index=reference?this.children.indexOf(reference):-1;this.children.splice(index<0?this.children.length:index,0,child);return child;}
  after(child){const parent=this.parentElement;if(!parent)return;child.remove();child.parentElement=parent;child.register();const index=parent.children.indexOf(this);parent.children.splice(index+1,0,child);}
  remove(){if(this.parentElement){const index=this.parentElement.children.indexOf(this);if(index>=0)this.parentElement.children.splice(index,1);this.parentElement=null;}if(this._id)delete this.nodes[this._id];}
  addEventListener(type,listener){(this.events[type]??=[]).push(listener);}
  setAttribute(name,value){this[name]=String(value);}
}

const nodes={};
const scene=new FakeNode(nodes,"campScene");
const ground=new FakeNode(nodes),stars=new FakeNode(nodes),info=new FakeNode(nodes,"campInfoBtn");
scene.querySelector=selector=>selector===".camp-ground"?ground:selector===".camp-sky .camp-stars"?stars:null;
stars.appendChild(info);
ground.appendChild(new FakeNode(nodes,"campAchievementBtn"));
stars.insertBefore(new FakeNode(nodes,"campTalentBtn"),info);
info.after(new FakeNode(nodes,"campMoonBtn"));

const document={createElement:()=>new FakeNode(nodes),getElementById:id=>nodes[id]||null,querySelectorAll:()=>[]};
const progressionCalls=[];let achievementCount=0;
const context=vm.createContext({
  Math,Number,Object,JSON,Array,String,
  meta:{campReveals:{}},document,innerWidth:0,innerHeight:0,
  $:id=>nodes[id]||null,
  dbProgression:{
    achievementCount:()=>achievementCount,
    prestigeOffer:total=>{progressionCalls.push(total);return 9000+Number(total);}
  }
});
context.window=context;
vm.runInContext(achievementSource,context,{filename:"progression/achievements.js"});
vm.runInContext(campSource,context,{filename:"ui/camp.js"});
context.window.DiceboundCamp.configure({find:id=>nodes[id]||null,actions:{}});
vm.runInContext(`${implementation}\nthis.campApi={trophy:db0633TrophyTierForAchievementCount,prestige:db0633PrestigeOfferPoints,reconcile:db0633ReconcileCampRevealState,sync:db0633SyncCampObjects,current:db0633CurrentCampRevealState};`,context,{filename:"camp-progression-composition"});
const api=context.campApi;
const tiers=JSON.parse(JSON.stringify(context.window.DiceboundAchievements.campTrophyTiers));

assert.deepEqual(tiers,[
  {id:"tier-1",minimumAchievementCount:2,assetKey:"achievementTier1"},
  {id:"tier-2",minimumAchievementCount:10,assetKey:"achievementTier2"},
  {id:"tier-3",minimumAchievementCount:20,assetKey:"achievementTier3"},
  {id:"tier-4",minimumAchievementCount:30,assetKey:"achievementTier4"},
  {id:"tier-5",minimumAchievementCount:40,assetKey:"achievementTier5"},
  {id:"tier-6",minimumAchievementCount:50,assetKey:"achievementTier6"}
],"Achievement domain must own the six Camp trophy tiers");
for(const [count,id] of [[0,null],[1,null],[2,"tier-1"],[9,"tier-1"],[10,"tier-2"],[19,"tier-2"],[20,"tier-3"],[30,"tier-4"],[40,"tier-5"],[50,"tier-6"],[999,"tier-6"]]){
  assert.equal(api.trophy(count)?.id||null,id,`wrong trophy tier at ${count} achievements`);
}

const fresh={achievementCount:0,legacyLevel:1,legacyLevelGained:false,prestigeCount:0,prestigeOfferPoints:0};
assert.deepEqual(JSON.parse(JSON.stringify(api.reconcile({},fresh))),{achievementTrophy:false,talentStar:false,prestigeMoon:false});
assert.equal(api.reconcile({achievementTrophy:true},{...fresh,achievementCount:0}).achievementTrophy,false,"stale persisted Trophy reveal must not override current achievement count");
assert.equal(api.reconcile({}, {...fresh,achievementCount:2}).achievementTrophy,true,"second achievement must reveal Trophy");
assert.equal(api.reconcile({}, {...fresh,legacyLevelGained:true}).talentStar,true);
assert.equal(api.reconcile({}, {...fresh,prestigeOfferPoints:1}).prestigeMoon,true);
assert.equal(api.prestige(8),9008);assert.equal(api.prestige(9),9009);assert.deepEqual(progressionCalls,[8,9]);

const sticky=api.reconcile({achievementTrophy:true,talentStar:true,prestigeMoon:true},fresh);
assert.deepEqual(JSON.parse(JSON.stringify(sticky)),{achievementTrophy:false,talentStar:true,prestigeMoon:true},"only Talent/Prestige reveals are permanent; Trophy follows current count");

context.meta.campReveals={achievementTrophy:true,talentStar:false,prestigeMoon:false};
achievementCount=0;api.sync();
assert.equal(nodes.campAchievementBtn,undefined,"0 achievements must physically remove stale Trophy DOM");
achievementCount=1;api.sync();
assert.equal(nodes.campAchievementBtn,undefined,"1 achievement must keep Trophy absent");
achievementCount=2;api.sync();
assert.ok(nodes.campAchievementBtn,"2 achievements must recreate Trophy");
assert.equal(nodes.campAchievementBtn.parentElement,ground);
assert.equal(nodes.campAchievementBtn.type,"button");
assert.equal(nodes.campAchievementBtn.events.click.length,1);
assert.equal(nodes.campAchievementBtn["aria-label"],"Achievements");

assert.match(campSource,/syncProgressionReveals/);
assert.match(campSource,/find\(entry\.id\)\?\.remove\(\)/,"hidden Camp objects must be physically removed");
assert.doesNotMatch(source,/DB0633_CAMP_TROPHY_TIERS/,"composition root must not own Trophy-tier policy");
assert.match(source,/campTrophyTierForCount/,"composition root must delegate Trophy policy to DiceboundAchievements");
assert.match(source,/delete meta\.campReveals\.achievementTrophy/,"stale persisted Trophy reveal must be cleaned at the composition boundary");
console.log("Camp progression reveals PASS: canonical six-tier Achievement policy, non-sticky Trophy reveal and absent locked DOM");
