const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');
const facadePath=path.join(root,'runtime','js','combat','facade.js');
const source=fs.readFileSync(facadePath,'utf8');
const sandbox={window:{},console,Object};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:facadePath});
const combat=sandbox.window.DiceboundCombat;
assert(combat&&combat.owner==='combat/facade'&&combat.apiVersion===1,'Combat facade did not initialize');

const calls=[];
const svc=(name,methods)=>Object.fromEntries(methods.map(method=>[method,(...args)=>{calls.push([name,method,...args]);return `${name}.${method}`;} ]));
combat.configure({
  encounter:svc('encounter',['start']),
  attack:svc('attack',['playerAttack']),
  guard:svc('guard',['guardAction','identityGuardAction']),
  mana:svc('mana',['manaGain','occultChannelAttack','occultSpellAttack','summonerConjure']),
  ultimate:svc('ultimate',['start']),
  petTurn:svc('petTurn',['petTurn','petDamage','trainerPetDamage','petElementFor','activeTrainerPetId','maybePetElementProc','trainerStrike']),
  turns:svc('turns',['enemyTurn','resolveEnemyResponse','applyPlayerDamage']),
  victory:svc('victory',['winCombat']),
  elements:svc('elements',['triggerElementEffect','currentWeaponElement','triggerWeaponElement','enemyElementProc','affinityElementMultiplier','elementHit','elementHitAll','restoreRadiationDefense','restoreEnemyElementDebuffs','addEnemyBurn']),
  healing:svc('healing',['recordHealing','healPlayer','clearBloodOverhealTemp','clearStoneBattle']),
  d20:svc('d20',['rollD20Chaos','initializePlayerState']),
  strikes:svc('strikes',['strikeBaseDamage','performStrike']),
  scaling:svc('scaling',['scale'])
});
assert.strictEqual(combat.attack('a'),'attack.playerAttack');
assert.strictEqual(combat.guard('g'),'guard.guardAction');
assert.strictEqual(combat.spell('s'),'mana.occultSpellAttack');
assert.strictEqual(combat.ultimate('u'),'ultimate.start');
assert.strictEqual(combat.petDamage(),'petTurn.petDamage');
assert.strictEqual(combat.enemyResponse(false),'turns.resolveEnemyResponse');
assert.strictEqual(combat.element('fire',{}),'elements.triggerElementEffect');
assert.strictEqual(combat.heal(5),'healing.healPlayer');
assert.strictEqual(combat.win(),'victory.winCombat');
assert.strictEqual(combat.scaleEnemy({}),'scaling.scale');
assert.strictEqual(calls.length,10,'Combat facade forwarding smoke did not exercise expected methods');

const monolith=fs.readFileSync(path.join(root,'runtime','js','dicebound.js'),'utf8');
assert(monolith.includes('const dbCombatOwner=window.DiceboundCombat;'),'Combat public facade owner binding missing');
assert(monolith.includes('dbCombat=dbCombatOwner.configure({'),'Combat public facade composition binding missing');

// These are genuine first-class seams: the released runtime passes/replaces
// them as values or hooks, so they remain narrow root-level interception points.
for(const snippet of [
  'async function playerAttack(...args){return dbCombat.attack(...args);}',
  'async function guardAction(...args){return dbCombat.guard(...args);}',
  'function startCombat(kind="normal"){return dbCombat.startEncounter(kind);}',
  'async function resolveEnemyResponse(...args){return dbCombat.enemyResponse(...args);}',
  'async function useUltimate(...args){return dbCombat.ultimate(...args);}',
  'if(dbCombat)return dbCombat.petDamage();'
])assert(monolith.includes(snippet),`Missing intentional Combat seam/composition route: ${snippet}`);

// Call-only compatibility functions are not architecture.  Their callers now
// invoke DiceboundCombat directly; rebuilding these wrappers would recreate the
// historical layer this release is removing.
const retiredForwarders=[
  'activeTrainerPetId','affinityElementMultiplier','clearBloodOverhealTemp',
  'currentWeaponElement','elementHit','elementHitAll','enemyElementProc','enemyTurn',
  'healPlayer','manaGain','maybePetElementProc','occultChannelAttack',
  'occultSpellAttack','performStrike','petElementFor','recordHealing',
  'strikeBaseDamage','summonerConjure','trainerPetDamage','trainerStrike',
  'triggerElementEffect','triggerWeaponElement','winCombat'
];
for(const name of retiredForwarders){
  assert(!new RegExp(`\\b(?:async\\s+)?function\\s+${name}\\s*\\(`).test(monolith),`retired Combat forwarding adapter returned: ${name}`);
}
for(const direct of [
  'dbCombat.win(',
  'dbCombat.element(',
  'dbCombat.heal(',
  'dbCombat.spell(',
  'dbCombat.manaGain(',
  'dbCombat.strike(',
  'dbCombat.strikeBaseDamage('
])assert(monolith.includes(direct),`ordinary Combat callers no longer route directly through facade: ${direct}`);

for(const retired of [
  'return dbCombatAttackResolution.playerAttack(...args);',
  'return dbCombatGuardResolution.guardAction(...args);',
  'return dbCombatEncounterLifecycle.start(kind);',
  'return dbCombatVictoryResolution.winCombat(...args);',
  'return dbCombatTurns.resolveEnemyResponse(...args);',
  'return dbCombatManaActionResolution.occultSpellAttack.apply(this,args);',
  'if(dbCombatPetTurnResolution)return dbCombatPetTurnResolution.petDamage();'
])assert(!monolith.includes(retired),`Peer-public Combat adapter returned: ${retired}`);
assert(!source.includes('DiceboundCombatPresentation'),'Engine facade must not absorb Combat Presentation');
assert(!source.includes('DiceboundCombatVfx'),'Engine facade must not absorb Combat VFX');
const index=fs.readFileSync(path.join(root,'runtime','index.html'),'utf8');
assert(index.indexOf('js/combat/facade.js')>index.indexOf('js/combat/mana-action-resolution.js'),'Combat facade must load after engine internals');
assert(index.indexOf('js/combat/facade.js')<index.indexOf('js/dicebound.js'),'Combat facade must load before composition monolith');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime','js','module-manifest.json'),'utf8'));
const entry=manifest.modules.find(module=>module.id==='combat-facade');
assert(entry&&entry.provides.includes('DiceboundCombat'),'Combat facade missing from module manifest');
assert(!entry.requires.includes('combat-presentation')&&!entry.requires.includes('combat-vfx'),'Combat Engine facade must keep View/VFX out of its dependency boundary');
console.log('Combat public facade ownership contract: PASS — call-only adapters retired; intentional hooks preserved.');
