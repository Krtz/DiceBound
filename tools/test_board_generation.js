#!/usr/bin/env node
"use strict";

/* Deterministic contract checks for the extracted Board-generation owner. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/board/generation.js"),"utf8");
const window={window:null};window.window=window;
vm.runInNewContext(source,{window,console,Math},{filename:"runtime/js/board/generation.js"});
const generation=window.DiceboundBoardGeneration;
assert.ok(generation,"Board generation owner is not public");
assert.equal(generation.owner,"board/generation");
assert.doesNotMatch(source,/\bMath\.random\b/,"Board generation must use the injected RNG only");
assert.doesNotMatch(source,/function (buildBoard|startCombat|movePlayer|resolveTile|advanceToNextBoard)\b/,"Board generation must not absorb UI, combat, movement, dispatch, or transition ownership");

function rng(seed){
  let state=seed>>>0,draws=0;
  const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;draws+=1;return state/0x100000000;};
  return {
    random:next,
    rand:(min,max)=>min+Math.floor(next()*(max-min+1)),
    pick:values=>values[Math.floor(next()*values.length)],
    draws:()=>draws
  };
}
function digest(tiles){
  return tiles.map(tile=>({
    type:tile.type,
    pack:tile.packSize||1,
    enemy:tile.enemyBase?.name||null,
    enemies:(tile.enemyBases||[]).map(enemy=>enemy.name),
    devil:!!tile.enemyBase?.devilBoss
  }));
}
function scenario({boardLevel,seed=1,hellMode=false,devilPrimed=false,withSnapshot=false,tileCount=24}={}){
  const calls=[],random=rng(seed),pool=Array.from({length:20},(_,index)=>({name:`Enemy ${index}`,icon:`E${index}`,hp:10+index,attack:3+index,defenseBias:index%3,weakness:index%4===0?null:"fire"}));
  const boardDefs={
    1:{id:1,name:"Green Road",tiles:tileCount,minibossTile:12,minibossId:"mini-1",balance:{}},
    2:{id:2,name:"Astral Road",tiles:tileCount,minibossTile:12,minibossId:"mini-2",balance:{}},
    3:{id:3,name:"Fractured Road",tiles:tileCount,minibossTile:12,minibossId:"mini-3",balance:{}},
    4:{id:4,name:"Crown Road",tiles:tileCount,minibossTile:12,minibossId:"mini-4",balance:{}},
    5:{id:5,name:"Oblivion Ringroad",tiles:tileCount,minibossTile:12,minibossId:"mini-5",balance:{}},
    6:{id:6,name:"Sixth Road",tiles:tileCount,minibossTile:12,minibossId:"mini-6",balance:{threePackChance:.95}}
  };
  let result=null;
  generation.configure({
    getState:()=>({boardLevel,hellMode,devilPrimed}),
    getEnemyPool:()=>pool,
    getBoardDefinition:level=>boardDefs[level],
    enemyById:id=>({name:`Guardian ${id}`,icon:"G",hp:100,attack:10,weakness:"light"}),
    elementKeys:()=>["fire","ice","nature","light"],
    random:random.random,
    rand:random.rand,
    pick:random.pick,
    currentTileCount:()=>boardDefs[boardLevel].tiles,
    currentMinibossTile:()=>boardDefs[boardLevel].minibossTile,
    currentCampTiles:()=>[8],
    currentPowerupCount:()=>1,
    currentWheelCount:()=>1,
    merchantSpacing:()=>6,
    gameplayTalentRank:id=>id==="fortune_omens"?1:0,
    roadTileType:roll=>roll<.28?"enemy":roll<.48?"event":roll<.66?"treasure":roll<.78?"empty":roll<.88?"wheel":"powerup",
    withRunTalentSnapshot:work=>{calls.push(["snapshot",withSnapshot]);return work();},
    setRoad:road=>{calls.push(["setRoad",road.merchantFaceTotal]);result=road;}
  });
  generation.generate();
  return {calls,random,result,digest:digest(result.tiles)};
}

const board1=scenario({boardLevel:1,seed:11,withSnapshot:true});
assert.deepEqual(board1.calls,[['snapshot',true],['setRoad',3]],"generation must retain its run-talent snapshot boundary and then publish road state once");
assert.equal(board1.result.tiles[0].type,"start");
assert.equal(board1.result.tiles.at(-1).type,"boss");
assert.equal(board1.result.tiles[11].type,"miniboss");
for(const kind of ["blessing","mystic"])assert.ok(board1.result.tiles.slice(3,11).some(tile=>tile.type===kind),`Board 1 must retain an early ${kind} placement when one exists`);
assert.equal(board1.random.draws(),19,"Board 1 generator RNG cursor regression");

const board5=scenario({boardLevel:5,seed:27});
assert.equal(board5.result.tiles[11].enemyBase.name,"Guardian mini-5","Board 5 must retain its dedicated guardian identity");
assert.ok(board5.result.tiles.filter(tile=>tile.type==="enemy").every(tile=>tile.enemyBases.every(enemy=>enemy.name.startsWith("Ringbound "))),"Board 5 ordinary enemies must retain Ringbound generation identity");
assert.equal(board5.random.draws(),60,"Board 5 generator RNG cursor regression");

const board6=scenario({boardLevel:6,seed:41});
assert.equal(board6.result.tiles[11].enemyBase.name,"Guardian mini-6","Board 6 must retain its dedicated guardian identity");
assert.equal(board6.result.tiles.at(-1).type,"boss");
for(const [index,tile] of board6.result.tiles.entries())if(tile.type==="enemy"&&index>=11)assert.ok([2,3].includes(tile.packSize),"Board 6 post-miniboss enemies must remain two/three packs");
assert.equal(board6.random.draws(),18,"Board 6 generator RNG cursor regression");

const devil=scenario({boardLevel:2,seed:55,hellMode:true,devilPrimed:true});
const devilIndex=devil.result.tiles.findIndex(tile=>tile.type==="devilboss");
const devilLo=Math.max(11+10,Math.floor(devil.result.tiles.length*.62)),devilHi=Math.min(devil.result.tiles.length-3,Math.floor(devil.result.tiles.length*.82));
assert.equal(devilIndex,devil.result.tiles.length-3,"Pale Devil must retain its compact-road fallback placement contract");
assert.equal(devil.result.tiles[devilIndex].enemyBase.devilBoss,true,"Pale Devil tile must retain secret-boss identity");
assert.equal(devil.random.draws(),29,"Pale Devil placement must preserve its RNG cursor");

const devilFullRoad=scenario({boardLevel:2,seed:55,hellMode:true,devilPrimed:true,tileCount:100});
const devilFullIndex=devilFullRoad.result.tiles.findIndex(tile=>tile.type==="devilboss");
const devilFullLo=Math.max(11+10,Math.floor(devilFullRoad.result.tiles.length*.62)),devilFullHi=Math.min(devilFullRoad.result.tiles.length-3,Math.floor(devilFullRoad.result.tiles.length*.82));
assert.ok(devilFullIndex>=devilFullLo&&devilFullIndex<=devilFullHi,"Pale Devil must retain its Board 2 late-road candidate placement contract");

const noDevil=scenario({boardLevel:1,seed:55,hellMode:true,devilPrimed:true});
assert.equal(noDevil.result.tiles.some(tile=>tile.type==="devilboss"),false,"primed Hell runs must not retain the retired Board 1 Pale Devil placement");
assert.equal(noDevil.result.tiles[Math.min(34,noDevil.result.tiles.length-2)].type,"empty","primed Board 1 must retain the retired Devil chain's final empty-road result");

const boardOneBeforeCleanup=scenario({boardLevel:1,seed:77,hellMode:true,tileCount:100});
const boardOneAfterCleanup=scenario({boardLevel:1,seed:77,hellMode:true,devilPrimed:true,tileCount:100});
let clearedBoardOneIndex=boardOneBeforeCleanup.result.tiles.findIndex((tile,index)=>index>=28&&index<=42&&["enemy","event","treasure","empty"].includes(tile.type));
if(clearedBoardOneIndex<0)clearedBoardOneIndex=Math.min(34,boardOneBeforeCleanup.result.tiles.length-2);
const expectedBoardOneDigest=boardOneBeforeCleanup.digest.map((tile,index)=>index===clearedBoardOneIndex?{type:"empty",pack:1,enemy:null,enemies:[],devil:false}:tile);
assert.deepEqual(boardOneAfterCleanup.digest,expectedBoardOneDigest,"primed Board 1 must retain exactly the final published V24/V25 cleanup state");
assert.equal(boardOneAfterCleanup.random.draws(),boardOneBeforeCleanup.random.draws(),"Board 1 Devil cleanup must not consume RNG");

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "const dbBoardGeneration=window.DiceboundBoardGeneration?.configure({",
  "function enemyForPosition(index){return dbBoardGeneration.enemyForPosition(index);}",
  "function generateBoard(){return dbBoardGeneration.generate();}"
])assert.ok(monolith.includes(adapter),`missing Board-generation composition adapter: ${adapter}`);
for(const retired of [
  "function drawSpecialIndexes(",
  "function plannedPackSize(",
  "const generateBoardV15=generateBoard;",
  "const generateBoardV11=generateBoard;",
  "const generateBoardV12=generateBoard;",
  "const generateBoardV19Base=generateBoard;",
  "const v235GenerateBoardBase=generateBoard;",
  "const generateBoardV24Base=generateBoard;",
  "const generateBoardV25DevilBase=generateBoard;",
  "const db046GenerateBoardBase=generateBoard;",
  "const db047GenerateBoardBase=generateBoard;",
  "generateBoard=function"
])assert.ok(!monolith.includes(retired),`retired Board-generation chain remains: ${retired}`);

console.log("Board generation owner PASS: Board 1/5/6 construction, Pale Devil placement, exact fixture RNG cursors and retired-chain guards are deterministic");
