const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'runtime', 'js', 'combat', 'element-resolution.js');
const source = fs.readFileSync(ownerPath, 'utf8');
assert(source.includes('window.DiceboundCombatElementResolution = api;'), 'Element owner must use canonical direct global assignment');

const sandbox = { window: {}, console, Object, Math, Set, Map };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerPath });
const owner = sandbox.window.DiceboundCombatElementResolution;
assert(owner && owner.owner === 'combat/element-resolution', 'Element owner did not initialize');

const ELEMENTS = {
  fire:{icon:'🔥',name:'Fire',spell:'Fireball'}, ice:{icon:'❄️',name:'Ice',spell:'Ice Nova'}, electric:{icon:'⚡',name:'Electric',spell:'Thunderbolt'},
  light:{icon:'✨',name:'Light',spell:'Holy'}, void:{icon:'🕳️',name:'Void',spell:'Black Hole'}, nature:{icon:'🌿',name:'Nature',spell:'Poison Vines'},
  donut:{icon:'🍩',name:'Donut',spell:'Healing Rain of Donuts'}, tech:{icon:'🤖',name:'Tech',spell:'Brain Hack'}, metal:{icon:'🤘',name:'Metal',spell:'Hard Rock Metal Music'},
  coffee:{icon:'☕',name:'Coffee',spell:'Caffeinated Haste'}, gun:{icon:'🔫',name:'Gun',spell:'Deadeye Volley'}, radiation:{icon:'☢️',name:'Radiation',spell:'Irradiate'},
  math:{icon:'🧮',name:'Math',spell:'Weaponized Equation'}
};
const CORE = ['fire','ice','electric','nature','light','void'];

function harness(options={}) {
  const trace = [], randoms = [...(options.randoms || [])];
  let randomCalls = 0, turn = 0;
  const p = Object.assign({
    classId:'ranger', hp:100, maxHp:100, attack:20, defense:10, ultimateCharge:0,
    equipment:{weapon:null}, combatAttackCount:0, elementProcBonus:0, elementDamageBonus:0,
    weaknessElementBonus:0, elementEchoChance:0, elementUltimateGain:0, naturePoisonStacks:1,
    hasteTurns:0, hasteCooldown:0, _db046HasteLocked:false, _db047HastePrimed:false, confusionActions:0
  }, options.player || {});
  const enemies = options.enemies || [{name:'Dummy',hp:1000,maxHp:1000,attack:20,defense:10,weakness:null,affinity:null,poisonStacks:0,skipTurns:0,freezeCooldown:0}];
  let current = options.current || enemies[0];
  const effects = new Set(options.effects || []);
  const call = (...args) => trace.push(args);
  const rt = {
    getPlayer:()=>p,
    getCurrentEnemy:()=>current,
    setCurrentEnemy:value=>{current=value;},
    livingEnemies:()=>enemies.filter(enemy=>enemy.hp>0),
    getEncounterLead:()=>options.lead || enemies[0],
    getEncounterTurn:()=>turn,
    setEncounterTurn:value=>{turn=value;},
    getElements:()=>ELEMENTS,
    getRarityValues:()=>({poor:0,common:1,uncommon:2,rare:3,epic:4,legendary:5,mythical:6,omega:9}),
    getCoreElements:()=>CORE,
    random:()=>{randomCalls++;const value=randoms.length?randoms.shift():.99;call('rng',value);return value;},
    clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>{const dealt=Math.max(0,Math.round(amount));enemy.hp=Math.max(0,enemy.hp-dealt);call('damage',enemy.name,dealt,ignoreDefense);return dealt;},
    applyPlayerDamage:raw=>{const total=Math.max(0,Math.round(raw));p.hp=Math.max(0,p.hp-total);call('playerDamage',total);return {total};},
    healPlayer:raw=>{const amount=Math.max(0,Math.round(raw)),actual=Math.min(p.maxHp-p.hp,amount);p.hp+=actual;call('heal',raw,actual);return actual;},
    trackElementProgress:(key,value)=>call('progress',key,value),
    playElementAnimation:(key,target,enemySource)=>call('anim',key,enemySource),
    addLog:text=>call('log',text), showToast:text=>call('toast',text), addCombatHistory:text=>call('history',text),
    renderEnemyParty:()=>call('render'), updateCombatUI:()=>call('combatUI'), updateHUD:()=>call('hud'),
    setProcBonus:()=>0, setElementPower:()=>1, hasLegendaryEffect:id=>effects.has(id),
    reconcileDefeatedTarget:(target,reason)=>call('reconcile',target.name,reason),
    withNatureLegacyPresentation:(key,fn)=>{call('natureScope',key);return fn();},
    livingNatureTargets:list=>list.slice(), playNatureOnEnemy:enemy=>call('natureEnemy',enemy.name), playNatureOnPlayer:()=>call('naturePlayer'),
    playDonutRain:payload=>call('donutVfx',payload.origin), playProjectileProc:(key,payload)=>call('projectile',key,payload.origin),
    playMathFormula:payload=>call('mathVfx',payload.origin),
    applyEnemyConfusion:enemy=>{enemy.confusionActions=1;call('enemyConfused',enemy.name);return 1;},
    applyPlayerConfusion:()=>{p.confusionActions=1;call('playerConfused');return 1;},
    clearPlayerConfusion:()=>{p.confusionActions=0;call('clearPlayerConfusion');return 0;},
    recordCareerElementProc:key=>call('careerElement',key)
  };
  owner.configure(rt);
  return {p,enemies,trace,rt,get current(){return current;},get randomCalls(){return randomCalls;},get turn(){return turn;}};
}

