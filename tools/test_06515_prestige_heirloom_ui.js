#!/usr/bin/env node
const assert=require('assert'),fs=require('fs');
const read=p=>fs.readFileSync(p,'utf8');
const mono=read('runtime/js/dicebound.js');
const prestige=read('runtime/js/progression/prestige.js');
const progression=read('runtime/js/progression/lifecycle.js');
const heirlooms=read('runtime/js/items/heirlooms.js');
const camp=read('runtime/js/ui/camp.js');
const moon=read('runtime/js/ui/prestige-moon.js');
const classes=read('runtime/js/classes/registry.js');
const equipment=read('runtime/js/ui/equipment-heirlooms.js');

assert.doesNotMatch(mono,/function getHeirloomSlots\s*\(/,'hidden Prestige-count loadout policy must stay drained from composition');
for(const retired of ['v24StorageUnlocked','v24StorageCapacity','v24SyncStorage','v24StorageMilestones','DB_HEIRLOOM_SLOT_I_NODE','DB_HEIRLOOM_SLOT_II_NODE','dbEquipmentUiToggleStoredActive','dbEquipmentUiDiscardStored','dbEquipmentUiToggleRunStorage','dbEquipmentUiToggleLegacyHeirloom']){
  assert.ok(!mono.includes(retired),`retired Heirloom composition ownership remains: ${retired}`);
}
assert.match(progression,/function heirloomLoadoutCapacity\(\)/);
assert.match(progression,/function heirloomStorageCapacity\(\)/);
assert.match(progression,/bloodmageKills/);
assert.match(progression,/devilBossKills/);
assert.match(heirlooms,/window\.DiceboundHeirloomOperations/);

assert.match(prestige,/id: 'heirloom-storage'[\s\S]*?cost: 1/);
assert.match(prestige,/id: 'heirloom-vault-expansion'[\s\S]*?costs: Object\.freeze\(\[2, 3, 4, 5, 6, 7, 8\]\)/);
assert.match(prestige,/id: 'heirloom-loadout'[\s\S]*?costs: Object\.freeze\(\[1, 3, 5\]\)/);
assert.match(prestige,/function legacyXpMultiplier\(prestige\)/);
assert.match(prestige,/refundable: false/);

assert.match(classes,/rouge:\{type:"prestige",count:10\}/);
assert.match(classes,/"unlock": "Reach 10 Prestige points"/);
assert.match(camp,/campClassBtn:Object\.freeze\(\{x:\.39,y:\.65,w:235\}\)/);
assert.match(camp,/campPetBtn:Object\.freeze\(\{x:\.39,y:\.90,w:220\}\)/);
assert.match(moon,/prestige-moon-intro\{[^}]*left:clamp\(14px,2\.6vw,40px\)[^}]*text-align:left/);
assert.match(moon,/Rank \$\{rank\}\/\$\{maxRank\}/);
assert.match(equipment,/Purchase Heirloom Vault on the Prestige Moon for 1 Prestige Point/);
assert.match(equipment,/Blood Mage/);
assert.match(equipment,/Pale Devil/);

console.log('Prestige Heirloom/Vault UI and ownership contract PASS');
