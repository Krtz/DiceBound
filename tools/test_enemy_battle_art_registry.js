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
  assert.deepEqual(JSON.parse(JSON.stringify(art)),{key:"slime",src:`assets/enemies/normal/battle/slime-board-${board}.png`,alt:"Slime",board});
  assert.equal(assets.resolveEnemyBattleArt("Slime",board).src,`assets/enemies/normal/battle/slime-board-${board}.png`);
}
assert.equal(assets.resolveEnemyBattleArt("Slime",0).board,1,"invalid low boards must safely select Board 1");
assert.equal(assets.resolveEnemyBattleArt("Slime",99).board,6,"invalid high boards must safely select Board 6");
assert.equal(assets.resolveEnemyBattleArt("Wolf",1),null,"existing static portraits are not silently reclassified as tiered battle art");
const slimeMarker=assets.resolveEnemyMarker("Slime");
assert.deepEqual(JSON.parse(JSON.stringify(slimeMarker)),{key:"slime",src:"assets/enemies/normal/board-markers/slime.png",alt:"Slime"});
assert.notEqual(slimeMarker.src,assets.resolveEnemyBattleArt("Slime",1).src,"the static marker must remain separate from tiered battle art");
assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyModeAura("normal"))),{id:"normal",className:""});
assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyModeAura("Nightmare"))),{id:"nightmare",className:"db-enemy-mode-nightmare"});
assert.deepEqual(JSON.parse(JSON.stringify(assets.resolveEnemyModeAura("HELL"))),{id:"hell",className:"db-enemy-mode-hell"});
assert.equal(assets.resolveEnemyModeAura("unexpected").id,"normal");
for(let board=1;board<=6;board++)assert.ok(fs.existsSync(path.join(root,"runtime","assets","enemies","normal","battle",`slime-board-${board}.png`)));

console.log("Slime Board battle-art registry: identity/Board resolution, independent marker ownership and mode-presentation separation pass");
