#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const SOURCE=fs.readFileSync(path.join(__dirname,"..","runtime","js","run","dice.js"),"utf8");
const MONOLITH=fs.readFileSync(path.join(__dirname,"..","runtime","js","dicebound.js"),"utf8");

function tick(){return new Promise(resolve=>setImmediate(resolve));}
function classList(){const set=new Set();return {add:(...v)=>v.forEach(x=>set.add(x)),remove:(...v)=>v.forEach(x=>set.delete(x)),contains:x=>set.has(x)};}
function element(id=""){return {id,textContent:"",innerHTML:"",disabled:false,style:{},dataset:{},className:"",classList:classList(),children:[],listeners:{},parentElement:{insertBefore(){}},appendChild(child){this.children.push(child);},addEventListener(type,fn){this.listeners[type]=fn;},click(){this.listeners.click?.({});}};}
function harness(options={}){
  const nodes={dice:element("dice"),rollBtn:element("rollBtn"),diceChoiceGrid:element("diceChoiceGrid"),diceChoiceOverlay:element("diceChoiceOverlay")};nodes.diceChoiceOverlay.classList.add("hidden");
  const player={diceChoiceChance:0,extraStepChance:0,maxHp:100,hp:100,ultimateCharge:0,...options.player};
  const meta={doubleDiceUnlocked:true,debugAlwaysChooseRolls:false,...options.meta};
  const calls={delays:[],moves:[],toasts:[],logs:[],rand:[],random:0,picks:0,sounds:0,updates:0,increments:0,resume:0,traces:[]};let locked=false;
  const randValues=[...(options.randValues||[2,5])],randomValues=[...(options.randomValues||[.99,.99])];
  const document={createElement:()=>element()};const window={};const context=vm.createContext({window,console,Math,Object,Promise});vm.runInContext(SOURCE,context,{filename:"runtime/js/run/dice.js"});const api=window.DiceboundRunDice;
  api.configure({getDocument:()=>document,find:id=>nodes[id]||null,getMeta:()=>meta,getPlayer:()=>player,isRollLocked:()=>locked,setRollLocked:v=>{locked=!!v;},isGameStarted:()=>true,hasCurrentEnemy:()=>false,ensureAudio:()=>{},resumeAudio:()=>{calls.resume++;},updateHud:()=>{calls.updates++;},pick:list=>{calls.picks++;return list[(calls.picks-1)%list.length];},rollSound:()=>{calls.sounds++;},delay:async ms=>{calls.delays.push(ms);},rand:(a,b)=>{const v=randValues.shift();calls.rand.push([a,b,v]);return v;},random:()=>{calls.random++;return randomValues.length?randomValues.shift():.99;},showToast:t=>calls.toasts.push(t),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),incrementRolls:()=>{calls.increments++;},hasMythicPiece:()=>!!options.mythicBoots,addLog:t=>calls.logs.push(t),move:async(...args)=>{calls.moves.push(args);locked=false;},traceCommand:(name,fn)=>{calls.traces.push(name);return fn();}});
  return {api,nodes,player,meta,calls,locked:()=>locked};
}
async function clickChoice(h,value){await tick();const b=h.nodes.diceChoiceGrid.children[value-1];assert.ok(b,`missing Fate choice ${value}`);b.click();}

