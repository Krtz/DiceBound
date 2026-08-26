"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,".."),context=vm.createContext({window:{},document:undefined});
vm.runInContext(fs.readFileSync(path.join(root,"runtime","js","assets.js"),"utf8"),context,{filename:"assets.js"});
const effect=context.window.DiceboundAssets.resolveCombatEffect("naturePoisonVines");
assert.ok(Object.isFrozen(effect));assert.equal(effect.frameDurationMs,75);assert.equal(effect.frames.length,8);
assert.deepEqual(JSON.parse(JSON.stringify(effect.frames)),[1,2,3,4,5,6,7,8].map(frame=>`assets/combat/effects/nature-poison-vines-${String(frame).padStart(2,"0")}.png`));
for(const frame of effect.frames)assert.ok(fs.existsSync(path.join(root,"runtime",frame)));
assert.equal(context.window.DiceboundAssets.resolveCombatEffect("missing"),null);
const monolith=fs.readFileSync(path.join(root,"runtime","js","dicebound.js"),"utf8");
const vfx=fs.readFileSync(path.join(root,"runtime","js","combat","vfx.js"),"utf8");
assert.match(vfx,/natureLegacySuppressions/,"Nature VFX does not own a legacy-presentation suppression boundary");
assert.match(vfx,/key === "nature" && natureLegacySuppressions > 0/,"Nature suppression is not scoped to the authored Nature presentation");
assert.match(monolith,/dbCombatVfx\.withNatureLegacyPresentation/,"Monolith is not wired through the authoritative VFX owner");
assert.doesNotMatch(monolith,/dbNatureReplacesLegacyPresentation/,"Legacy Nature VFX presentation state remained in the monolith");
console.log("Nature poison-vines VFX registry/owner: ordered canonical frames, timing and asset existence pass");
