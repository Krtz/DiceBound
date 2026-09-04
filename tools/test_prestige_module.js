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

let heirloomState=prestige.normalize({count:20,moon:{legacySpent:0,purchases:[]}});
let noRngCalls=0;
let lockedSlot=prestige.purchase(heirloomState,'heirloom-slot-i',()=>{noRngCalls++;return 0;});
assert.equal(lockedSlot.ok,false,'slot purchases must require Heirloom Storage first');
assert.match(lockedSlot.reason,/requires unlock heirloom storage/i);
let storage=prestige.purchase(heirloomState,'heirloom-storage',()=>{noRngCalls++;return 0;});
assert.equal(storage.ok,true);
assert.equal(storage.node.cost,1);
assert.equal(noRngCalls,0,'non-stat Prestige purchases must not consume RNG');
heirloomState=storage.prestige;
let slotOne=prestige.purchase(heirloomState,'heirloom-slot-i',()=>{noRngCalls++;return 0;});
assert.equal(slotOne.ok,true);assert.equal(slotOne.node.cost,2);heirloomState=slotOne.prestige;
let slotTwo=prestige.purchase(heirloomState,'heirloom-slot-ii',()=>{noRngCalls++;return 0;});
assert.equal(slotTwo.ok,true);assert.equal(slotTwo.node.cost,5);heirloomState=slotTwo.prestige;
assert.equal(noRngCalls,0);
assert.equal(prestige.inspect(heirloomState).unspent,12,'1 + 2 + 5 PP permanent Heirloom purchases must spend exactly 8 PP');
assert.equal(prestige.inspect(heirloomState).refundableSpent,0,'permanent Heirloom purchases are not refundable');
let statAfterStorage=prestige.purchase(heirloomState,'five-random-stats',()=>0);
assert.equal(statAfterStorage.ok,true);heirloomState=statAfterStorage.prestige;
assert.equal(prestige.inspect(heirloomState).refundableSpent,1);
const permanentRefund=prestige.refundAll(heirloomState);
assert.equal(permanentRefund.refunded,1,'Refund Stats must refund only refundable stat bundles');
assert.equal(prestige.hasPurchase(permanentRefund.prestige,'heirloom-storage'),true);
assert.equal(prestige.hasPurchase(permanentRefund.prestige,'heirloom-slot-i'),true);
assert.equal(prestige.hasPurchase(permanentRefund.prestige,'heirloom-slot-ii'),true);
assert.equal(prestige.inspect(permanentRefund.prestige).unspent,12,'permanent Heirloom spend must remain after a stat refund');
let grandfathered=prestige.normalize({count:50,moon:{legacySpent:0,purchases:[]}});
grandfathered=prestige.grantLegacyPurchase(grandfathered,'heirloom-storage');
grandfathered=prestige.grantLegacyPurchase(grandfathered,'heirloom-slot-i');
grandfathered=prestige.grantLegacyPurchase(grandfathered,'heirloom-slot-ii');
assert.equal(prestige.inspect(grandfathered).spent,0,'grandfathered legacy purchases must preserve earned capacity without retroactively charging PP');
assert.equal(prestige.hasPurchase(grandfathered,'heirloom-slot-ii'),true);

const forge=prestige.purchase(refund.prestige,'moon-forge',()=>0);
assert.equal(forge.ok,false);
assert.match(forge.reason,/cost is awaiting balance approval/i,'the Forge must remain explicitly unavailable until a real cost is approved');
assert.equal(prestige.nodes.find(node=>node.id==='moon-forge').cost,null,'Forge cost must not be a hidden UI magic number');

console.log('Prestige progression owner PASS: currency, held stats, permanent Heirloom purchases, selective refund, migration and Forge TBD contract');
