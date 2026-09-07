const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'runtime', 'js', 'items', 'consumables.js');
const source = fs.readFileSync(ownerPath, 'utf8');
assert(source.includes('window.DiceboundConsumables = api;'), 'Consumables owner must use canonical direct global assignment');
assert(!source.includes('Math.random'), 'Consumables owner must not own RNG generation');

const sandbox = { window: {}, console, Object, Math, Promise, Set, Map };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: ownerPath });
const owner = sandbox.window.DiceboundConsumables;
assert(owner && owner.owner === 'items/consumables', 'Consumables owner did not initialize');

function enemy(name='Dummy', hp=100) { return { name, hp, maxHp: hp }; }

function harness(options={}) {
  const trace=[];
  const enemies=options.enemies || [enemy()];
  let currentEnemy=options.currentEnemy === undefined ? enemies[0] : options.currentEnemy;
  let combatBusy=!!options.combatBusy;
  let gameStarted=options.gameStarted === undefined ? true : !!options.gameStarted;
  let rollLocked=!!options.rollLocked;
  const stats={potionsUsed:options.potionsUsed||0};
  const chaosQueue=[...(options.chaosQueue||[{}])];
  const p=Object.assign({
    classId:options.classId||'ranger', hp:50, maxHp:100, potions:3, potionPower:0,
    doublePotionTurn:false, guardCooldown:2, monkCombo:4, turtleGuardChain:3,
    dragoonLandingReady:false, dragoonJumpCooldown:0
  }, options.player||{});
  const livingEnemies=()=>enemies.filter(e=>e&&e.hp>0);
  const call=(name,...args)=>trace.push([name,...args]);
  const rt={
    getPlayer:()=>p,
    getCurrentEnemy:()=>currentEnemy,
    livingEnemies,
    getCombatBusy:()=>combatBusy,
    setCombatBusy:value=>{combatBusy=!!value;call('busy',combatBusy);},
    isGameStarted:()=>gameStarted,
    getRollLocked:()=>rollLocked,
    rollD20Chaos:async action=>{call('chaos',action);return chaosQueue.length?chaosQueue.shift():{};},
    healPlayer:amount=>{const healed=Math.min(p.maxHp-p.hp,amount);p.hp+=healed;call('heal',amount,healed);return healed;},
    playHeal:()=>call('sfx'),
    triggerElementEffect:(key,target,meta)=>{call('element',key,target?.name||null,meta?.source);if(options.elementEffect)return options.elementEffect({key,target,meta,p,enemies,trace,setCurrentEnemy:v=>{currentEnemy=v;}});return {message:`${key}!`};},
    getDiboElements:()=>['fire','ice','electric','nature','light','void'],
    applyMythicPantsPulse:()=>{call('pants');return options.pants||'';},
    setCombatText:text=>call('text',text),
    updateCombatUI:()=>call('combatUI'),
    delay:async ms=>call('delay',ms),
    winCombat:async()=>{call('win');currentEnemy=null;return 'win';},
    resolveEnemyResponse:async guarded=>{call('response',guarded);combatBusy=false;return 'response';},
    ensureAlphaMeta:()=>stats,
    checkDynamicClassUnlocks:()=>call('unlockCheck'),
    saveMeta:()=>call('save'),
    renderClassChooser:()=>call('chooser'),
    addLog:html=>call('log',html),
    showToast:text=>call('toast',text),
    updateHud:()=>call('hud'),
    traceCommand:(name,fn,level,args,thisArg)=>{call('trace:start',name,level);let result;try{result=fn.apply(thisArg,args);}catch(error){call('trace:error',name);throw error;}if(result&&typeof result.then==='function')return result.then(value=>{call('trace:end',name);return value;},error=>{call('trace:error',name);throw error;});call('trace:end',name);return result;},
    isClassActive:id=>p.classId===id,
    dragoonActive:()=>options.dragoonActive === undefined ? p.classId==='dragoon' : !!options.dragoonActive,
    dragoonLandingReady:()=>!!p.dragoonLandingReady,
    dragoonLanding:async()=>{call('dragoonLanding');return 'landing';},
    tickDragoonCooldown:()=>{p.dragoonJumpCooldown=Math.max(0,(p.dragoonJumpCooldown||0)-1);call('dragoonTick');}
  };
  owner.configure(rt);
  return {p,stats,enemies,trace,rt,get currentEnemy(){return currentEnemy;},get combatBusy(){return combatBusy;},set gameStarted(v){gameStarted=!!v;},set rollLocked(v){rollLocked=!!v;}};
}