(async()=>{
  {const h=harness({randValues:[4],randomValues:[.99]});await h.api.rollOne();assert.deepEqual(h.calls.delays,[55,61,67,73,79,85,91,97,103,109,115]);assert.equal(h.calls.picks,11);assert.deepEqual(h.calls.rand,[[1,6,4]]);assert.equal(h.calls.random,1);assert.deepEqual(h.calls.moves,[[4,4,false,false]]);assert.equal(h.calls.increments,1);assert.equal(h.calls.resume,1);assert.equal(h.nodes.dice.textContent,"⚃");assert.deepEqual(h.calls.traces,["rollDice"]);}
  {const h=harness({player:{extraStepChance:.25},randValues:[3],randomValues:[.10]});await h.api.rollOne();assert.deepEqual(h.calls.moves,[[4,3,true,false]]);assert.match(h.calls.logs[0],/Long Stride adds/);}
  {const h=harness({meta:{debugAlwaysChooseRolls:true},randValues:[6]});const pending=h.api.rollOne();await clickChoice(h,5);await pending;assert.equal(h.calls.rand.length,0,"debug 1d6 must preserve the released no-preliminary-RNG contract");assert.equal(h.calls.random,0);assert.equal(h.calls.resume,0);assert.deepEqual(h.calls.moves,[[5,5,false,true]]);assert.match(h.calls.logs[0],/Debug fate chooses/);}
  {const h=harness({meta:{debugAlwaysChooseRolls:true},player:{hp:50,maxHp:100,ultimateCharge:95},mythicBoots:true});const pending=h.api.rollOne();await clickChoice(h,6);await pending;assert.equal(h.player.hp,50,"debug-chosen 1d6 must preserve the released no-Titanstep behavior");assert.equal(h.player.ultimateCharge,95);assert.equal(h.calls.toasts.includes("🥾 Titanstep!"),false);}
  {const h=harness({player:{diceChoiceChance:1},randValues:[2],randomValues:[0]});const pending=h.api.rollOne();await tick();assert.equal(h.nodes.dice.classList.contains("rolling"),false);await clickChoice(h,6);await pending;assert.deepEqual(h.calls.moves,[[6,6,false,true]]);assert.equal(h.calls.random,1,"chosen 1d6 Fate must not draw Long Stride RNG");}
  {const h=harness({randValues:[2,5],randomValues:[.99]});await h.api.rollTwo();assert.deepEqual(h.calls.delays,[45,50,55,60,65,70,75,80,85,90]);assert.equal(h.calls.picks,20);assert.deepEqual(h.calls.rand,[[1,6,2],[1,6,5]]);assert.equal(h.calls.random,1);assert.deepEqual(h.calls.moves,[[7,7,false,false]]);assert.equal(h.calls.increments,1);assert.equal(h.nodes.dice.textContent,"⚁ + ⚄");assert.deepEqual(h.calls.traces,["rollTwoDice"]);}
  {const h=harness({player:{extraStepChance:.25},randValues:[3,4],randomValues:[.10]});await h.api.rollTwo();assert.deepEqual(h.calls.moves,[[8,7,true,false]]);}
  {const h=harness({player:{diceChoiceChance:1},randValues:[1,1],randomValues:[0]});const pending=h.api.rollTwo();await tick();assert.equal(h.nodes.dice.classList.contains("rolling"),false);await clickChoice(h,6);await clickChoice(h,4);await pending;assert.equal(h.calls.random,1);assert.deepEqual(h.calls.moves,[[10,10,false,true]]);assert.equal(h.nodes.dice.textContent,"⚅ + ⚃");}
  {const h=harness({player:{hp:50,maxHp:100,ultimateCharge:95},randValues:[5,2],randomValues:[.99],mythicBoots:true});await h.api.rollTwo();assert.equal(h.player.hp,55);assert.equal(h.player.ultimateCharge,100);assert.ok(h.calls.toasts.includes("🥾 Titanstep!"));}
  {const h=harness({randValues:[2,2],randomValues:[.99]});h.api.configure({delay:async()=>{throw new Error("animation failed");}});await assert.rejects(h.api.rollTwo(),/animation failed/);assert.equal(h.nodes.dice.classList.contains("rolling"),false);assert.equal(h.locked(),false);assert.equal(h.calls.moves.length,0);}
  assert.doesNotMatch(SOURCE,/call\("random"\)\(\)/,"injected RNG result must never be invoked as a function");
  for(const pattern of [/function\s+rollDice\s*\(/,/function\s+chooseDieResult\s*\(/,/pendingDiceChoiceResolve/,/const\s+diceFaces\s*=/,/addEventListener\(\"click\",rollDice\)/,/\{rollDice,applyUpgrade/])assert.doesNotMatch(MONOLITH,pattern,`road-dice implementation returned to dicebound.js: ${pattern}`);
  assert.match(MONOLITH,/dbRunDice\.bindPrimaryButton\(\)/,"composition must bind the canonical primary dice owner");
  assert.match(MONOLITH,/handleRoadKeydown:event=>dbRunDice\.handleRoadKeydown\(event\)/,"app input routing must delegate Road Dice keys to the canonical dice owner");
  assert.doesNotMatch(MONOLITH,/window\.addEventListener\("keydown",e=>dbRunDice\.handleRoadKeydown\(e\)\)/,"raw global Road Dice listener must stay drained from the composition root");
  const configuredAt=MONOLITH.indexOf("dbRunDice.configure({"),firstBootstrapHud=MONOLITH.indexOf('dbRun.generateBoard();buildBoard();window.DiceboundClassChooser.render();renderEquipment();updateHUD();updateMetaUI();');
  assert.ok(configuredAt>=0&&firstBootstrapHud>=0&&configuredAt<firstBootstrapHud,"Run Dice must be configured before the first bootstrap HUD refresh");
  assert.equal((MONOLITH.match(/dbRunDice\.configure\(\{/g)||[]).length,1,"Run Dice must have exactly one composition/configuration boundary");
  assert.equal((MONOLITH.match(/dbRunDice\.ensureButton\(\)/g)||[]).length,1,"road-dice button initialization must have one canonical composition call");
  console.log("Run Dice owner PASS: canonical 1d6 + 2d6, Fate, Long Stride, Titanstep, tracing and failure recovery");
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