// Forced Fire consumes Echo RNG before the later Burn RNG.
{
  const h=harness({randoms:[.9,.1]}), e=h.enemies[0];
  const result=owner.triggerElementEffect('fire',e,{forced:true,source:'test'});
  assert(result && result.totalDamage===14);
  assert.strictEqual(h.randomCalls,2);
  assert.strictEqual(e.burnStacks,1);
  const rngIndexes=h.trace.map((entry,index)=>entry[0]==='rng'?index:-1).filter(index=>index>=0);
  const burnHistory=h.trace.findIndex(entry=>entry[0]==='history'&&entry[1].includes('ignites'));
  assert(rngIndexes[1]<burnHistory,'Burn RNG must occur after core Echo RNG and before burn history');
}

// Non-forced weapon Fire preserves proc -> Echo -> Burn draw order.
{
  const h=harness({randoms:[.01,.9,.9],player:{equipment:{weapon:{element:'fire',rarity:'common'}}}});
  assert(owner.triggerWeaponElement(h.enemies[0]));
  assert.strictEqual(h.randomCalls,3);
}

// Affinity halves matching damage; Electric stun draw precedes Echo draw.
{
  const e={name:'Coil',hp:1000,maxHp:1000,attack:10,defense:0,weakness:null,affinity:'electric',skipTurns:0,freezeCooldown:0};
  const h=harness({enemies:[e],randoms:[.1,.9]});
  const result=owner.triggerElementEffect('electric',e,{forced:true});
  assert.strictEqual(result.totalDamage,7);
  assert.strictEqual(e.skipTurns,1);
  assert.strictEqual(h.randomCalls,2);
}

// Ice/Electric control chances are 25% after the elemental proc.
{
  const e={name:'Ice Dummy',hp:1000,maxHp:1000,attack:10,defense:0,weakness:null,affinity:null,skipTurns:0,freezeCooldown:0};
  const miss=harness({enemies:[e],randoms:[.30,.9]});
  const missResult=owner.triggerElementEffect('ice',e,{forced:true});
  assert.strictEqual(missResult.totalDamage,14);
  assert.strictEqual(e.skipTurns,0,'Ice must no longer freeze automatically');
  const e2={name:'Ice Dummy 2',hp:1000,maxHp:1000,attack:10,defense:0,weakness:null,affinity:null,skipTurns:0,freezeCooldown:0};
  const hit=harness({enemies:[e2],randoms:[.24,.9]});
  owner.triggerElementEffect('ice',e2,{forced:true});
  assert.strictEqual(e2.skipTurns,1,'Ice must freeze on a sub-25% status roll');
}
{
  const e={name:'Shock Dummy',hp:1000,maxHp:1000,attack:10,defense:0,weakness:null,affinity:null,skipTurns:0,freezeCooldown:0};
  const h=harness({enemies:[e],randoms:[.24,.9]});
  owner.triggerElementEffect('electric',e,{forced:true});
  assert.strictEqual(e.skipTurns,1,'Electric Stun must use the approved 25% chance');
}

