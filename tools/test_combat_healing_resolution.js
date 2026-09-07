const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'runtime', 'js', 'combat', 'healing-resolution.js');
const source = fs.readFileSync(ownerPath, 'utf8');
assert(source.includes('window.DiceboundCombatHealingResolution = api;'), 'Healing owner must use canonical direct global assignment');
assert(!source.includes('Math.random'), 'Healing resolution must not consume RNG');

const sandbox = { window: {}, console, Object, Math, Set, Map };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerPath });
const owner = sandbox.window.DiceboundCombatHealingResolution;
assert(owner && owner.owner === 'combat/healing-resolution', 'Healing owner did not initialize');

function harness(options={}) {
  const trace=[];
  const stats={healingDone:options.healingDone||0};
  let statsLastHp=options.statsLastHp ?? null;
  let currentEnemy=options.currentEnemy === undefined ? null : options.currentEnemy;
  const active=new Set(options.activeIdentities||[]);
  const p=Object.assign({
    classId:'ranger', hp:50, maxHp:100, attack:10, doubleStrike:.2,
    clericFaith:0, clericFaithGainBonus:0, paladinGrace:0, paladinGraceGainBonus:0,
    bloodOverheal:false, bloodOverhealBonus:0, energyShield:0, energyShieldCap:0,
    legendaryOverhealShieldRate:0, v26StoneBattleAttack:0, v26StoneBattleEcho:0,
    equipment:{hat:null,amulet:null}
  },options.player||{});
  if (!options.activeIdentities && p.classId) active.add(p.classId);
  const call=(name,...args)=>trace.push([name,...args]);
  const rt={
    getPlayer:()=>p,
    getCurrentEnemy:()=>currentEnemy,
    ensureAlphaMeta:()=>stats,
    setStatsLastHp:value=>{statsLastHp=value;call('statsLastHp',value);},
    saveMeta:()=>call('save'),
    checkDynamicClassUnlocks:()=>call('unlockCheck'),
    isClassActive:id=>active.has(id),
    clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
    identityFlash:text=>call('flash',text),
    addCombatHistory:text=>call('history',text),
    syncShieldBars:()=>call('shieldUI'),
    syncOuroborosAttack:()=>call('ouroSync')
  };
  owner.configure(rt);
  return {p,stats,trace,active,rt,get statsLastHp(){return statsLastHp;},set currentEnemy(v){currentEnemy=v;}};
}

// Base integer rounding, HP cap and lifetime-accounting order.
{
  const h=harness({player:{hp:50,maxHp:100}});
  assert.strictEqual(owner.healPlayer(12.4),12);
  assert.strictEqual(h.p.hp,62);
  assert.strictEqual(h.stats.healingDone,12);
  assert.strictEqual(h.statsLastHp,62);
  assert.deepStrictEqual(h.trace.map(x=>x[0]),['statsLastHp','save','unlockCheck','shieldUI']);
}
{
  const h=harness({player:{hp:95,maxHp:100}});
  assert.strictEqual(owner.healPlayer(20),5);
  assert.strictEqual(h.p.hp,100);
  assert.strictEqual(h.stats.healingDone,5);
}

// Blood Overheal grows max HP only from true excess, then cleanup reverses it.
{
  const h=harness({player:{hp:90,maxHp:100,bloodOverheal:true,bloodOverhealBonus:0}});
  assert.strictEqual(owner.healPlayer(20),20);
  assert.deepStrictEqual({hp:h.p.hp,maxHp:h.p.maxHp,bonus:h.p.bloodOverhealBonus},{hp:110,maxHp:110,bonus:10});
  owner.clearBloodOverhealTemp();
  assert.deepStrictEqual({hp:h.p.hp,maxHp:h.p.maxHp,bonus:h.p.bloodOverhealBonus},{hp:100,maxHp:100,bonus:0});
  assert.strictEqual(h.statsLastHp,100);
}
{
  const h=harness({player:{hp:95,maxHp:100,bloodOverheal:true}});
  assert.strictEqual(owner.healPlayer(20,{overheal:false}),5);
  assert.deepStrictEqual({hp:h.p.hp,maxHp:h.p.maxHp,bonus:h.p.bloodOverhealBonus},{hp:100,maxHp:100,bonus:0});
}

