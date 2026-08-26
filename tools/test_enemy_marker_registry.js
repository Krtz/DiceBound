#!/usr/bin/env node
const assert=require('assert');
const path=require('path');

global.window={};
global.document=undefined;
require(path.join(__dirname,'..','runtime','js','assets.js'));
const assets=global.window.DiceboundAssets;

const imported=['slime','goblin','skeleton','orc','cultist','wraith','devil','lich'];
const existing=['wolf','bandit','troll'];
const names={slime:'Slime',goblin:'Goblin',skeleton:'Skeleton',wolf:'Wolf',bandit:'Bandit',orc:'Orc',cultist:'Cultist',wraith:'Wraith',troll:'Troll',devil:'Devil',lich:'Lich'};
const markerFiles={devil:'demon'};

for(const id of [...imported,...existing]){
  const marker=assets.resolveEnemyMarker(`${names[id]} pack · 4`);
  assert(marker,`${id} marker did not resolve`);
  assert.strictEqual(marker.key,id,`${id} resolved as ${marker.key}`);
  assert.strictEqual(marker.src,`assets/enemies/normal/board-markers/${markerFiles[id]||id}.png`);
  assert(assets.files.includes(marker.src),`${id} is not a preloaded registry file`);
  // The resolver deliberately takes no Board or difficulty input: identity art
  // is invariant while battle art/mode presentation have their own systems.
  assert.strictEqual(assets.resolveEnemyMarker(names[id]).src,marker.src);
}

assert.strictEqual(assets.resolveEnemyMarker('Demon').key,'devil','legacy Demon labels must resolve to the standard Devil marker');

for(const id of imported)assert.strictEqual(assets.resolveEnemyPortrait(names[id]),null,`${id} marker must not masquerade as battle art`);
for(const id of existing)assert.strictEqual(assets.resolveEnemyPortrait(names[id]).src,`assets/enemies/normal/battle/${id}.png`);
assert.strictEqual(assets.resolveEnemyMarker('Unknown'),null);
console.log('Normal enemy marker registry PASS: 11 static semantic markers; marker-only identities have no battle-art fallback');
