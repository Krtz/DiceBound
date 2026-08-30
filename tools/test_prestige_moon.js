#!/usr/bin/env node
/* Ownership and destination-contract checks for the Prestige Moon UI. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/ui/prestige-moon.js'),'utf8');
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:'prestige-moon.js'});

const moon=sandbox.window.DiceboundPrestigeMoon;
assert(moon,'Prestige Moon module should publish one presentation owner');
assert.equal(moon.owner,'ui/prestige-moon');
assert.match(source,/data-prestige-back/,'Moon must own a semantic Back control');
assert.match(source,/prestige-moon-back\{position:absolute/,'Back must be viewport/panel chrome, not scrollable Moon content');
assert.match(source,/top:clamp\(12px,2vw,28px\);right:clamp\(12px,2vw,28px\)/,'Back must remain pinned in the top-right safe area');
assert.match(source,/data-prestige-held/,'Moon must expose the semantic held-currency counter');
assert.match(source,/data-prestige-node/,'Moon must render data-driven upgrade nodes');
assert.match(source,/data-prestige-refund/,'Moon must own the Refund All interaction surface');
assert.match(source,/Moon Forge is intentionally cost-TBD/,'Moon must make the unresolved Forge cost explicit');
assert.doesNotMatch(source,/Math\.random|random\(/,'Moon presentation must not own purchase RNG');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
const talent=fs.readFileSync(path.join(root,'runtime/js/ui/talent-tree.js'),'utf8');
const camp=fs.readFileSync(path.join(root,'runtime/js/ui/camp.js'),'utf8');
assert.match(monolith,/const DB_PRESTIGE=window\.DiceboundPrestige/,'monolith must consume the authoritative Prestige progression owner');
assert.match(monolith,/DB_PRESTIGE\.purchase\(meta\.prestige,id,random\)/,'only the injected runtime adapter may supply purchase RNG');
assert.match(monolith,/DB_PRESTIGE\.refundAll\(meta\.prestige\)/,'Refund All must route through the domain transaction owner');
assert.match(monolith,/function openPrestigeMoon\(\)\{return window\.DiceboundPrestigeMoon\?\.open\?\.\(\)\|\|null;\}/,'monolith should retain only a thin Moon open adapter');
assert.match(monolith,/meta\.prestige=DB_PRESTIGE\.award\(meta\.prestige,rewards\)/,'existing reset flow must award Prestige currency through the owner');
assert.match(monolith,/const p=DB_PRESTIGE\.statTotals\(meta\.prestige\|\|defaultPrestige\(\)\)/,'effective player stats must use the single Prestige totals path');
assert.doesNotMatch(monolith,/setTimeout\(\(\)=>\{const box=document\.querySelector\('\.prestige-box'\)/,'retired hidden Prestige popup mutation must not remain live');
assert.match(camp,/openPrestigeMoon/,'Camp must open the Moon destination through its configured action');
assert.doesNotMatch(camp,/camp-prestige-actions|camp-moon-actions/,'Camp owner must not retain the retired Prestige popup layout');
assert.doesNotMatch(fs.readFileSync(path.join(root,'runtime/css/dicebound.css'),'utf8'),/\.prestige-box|\.prestige-stats/,'shared CSS must not retain the retired Prestige popup styles');
assert.doesNotMatch(talent,/data-talent-prestige/,'Talent UI must not retain a second Prestige action');
assert.doesNotMatch(talent,/talent-tree-prestige/,'Talent UI must not retain Prestige presentation markup or styles');

console.log('Prestige Moon UI owner PASS: destination chrome, data-driven nodes and monolith drain contract');
