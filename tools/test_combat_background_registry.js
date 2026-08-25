#!/usr/bin/env node
const assert=require('assert');
const path=require('path');

global.window={};
global.document=undefined;
require(path.join(__dirname,'..','runtime','js','assets.js'));
const assets=global.window.DiceboundAssets;

for(let board=1;board<=6;board++){
  const entry=assets.resolveCombatBackground(board,'Normal');
  assert(entry,`Board ${board} Normal background did not resolve`);
  assert.strictEqual(entry.image,`assets/combat/backgrounds/board-${board}-normal.png`);
  assert(assets.files.includes(entry.image),`Board ${board} background is not a registry preload target`);
}
assert.strictEqual(assets.resolveCombatBackground(3,'nightmare'),null,'Nightmare must not receive a fabricated Normal background');
assert.strictEqual(assets.resolveCombatBackground(3,'hell'),null,'Hell must not receive a fabricated Normal background');
assert.strictEqual(assets.resolveCombatBackground(999,'normal').image,'assets/combat/backgrounds/board-1-normal.png','invalid Board context must fail safely to Board 1');
console.log('Combat background registry PASS: six Board-specific Normal plates; Nightmare/Hell intentionally have no authored fallback');
