#!/usr/bin/env node
"use strict";

/* Deterministic contract checks for the extracted board movement owner. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/board/movement.js"),"utf8");
const window={window:null};window.window=window;
vm.runInNewContext(source,{window,console},{filename:"runtime/js/board/movement.js"});
const movement=window.DiceboundBoardMovement;
assert.ok(movement,"Board movement owner is not public");
assert.equal(movement.owner,"board/movement");
assert.doesNotMatch(source,/\bMath\.random\b/,"movement orchestration must not add its own RNG draws");

function makeRuntime(road,{loadedSixes=false,modifier=value=>value}={}){
  const calls=[];let moved=0;
  return {
    calls,
    runtime:{
      getRoad:()=>road,
      currentTileCount:()=>road.tiles.length,
      currentMinibossTile:()=>road.minibossTile,
      incrementTilesMoved:()=>++moved,
      emit:(name,payload)=>{calls.push(["event",name,payload]);return payload;},
      hasEffect:id=>loadedSixes&&id==="loaded_sixes",
      clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
      modifiedGold:modifier,
      grantXp:value=>{calls.push(["xp",value]);return {applied:value};},
      log:text=>calls.push(["log",text]),
      toast:text=>calls.push(["toast",text]),
      playStep:()=>calls.push(["step-sfx"]),
      refreshBoardHighlights:()=>calls.push(["highlights"]),
      placePawn:hop=>calls.push(["pawn",hop]),
      updateHud:()=>calls.push(["hud"]),
      delay:async ms=>calls.push(["delay",ms]),
      resolveTile:()=>calls.push(["resolve"])
    },
    tilesMoved:()=>moved
  };
}

(async()=>{
  const devilTiles=Array.from({length:12},()=>({type:"empty",cleared:false}));
  devilTiles[5]={type:"devilboss",cleared:false};
  const devilRoad={player:{position:1,fastTravelBonus:2,loadedSix:true,loadedSixBonusXp:30,loadedSixUltimate:30,loadedSixGold:25,ultimateCharge:80,gold:0},tiles:devilTiles,boardLevel:2,hellMode:true,devilPrimed:true,minibossTile:10};
  const devil=makeRuntime(devilRoad,{loadedSixes:true,modifier:value=>value+7});
  movement.configure(devil.runtime);
  await movement.move(6,6,false,false);
  assert.equal(devilRoad.player.position,5,"Loaded Sixes must resolve before the Pale Devil interception");
  assert.equal(devil.tilesMoved(),4,"only the intercepted movement distance may advance the run counter");
  assert.equal(devilRoad.player.ultimateCharge,100,"Loaded Road Ultimate gain must retain its existing clamp");
  assert.equal(devilRoad.player.gold,32,"Loaded Road gold must still use the authoritative Gold modifier once");
  assert.deepEqual(devil.calls.filter(call=>call[0]==="xp").map(call=>call[1]),[30,15],"Loaded Road XP then normal travel XP ordering must be exact");
  assert.deepEqual(devil.calls.filter(call=>call[0]==="delay").map(call=>call[1]),[180,180,180,180,150],"step and tile-handoff timing must be preserved");
  const completion=devil.calls.find(call=>call[0]==="event"&&call[1]==="board:move-complete")[2];
  assert.deepEqual(JSON.parse(JSON.stringify(completion)),{domain:"board",type:"move-complete",start:1,steps:4,naturalRoll:6,originalDestination:5,destination:5,intercepted:false,actualSteps:4,fastTravelXp:11,travelXp:15,chosen:false,extraStep:false},"final movement payload must preserve post-interception values and ordering");
  assert.ok(devil.calls.some(call=>call[0]==="resolve"),"movement must hand off exactly once to the existing tile dispatcher");

  const guardianTiles=Array.from({length:12},()=>({type:"empty",cleared:false}));
  guardianTiles[6]={type:"miniboss",cleared:false,enemyBase:{name:"Regression Guardian"}};
  const guardianRoad={player:{position:2,fastTravelBonus:0,loadedSix:false,ultimateCharge:0,gold:0},tiles:guardianTiles,boardLevel:1,hellMode:false,devilPrimed:false,minibossTile:7};
  const guardian=makeRuntime(guardianRoad);
  movement.configure(guardian.runtime);
  const plan=movement.planMove(6,3);
  assert.deepEqual(JSON.parse(JSON.stringify(plan)),{domain:"board",type:"move-plan",start:2,steps:6,naturalRoll:3,originalDestination:8,destination:6,intercepted:true,actualSteps:4},"midpoint guardian interception must retain the legacy plan exactly");
  await movement.move(6,3,false,true);
  assert.equal(guardianRoad.player.position,6,"guardian interception must stop on the midpoint tile");
  assert.ok(guardian.calls.some(call=>call[0]==="toast"&&call[1]==="👑 Miniboss intercept!"),"guardian interception must preserve its player-facing toast");
  assert.deepEqual(guardian.calls.filter(call=>call[0]==="xp").map(call=>call[1]),[4],"intercepted movement must award only the actual travelled distance");
  console.log("Board movement owner PASS: movement ordering, interception, XP and tile handoff are deterministic");
})().catch(error=>{console.error(error);process.exitCode=1;});

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "const dbBoardMovement=window.DiceboundBoardMovement?.configure({",
  "board:dbBoardMovement.state",
  "await dbBoardMovement.move("
])assert.ok(monolith.includes(adapter),`missing board-movement composition adapter: ${adapter}`);
for(const retired of [
  "const BoardState=Object.freeze({",
  "const BoardUI=Object.freeze({",
  "async function movePlayer(",
  "const movePlayerV25LoadedBase=movePlayer;",
  "const movePlayerV26DevilBase=movePlayer;",
  "const db060MovePlayerBase=movePlayer;"
])assert.ok(!monolith.includes(retired),`retired board movement chain remains: ${retired}`);