// Light is 70% single-target damage and still delegates healing ownership.
{
  const selected={name:'Light Dummy',hp:1000,maxHp:1000,attack:10,defense:0,weakness:null,affinity:null};
  const bystander={name:'Bystander',hp:1000,maxHp:1000,attack:10,defense:0,weakness:null,affinity:null};
  const h=harness({enemies:[selected,bystander],player:{hp:50,maxHp:100},randoms:[.9]});
  const result=owner.triggerElementEffect('light',selected,{forced:true});
  assert.strictEqual(result.totalDamage,14);
  assert.strictEqual(result.heal,9);
  assert.strictEqual(selected.hp,986);
  assert.strictEqual(bystander.hp,1000,'Light damage must be single-target');
  assert(h.trace.some(entry=>entry[0]==='heal'));
}

// Gun is the heavy single-target proc: 120% Attack and 75% Defense pierce.
{
  const e={name:'Armored Dummy',hp:1000,maxHp:1000,attack:10,defense:20,weakness:null,affinity:null};
  const h=harness({enemies:[e],randoms:[.9]});
  const result=owner.triggerElementEffect('gun',e,{forced:true});
  assert.strictEqual(result.totalDamage,39,'20 ATK -> 24 base + 15 armor-pierce compensation');
  assert(!h.trace.some(entry=>entry[0]==='anim'&&entry[1]==='gun'),'Deadeye Volley must not request the retired emoji element animation when dedicated art exists');
  assert(h.trace.some(entry=>entry[0]==='projectile'&&entry[1]==='gun'),'Deadeye Volley must still request its dedicated authored projectile VFX');
}

// Tech is 30% damage with its 10% current-battle Attack reduction.
{
  const e={name:'Tech Dummy',hp:1000,maxHp:1000,attack:50,defense:0,weakness:null,affinity:null};
  const h=harness({enemies:[e],randoms:[.9]});
  const result=owner.triggerElementEffect('tech',e,{forced:true});
  assert.strictEqual(result.totalDamage,6);
  assert.strictEqual(e.attack,45);
}

// Radiation is 40% damage and removes 10% current Defense without driving it negative.
{
  const e={name:'Rad Dummy',hp:1000,maxHp:1000,attack:10,defense:20,weakness:null,affinity:null};
  const h=harness({enemies:[e]});
  const result=owner.triggerElementEffect('radiation',e,{forced:true});
  assert.strictEqual(result.totalDamage,8);
  assert.strictEqual(h.randomCalls,0);
  assert.strictEqual(e.defense,18);
}
{
  const e={name:'Zero Defense',hp:1000,maxHp:1000,attack:10,defense:0,weakness:null,affinity:null};
  const h=harness({enemies:[e]});
  owner.triggerElementEffect('radiation',e,{forced:true});
  assert.strictEqual(e.defense,0);
}

// Math is 30% damage; a successful 25% roll applies one-action Confusion and plays formula VFX.
{
  const e={name:'Math Dummy',hp:1000,maxHp:1000,attack:10,defense:0,weakness:null,affinity:null,confusionActions:0};
  const h=harness({enemies:[e],randoms:[.24,.9]});
  const result=owner.triggerElementEffect('math',e,{forced:true});
  assert.strictEqual(result.totalDamage,6);
  assert.strictEqual(e.confusionActions,1);
  assert(h.trace.some(entry=>entry[0]==='enemyConfused'&&entry[1]==='Math Dummy'));
  assert(h.trace.some(entry=>entry[0]==='mathVfx'&&entry[1]==='player'));
}

// Coffee preserves cooldown and both historical anti-lock layers.
{
  const h=harness({player:{hasteTurns:3}});
  assert.strictEqual(owner.clampQueuedHaste(0),1);
  h.p.hasteTurns=3;
  assert.strictEqual(owner.clampQueuedHaste(2),2);
}
{
  const h=harness({randoms:[.9],player:{hasteTurns:0,hasteCooldown:1}});
  const result=owner.triggerElementEffect('coffee',h.enemies[0],{forced:true});
  assert.strictEqual(h.p.hasteTurns,0);
  assert(result.message.includes('cooling down'));
}
{
  const h=harness({randoms:[.9,.9]});
  owner.triggerElementEffect('coffee',h.enemies[0],{forced:true});
  assert.strictEqual(h.p.hasteTurns,1);
  assert.strictEqual(h.p._db046HasteLocked,true);
  assert.strictEqual(h.p._db047HastePrimed,true);
  owner.triggerElementEffect('coffee',h.enemies[0],{forced:true});
  assert.strictEqual(h.p.hasteTurns,1);
}

// Second Barrel repeats the predecessor mechanics but bypasses later outer VFX.
{
  const h=harness({effects:['second_barrel'],randoms:[.9,.9]});
  const result=owner.triggerElementEffect('gun',h.enemies[0],{forced:true});
  assert(result.totalDamage>20);
  assert.strictEqual(h.randomCalls,2);
  assert.strictEqual(h.trace.filter(entry=>entry[0]==='projectile').length,1);
}