async function run(){
  // Published V16 formula and rounding.
  {
    const h=harness({player:{maxHp:137,potionPower:.25}});
    assert.strictEqual(owner.potionHealValue(), Math.max(1,Math.round((10+137*.10)*1.25)));
    assert.strictEqual(owner.potionHealValue(.5), Math.max(1,Math.round((10+137*.10)*1.25*.5)));
  }

  // One combat Potion: D20 -> consume/account/heal -> Pants -> 630ms -> response.
  {
    const h=harness({chaosQueue:[{potionMult:1.5}],player:{potions:2,hp:20,maxHp:100,potionPower:0}});
    await owner.usePotion();
    assert.strictEqual(h.p.potions,1);
    assert.strictEqual(h.stats.potionsUsed,1);
    assert.strictEqual(h.p.guardCooldown,0);
    assert.deepStrictEqual(h.trace.filter(x=>['trace:start','busy','chaos','unlockCheck','save','heal','sfx','pants','text','combatUI','delay','response','trace:end'].includes(x[0])).map(x=>x[0]),
      ['trace:start','busy','chaos','unlockCheck','save','heal','sfx','pants','text','combatUI','delay','response','trace:end']);
    assert.strictEqual(h.trace.find(x=>x[0]==='delay')[1],630);
  }

  // Double Dose consumes/tracks exactly two Potions and keeps the 180/630 delay order.
  {
    const h=harness({chaosQueue:[{potionMult:1},{potionMult:1}],player:{potions:3,hp:1,maxHp:200,doublePotionTurn:true}});
    await owner.usePotion();
    assert.strictEqual(h.p.potions,1);
    assert.strictEqual(h.stats.potionsUsed,2);
    assert.deepStrictEqual(h.trace.filter(x=>x[0]==='chaos').map(x=>x[1]),['potion','potion']);
    assert.deepStrictEqual(h.trace.filter(x=>x[0]==='delay').map(x=>x[1]),[180,630]);
    assert.strictEqual(h.trace.filter(x=>x[0]==='response').length,1);
    assert(h.trace.find(x=>x[0]==='text')[1].includes('Double Dose'));
  }

  // Forced element happens before all-elements, whose order stays DIBO canonical.
  {
    const h=harness({chaosQueue:[{forceElement:'coffee',allElements:true}],player:{hp:10,maxHp:200}});
    await owner.usePotion();
    const elems=h.trace.filter(x=>x[0]==='element').map(x=>[x[1],x[3]]);
    assert.deepStrictEqual(elems,[
      ['coffee','d20 potion'],['fire','natural twenty potion'],['ice','natural twenty potion'],['electric','natural twenty potion'],
      ['nature','natural twenty potion'],['light','natural twenty potion'],['void','natural twenty potion']
    ]);
  }

  // Potion-triggered elemental kill goes to Victory after the normal 630ms pause and never responds.
  {
    const last=enemy('Last',5);
    const h=harness({enemies:[last],chaosQueue:[{forceElement:'fire'}],elementEffect:({target})=>{target.hp=0;return {message:'burned'};}});
    assert.strictEqual(await owner.usePotion(),'win');
    assert.deepStrictEqual(h.trace.filter(x=>['delay','win','response'].includes(x[0])).map(x=>x[0]),['delay','win']);
  }

  // Road Potion consumes and records exactly one, then logs/toasts/HUD in order.
  {
    const h=harness({currentEnemy:null,player:{potions:2,hp:50,maxHp:100}});
    owner.usePotionOutsideCombat();
    assert.strictEqual(h.p.potions,1);
    assert.strictEqual(h.stats.potionsUsed,1);
    assert.deepStrictEqual(h.trace.filter(x=>['trace:start','unlockCheck','save','heal','sfx','log','toast','hud','trace:end'].includes(x[0])).map(x=>x[0]),
      ['trace:start','unlockCheck','save','heal','sfx','log','toast','hud','trace:end']);
  }

  // Road guards consume nothing and therefore record nothing.
  {
    const h=harness({currentEnemy:null,rollLocked:true,player:{potions:2,hp:50,maxHp:100}});
    owner.usePotionOutsideCombat();
    assert.strictEqual(h.p.potions,2);
    assert.strictEqual(h.stats.potionsUsed,0);
  }

  // V24 repair layer must not double-count the normal V16 core.
  {
    const h=harness({currentEnemy:null,player:{potions:2,hp:50,maxHp:100}});
    owner._test.v24RoadAccountingLayer();
    assert.strictEqual(h.stats.potionsUsed,1);
  }

  // Dragoon Landing bypasses both Potion consumption and normal command tracing.
  {
    const h=harness({classId:'dragoon',dragoonActive:true,player:{potions:2,hp:50,maxHp:100,dragoonLandingReady:true,dragoonJumpCooldown:3}});
    assert.strictEqual(await owner.usePotion(),'landing');
    assert.strictEqual(h.p.potions,2);
    assert.deepStrictEqual(h.trace.map(x=>x[0]),['dragoonLanding']);
  }

  // Normal Dragoon Potion ticks Jump cooldown before entering v25 command tracing.
  {
    const h=harness({classId:'dragoon',dragoonActive:true,player:{potions:2,hp:50,maxHp:100,dragoonJumpCooldown:3}});
    await owner.usePotion();
    assert.strictEqual(h.p.dragoonJumpCooldown,2);
    assert(h.trace.findIndex(x=>x[0]==='dragoonTick') < h.trace.findIndex(x=>x[0]==='trace:start'));
  }

  // Identity Potion resets final Monk/Turtle action state before dispatch.
  {
    const monk=harness({classId:'monk',player:{monkCombo:5,potions:1,hp:50,maxHp:100}});
    await owner.identityPotionAction();
    assert.strictEqual(monk.p.monkCombo,0);
    const turtle=harness({classId:'turtle',player:{turtleGuardChain:4,potions:1,hp:50,maxHp:100}});
    await owner.identityPotionAction();
    assert.strictEqual(turtle.p.turtleGuardChain,0);
  }

  const monolith=fs.readFileSync(path.join(root,'runtime','js','dicebound.js'),'utf8');
  for(const retired of ['usePotionOutsideCombatV24Base','dbFriendPotionBase','usePotion=async function','usePotionOutsideCombat=function','identityPotionAction=async function'])
    assert(!monolith.includes(retired),`Retired consumable shadow ownership returned: ${retired}`);
  assert(monolith.includes('DiceboundConsumables'),'Monolith must configure the extracted Consumables owner');
  const index=fs.readFileSync(path.join(root,'runtime','index.html'),'utf8');
  assert(index.includes('js/items/consumables.js'),'Runtime index must load the Consumables owner');

  console.log('Potion / Consumable action-resolution deterministic contract: PASS');
}

run().catch(error=>{console.error(error);process.exitCode=1;});
