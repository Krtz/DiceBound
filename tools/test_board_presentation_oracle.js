#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"runtime","js","board","presentation.js"),"utf8");
let boardLevel=4;
let uiResolutions=0,guardianResolutions=0;
const ui={
  bandit:{image:"assets/enemies/normal/battle/bandit.png",alt:"Bandit"},
  troll:{image:"assets/enemies/normal/battle/troll.png",alt:"Troll"},
  coins:{image:"assets/ui/currencies/coins.png",alt:"Coins"},
  gambler:{image:"assets/board/tiles/events/gambler.png",alt:"Gambler"},
};
const guardianById={
  "mini-known":{id:"mini-known",name:"Known Mini",art:{boardMarker:"assets/enemies/minibosses/board-markers/mini-known.png"}},
};
const context={
  window:{
    DiceboundAssets:{
      resolveUiIcon:key=>{uiResolutions++;return ui[key]||null;},
      resolveGuardianArt:id=>{guardianResolutions++;return {boardMarker:`assets/fallback/${id}.png`};},
    },
    DiceboundGuardians:{
      resolveById:id=>guardianById[id]||null,
      resolveFinal:level=>({id:`boss-${level}`,name:`Board ${level} Boss`,art:{boardMarker:`assets/enemies/bosses/board-markers/boss-${level}.png`}}),
    },
  },
  console,
};
vm.createContext(context);
vm.runInContext(source,context,{filename:"runtime/js/board/presentation.js"});
const presentation=context.window.DiceboundBoardPresentation;
assert.ok(presentation?.configure&&presentation?.tileMeta,"Board presentation owner must expose configure() and tileMeta().");
presentation.configure({getBoardLevel:()=>boardLevel});

const meta=(tile,ready=true)=>Array.from(presentation.tileMeta(tile,{ready}));

assert.deepEqual(meta({type:"enemy",enemyBase:{name:"Goblin",icon:"👺"}},false),["👺","Goblin · 1 enemy"]);
assert.deepEqual(meta({type:"enemy",packSize:2,enemyBase:{name:"Goblin",icon:"👺"}},false),["👹👹","Enemy pack · 2"]);
assert.deepEqual(meta({type:"enemy",packSize:5,enemyBase:{name:"Goblin",icon:"👺"}},false),["👹👹👹","Enemy pack · 5"]);
assert.deepEqual(meta({type:"miniboss",enemyBase:{id:"mini-known",name:"Known Mini",icon:"🪨"}},false),["🪨","Mini Boss · 1 enemy"]);

const staticExpected={
  start:["🏠","Start"],empty:["·","Road"],event:["🎰","Slots"],wheel:["🎡","Wheel"],powerup:["🎁","Powerup"],treasure:["💰","Treasure"],camp:["🔥","Camp"],merchant:["🧔","Merchant"],blessing:["✨","Blessing"],mystic:["🔮","Mystic"],bloodwell:["🩸","Bloodwell"],gambler:["🪙","Gambler"],boss:["🐉","Final Boss · 1"],
};
for(const [type,expected] of Object.entries(staticExpected))assert.deepEqual(meta({type},false),expected,`bootstrap ${type} metadata drifted`);

assert.deepEqual(meta({type:"miniboss",enemyBase:{id:"mini-known",name:"Known Mini",icon:"🪨"}}),[
  '<img class="db060-guardian-tile-art" src="assets/enemies/minibosses/board-markers/mini-known.png" alt="Known Mini" draggable="false">',
  "Mini Boss · 1 enemy",
]);
assert.deepEqual(meta({type:"boss"}),[
  '<img class="db060-guardian-tile-art" src="assets/enemies/bosses/board-markers/boss-4.png" alt="Board 4 Boss" draggable="false">',
  "Final Boss · 1 enemy",
]);

assert.deepEqual(meta({type:"enemy",enemyBase:{name:"Road Bandit",icon:"🗡️"}}),[
  '<img class="db-art-icon db-art-portrait" src="assets/enemies/normal/battle/bandit.png" alt="Road Bandit">',
  "Road Bandit · 1 enemy",
]);
assert.deepEqual(meta({type:"enemy",packSize:3,enemyBase:{name:"Cave Troll",icon:"👹"}}),[
  '<span class="db-enemy-pack-art"><img class="db-art-icon db-art-portrait" src="assets/enemies/normal/battle/troll.png" alt="Cave Troll"><b>×3</b></span>',
  "Cave Troll pack · 3 enemies",
]);
assert.deepEqual(meta({type:"enemy",packSize:4,enemyBase:{name:"Goblin",icon:"👺"}}),[
  '<span class="db-enemy-pack-art">👺<b>×4</b></span>',
  "Goblin pack · 4 enemies",
]);
assert.deepEqual(meta({type:"enemy",enemyBase:{name:"Goblin",icon:"👺"}}),["👺","Goblin · 1 enemy"]);

assert.deepEqual(meta({type:"treasure"}),[
  '<img class="db-art-icon db-art-tile" src="assets/ui/currencies/coins.png" alt="Treasure">',"Treasure",
]);
assert.deepEqual(meta({type:"gambler"}),[
  '<img class="db-art-icon db-art-tile" src="assets/board/tiles/events/gambler.png" alt="Gambler">',"Gambler",
]);
assert.deepEqual(meta({type:"devilboss"}),["👿🌙","???"]);
assert.equal(presentation.tileMeta({type:"mystery"},{ready:true}),undefined);

assert.equal(presentation.test.uiArt("bandit",'Bandit "Prime"',"db-art-portrait"),'<img class="db-art-icon db-art-portrait" src="assets/enemies/normal/battle/bandit.png" alt="Bandit &quot;Prime&quot;">');
assert.equal(presentation.inspect().owner,"board/presentation");
assert.ok(uiResolutions>0,"oracle must exercise canonical UI asset resolution");
assert.equal(guardianResolutions,0,"registered guardians must not need fallback asset lookup in frozen cases");
assert.ok(!/Math\.random|\brandom\s*\(/.test(source),"Board presentation must not consume gameplay RNG");

console.log("Board presentation oracle PASS: bootstrap/final tile metadata, guardian art, enemy packs, Bandit/Troll art, event art and zero-gameplay-RNG contract are frozen.");
