#!/usr/bin/env node
"use strict";

/* #322: the public Board + Run facade must delegate without owning gameplay. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/run/facade.js"),"utf8");

assert.doesNotMatch(source,/\bMath\.random\b/,"Run facade must not own RNG");
assert.doesNotMatch(source,/\bplayer\s*=|\bboardLevel\s*=|\btiles\s*=/,"Run facade must not own gameplay state");
for(const owner of [
  "DiceboundBoards","DiceboundBoardMovement","DiceboundBoardTileDispatch","DiceboundBoardGeneration",
  "DiceboundBoardTransition","DiceboundPlayerInitialization","DiceboundRunLifecycle","DiceboundRunCompletion"
])assert.ok(source.includes(owner),`Run facade is missing internal owner ${owner}`);

const calls=[];
const call=(name,...args)=>{calls.push([name,...args]);return `${name}:result`;};
const boardState={owner:"movement-state"};
const fakeWindow={
  DiceboundBoards:{owner:"board/registry",createRegistry:(...args)=>call("boards.createRegistry",...args)},
  DiceboundBoardMovement:{owner:"board/movement",state:boardState,configure:x=>call("movement.configure",x),move:(...args)=>call("movement.move",...args),planMove:(...args)=>call("movement.planMove",...args)},
  DiceboundBoardTileDispatch:{owner:"board/tile-dispatch",configure:x=>call("dispatch.configure",x),dispatch:(...args)=>call("dispatch.dispatch",...args)},
  DiceboundBoardGeneration:{owner:"board/generation",configure:x=>call("generation.configure",x),generate:(...args)=>call("generation.generate",...args),activateFinalRules:(...args)=>call("generation.activateFinalRules",...args),enemyForPosition:(...args)=>call("generation.enemyForPosition",...args)},
  DiceboundBoardTransition:{owner:"board/transition",configure:x=>call("transition.configure",x),advance:(...args)=>call("transition.advance",...args)},
  DiceboundPlayerInitialization:{owner:"run/player-initialization",configure:(...args)=>{call("player.configure",...args);return {initialize:(...initArgs)=>call("player.initialize",...initArgs)};}},
  DiceboundRunLifecycle:{owner:"run/lifecycle",configure:x=>call("lifecycle.configure",x),startFreshRun:(...args)=>call("lifecycle.startFreshRun",...args)},
  DiceboundRunCompletion:{owner:"run/completion",configure:x=>call("completion.configure",x),completeFinalRoad:(...args)=>call("completion.completeFinalRoad",...args)}
};
vm.runInNewContext(source,{window:fakeWindow,console},{filename:"runtime/js/run/facade.js"});
const run=fakeWindow.DiceboundRun;

assert.ok(Object.isFrozen(run),"Run facade should be frozen");
assert.strictEqual(run.apiVersion,1);
assert.strictEqual(run.owner,"run");
assert.strictEqual(run.boardState,boardState,"Run facade should expose the authoritative movement diagnostic state");
assert.strictEqual(run.inspect().playerInitializationConfigured,false);
assert.deepStrictEqual(JSON.parse(JSON.stringify(run.inspect().internalOwners)),{
  boards:"board/registry",movement:"board/movement",tileDispatch:"board/tile-dispatch",generation:"board/generation",
  transition:"board/transition",playerInitialization:"run/player-initialization",lifecycle:"run/lifecycle",completion:"run/completion"
});
assert.throws(()=>run.initializePlayer("ranger"),/player initialization is not configured/,
  "initializePlayer should fail fast before configuration");

const parts={movement:{m:1},tileDispatch:{d:1},generation:{g:1},transition:{t:1},lifecycle:{l:1},completion:{c:1}};
assert.strictEqual(run.configure(parts),run,"configure should preserve fluent facade identity");
assert.strictEqual(run.createBoardRegistry(),"boards.createRegistry:result");
assert.strictEqual(run.configurePlayerInitialization({p:1}),run,"player initialization configuration should preserve facade identity");
assert.strictEqual(run.inspect().playerInitializationConfigured,true);
assert.strictEqual(run.initializePlayer("ranger"),"player.initialize:result");
assert.strictEqual(run.move(6,6,false),"movement.move:result");
assert.strictEqual(run.planMove(4,4),"movement.planMove:result");
assert.strictEqual(run.dispatchTile(),"dispatch.dispatch:result");
assert.strictEqual(run.generateBoard(),"generation.generate:result");
assert.strictEqual(run.activateFinalBoardRules(),"generation.activateFinalRules:result");
assert.strictEqual(run.enemyForPosition(12),"generation.enemyForPosition:result");
assert.strictEqual(run.advanceBoard(),"transition.advance:result");
assert.strictEqual(run.startFreshRun({source:"test"}),"lifecycle.startFreshRun:result");
assert.strictEqual(run.completeFinalRoad(),"completion.completeFinalRoad:result");

assert.deepStrictEqual(calls.map(entry=>entry[0]),[
  "movement.configure","dispatch.configure","generation.configure","transition.configure","lifecycle.configure","completion.configure",
  "boards.createRegistry","player.configure","player.initialize","movement.move","movement.planMove","dispatch.dispatch","generation.generate",
  "generation.activateFinalRules","generation.enemyForPosition","transition.advance","lifecycle.startFreshRun","completion.completeFinalRoad"
]);

const missing={...fakeWindow};delete missing.DiceboundBoardMovement;delete missing.DiceboundRun;
assert.throws(()=>vm.runInNewContext(source,{window:missing,console}),/DiceboundRun requires DiceboundBoardMovement/,
  "Facade should fail fast when an internal owner is missing from load order");

console.log("Run facade delegation tests passed.");
