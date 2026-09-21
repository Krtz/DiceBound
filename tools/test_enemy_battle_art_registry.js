"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,".."),context=vm.createContext({window:{},document:undefined});
const source=fs.readFileSync(path.join(root,"runtime","js","assets.js"),"utf8");
vm.runInContext(source,context,{filename:"assets.js"});
const assets=context.window.DiceboundAssets;

assert.ok(Object.isFrozen(assets),"asset API must remain immutable");
for(let board=1;board<=6;board++){
  const art=assets.resolveEnemyBattleArt("Nightmare Slime",board);
  assert.deepEqual(JSON.parse(JSON.stringify(art)),{key:"slime",src:`assets/enemies/normal/battle/slime/board-${board}.png`,alt:"Slime",board});
  assert.equal(assets.resolveEnemyBattleArt("Slime",board).src,`assets/enemies/normal/battle/slime/board-${board}.png`);
  assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyBattleArt("Road Goblin",board))),{key:"goblin",src:`assets/enemies/normal/battle/goblin/board-${board}.png`,alt:"Goblin",board});
  assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyBattleArt("Skeleton",board))),{key:"skeleton",src:`assets/enemies/normal/battle/skeleton/board-${board}.png`,alt:"Skeleton",board});
  const wolf=assets.resolveEnemyBattleArt("Ascended Wolf",board);
  assert.deepEqual(JSON.parse(JSON.stringify(wolf)),{key:"wolf",src:`assets/enemies/normal/battle/wolf/board-${board}.png`,alt:"Wolf",board});
  const demon=assets.resolveEnemyBattleArt("Demon",board);
  assert.deepEqual(JSON.parse(JSON.stringify(demon)),{key:"demon",src:`assets/enemies/normal/battle/demon/board-${board}.png`,alt:"Demon",board});
  assert.equal(assets.resolveEnemyBattleArt("Devil",board).key,"demon","legacy ordinary Devil labels may resolve art but must canonicalize to Demon");
}
assert.equal(assets.resolveEnemyBattleArt("Slime",0).board,1,"invalid low boards must safely select Board 1");
assert.equal(assets.resolveEnemyBattleArt("Slime",99).board,6,"invalid high boards must safely select Board 6");
for(let board=1;board<=6;board++)assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyBattleArt("Wraith",board))),{key:"wraith",src:`assets/enemies/normal/battle/wraith/board-${board}.png`,alt:"Wraith",board},"transparent Wraith Board art must retain its canonical semantic mapping without a matte contract");
const slimeMarker=assets.resolveEnemyMarker("Slime");
assert.deepEqual(JSON.parse(JSON.stringify(slimeMarker)),{key:"slime",src:"assets/enemies/normal/board-markers/slime.png",alt:"Slime"});
assert.notEqual(slimeMarker.src,assets.resolveEnemyBattleArt("Slime",1).src,"the static marker must remain separate from tiered battle art");
const wolfMarker=assets.resolveEnemyMarker("Wolf");
assert.deepEqual(JSON.parse(JSON.stringify(wolfMarker)),{key:"wolf",src:"assets/enemies/normal/board-markers/wolf.png",alt:"Wolf"});
assert.notEqual(wolfMarker.src,assets.resolveEnemyBattleArt("Wolf",1).src,"the static Wolf marker must remain separate from tiered battle art");
assert.equal(assets.resolveEnemyBattleArt("The Pale Devil",1),null,"Pale Devil must not resolve as a standard Demon");
assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyMarker("Demon"))),{key:"demon",src:"assets/enemies/normal/board-markers/demon.png",alt:"Demon"});
assert.equal(assets.resolveEnemyMarker("Devil").key,"demon","legacy ordinary Devil labels may resolve markers but must canonicalize to Demon");
assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyModeAura("normal"))),{id:"normal",className:""});
assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyModeAura("Nightmare"))),{id:"nightmare",className:"db-enemy-mode-nightmare"});
assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyModeAura("HELL"))),{id:"hell",className:"db-enemy-mode-hell"});
assert.equal(assets.resolveEnemyModeAura("unexpected").id,"normal");
for(const identity of ["slime","goblin","skeleton","wolf","demon","wraith"])for(let board=1;board<=6;board++)assert.ok(fs.existsSync(path.join(root,"runtime","assets","enemies","normal","battle",identity,`board-${board}.png`)));
const monolith=fs.readFileSync(path.join(root,"runtime","js","dicebound.js"),"utf8");
assert.doesNotMatch(monolith,/db066TieredEnemyMarkupBase|db-enemy-dark-matte|wraith-dark-matte-style/,"transparent Wraith art must not retain the old Wraith-only matte/blending renderer wrapper");

console.log("Ordinary Board battle-art registry: identity/Board resolution, independent marker ownership and mode-presentation separation pass");