// Cleric V13 + V18 order: base Faith is actual healing*2, then bonus uses the
// amount the capped base layer really added.
{
  const h=harness({activeIdentities:['cleric'],player:{classId:'cleric',hp:50,maxHp:100,clericFaith:10,clericFaithGainBonus:.5}});
  assert.strictEqual(owner.healPlayer(10),10);
  assert.strictEqual(h.p.clericFaith,40); // 10 + 20 base + round(20*.5)
}
{
  const h=harness({activeIdentities:['cleric'],player:{classId:'cleric',hp:50,maxHp:100,clericFaith:95,clericFaithGainBonus:.5}});
  owner.healPlayer(10);
  assert.strictEqual(h.p.clericFaith,100);
}

// Paladin V19 + V21 order and identity/classId distinction.
{
  const h=harness({activeIdentities:['paladin'],player:{classId:'paladin',hp:50,maxHp:100,paladinGrace:20,paladinGraceGainBonus:.5}});
  owner.healPlayer(10);
  assert.strictEqual(h.p.paladinGrace,35);
  assert(h.trace.some(x=>x[0]==='flash'&&x[1].includes('Grace 30/100')), 'V19 flash must occur before bonus Grace');
}
{
  const h=harness({activeIdentities:['paladin'],player:{classId:'slime',hp:50,maxHp:100,paladinGrace:20,paladinGraceGainBonus:1}});
  owner.healPlayer(10);
  assert.strictEqual(h.p.paladinGrace,30, 'Identity Paladin gains base Grace but literal-class bonus must not apply');
}

// Devil's Horns turns true excess into Shield after Blood Overheal growth is excluded.
{
  const h=harness({player:{hp:100,maxHp:100,equipment:{hat:{devilHorns:true},amulet:null}}});
  assert.strictEqual(owner.healPlayer(20),0);
  assert.strictEqual(h.p.energyShield,20);
  assert.strictEqual(h.p.energyShieldCap,100);
  assert(h.trace.some(x=>x[0]==='history'&&x[1].includes("Devil's Horns")));
}
{
  const h=harness({player:{hp:90,maxHp:100,bloodOverheal:true,equipment:{hat:{devilHorns:true},amulet:null}}});
  owner.healPlayer(20);
  assert.strictEqual(h.p.energyShield,0, 'Blood Overheal max-HP growth must be excluded from Horns excess');
}

// Philosopher's Stone: shield + temporary Attack, and Ouroboros converts only
// that Attack gain into Echo while retaining battle cleanup bookkeeping.
{
  const h=harness({currentEnemy:{name:'Dummy',hp:100},player:{hp:100,maxHp:100,attack:10,equipment:{hat:null,amulet:{bloodmageStone:true}}}});
  owner.healPlayer(40);
  assert.strictEqual(h.p.energyShield,2);
  assert.strictEqual(h.p.attack,10.4);
  assert.strictEqual(h.p.v26StoneBattleAttack,.4);
  owner.clearStoneBattle();
  assert.strictEqual(h.p.attack,10);
  assert.strictEqual(h.p.v26StoneBattleAttack,0);
}
{
  const h=harness({activeIdentities:['ouroboros'],currentEnemy:{name:'Dummy',hp:100},player:{classId:'ouroboros',hp:100,maxHp:100,attack:10,doubleStrike:.2,equipment:{hat:null,amulet:{bloodmageStone:true}}}});
  owner.healPlayer(40);
  assert(Math.abs(h.p.doubleStrike-.24)<1e-12);
  assert(Math.abs(h.p.v26StoneBattleEcho-.04)<1e-12);
  assert.strictEqual(h.p.attack,10);
  owner.clearStoneBattle();
  assert(Math.abs(h.p.doubleStrike-.2)<1e-12);
  assert(h.trace.some(x=>x[0]==='ouroSync'));
}

// Crimson Aegis is the outermost shield layer and refreshes Shield UI even for
// a zero-sized heal, matching the historical V27 wrapper.
{
  const h=harness({currentEnemy:{name:'Dummy',hp:100},player:{hp:100,maxHp:100,legendaryOverhealShieldRate:.25}});
  owner.healPlayer(20);
  assert.strictEqual(h.p.energyShield,5);
  assert(h.trace.some(x=>x[0]==='history'&&x[1].includes('Crimson Aegis')));
}
{
  const h=harness();
  assert.strictEqual(owner.healPlayer(0),0);
  assert.deepStrictEqual(h.trace.map(x=>x[0]),['shieldUI']);
}

console.log('Healing / Overheal resolution deterministic contract: PASS');
