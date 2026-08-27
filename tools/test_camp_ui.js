#!/usr/bin/env node
/* Deterministic contract checks for the extracted Camp presentation owner. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/ui/camp.js'),'utf8');
const sandbox={window:{},console,setTimeout,clearTimeout};
sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:'camp.js'});

const camp=sandbox.window.DiceboundCamp;
assert(camp,'Camp module should publish its one public owner');
assert.deepStrictEqual([...camp.layouts].map(layout=>layout.id),['wide-desktop','compact-desktop','stacked-or-short']);
assert.strictEqual(camp.layoutForViewport(1360,650).id,'wide-desktop');
assert.strictEqual(camp.layoutForViewport(1359,650).id,'compact-desktop');
assert.strictEqual(camp.layoutForViewport(999,900).id,'stacked-or-short');
assert.strictEqual(camp.layoutForViewport(1600,640).id,'stacked-or-short');
assert.strictEqual(typeof camp.ensureOptionsButton,'function','Camp owns the semantic Options object too');

const ids=[...camp.requiredSemanticIds()];
for(const id of ['campTalentBtn','campInfoBtn','campMoonBtn','campOptionsBtn','campNightmareBtn','campHellBtn','campClassBtn','campPetBtn','campChestBtn','campAchievementBtn','campGoBtn'])assert(ids.includes(id),`missing semantic Camp control ${id}`);
assert(Object.isFrozen(camp.layouts),'layout definitions should not be mutable by late patch code');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
assert(monolith.includes('const db064Camp=window.DiceboundCamp;'),'monolith should configure the extracted Camp owner');
assert(!monolith.includes('function db064PaintedCampBounds('),'painted hit-target implementation must not remain in the monolith');
assert(!monolith.includes('function db058SetArt('),'Camp authored-art implementation must not remain in the monolith');
assert(!monolith.includes('const scene=document.createElement(\'div\');scene.id=\'campScene\';'),'Camp scene construction must not remain in the monolith');
assert(monolith.includes('function beta042EnsureCampOptions(){return window.DiceboundCamp?.ensureOptionsButton();}'),'the legacy Options caller must remain a thin Camp adapter');

console.log('Camp UI owner PASS: deterministic layouts, semantic controls and monolith drain contract');
