#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.join(__dirname,"..");
const SOURCE=fs.readFileSync(path.join(ROOT,"runtime","js","ui","input-router.js"),"utf8");

function classes(...initial){const set=new Set(initial);return {contains:value=>set.has(value),add:value=>set.add(value),remove:value=>set.delete(value)};}
function node({id="",tagName="BUTTON",hidden=false,disabled=false,parentElement=null,ariaHidden=null,editable=false}={}){
  return {id,tagName,hidden,disabled,parentElement,isContentEditable:editable,classList:classes(),clicks:0,
    getAttribute(name){return name==="aria-hidden"?ariaHidden:null;},
    click(){this.clicks++;},
    closest(selector){
      if(selector.includes("input")&&["INPUT","TEXTAREA","SELECT"].includes(String(this.tagName).toUpperCase()))return this;
      if(selector.includes("[contenteditable")&&this.isContentEditable)return this;
      if(selector.includes('[role="textbox"]')&&this.role==="textbox")return this;
      return null;
    }
  };
}
function event(key,target=null,{repeat=false,defaultPrevented=false}={}){
  return {key,target,repeat,defaultPrevented,prevented:0,stopped:0,
    preventDefault(){this.prevented++;this.defaultPrevented=true;},
    stopPropagation(){this.stopped++;}
  };
}
function harness(){
  const controls=[],overlays=[],listeners={};let optionsOpened=0,roadCalls=0;
  const document={querySelectorAll(selector){if(selector==="[data-app-dismiss]")return controls;if(selector===".overlay")return overlays;return [];}};
  const window={document,addEventListener(type,fn){listeners[type]=fn;}};
  const context=vm.createContext({window,console,Object});vm.runInContext(SOURCE,context,{filename:"runtime/js/ui/input-router.js"});
  const api=window.DiceboundInputRouter;
  api.configure({getDocument:()=>document,getWindow:()=>window,openOptions:()=>{optionsOpened++;return true;},handleRoadKeydown:e=>{roadCalls++;e.preventDefault();return true;}});
  return {api,controls,overlays,listeners,optionsOpened:()=>optionsOpened,roadCalls:()=>roadCalls};
}

{
  const h=harness(),input=node({tagName:"INPUT"}),e=event(" ",input);
  assert.equal(h.api.handleKeydown(e),false);
  assert.equal(h.roadCalls(),0);
}
{
  const h=harness(),editable=node({tagName:"DIV",editable:true}),e=event("Escape",editable);
  assert.equal(h.api.handleKeydown(e),false);
  assert.equal(h.optionsOpened(),0);
}
{
  const h=harness(),base=node({id:"startOverlay",tagName:"DIV"});h.overlays.push(base);
  const e=event(" ",null,{repeat:true});assert.equal(h.api.handleKeydown(e),true);assert.equal(h.roadCalls(),0);assert.equal(e.prevented,1);
}
{
  const h=harness(),base=node({id:"startOverlay",tagName:"DIV"});h.overlays.push(base);
  const e=event(" ");assert.equal(h.api.handleKeydown(e),true);assert.equal(h.roadCalls(),1);
}
{
  const h=harness(),modal=node({id:"mysticOverlay",tagName:"DIV"});h.overlays.push(modal);
  const e=event(" ");assert.equal(h.api.handleKeydown(e),false);assert.equal(h.roadCalls(),0);
}
{
  const h=harness(),hiddenParent=node({tagName:"DIV"});hiddenParent.classList.add("hidden");
  const hidden=node({parentElement:hiddenParent}),visible=node();h.controls.push(hidden,visible);
  const e=event("Escape");assert.equal(h.api.handleKeydown(e),true);assert.equal(hidden.clicks,0);assert.equal(visible.clicks,1);assert.equal(h.optionsOpened(),0);
}
{
  const h=harness(),modal=node({id:"lootOverlay",tagName:"DIV"});h.overlays.push(modal);
  const e=event("Escape");assert.equal(h.api.handleKeydown(e),true);assert.equal(h.optionsOpened(),0,"Escape must not open Options underneath gameplay choices");assert.equal(e.prevented,1);
}
{
  const h=harness(),base=node({id:"startOverlay",tagName:"DIV"});h.overlays.push(base);
  const e=event("Escape");assert.equal(h.api.handleKeydown(e),true);assert.equal(h.optionsOpened(),1);
}
{
  const h=harness();h.api.bind();h.api.bind();assert.equal(typeof h.listeners.keydown,"function","router must bind one global keydown owner");
}

const monolith=fs.readFileSync(path.join(ROOT,"runtime","js","dicebound.js"),"utf8");
assert.match(monolith,/const dbInputRouter=window\.DiceboundInputRouter/);
assert.match(monolith,/dbInputRouter\.configure\(/);
assert.match(monolith,/dbInputRouter\.bind\(\)/);
assert.doesNotMatch(monolith,/window\.addEventListener\("keydown",e=>dbRunDice\.handleRoadKeydown\(e\)\)/,"raw Road Dice global key listener must stay drained from dicebound.js");

for(const [file,pattern] of [
  ["ui/options.js",/data-options-done[^>]*data-app-dismiss|data-app-dismiss[^>]*data-options-done/],
  ["ui/class-chooser.js",/data-class-chooser-done[^>]*data-app-dismiss|data-app-dismiss[^>]*data-class-chooser-done/],
  ["ui/pet-chooser.js",/data-pet-chooser-done[^>]*data-app-dismiss|data-app-dismiss[^>]*data-pet-chooser-done/],
  ["ui/talent-tree.js",/data-talent-done[^>]*data-app-dismiss|data-app-dismiss[^>]*data-talent-done/],
  ["ui/prestige-moon.js",/data-prestige-back[^>]*data-app-dismiss|data-app-dismiss[^>]*data-prestige-back/],
  ["ui/info-guide.js",/data-info-done[^>]*data-app-dismiss|data-app-dismiss[^>]*data-info-done/],
  ["ui/achievements.js",/data-achievements-done[^>]*data-app-dismiss|data-app-dismiss[^>]*data-achievements-done/],
  ["ui/career.js",/data-career-done[^>]*data-app-dismiss|data-app-dismiss[^>]*data-career-done/],
  ["ui/camp.js",/data-close-camp-panel[^>]*data-app-dismiss|data-app-dismiss[^>]*data-close-camp-panel/]
]){
  const src=fs.readFileSync(path.join(ROOT,"runtime","js",file),"utf8");
  assert.match(src,pattern,file+" must expose the shared dismissal contract");
}
const html=fs.readFileSync(path.join(ROOT,"runtime","index.html"),"utf8");
for(const id of ["merchantContinueBtn","buffCloseBtn","debugCloseBtn"]){
  const re=new RegExp('<button[^>]*id="'+id+'"[^>]*data-app-dismiss|<button[^>]*data-app-dismiss[^>]*id="'+id+'"');
  assert.match(html,re,id+" must participate in the shared dismissal contract");
}
assert.match(html,/legacy-dismiss-chrome/,"legacy dismissible overlays must use persistent top-right chrome");
const css=fs.readFileSync(path.join(ROOT,"runtime","css","dicebound.css"),"utf8");
assert.match(css,/\.legacy-dismiss-chrome\{position:sticky;top:0/,"legacy dismissal chrome must remain visible while modal bodies scroll");

console.log("Input router PASS: editing safety, repeat suppression, semantic Escape dismissal, modal priority and Road Dice delegation");
