#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.join(__dirname,"..");
const SOURCE_PATH=path.join(ROOT,"runtime","js","events","treasure.js");
const source=fs.readFileSync(SOURCE_PATH,"utf8");
const sandbox={window:{},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:SOURCE_PATH});
const owner=sandbox.window.DiceboundRoadEventTreasure;
assert.ok(owner,"Treasure owner must be assigned");
assert.ok(Object.isFrozen(owner));
assert.equal(owner.owner,"events/treasure");
assert.deepEqual({...owner.inspect().memoryCache},{normal:1/450,nightmare:1/300,hell:1/200});

function makeRuntime({level=2,position=10,tileCount=100,randoms=[],randValue=20,hell=false,nightmare=false}={}){
  const player={position,gold:100,potions:1};
  const tiles=Array.from({length:tileCount},()=>({type:'empty',cleared:true}));
  tiles[position]={type:'treasure',cleared:false};
  const calls=[];
  let randomIndex=0;
  const runtime={
    getPlayer:()=>player,
    getBoardLevel:()=>level,
    getTiles:()=>tiles,
    currentTileCount:()=>tileCount,
    isHell:()=>hell,
    isNightmare:()=>nightmare,
    random:()=>{const value=randoms[randomIndex++];if(value===undefined)throw new Error('random fixture exhausted');calls.push(['random',value]);return value;},
    rand:(a,b)=>{calls.push(['rand',a,b,randValue]);return randValue;},
    modifiedGold:value=>{calls.push(['modifiedGold',value]);return value;},
    clamp:(value,min,max)=>{calls.push(['clamp',value,min,max]);return Math.max(min,Math.min(max,value));},
    refreshTile:index=>calls.push(['refreshTile',index]),
    coin:()=>calls.push(['coin']),
    addLog:text=>calls.push(['log',text]),
    showToast:(...args)=>calls.push(['toast',...args]),
    updateHUD:()=>calls.push(['hud']),
    returnToRoad:()=>{calls.push(['returnToRoad']);return 'road';},
    rollGearRarity:bonus=>{calls.push(['rollGearRarity',bonus]);return 'epic';},
    generateEquipment:rarity=>{calls.push(['generateEquipment',rarity]);return {name:'Fixture Blade',rarity};},
    openLoot:(item,done)=>{calls.push(['openLoot',item.name,item.rarity]);const result=done();calls.push(['lootDone',result]);return 'loot';},
    generateLegendary:(slot,preferUndiscovered)=>{calls.push(['generateLegendary',slot,preferUndiscovered]);return {icon:'🌟',name:'Memory Fixture',rarity:'legendary'};}
  };
  return {runtime,player,tiles,calls,getRandomCount:()=>randomIndex};
}

// Board 2 ordinary treasure: no Memory Cache draw, potion miss, gear miss.
{
  const f=makeRuntime({level:2,position:10,tileCount:100,randoms:[.9,.9],randValue:20});
  owner.configure(f.runtime);
  assert.equal(owner.open(),'road');
  // progress=10/99 => round(progress*16)=2; 22*1.35 => 30 gold.
  assert.equal(f.player.gold,130);
  assert.equal(f.player.potions,1);
  assert.deepEqual(f.tiles[10],{type:'empty',cleared:true});
  assert.equal(f.getRandomCount(),2);
  assert.deepEqual(f.calls.slice(0,4),[
    ['rand',18,36,20],['modifiedGold',30],['random',.9],['refreshTile',10]
  ]);
  assert.ok(f.calls.some(c=>c[0]==='log'&&c[1]==='Board 2 treasure yields <b>30 gold</b>.'));
  assert.ok(f.calls.some(c=>c[0]==='toast'&&c[1]==='Treasure: +30 gold'));
  assert.equal(f.calls.some(c=>c[0]==='generateEquipment'),false);
}

// Board 4 ordinary treasure after failed Memory Cache: potion succeeds, double-potion
// sub-roll succeeds, gear succeeds, then rarity/equipment/loot delegation occurs.
{
  const f=makeRuntime({level:4,position:25,tileCount:100,randoms:[.9,.1,.1,.1],randValue:24});
  owner.configure(f.runtime);
  assert.equal(owner.open(),'loot');
  assert.equal(f.getRandomCount(),4);
  assert.equal(f.player.potions,3);
  assert.ok(f.calls.some(c=>c[0]==='rollGearRarity'));
  assert.ok(f.calls.some(c=>c[0]==='generateEquipment'&&c[1]==='epic'));
  assert.ok(f.calls.some(c=>c[0]==='openLoot'&&c[1]==='Fixture Blade'));
  assert.ok(f.calls.some(c=>c[0]==='returnToRoad'));
}

// Board 4 Memory Cache hit short-circuits every ordinary treasure draw and hands the
// generated Legendary directly to loot, preserving the current 0.6 cache path.
{
  const f=makeRuntime({level:4,position:25,tileCount:100,randoms:[.001],randValue:99});
  owner.configure(f.runtime);
  assert.equal(owner.open(),'loot');
  assert.equal(f.getRandomCount(),1);
  assert.equal(f.player.gold,100);
  assert.equal(f.calls.some(c=>c[0]==='rand'),false);
  assert.equal(f.calls.some(c=>c[0]==='modifiedGold'),false);
  assert.ok(f.calls.some(c=>c[0]==='generateLegendary'&&c[1]===null&&c[2]===true));
  assert.ok(f.calls.some(c=>c[0]==='log'&&c[1].includes('<b>MEMORY CACHE.</b>')));
  assert.ok(f.calls.some(c=>c[0]==='toast'&&c[1]==='🌟 MEMORY CACHE · Legendary gear'&&c[2]===3200&&c[3]===true));
}

// Policy precedence stays Hell > Nightmare > Normal.
{
  let f=makeRuntime({hell:true,nightmare:true});owner.configure(f.runtime);assert.equal(owner.memoryCacheChance(),1/200);
  f=makeRuntime({nightmare:true});owner.configure(f.runtime);assert.equal(owner.memoryCacheChance(),1/300);
  f=makeRuntime();owner.configure(f.runtime);assert.equal(owner.memoryCacheChance(),1/450);
}

// Retired v24 named-relic cache behavior must never creep into the extracted owner.
for(const retired of ['v24RandomLegendaryRelic','The Jean Jacket Lost at Kelly','A memory from another road','hellMode?.0025:.0015']){
  assert.equal(source.includes(retired),false,`Treasure owner resurrected retired v24 cache behavior: ${retired}`);
}

console.log('Road Event Treasure owner PASS: ordinary, double-potion, loot and 0.6 Memory Cache ordering are deterministic.');
