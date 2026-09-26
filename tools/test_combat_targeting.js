"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ window: {} });
const sourcePath = path.join(__dirname, "..", "runtime", "js", "combat", "targeting.js");
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });
const targeting = context.window.DiceboundCombatTargeting;

assert.ok(targeting);
assert.ok(Object.isFrozen(targeting));
assert.equal(targeting.apiVersion, 2);

const pack = [
  { name: "A", hp: 0 },
  { name: "B", hp: 8 },
  { name: "C", hp: 5 },
  { name: "D", hp: 0 },
];

assert.equal(targeting.isLiving(pack[1]), true);
assert.equal(targeting.isLiving(pack[0]), false);
assert.equal(targeting.resolveLivingIndex(pack, 1), 1, "a living selected target remains selected");
assert.equal(targeting.resolveLivingIndex(pack, 0), 1, "a defeated target advances to the next living enemy");
assert.equal(targeting.resolveLivingIndex(pack, 3), 1, "target selection wraps after the last defeated enemy");
assert.equal(targeting.nextLivingTarget(pack, 0).enemy, pack[1]);
assert.equal(targeting.nextLivingTarget(pack, 1).enemy, pack[2]);
assert.equal(targeting.nextLivingTarget(pack, 2).enemy, pack[1], "a later defeat wraps to the first surviving enemy");
assert.equal(targeting.resolveLivingIndex([], 0), -1);
const noTarget = targeting.resolveLivingTarget([{ name: "dead", hp: 0 }], 0);
assert.equal(noTarget.index, -1);
assert.equal(noTarget.enemy, null);

const hero={name:"Hero",hp:30,maxHp:30};
const allies=[
  {instanceId:"skel-1",name:"Skeleton 1",hp:10,maxHp:10,targetable:true,threatWeight:1},
  {instanceId:"skel-2",name:"Skeleton 2",hp:0,maxHp:10,targetable:true,threatWeight:1},
  {instanceId:"ghost",name:"Ghost",hp:5,maxHp:5,targetable:false,threatWeight:1},
  {instanceId:"ward",name:"Ward",hp:5,maxHp:5,targetable:true,threatWeight:0}
];
const playerSide=targeting.playerSideCandidates(hero,allies);
assert.deepEqual(playerSide.map(x=>[x.kind,x.id]),[["hero","hero"],["summon","skel-1"]],"only living targetable positive-threat allies join the target pool");
assert.equal(targeting.resolvePlayerSideSingleTarget({hero,allies,random:()=>0,heroShare:.5}).kind,"hero","lower half of weighted roll targets hero");
assert.equal(targeting.resolvePlayerSideSingleTarget({hero,allies,random:()=>.75,heroShare:.5}).id,"skel-1","upper half targets a summon");
assert.deepEqual(targeting.resolvePlayerSideTargets({hero,allies,policy:"heroOnly"}).map(x=>x.kind),["hero"]);
assert.deepEqual(targeting.resolvePlayerSideTargets({hero,allies,policy:"summonOnly"}).map(x=>x.kind),["summon"]);

console.log("Combat targeting preserves enemy selection and v2 hero/summon targeting policy");
