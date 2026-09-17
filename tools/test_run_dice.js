#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const SOURCE=fs.readFileSync(path.join(__dirname,"..","runtime","js","run","dice.js"),"utf8");
const FACES=["⚀","⚁","⚂","⚃","⚄","⚅"];

function tick(){return new Promise(resolve=>setImmediate(resolve));}
function classList(){
  const values=new Set();
  return {add:(...names)=>names.forEach(name=>values.add(name)),remove:(...names)=>names.forEach(name=>values.delete(name)),contains:name=>values.has(name),values};
}
function harness(options={}){
  const die={textContent:"⚀",classList:classList()};
  const player={diceChoiceChance:0,extraStepChance:0,maxHp:100,hp:100,ultimateCharge:0,...options.player};
  const meta={doubleDiceUnlocked:true,debugAlwaysChooseRolls:false,...options.meta};
  const calls={delays:[],moves:[],toasts:[],logs:[],rand:[],random:0,picks:0,rollSounds:0,updates:0,increments:0};
  let rollLocked=false;
  const randValues=[...(options.randValues||[2,5])];
  const randomValues=[...(options.randomValues||[.99])];
  const window={};
  const context=vm.createContext({window,console,Math,Object,Promise});
  vm.runInContext(SOURCE,context,{filename:"runtime/js/run/dice.js"});
  const api=window.DiceboundRunDice;
  api.configure({
    getMeta:()=>meta,
    getPlayer:()=>player,
    isRollLocked:()=>rollLocked,
    setRollLocked:value=>{rollLocked=!!value;},
    isGameStarted:()=>true,
    ensureAudio:()=>{},
    updateHud:()=>{calls.updates++;},
    find:id=>id==="dice"?die:null,
    diceFaces:()=>FACES,
    pick:faces=>{calls.picks++;return faces[(calls.picks-1)%faces.length];},
    rollSound:()=>{calls.rollSounds++;},
    delay:async ms=>{calls.delays.push(ms);},
    rand:(min,max)=>{const value=randValues.shift();calls.rand.push([min,max,value]);return value;},
    random:()=>{calls.random++;return randomValues.length?randomValues.shift():.99;},
    chooseDieResult:options.chooseDieResult||(()=>Promise.resolve(1)),
    showToast:text=>{calls.toasts.push(text);},
    clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
    incrementRolls:()=>{calls.increments++;},
    hasMythicPiece:()=>!!options.mythicBoots,
    addLog:text=>{calls.logs.push(text);},
    move:async (...args)=>{calls.moves.push(args);if(options.move)await options.move(...args);rollLocked=false;}
  });
  return {api,die,player,meta,calls,isRollLocked:()=>rollLocked};
}

(async()=>{
  {
    const h=harness({randValues:[2,5],randomValues:[.99]});
    await h.api.roll();
    assert.deepEqual(h.calls.delays,[45,50,55,60,65,70,75,80,85,90]);
    assert.equal(h.calls.picks,20,"2d6 presentation must preserve two face picks per animation frame");
    assert.equal(h.calls.rollSounds,10);
    assert.deepEqual(h.calls.rand,[[1,6,2],[1,6,5]]);
    assert.equal(h.calls.random,1,"ordinary 2d6 must preserve the one Long Stride draw when Fate chance is zero");
    assert.deepEqual(h.calls.moves,[[7,7,false,false]]);
    assert.equal(h.calls.increments,1);
    assert.equal(h.die.textContent,"⚁ + ⚄");
    assert.equal(h.die.classList.contains("rolling"),false);
    assert.equal(h.isRollLocked(),false);
  }

  {
    const h=harness({player:{extraStepChance:.25},randValues:[3,4],randomValues:[.10]});
    await h.api.roll();
    assert.deepEqual(h.calls.moves,[[8,7,true,false]],"Long Stride must still add exactly one movement tile without changing the rolled total");
    assert.match(h.calls.logs[0],/Long Stride adds/);
  }

  {
    const choiceResolvers=[];
    const h=harness({
      player:{diceChoiceChance:1},
      randValues:[1,1],
      randomValues:[0],
      chooseDieResult:()=>new Promise(resolve=>choiceResolvers.push(resolve))
    });
    const pending=h.api.roll();
    await tick();
    assert.equal(choiceResolvers.length,1,"Fate must request the first d6 choice");
    assert.equal(h.die.classList.contains("rolling"),false,"2d6 animation must stop before waiting on Fate choice 1");
    assert.equal(h.isRollLocked(),true,"road stays locked while Fate choice is pending");
    choiceResolvers[0](6);
    await tick();
    assert.equal(choiceResolvers.length,2,"Fate must request the second d6 choice");
    assert.equal(h.die.classList.contains("rolling"),false,"2d6 animation must stay stopped while waiting on Fate choice 2");
    choiceResolvers[1](4);
    await pending;
    assert.equal(h.calls.random,1,"chosen Fate must not consume a Long Stride draw");
    assert.deepEqual(h.calls.moves,[[10,10,false,true]]);
    assert.equal(h.die.textContent,"⚅ + ⚃");
    assert.match(h.calls.toasts.at(-1),/6\+4=10/);
  }

  {
    const h=harness({player:{hp:50,maxHp:100,ultimateCharge:95},randValues:[5,2],randomValues:[.99],mythicBoots:true});
    await h.api.roll();
    assert.equal(h.player.hp,55,"Titanstep must preserve 5% max-HP healing");
    assert.equal(h.player.ultimateCharge,100,"Titanstep ultimate gain must remain capped at 100");
    assert.deepEqual(h.calls.moves,[[7,7,false,false]]);
    assert.ok(h.calls.toasts.includes("🥾 Titanstep!"));
  }

  {
    const h=harness({
      player:{diceChoiceChance:1},
      randValues:[2,2],
      randomValues:[0],
      chooseDieResult:()=>Promise.reject(new Error("chooser failed"))
    });
    await assert.rejects(h.api.roll(),/chooser failed/);
    assert.equal(h.die.classList.contains("rolling"),false,"failed pre-movement resolution must always clear rolling presentation");
    assert.equal(h.isRollLocked(),false,"failed pre-movement resolution must release the road lock");
    assert.equal(h.calls.moves.length,0);
    assert.match(h.calls.toasts.at(-1),/Double Dice roll interrupted/);
  }

  assert.doesNotMatch(SOURCE,/await chooseDice\([^;]+;chosen=true[^]*?classList\.remove\("rolling"\)/,"rolling cleanup must not move back behind the Fate await");
  console.log("Run Dice owner PASS: ordinary 2d6, Long Stride, two-step Fate, Titanstep and pre-movement recovery are deterministic");
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
