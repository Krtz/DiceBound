#!/usr/bin/env node
"use strict";

/* Deterministic ownership and ordering checks for Sixth-Road completion. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/run/completion.js"),"utf8");
const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");

assert.doesNotMatch(source,/\bMath\.random\b/,"terminal completion must not consume RNG");
assert.doesNotMatch(source,/function\s+(finalizeRun|dbRunRestore|openCombatLootChain|renderEndGear)\b/,"terminal completion must coordinate injected owners rather than absorb them");
for(const required of [
  "const OWNER='run/completion'",
  "function completeFinalRoad()",
  "runtime.clearCheckpoint?.();",
  "if(runtime.isCompleting?.())",
  "runtime.setRunState?.({gameStarted:false,rollLocked:true});",
  "const earned=Number(runtime.finalizeRun?.())||0;",
  "runtime.presentTerminalEnd?.(detail);",
  "if(first)runtime.recordFirstCompletion?.(detail);",
  "runtime.afterCompletion?.(detail);"
])assert.ok(source.includes(required),`run completion is missing required ownership behavior: ${required}`);

function createCompletion(){
  const window={};
  vm.runInNewContext(source,{window,console},{filename:"runtime/js/run/completion.js"});
  return window.DiceboundRunCompletion;
}

function scenario(mode="Normal"){
  const completion=createCompletion(),calls=[],state={completing:false,runFinalized:false,gameStarted:true,rollLocked:false,rngCursor:23,firstCompletions:0,presented:null};
  const call=value=>calls.push(value);
  completion.configure({
    clearCheckpoint:()=>call("checkpoint:clear"),
    isCompleting:()=>state.completing,
    beforeCompletion:()=>{call("completion:before");return {slimeRouge:true};},
    setCompleting:value=>{state.completing=!!value;call(`completion:lock:${value}`);},
    setRunState:next=>{Object.assign(state,next);call(`run:${next.gameStarted}/${next.rollLocked}`);},
    isRunFinalized:()=>state.runFinalized,
    finalizeRun:()=>{state.runFinalized=true;call("progression:finalize");return 91;},
    getCompletionContext:()=>({mode,level:12,gold:345,rolls:67,legacyAward:91,goldLegacyAward:34}),
    updateHud:()=>call("ui:hud"),
    presentTerminalEnd:detail=>{state.presented=detail;call("ui:end-with-gear");},
    recordFirstCompletion:()=>{state.firstCompletions+=1;call("progression:first-sixth-clear");},
    afterCompletion:detail=>{assert.equal(detail.before.slimeRouge,true);call("class:after-terminal");}
  });
  return {completion,calls,state};
}

for(const mode of ["Normal","Nightmare","Hell"]){
  const fixture=scenario(mode),result=fixture.completion.completeFinalRoad();
  assert.equal(result.completed,true);
  assert.equal(result.road,6);
  assert.equal(result.earned,91);
  assert.equal(result.context.mode,mode);
  assert.equal(fixture.state.gameStarted,false);
  assert.equal(fixture.state.rollLocked,true);
  assert.equal(fixture.state.rngCursor,23,`${mode} terminal completion must preserve the existing RNG cursor`);
  assert.deepEqual(fixture.calls,[
    "checkpoint:clear","completion:before","completion:lock:true","run:false/true",
    "progression:finalize","ui:hud","ui:end-with-gear","progression:first-sixth-clear","class:after-terminal"
  ],`${mode} terminal completion order changed`);
}

const duplicate=scenario();
const first=duplicate.completion.completeFinalRoad(),second=duplicate.completion.completeFinalRoad();
assert.equal(first.first,true);
assert.equal(second.duplicate,true,"a repeated terminal signal must be idempotent");
assert.equal(duplicate.calls.filter(call=>call==="checkpoint:clear").length,2,"duplicate terminal signals retain checkpoint-clear safety");
assert.equal(duplicate.calls.filter(call=>call==="progression:finalize").length,1,"terminal accounting must run exactly once");
assert.equal(duplicate.calls.filter(call=>call==="ui:end-with-gear").length,1,"terminal end gear presentation must run exactly once");
assert.equal(duplicate.state.firstCompletions,1,"sixth-clear accounting must run exactly once");

for(const required of [
  "const dbRunCompletion=window.DiceboundRunCompletion?.configure({",
  "completeFinalRoad:()=>dbRunCompletion.completeFinalRoad()",
  "function completeSixthRoadV19(){return dbRunCompletion.completeFinalRoad();}"
])assert.ok(monolith.includes(required),`dicebound.js is missing run-completion composition: ${required}`);
for(const retired of [
  "const showEndV15Patch=showEnd;",
  "function completeFifthRoadV16()",
  "v16FifthRoadCompleting",
  "const completeSixthRoadV28Base=completeSixthRoadV19;",
  "const dbRunCompleteFifthBase=completeFifthRoadV16;",
  "const dbRunCompleteSixthBase=completeSixthRoadV19;"
])assert.ok(!monolith.includes(retired),`retired terminal wrapper remains: ${retired}`);

const lateFinalStart=monolith.indexOf("async function v19ResolveLateFinal(");
const lateFinalEnd=monolith.indexOf("winCombat=async function(){",lateFinalStart);
assert.ok(lateFinalStart>=0&&lateFinalEnd>lateFinalStart,"late-final combat boundary is missing");
const lateFinal=monolith.slice(lateFinalStart,lateFinalEnd);
assert.match(lateFinal,/const finish=\(\)=>boardAtWin===6\?completeSixthRoadV19\(\):advanceToNextBoard\(\)/,"Board 5 must advance instead of terminally completing");
const rewardIndex=lateFinal.indexOf("grantXp(rewardXp);"),finishIndex=lateFinal.indexOf("const finish=()=>"),levelsIndex=lateFinal.indexOf("afterLevels=()=>"),lootIndex=lateFinal.indexOf("openCombatLootChain(defeated,afterLevels);");
assert.ok(rewardIndex>=0&&finishIndex>rewardIndex&&levelsIndex>finishIndex&&lootIndex>levelsIndex,"final reward, level-up and loot ordering changed before terminal completion");

const restoreStart=monolith.indexOf("function dbRunRestore(");
const restoreEnd=monolith.indexOf("function dbRunPanelText(",restoreStart);
assert.ok(restoreStart>=0&&restoreEnd>restoreStart,"checkpoint restore boundary is missing");
const restoreSource=monolith.slice(restoreStart,restoreEnd);
assert.doesNotMatch(restoreSource,/DiceboundRunCompletion|completeFinalRoad|completeSixthRoadV19|finalizeRun/,"checkpoint restore must not replay terminal completion");

console.log("Run completion owner PASS: Normal/Nightmare/Hell ordering, Board 5 continuation, Sixth-Road idempotence, loot/level sequencing, end gear handoff, checkpoint separation and RNG preservation are deterministic");
