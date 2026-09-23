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
  const nightmare=assets.resolveCombatBackground(board,'Nightmare');
  assert(nightmare,`Board ${board} Nightmare background did not resolve`);
  assert.strictEqual(nightmare.image,`assets/combat/backgrounds/board-${board}-nightmare.png`);
  assert(assets.files.includes(nightmare.image),`Board ${board} Nightmare background is not a registry preload target`);
  const hell=assets.resolveCombatBackground(board,'Hell');
  assert(hell,`Board ${board} Hell background did not resolve`);
  assert.strictEqual(hell.image,`assets/combat/backgrounds/board-${board}-hell.png`);
  assert(assets.files.includes(hell.image),`Board ${board} Hell background is not a registry preload target`);
}
assert.strictEqual(assets.resolveCombatBackground(999,'normal').image,'assets/combat/backgrounds/board-1-normal.png','invalid Board context must fail safely to Board 1');
assert.strictEqual(assets.resolveCombatBackground(999,'nightmare').image,'assets/combat/backgrounds/board-1-nightmare.png','invalid Nightmare Board context must fail safely to Board 1');
assert.strictEqual(assets.resolveCombatBackground(999,'hell').image,'assets/combat/backgrounds/board-1-hell.png','invalid Hell Board context must fail safely to Board 1');
console.log('Combat background registry PASS: six Board-specific Normal, Nightmare and Hell plates resolve semantically');
