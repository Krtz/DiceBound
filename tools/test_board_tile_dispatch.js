#!/usr/bin/env node
"use strict";

/* Deterministic contract checks for the extracted board tile dispatcher. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/board/tile-dispatch.js"),"utf8");
const window={window:null};window.window=window;
vm.runInNewContext(source,{window,console,Math:{...Math,random(){throw new Error("tile dispatch must not draw RNG");}}},{filename:"runtime/js/board/tile-dispatch.js"});
const dispatch=window.DiceboundBoardTileDispatch;
assert.ok(dispatch,"Board tile-dispatch owner is not public");
assert.equal(dispatch.owner,"board/tile-dispatch");
assert.doesNotMatch(source,/\bMath\.random\b/,"tile dispatch must not add RNG draws");
assert.doesNotMatch(source,/function (startCombat|openEvent|openMerchant|openTreasure|openWheelEvent)\b/,"destination implementations must remain outside tile dispatch");

function scenario(tile,{merchantBossPrimed=false,merchantBossDefeatedThisBoard=false,throwDestination=null}={}){
  const calls=[];
  const road={player:{position:0},tiles:tile===null?[]:[tile],boardLevel:3,merchantBossPrimed,merchantBossDefeatedThisBoard};
  const destination=name=>{
    if(throwDestination===name)throw new Error(`${name} failed`);
    calls.push(["destination",name]);
    return name;
  };
  dispatch.configure({
    getRoad:()=>road,
    setRollLocked:value=>calls.push(["rollLocked",value]),
    setCombatBusy:value=>calls.push(["combatBusy",value]),
    refreshTile:index=>calls.push(["refreshTile",index]),
    updateHud:()=>calls.push(["hud"]),
    log:text=>calls.push(["log",text]),
    toast:text=>calls.push(["toast",text]),
    returnToRoad:()=>destination("returnToRoad"),
    startCombat:kind=>destination(`combat:${kind}`),
    openEvent:()=>destination("event"),
    openWheelEvent:()=>destination("wheel"),
    openFreePowerup:()=>destination("powerup"),
    openTreasure:()=>destination("treasure"),
    useCamp:()=>destination("camp"),
    openMerchant:()=>destination("merchant"),
    openBlessing:()=>destination("blessing"),
    openMystic:()=>destination("mystic"),
    openBloodwell:()=>destination("bloodwell"),
    openGambler:()=>destination("gambler"),
    clearDevilPrimed:()=>calls.push(["clearDevilPrimed"]),
    logDiagnostic:(level,category,message,data)=>calls.push(["diagnostic",level,category,message,data]),
    debugState:()=>({board:road.boardLevel,position:road.player.position}),
    trace:(name,work)=>{calls.push(["trace",name]);return work();}
  });
  return {calls,road,run:()=>dispatch.dispatch()};
}

function destinations(calls){return calls.filter(call=>call[0]==="destination").map(call=>call[1]);}
function exactRoute(type,expected,options){
  const run=scenario({type,cleared:false},options);run.run();
  assert.deepEqual(destinations(run.calls),[expected],`${type} must select exactly one existing destination`);
  assert.deepEqual(run.calls.filter(call=>call[0]==="trace").map(call=>call[1]),["resolveTile"],`${type} must retain its command trace`);
}

exactRoute("enemy","combat:normal");
exactRoute("miniboss","combat:miniboss");
exactRoute("boss","combat:final");
exactRoute("event","event");
exactRoute("wheel","wheel");
exactRoute("powerup","powerup");
exactRoute("treasure","treasure");
exactRoute("camp","camp");
exactRoute("merchant","merchant");
exactRoute("merchant","combat:merchant",{merchantBossPrimed:true});
exactRoute("blessing","blessing");
exactRoute("mystic","mystic");
exactRoute("bloodwell","bloodwell");
exactRoute("gambler","gambler");

const devil=scenario({type:"devilboss",cleared:false});devil.run();
assert.deepEqual(destinations(devil.calls),["combat:devil"],"Pale Devil tile must select the Devil combat destination");
assert.ok(devil.calls.some(call=>call[0]==="clearDevilPrimed"),"Pale Devil route must clear the ritual flag before combat");

for(const tile of [{type:"empty",cleared:false},{type:"start",cleared:false},{type:"enemy",cleared:true}]){
  const quiet=scenario(tile);quiet.run();
  assert.deepEqual(destinations(quiet.calls),["returnToRoad"],"quiet tiles must return to the existing road continuation");
  assert.ok(quiet.calls.some(call=>call[0]==="log"&&call[1]==="The road is quiet. For now."),"quiet tiles must retain their road log");
}

const missing=scenario(null);missing.run();
assert.deepEqual(destinations(missing.calls),[],"missing tile must not invent a destination");
assert.ok(missing.calls.some(call=>call[0]==="rollLocked"&&call[1]===false),"missing tile must unlock rolling");
assert.ok(missing.calls.some(call=>call[0]==="hud"),"missing tile must refresh the HUD");

const corrupt=scenario({type:"definitely-corrupt",cleared:false});corrupt.run();
assert.equal(corrupt.road.tiles[0].type,"empty","unknown tiles must be repaired to empty");
assert.equal(corrupt.road.tiles[0].cleared,true,"unknown tiles must be marked cleared");
assert.deepEqual(destinations(corrupt.calls),[],"unknown tiles must not route to a destination");
assert.equal(corrupt.calls.filter(call=>call[0]==="trace").length,0,"unknown-tile recovery must preserve its pre-trace safety behavior");
assert.ok(corrupt.calls.some(call=>call[0]==="diagnostic"&&call[3].startsWith("Unknown tile type:")),"unknown tiles must retain diagnostic evidence");

const failure=scenario({type:"event",cleared:false},{throwDestination:"event"});failure.run();
assert.ok(failure.calls.some(call=>call[0]==="diagnostic"&&call[3]==="resolveTile threw"),"destination failures must retain road-recovery diagnostics");
assert.ok(failure.calls.some(call=>call[0]==="rollLocked"&&call[1]===false),"destination failures must unlock rolling");
assert.ok(failure.calls.some(call=>call[0]==="combatBusy"&&call[1]===false),"destination failures must clear combat busy state");

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "const dbBoardTileDispatch=window.DiceboundBoardTileDispatch?.configure({",
  "dispatchTile:()=>dbBoardTileDispatch.dispatch()",
  "dbBoardTileDispatch.dispatch()"
])assert.ok(monolith.includes(adapter),`missing board tile-dispatch composition adapter: ${adapter}`);
for(const retired of [
  "function resolveTile(",
  "const resolveTileV24Base=resolveTile;",
  "const resolveTileV25SafetyBase=resolveTile;",
  "else if(name==='resolveTile')resolveTile=wrapped;"
])assert.ok(!monolith.includes(retired),`retired tile-dispatch chain remains: ${retired}`);

console.log("Board tile-dispatch owner PASS: routes, safety recovery, command tracing and destination boundaries are deterministic");
