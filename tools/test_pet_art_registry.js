"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
global.window={};
global.document=undefined;
require(path.join(root,"runtime","js","assets.js"));

const assets=global.window.DiceboundAssets;
const math=assets.resolvePetArt("math");
assert.deepEqual(math,{portrait:"assets/characters/pets/portraits/math.png",battle:"assets/characters/pets/battle/math.png",alt:"math"});
for(const source of [math.portrait,math.battle])assert.ok(fs.existsSync(path.join(root,"runtime",source)),`Euler authored Pet art missing: ${source}`);
assert.deepEqual(assets.resolvePetArt("not-a-pet"),assets.resolvePetArt("neutral"),"unknown Pets must retain the generic neutral fallback");
console.log("Pet art registry PASS: authored Euler Math portrait/battle paths and generic fallback are intact");
