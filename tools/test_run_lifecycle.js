#!/usr/bin/env node
"use strict";

/* Deterministic ownership and ordering checks for fresh-run orchestration. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/run/lifecycle.js"),"utf8");
const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");

assert.doesNotMatch(source,/\bMath\.random\b/,"Fresh-run lifecycle must use injected RNG-owning callbacks only");
assert.doesNotMatch(source,/function\s+(restore|resume)\b/,"Fresh-run lifecycle must not absorb checkpoint restore ownership");
assert.doesNotMatch(source,/function\s+(generateBoard|buildBoard|resetPlayer)\b/,"Fresh-run lifecycle must orchestrate existing owners rather than duplicate them");
for(const required of [
  "const OWNER='run/lifecycle'",
  "const FRESH_RUN_SURFACES=Object.freeze(",
  "function startFreshRun(options={})",
  "runtime.clearCheckpoint?.();runtime.seedNewRun?.();",
  "runtime.initializePlayer?.(runtime.selectedClassId?.()||'ranger');",
  "runtime.generateBoard?.();runtime.buildBoard?.();",
  "runtime.recordFreshRunStarted?.();runtime.updateHud?.();",
  "runtime.afterClassStart?.({wasRandom,chosen,context});runtime.scheduleCheckpoint?.();"
])assert.ok(source.includes(required),`run lifecycle is missing required ownership behavior: ${required}`);
for(const required of [
  "const dbRunLifecycle=window.DiceboundRunLifecycle?.configure({",
  "function startNewGame(){return dbRunLifecycle.startFreshRun();}",
  "dbRunLifecycle.startFreshRun({beforeFreshRun:()=>{"
])assert.ok(monolith.includes(required),`dicebound.js is missing run-lifecycle composition adapter: ${required}`);
for(const retired of [
  "const startNewGameV15=startNewGame;",
  "const startNewGameV16GuardReset=startNewGame;",
  "const startNewGameV19Base=startNewGame;",
  "const startNewGameV27Base=startNewGame;",
  "const startNewGameV28Base=startNewGame;",
  "const dbRunStartBase=startNewGame;",
  "startNewGame=function"
])assert.ok(!monolith.includes(retired),`retired fresh-run wrapper remains: ${retired}`);

function createLifecycle(){
  const window={};
  vm.runInNewContext(source,{window,console},{filename:"runtime/js/run/lifecycle.js"});
  return window.DiceboundRunLifecycle;
}

function scenario({randomMode=false,nightmareMode=false,hellMode=false,withBefore=false}={}){
  const lifecycle=createLifecycle(),calls=[],surfaces=[],state={selectedClassId:"ranger",classId:"ranger",className:"Ranger",nightmareMode,hellMode,gameStarted:false,rollLocked:true,combatBusy:true,rngCursor:0,talentSnapshot:null,petStartup:false,equipmentStartup:false};
  const call=value=>calls.push(value);
  lifecycle.configure({
    clearCheckpoint:()=>call("checkpoint:clear"),
    seedNewRun:()=>{state.rngCursor+=1;call("rng:seed");},
    beforeFreshRun:options=>options?.beforeFreshRun?.(),
    selectedClassId:()=>state.selectedClassId,
    isRandomClassMode:()=>{call("random:mode");return randomMode;},
    resolveRandomForRun:()=>{if(!randomMode)return null;state.rngCursor+=2;state.selectedClassId="rogue";state.classId="rogue";state.className="Rogue";call("random:resolve");return {id:"rogue",name:"Rogue",icon:"🗡️"};},
    prepareFreshRun:()=>call("run:prepare"),
    ensureAudio:()=>call("audio:ensure"),
    initializePlayer:id=>{state.rngCursor+=3;state.classId=id;state.className=id==="rogue"?"Rogue":"Ranger";state.talentSnapshot={legacy_heirloom:2};state.petStartup=true;state.equipmentStartup=true;call(`player:initialize:${id}`);},
    setBoardLevel:value=>call(`board:set:${value}`),
    applyRunTheme:()=>call("board:theme"),
    generateBoard:()=>{state.rngCursor+=4;call("board:generate");},
    buildBoard:()=>call("board:build"),
    setRunState:next=>{Object.assign(state,next);call(`state:${next.gameStarted}/${next.rollLocked}/${next.combatBusy}`);},
    clearLog:()=>call("ui:clear-log"),
    setDice:value=>call(`ui:dice:${value}`),
    hideSurface:id=>surfaces.push(id),
    getFreshContext:()=>({classId:state.classId,className:state.className,nightmareMode:state.nightmareMode}),
    log:message=>call(`log:${message}`),
    updateHud:()=>call("ui:hud"),
    schedulePawn:ms=>call(`ui:pawn:${ms}`),
    recordFreshRunStarted:()=>call("meta:run-started"),
    announceRandomClass:chosen=>call(`random:announce:${chosen.id}`),
    afterClassStart:detail=>call(`class:after:${detail.wasRandom}/${detail.chosen?.id||"none"}`),
    scheduleCheckpoint:()=>call("checkpoint:schedule")
  });
  const result=lifecycle.startFreshRun(withBefore?{beforeFreshRun:()=>call("camp:prepare")}:{ });
  return {lifecycle,calls,surfaces,state,result};
}

const normal=scenario();
assert.equal(normal.result.classId,"ranger");
assert.equal(normal.result.wasRandom,false);
assert.equal(normal.state.rngCursor,8,"ordinary fresh run must preserve its deterministic callback RNG cursor");
assert.deepEqual(normal.calls.slice(0,10),[
  "checkpoint:clear","rng:seed","random:mode","run:prepare","audio:ensure",
  "player:initialize:ranger","board:set:1","board:theme","board:generate","board:build"
],"ordinary fresh-run ownership ordering changed");
assert.equal(normal.calls.filter(call=>call==="ui:hud").length,2,"fresh start must preserve both published HUD refreshes");
assert.deepEqual(normal.surfaces,normal.lifecycle.inspect().freshRunSurfaces,"fresh start must clear exactly the owned presentation surface list");
assert.deepEqual(normal.state.talentSnapshot,{legacy_heirloom:2},"the injected player initializer must retain run-scoped Talent snapshot timing");
assert.equal(normal.state.petStartup,true,"the injected player initializer must retain pet startup mechanics");
assert.equal(normal.state.equipmentStartup,true,"the injected player initializer must retain starting-equipment mechanics");
assert.ok(normal.calls.indexOf("ui:pawn:60")<normal.calls.indexOf("meta:run-started"),"pawn scheduling must retain its base-start position before run accounting");
assert.equal(normal.calls.at(-1),"checkpoint:schedule","fresh start must schedule the checkpoint after all class-start hooks");
assert.match(normal.calls.find(call=>call.startsWith("log:")),/Ranger.*four-road adventure/);

const nightmare=scenario({nightmareMode:true,withBefore:true});
assert.equal(nightmare.calls.indexOf("camp:prepare"),2,"saved-run confirmation preparation must run after checkpoint/seed ownership and before class RNG");
assert.match(nightmare.calls.find(call=>call.startsWith("log:")),/Nightmare four-road adventure/);
assert.equal(nightmare.state.rngCursor,8,"Nightmare fresh start must retain the ordinary deterministic callback cursor");

const hell=scenario({hellMode:true});
assert.equal(hell.state.hellMode,true,"Hell mode must pass through the fresh-run coordinator unchanged");
assert.equal(hell.state.rngCursor,8,"Hell fresh start must retain the ordinary deterministic callback cursor");

const random=scenario({randomMode:true,nightmareMode:true});
assert.equal(random.result.classId,"rogue");
assert.equal(random.result.wasRandom,true);
assert.equal(random.state.rngCursor,10,"Random Class must consume its published RNG callbacks before Board generation");
assert.ok(random.calls.indexOf("random:resolve")<random.calls.indexOf("player:initialize:rogue"),"Random Class must resolve before player initialization");
assert.ok(random.calls.indexOf("random:announce:rogue")>random.calls.lastIndexOf("ui:hud"),"Random Class announcement must remain after the final HUD refresh");
assert.equal(random.calls.at(-2),"class:after:true/rogue","post-start class effects must remain after Random announcement");

const repeated=scenario();
repeated.lifecycle.startFreshRun();
assert.equal(repeated.calls.filter(call=>call==="checkpoint:clear").length,2,"each new run must independently replace the old checkpoint");
assert.equal(repeated.calls.filter(call=>call==="board:generate").length,2,"each new run must generate Board 1 exactly once");
assert.equal(repeated.calls.filter(call=>call==="checkpoint:schedule").length,2,"each new run must schedule one stable checkpoint");

const resumeStart=monolith.indexOf("function dbRunRestore(");
const resumeEnd=monolith.indexOf("function dbRunPanelText(",resumeStart);
assert.ok(resumeStart>=0&&resumeEnd>resumeStart,"live checkpoint restore boundary is missing");
const resumeSource=monolith.slice(resumeStart,resumeEnd);
assert.doesNotMatch(resumeSource,/dbRunLifecycle|startFreshRun|startNewGame|generateBoard|resetPlayer/,"checkpoint restore must not invoke fresh-run initialization or consume fresh-start RNG");

console.log("Run lifecycle owner PASS: fresh-run ordering, RNG cursor, Talent/class/pet/equipment hooks, Random/Nightmare/Hell, repeated starts and resume separation are deterministic");
