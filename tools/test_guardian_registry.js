"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,".."),context=vm.createContext({window:{},document:undefined});
for(const relative of ["runtime/js/assets.js","runtime/js/board/registry.js","runtime/js/combat/enemies.js","runtime/js/combat/guardians.js"]){
  vm.runInContext(fs.readFileSync(path.join(root,relative),"utf8"),context,{filename:relative});
}

const guardians=context.window.DiceboundGuardians;
const expected=[
  [1,"ancient-road-dragon","Ancient Road Dragon","Worldfire Breath","ice"],
  [2,"astral-devourer-dragon","Astral Devourer Dragon","Astral Consumption","donut"],
  [3,"nullstar-hydra","Nullstar Hydra","Erasure of All Roads","light"],
  [4,"crown-eater","Crown-Eater of the Fourth Road","End of All Accounts","light"],
  [5,"ring-tyrant","Ring Tyrant of the Fifth Road","Ouroboros Verdict","void"],
  [6,"last-equation","The Last Equation","Proof of Extinction","gun"]
];

assert.ok(Object.isFrozen(guardians),"guardian API must remain immutable");
for(const [board,id,name,specialName,weakness] of expected){
  const guardian=guardians.resolveFinal(board);
  assert.deepEqual(JSON.parse(JSON.stringify({board:guardian.board,kind:guardian.kind,id:guardian.id,name:guardian.name,specialName:guardian.combat.specialName,weakness:guardian.combat.weakness,art:guardian.art})),{
    board,kind:"final",id,name,specialName,weakness,
    art:{battle:id==="astral-devourer-dragon"?"assets/enemies/bosses/battle/astral-devourer-dragon-2.png":`assets/enemies/bosses/battle/${id}.png`,boardMarker:`assets/enemies/bosses/board-markers/${id}.png`,alt:name}
  });
  assert.ok(fs.existsSync(path.join(root,"runtime",guardian.art.battle)),`${id} battle art is absent`);
  assert.ok(fs.existsSync(path.join(root,"runtime",guardian.art.boardMarker)),`${id} board marker is absent`);
  assert.deepEqual(JSON.parse(JSON.stringify(guardians.resolveById(id))),JSON.parse(JSON.stringify(guardian)),`${id} must resolve to the same final guardian identity`);
  guardian.combat.name="mutated";
  assert.equal(guardians.resolveFinal(board).combat.name,name,"guardian resolver must return isolated data");
}
assert.equal(guardians.resolveFinal(0),null,"invalid Boards must not silently choose Board 1");
assert.equal(guardians.resolveFinal(7),null,"invalid Boards must not silently choose Board 6");

const monolith=fs.readFileSync(path.join(root,"runtime","js","dicebound.js"),"utf8");
assert.match(monolith,/db317FinalGuardian\(boardLevel\)/,"the active final-combat path must use the guardian resolver");
assert.match(monolith,/DB317_GUARDIANS\.resolveFinal\(boardLevel\)/,"the final board tile must use the guardian resolver");
assert.doesNotMatch(monolith,/const DB060_BOSS_ART=/,"legacy guardian portrait map must not bypass semantic artwork");
assert.doesNotMatch(monolith,/assets\/enemies\/portraits\/astral-devourer-dragon\.png/,"guardian rendering must not retain the stale Astral portrait path");
assert.ok(!fs.existsSync(path.join(root,"runtime","assets","enemies","bosses","battle","astral-devourer-dragon.png")),"opaque Astral battle art should be retired once the transparent replacement is canonical");

console.log("Guardian registry PASS: Boards 1-6 use one isolated final identity with canonical battle/marker asset paths");
