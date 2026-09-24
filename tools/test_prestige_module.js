#!/usr/bin/env node
/* Deterministic transaction checks for the Prestige Moon progression owner. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/progression/prestige.js'),'utf8');
const sandbox={window:{},console};sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:'prestige.js'});
const prestige=sandbox.window.DiceboundPrestige;
assert(prestige,'Prestige progression module should publish one authoritative owner');
assert.equal(prestige.owner,'progression/prestige');
assert.equal(prestige.apiVersion,3);
assert.deepEqual([...prestige.statKeys],['maxHp','attack','defense','crit','dodge','luck','lifeSteal']);

let state=prestige.normalize({count:2,maxHp:1,attack:1});
assert.equal(prestige.inspect(state).unspent,0,'pre-Moon permanent rolls must not become duplicate spendable currency');
assert.deepEqual({...prestige.permanentStats(state)},{maxHp:1,attack:1,defense:0,crit:0,dodge:0,luck:0,lifeSteal:0});

state=prestige.award(state,3);
let view=prestige.inspect(state);
assert.equal(view.count,5);
assert.equal(view.spent,2);
assert.equal(view.unspent,3);
assert.equal(view.legacyXpBonusPercent,25);
assert.equal(view.legacyXpMultiplier,1.25);
assert.deepEqual({...view.held},{maxHp:1,attack:1,defense:1,crit:0,dodge:0,luck:0,lifeSteal:0});

const firstRoll=[0,.16,.31,.45,.74];let calls=0;
let result=prestige.purchase(state,'five-random-stats',()=>firstRoll[calls++]);
assert.equal(result.ok,true);assert.equal(calls,5);
state=result.prestige;
assert.equal(prestige.inspect(state).refundableSpent,1);

let heirloom=prestige.normalize({count:80,moon:{legacySpent:0,purchases:[]}});
let structuralRng=0;
let denied=prestige.purchase(heirloom,'heirloom-vault-expansion',()=>{structuralRng++;return 0;});
assert.equal(denied.ok,false);assert.match(denied.reason,/requires unlock heirloom vault/i);

let purchase=prestige.purchase(heirloom,'heirloom-storage',()=>{structuralRng++;return 0;});
assert.equal(purchase.ok,true);assert.equal(purchase.cost,1);heirloom=purchase.prestige;

const vaultCosts=[];
for(let rank=0;rank<7;rank++){
  purchase=prestige.purchase(heirloom,'heirloom-vault-expansion',()=>{structuralRng++;return 0;});
  assert.equal(purchase.ok,true);vaultCosts.push(purchase.cost);heirloom=purchase.prestige;
}
assert.deepEqual(vaultCosts,[2,3,4,5,6,7,8]);
assert.equal(prestige.rank(heirloom,'heirloom-vault-expansion'),7);
assert.equal(prestige.vaultExpansionSlots(heirloom),28);
assert.equal(prestige.purchase(heirloom,'heirloom-vault-expansion',()=>0).ok,false);

const loadoutCosts=[];
for(let rank=0;rank<3;rank++){
  purchase=prestige.purchase(heirloom,'heirloom-loadout',()=>{structuralRng++;return 0;});
  assert.equal(purchase.ok,true);loadoutCosts.push(purchase.cost);heirloom=purchase.prestige;
}
assert.deepEqual(loadoutCosts,[1,3,5]);
assert.equal(prestige.rank(heirloom,'heirloom-loadout'),3);
assert.equal(prestige.loadoutSlots(heirloom),3);
assert.equal(prestige.purchase(heirloom,'heirloom-loadout',()=>0).ok,false);
assert.equal(structuralRng,0,'structural Prestige purchases must never consume RNG');
assert.equal(prestige.inspect(heirloom).refundableSpent,0);

const withStat=prestige.purchase(heirloom,'five-random-stats',()=>0);
assert.equal(withStat.ok,true);
const refunded=prestige.refundAll(withStat.prestige);
assert.equal(refunded.refunded,1);
assert.equal(prestige.rank(refunded.prestige,'heirloom-vault-expansion'),7);
assert.equal(prestige.rank(refunded.prestige,'heirloom-loadout'),3);
assert.equal(prestige.hasPurchase(refunded.prestige,'heirloom-storage'),true);

const legacy=prestige.normalize({count:20,moon:{legacySpent:0,purchases:[
  {nodeId:'heirloom-storage',cost:1,stats:{}},
  {nodeId:'heirloom-slot-i',cost:2,stats:{}},
  {nodeId:'heirloom-slot-ii',cost:5,stats:{}}
]}});
assert.equal(prestige.rank(legacy,'heirloom-vault-expansion'),2,'old +1 Vault purchases should migrate into two ranked expansions');
assert.equal(prestige.vaultExpansionSlots(legacy),8,'migrated old storage purchases should now grant ranked +4 expansion capacity');
assert.equal(prestige.inspect(legacy).spent,8,'migration must preserve historical PP spend');

for(const [count,mult,bonus] of [[0,1,0],[1,1.05,5],[10,1.5,50],[20,2,100],[60,4,300]]){
  const sample=prestige.normalize({count,moon:{legacySpent:0,purchases:[]}});
  assert.equal(prestige.legacyXpMultiplier(sample),mult);
  assert.equal(prestige.legacyXpBonusPercent(sample),bonus);
}
const spentSample=prestige.purchase(prestige.normalize({count:10,moon:{legacySpent:0,purchases:[]}}),'heirloom-storage',()=>0).prestige;
assert.equal(prestige.legacyXpMultiplier(spentSample),1.5,'Legacy acceleration must use lifetime earned PP, not unspent PP');

const forgeBeforeCrucible=prestige.purchase(refunded.prestige,'moon-forge',()=>0);
assert.equal(forgeBeforeCrucible.ok,false);assert.match(forgeBeforeCrucible.reason,/requires build echo crucible/i);
let crucible=prestige.purchase(refunded.prestige,'echo-crucible',()=>{structuralRng++;return 0;});
assert.equal(crucible.ok,true);assert.equal(crucible.cost,20);assert.equal(prestige.hasPurchase(crucible.prestige,'echo-crucible'),true);
assert.equal(structuralRng,0,'Echo Crucible is a permanent structural purchase and must not consume RNG');
const forge=prestige.purchase(crucible.prestige,'moon-forge',()=>0);
assert.equal(forge.ok,false);assert.match(forge.reason,/not available yet/i);
const crucibleRefund=prestige.refundAll(crucible.prestige);
assert.equal(prestige.hasPurchase(crucibleRefund.prestige,'echo-crucible'),true,'Echo Crucible must survive Refund Stats');

console.log('Prestige progression owner PASS: ranked permanent Heirloom upgrades, Echo Crucible, selective refunds and lifetime Legacy acceleration');
