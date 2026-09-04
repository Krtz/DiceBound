#!/usr/bin/env node
"use strict";

/* Deterministic contract checks for the extracted board-transition owner. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/board/transition.js"),"utf8");
const window={window:null};window.window=window;
const safeMath=Object.create(Math);safeMath.random=()=>{throw new Error("board transition must not draw RNG");};
vm.runInNewContext(source,{window,console,Math:safeMath},{filename:"runtime/js/board/transition.js"});
const transition=window.DiceboundBoardTransition;
assert.ok(transition,"Board transition owner is not public");
assert.equal(transition.owner,"board/transition");
assert.doesNotMatch(source,/\bMath\.random\b/,"board transition must not add its own RNG draws");
assert.doesNotMatch(source,/function (generateBoard|buildBoard|winCombat|completeSixthRoadV19)\b/,"board transition must not absorb generation, combat, or final-run implementation");

function scenario({boardLevel=1,hp=40,maxHp=100,potions=2,rebuild=null}={}){
  const calls=[];
  const player={position:49,hp,maxHp,potions};
  let level=boardLevel;
  const definitions={
    2:{id:2,name:"Astral Road",entryHeal:.35,entryPotions:1},
    3:{id:3,name:"Fractured Road",entryHeal:.28,entryPotions:2},
    4:{id:4,name:"Crown Road",entryHeal:.22,entryPotions:3},
    5:{id:5,name:"Oblivion Ringroad",entryHeal:.18,entryPotions:3},
    6:{id:6,name:"The Sixth Road · End of Mathematics",entryHeal:.03,entryPotions:1}
  };
  transition.configure({
    getRoad:()=>({player,boardLevel:level}),
    setBoardLevel:value=>{calls.push(["setBoardLevel",value]);level=value;},
    resetEncounter:()=>calls.push(["resetEncounter"]),
    setRollLocked:value=>calls.push(["rollLocked",value]),
    applyTheme:()=>calls.push(["theme"]),
    rebuildBoard:()=>{calls.push(["rebuild"]);rebuild?.(player);},
    getBoardDefinition:value=>{calls.push(["definition",value]);return definitions[value];},
    completeFinalRoad:()=>calls.push(["completeFinalRoad"]),
    log:text=>calls.push(["log",text]),
    toast:text=>calls.push(["toast",text]),
    playHoly:()=>calls.push(["holy"]),
    updateHud:()=>calls.push(["hud"]),
    placePawn:hop=>calls.push(["pawn",hop]),
    schedule:(work,ms)=>{calls.push(["schedule",ms]);work();}
  });
  return {calls,player,level:()=>level,run:()=>transition.advance()};
}

const ordinary=scenario({boardLevel:1,hp:40,potions:2});ordinary.run();
assert.equal(ordinary.level(),2,"Board 1 completion must advance exactly to Board 2");
assert.equal(ordinary.player.position,0,"next Board must reset the player to the first tile");
assert.equal(ordinary.player.hp,75,"Board 2 entry recovery must preserve its published 35% heal");
assert.equal(ordinary.player.potions,3,"Board 2 entry recovery must preserve its published potion grant");
assert.deepEqual(ordinary.calls.map(call=>call[0]),["setBoardLevel","resetEncounter","rollLocked","theme","rebuild","definition","log","toast","holy","hud","schedule","pawn","rollLocked","hud"],"ordinary Board transition order and delayed unlock must remain exact");
assert.equal(ordinary.calls.find(call=>call[0]==="schedule")[1],350,"movement unlock delay must remain 350ms");

const sixth=scenario({boardLevel:5,hp:30,potions:7,rebuild:player=>{player.hp=99;player.potions=99;}});sixth.run();
assert.equal(sixth.level(),6,"Board 5 completion must open Board 6 rather than end the run");
assert.equal(sixth.player.hp,33,"Board 5 -> 6 must retain the legacy pre-transition entry-heal result");
assert.equal(sixth.player.potions,8,"Board 5 -> 6 must retain the legacy pre-transition potion result");
assert.ok(sixth.calls.some(call=>call[0]==="toast"&&call[1].startsWith("Board 6:")),"Board 6 must retain its entry announcement");

const finalRoad=scenario({boardLevel:6,hp:50,potions:4});finalRoad.run();
assert.deepEqual(finalRoad.calls.map(call=>call[0]),["completeFinalRoad"],"Board 6 transition must delegate only to the existing final-run completion owner");

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "const dbBoardTransition=window.DiceboundBoardTransition?.configure({",
  "function advanceToNextBoard(){return dbBoardTransition.advance();}",
  "completeFinalRoad:()=>dbRunCompletion.completeFinalRoad()"
])assert.ok(monolith.includes(adapter),`missing board-transition composition adapter: ${adapter}`);
for(const retired of [
  "advanceToNextBoard=function",
  "const advanceToNextBoardV15Patch=advanceToNextBoard;",
  "const advanceToNextBoardV16Base=advanceToNextBoard;",
  "const v235AdvanceBase=advanceToNextBoard;",
  "function v19BoardName("
])assert.ok(!monolith.includes(retired),`retired board-transition chain remains: ${retired}`);

console.log("Board transition owner PASS: Board entry recovery, Board 5 -> 6 continuity, final-road delegation and no-RNG contract are deterministic");
