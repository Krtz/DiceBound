"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");

const calls=[];
let renderedVisit=null;
const transaction={
  createVisit(items){const v={items,active:false};renderedVisit=v;calls.push("tx:create");return v;},
  beginVisit(previous,items){calls.push("tx:begin");return renderedVisit&&renderedVisit.items===items?renderedVisit:{items,active:false};},
  ownsOffers(visit,items){return !!visit&&visit.items===items;},
  hasActiveChoice(visit){return !!visit?.active;},
  snapshot(visit){return visit?{active:visit.active,count:visit.items.length}:null;}
};
const stockController={catalog:()=>["catalog"],price:base=>base+1,makeGear:()=>({id:"gear"}),buildStock:()=>{calls.push("stock:build");return {items:[{id:"offer"}],title:"T",subtitle:"S"};}};
const stockOwner={createController(services){assert.equal(typeof services.random,"function");calls.push("stock:configure");return stockController;}};
const uiOwner={createController(services){calls.push("ui:configure");return {render(){calls.push("ui:render");services.getVisit();return true;}};}};
global.window={DiceboundMerchantStock:stockOwner,DiceboundMerchantTransaction:transaction,DiceboundMerchantUi:uiOwner};
require(path.resolve("runtime/js/events/merchant-facade.js"));
const merchant=window.DiceboundMerchant;
let items=[],notice="old",title="",subtitle="",visible=false;
merchant.configure({
  stock:{random:()=>.5},
  state:{getItems:()=>items,setItems:v=>{items=v;calls.push("state:items");},getNotice:()=>notice,setNotice:v=>{notice=v;calls.push("state:notice");},setTitle:v=>{title=v;calls.push("state:title");},setSubtitle:v=>{subtitle=v;calls.push("state:subtitle");},setVisible:v=>{visible=v;calls.push("state:visible");}},
  ui:{$:()=>({})}
});
assert.equal(merchant.owner,"merchant/facade");
assert.deepEqual(merchant.catalog(),["catalog"]);assert.equal(merchant.price(4),5);assert.deepEqual(merchant.makeGear(),{id:"gear"});
const before=calls.length;assert.equal(merchant.open(),undefined);
assert.deepEqual(calls.slice(before),["stock:build","state:items","state:notice","state:title","state:subtitle","state:visible","ui:render","tx:create","tx:begin"]);
assert.equal(notice,"");assert.equal(title,"T");assert.equal(subtitle,"S");assert.equal(visible,true);assert.equal(items.length,1);
assert.deepEqual(merchant.testing.snapshotVisit(),{active:false,count:1});
renderedVisit.active=true;const blockedCount=calls.length;assert.equal(merchant.open(),false);assert.equal(calls.length,blockedCount,"active Legendary choice must block stock rebuild");
const inspected=merchant.inspect();assert.equal(inspected.configured.stock,true);assert.equal(inspected.configured.ui,true);assert.equal(inspected.owner,"merchant/facade");
console.log("Merchant facade ownership tests passed");
