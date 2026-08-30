#!/usr/bin/env node
/* Deterministic transaction checks for the Prestige Moon progression owner. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/progression/prestige.js'),'utf8');
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:'prestige.js'});

const prestige=sandbox.window.DiceboundPrestige;
assert(prestige,'Prestige progression module should publish one authoritative owner');
assert.equal(prestige.owner,'progression/prestige');
assert.deepEqual([...prestige.statKeys],['maxHp','attack','defense','crit','dodge','luck','lifeSteal']);

let state=prestige.normalize({count:2,maxHp:1,attack:1});
assert.equal(prestige.inspect(state).unspent,0,'pre-Moon permanent rolls must not become duplicate spendable currency');
assert.deepEqual({...prestige.permanentStats(state)},{maxHp:1,attack:1,defense:0,crit:0,dodge:0,luck:0,lifeSteal:0});

state=prestige.award(state,3);
let view=prestige.inspect(state);
assert.equal(view.count,5);
assert.equal(view.spent,2);
assert.equal(view.unspent,3);
assert.deepEqual({...view.held},{maxHp:1,attack:1,defense:1,crit:0,dodge:0,luck:0,lifeSteal:0},'each held point must contribute exactly one deterministic stat point');

const firstRoll=[0,.16,.31,.45,.74];
let calls=0;
let result=prestige.purchase(state,'five-random-stats',()=>firstRoll[calls++]);
assert.equal(result.ok,true);
assert.equal(calls,5,'one random-stat bundle must consume exactly five purchase-local rolls');
assert.equal(Object.values(result.stats).reduce((total,value)=>total+value,0),5,'one purchase must grant exactly five stats');
state=result.prestige;
view=prestige.inspect(state);
assert.equal(view.unspent,2,'spending one point removes exactly one held point');
assert.equal(view.purchased.attack,1);
assert.equal(view.purchased.crit,1);
assert.equal(view.purchased.luck,1);

state=prestige.award(state,2);
result=prestige.purchase(state,'five-random-stats',()=>.999999);
assert.equal(result.ok,true);
assert.equal(result.stats.lifeSteal,5,'purchase bundles may contain repeated semantic stat IDs');
state=result.prestige;
view=prestige.inspect(state);
assert.equal(view.spent,4);
assert.equal(view.unspent,3);
assert.equal(view.purchased.lifeSteal,5);

const serialized=JSON.parse(JSON.stringify(state));
const loaded=prestige.normalize(serialized);
assert.deepEqual({...prestige.inspect(loaded).purchased},{...view.purchased},'save/load must preserve the exact active random bundles');

const refund=prestige.refundAll(loaded);
assert.equal(refund.refunded,2);
view=prestige.inspect(refund.prestige);
assert.equal(view.spent,2,'only refundable Moon purchases may be removed');
assert.equal(view.unspent,5,'refunded points must immediately become held currency again');
assert.deepEqual({...view.purchased},{maxHp:0,attack:0,defense:0,crit:0,dodge:0,luck:0,lifeSteal:0});
assert.deepEqual({...prestige.permanentStats(refund.prestige)},{maxHp:1,attack:1,defense:0,crit:0,dodge:0,luck:0,lifeSteal:0},'refund must retain pre-Moon permanent progression');

const forge=prestige.purchase(refund.prestige,'moon-forge',()=>0);
assert.equal(forge.ok,false);
assert.match(forge.reason,/cost is awaiting balance approval/i,'the Forge must remain explicitly unavailable until a real cost is approved');
assert.equal(prestige.nodes.find(node=>node.id==='moon-forge').cost,null,'Forge cost must not be a hidden UI magic number');

console.log('Prestige progression owner PASS: currency, held stats, purchase bundles, refund and Forge TBD contract');