// Nature/Donut mechanics remain here while authored presentation is callback-owned.
{
  const h=harness({randoms:[.9]});
  owner.triggerElementEffect('nature',h.enemies[0],{forced:true});
  assert(h.trace.some(entry=>entry[0]==='natureEnemy'));
}
{
  const h=harness({randoms:[.9]});
  owner.triggerElementEffect('donut',h.enemies[0],{forced:true});
  assert(h.trace.some(entry=>entry[0]==='donutVfx'&&entry[1]==='player'));
}

// Enemy Fire parity consumes proc then Burn RNG and applies player status.
{
  const e={name:'Imp',hp:100,maxHp:100,attack:20,defense:0,affinity:'fire',elementProcChance:1};
  const h=harness({enemies:[e],randoms:[.2,.1],player:{hp:100,maxHp:100}});
  const note=owner.enemyElementProc(e);
  assert(note.includes('14 Fire damage'));
  assert.strictEqual(h.p.db0511BurnStacks,1);
  assert.strictEqual(h.randomCalls,2);
}

// Enemy Math can Confuse the player; enemy Light heals its whole living side.
{
  const e={name:'Professor',hp:100,maxHp:100,attack:20,defense:0,affinity:'math',elementProcChance:1};
  const h=harness({enemies:[e],randoms:[.2,.2],player:{hp:100,maxHp:100,confusionActions:0}});
  const note=owner.enemyElementProc(e);
  assert(note.includes('6 Math damage'));
  assert.strictEqual(h.p.confusionActions,1);
  assert(h.trace.some(entry=>entry[0]==='mathVfx'&&entry[1]==='enemy'));
}
{
  const caster={name:'Cleric Enemy',hp:50,maxHp:100,attack:20,defense:0,affinity:'light',elementProcChance:1};
  const ally={name:'Ally',hp:40,maxHp:100,attack:10,defense:0,affinity:null,elementProcChance:0};
  const h=harness({enemies:[caster,ally],randoms:[.2]});
  owner.enemyElementProc(caster);
  assert.strictEqual(caster.hp,59);
  assert.strictEqual(ally.hp,49,'enemy Light heal must affect every living enemy-side ally');
}

// Innate mutation is seen by the inner Nature wrapper, while outer projectile
// observers retain the original affinity exactly as the historical nesting did.
{
  const e={name:'Devil',hp:100,maxHp:100,attack:20,defense:0,affinity:'ice',innateElement:'nature',elementProcChance:1};
  const h=harness({enemies:[e],randoms:[.2]});
  owner.enemyElementProc(e);
  assert(h.trace.some(entry=>entry[0]==='natureScope'&&entry[1]==='nature'));
  assert(h.trace.some(entry=>entry[0]==='naturePlayer'));
  assert(!h.trace.some(entry=>entry[0]==='projectile'));
  assert.strictEqual(e.affinity,'ice');
}
{
  const e={name:'Devil',hp:100,maxHp:100,attack:20,defense:0,affinity:'fire',innateElement:'nature',elementProcChance:1};
  const h=harness({enemies:[e],randoms:[.2]});
  owner.enemyElementProc(e);
  assert(h.trace.some(entry=>entry[0]==='naturePlayer'));
  assert(h.trace.some(entry=>entry[0]==='projectile'&&entry[1]==='fire'&&entry[2]==='enemy'));
}

// Enemy elemental temporary state restores as one owner transaction.
{
  const h=harness({player:{attack:7,defense:3,db0511TechAttackLost:2,radiationDefenseLost:1,db0511BurnStacks:3,db0511PoisonStacks:2,db0511PoisonPower:.2,_db0511SkipAction:'x',_db0511SuppressControlProc:true}});
  owner.restoreEnemyElementDebuffs();
  assert.deepStrictEqual(
    {attack:h.p.attack,defense:h.p.defense,burn:h.p.db0511BurnStacks,poison:h.p.db0511PoisonStacks,skip:h.p._db0511SkipAction,suppress:h.p._db0511SuppressControlProc},
    {attack:9,defense:4,burn:0,poison:0,skip:'',suppress:false}
  );
  assert(h.trace.some(entry=>entry[0]==='clearPlayerConfusion'),'combat cleanup must clear player Confusion');
}

console.log('Combat Element Resolution deterministic contract: PASS');
