const assert = require('assert');
global.window = global;
require('../runtime/js/combat/encounter-lifecycle.js');
const owner = global.DiceboundCombatEncounterLifecycle;
assert(owner && owner.owner === 'combat/encounter-lifecycle');

function fixture(opts={}) {
  const events=[];
  const player=Object.assign({
    classId: opts.classId || 'ranger', firstHitBlocks:0, combatShield:0, ultimateCharge:0, gold:0,
    summonerAutoSpirit:false, summonerSpirits:['old'], db0511BurnStacks:9, db0511PoisonStacks:8, db0511PoisonPower:7,
    _db060LastElement:'fire'
  }, opts.player || {});
  const meta={pets:{fire:{unlocked:true},ice:{unlocked:false},nature:{unlocked:true}}};
  const tile=opts.tile || {enemyBase:{name:'Wolf',hp:10,attack:3,defense:1,gold:2,xp:2}};
  let state={enemies:[],lead:null,index:0,current:null,tile:null,turn:99,busy:true};
  let title=''; let subtitle=''; let merchantBossBattle=false; let combatKind=null; let scaleCount=0;
  const picks=[...(opts.picks||[])];
  function scaleEnemy(base,kind,packSize){
    scaleCount++;events.push(`scale:${base.name}:${kind}:${packSize}`);
    if(opts.scaleRng)events.push(`rng:scale:${scaleCount}`);
    return {...base,hp:base.hp,maxHp:base.hp,attack:base.attack,defense:base.defense||0,boss:['merchant','miniboss','final'].includes(kind),guardian:['merchant','miniboss','final'].includes(kind),merchantBoss:kind==='merchant',miniBoss:kind==='miniboss',finalBoss:kind==='final',enemyBarrier:base.enemyBarrier||0};
  }
  const rt={
    getPlayer:()=>player,getMeta:()=>meta,getTile:()=>tile,getPosition:()=>opts.position??3,getBoardLevel:()=>opts.boardLevel||1,
    isNightmare:()=>!!opts.nightmare,isHell:()=>!!opts.hell,isClassActive:id=>player.classId===id,
    petIds:()=>['fire','ice','nature'],isPetUnlocked:(m,id)=>!!m.pets?.[id]?.unlocked,
    enemyById:id=>id==='road-merchant'?{name:'The Road Merchant',hp:100,attack:10,defense:2,enemyBarrier:4}:id==='bloodmage-boss'?{name:'The Bloodmage',hp:100,attack:10,defense:2,enemyBarrier:0}:{name:id,hp:10,attack:2},
    finalGuardian:board=>({name:`Final ${board}`,hp:20+board,attack:5+board,defense:2}),
    minibossGuardian:board=>({name:`Mini ${board}`,hp:15+board,attack:4+board,defense:1}),
    enemyForPosition:()=>({name:'Fallback',hp:9,attack:2,defense:0}),scaleEnemy,
    setMerchantBossBattle:v=>{merchantBossBattle=v;events.push(`merchant:${v}`);},
    setCombatKind:k=>{combatKind=k;events.push(`kind:${k}`);},
    setEncounterState:s=>{state={...s};events.push('encounter:set');},getEncounterState:()=>state,
    setEncounterSelection:s=>{state={...state,...s};events.push('encounter:select');},
    mythicalSetCount:()=>opts.setCount||0,hasMythicPiece:slot=>slot==='hat'&&!!opts.hat,startUltimate:()=>35,
    setCombatTitle:v=>{title=v;events.push(`title:${v}`);},getCombatTitle:()=>title,setCombatSubtitle:v=>{subtitle=v;events.push(`subtitle:${v}`);},
    clearCombatHistory:()=>events.push('history:clear'),setCombatText:()=>events.push('combat:text'),showCombatOverlay:()=>events.push('overlay:show'),addLog:()=>events.push('log:start'),
    renderEnemyParty:()=>events.push('render'),updateCombatUI:()=>events.push('ui'),
    pick:pool=>{events.push(`rng:pick:${pool.join('|')}`);return picks.length?picks.shift():pool[0];},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
    identityFlash:()=>events.push('identity'),addCombatHistory:text=>events.push(`history:${text}`),updateBossSpecialIndicator:()=>events.push('boss-indicator'),
    clearStoneBattle:()=>events.push('pre:stone'),restoreEnemyElementDebuffs:()=>events.push('pre:elements'),clearBattleLegendaryTemps:()=>events.push('pre:legendary'),
    traceCoreStart:(kind,work)=>{events.push('trace:before');const out=work();events.push('trace:after');return out;},
    applyCombatBackground:()=>events.push('post:background'),syncBattleLog:()=>events.push('post:battlelog'),clearCombatPresentation:()=>events.push('pre:presentation'),refreshActivePetArt:()=>events.push('post:petart')
  };
  owner.configure(rt);
  return {rt,player,meta,tile,events,start:k=>owner.start(k),state:()=>state,title:()=>title,subtitle:()=>subtitle,kind:()=>combatKind,merchant:()=>merchantBossBattle,scaleCount:()=>scaleCount};
}

{
  const f=fixture(); f.start('normal');
  assert.strictEqual(f.kind(),'normal'); assert.strictEqual(f.state().current.name,'Wolf'); assert.strictEqual(f.player.combatActionCount,0);
  assert.strictEqual(f.player.db0511BurnStacks,0); assert.strictEqual(f.player.db0511PoisonStacks,0); assert.strictEqual(f.player.db0511PoisonPower,0);
  assert.deepStrictEqual(f.events.slice(0,5),['pre:presentation','pre:legendary','pre:elements','pre:stone','trace:before']);
  assert.deepStrictEqual(f.events.slice(-3),['post:background','post:battlelog','post:petart']);
}
{
  const f=fixture({boardLevel:6,scaleRng:true}); f.start('final');
  assert.strictEqual(f.scaleCount(),2,'Board 6 final must preserve historical double scaling call/order');
  assert.strictEqual(f.state().current.name,'Final 6'); assert.strictEqual(f.title(),'Sixth Road Final Guardian');
  const scaleEvents=f.events.filter(x=>x.startsWith('scale:')); assert.deepStrictEqual(scaleEvents,['scale:Final 6:final:1','scale:Final 6:final:1']);
}
{
  const f=fixture({classId:'clown',picks:['Safety Net'],scaleRng:true}); f.start('normal');
  assert.strictEqual(f.player.clownGimmick,'Safety Net'); assert.strictEqual(f.player.combatShield,1);
  assert(f.events.indexOf('rng:scale:1') < f.events.findIndex(x=>x.startsWith('rng:pick:Big Shoes')),'encounter scaling RNG must remain before Clown opening-gag RNG');
}
{
  const f=fixture({classId:'summoner',picks:['nature'],player:{summonerAutoSpirit:true},scaleRng:true}); f.start('normal');
  assert.deepStrictEqual(f.player.summonerSpirits,['nature']);
  assert(f.events.indexOf('rng:scale:1') < f.events.findIndex(x=>x==='rng:pick:fire|nature'),'encounter scaling RNG must remain before Summoner auto-spirit RNG');
}
{
  const f=fixture({classId:'ceo',player:{gold:25000}}); f.start('normal'); assert.strictEqual(f.player.combatShield,3,'CEO 1k + 10k + 25k barriers must remain additive');
}
{
  const f=fixture({boardLevel:2,nightmare:true}); f.start('final'); assert(Math.abs(f.state().current.dodge-.019)<1e-9); assert.strictEqual(f.state().current.enemyBarrier,1);
  const g=fixture({boardLevel:2,hell:true}); g.start('normal'); assert(Math.abs(g.state().current.dodge-.044)<1e-9); assert.strictEqual(g.state().current.enemyBarrier,1);
}
{
  const f=fixture({boardLevel:3}); f.start('bloodmage'); const e=f.state().current;
  assert.strictEqual(e.bloodmageBoss,true); assert.strictEqual(e.guardian,true); assert.strictEqual(e.merchantBoss,false); assert.strictEqual(e.enemyBarrier,2);
  assert.strictEqual(f.title(),'Secret Boss: The Bloodmage');
}
{
  const f=fixture({boardLevel:4}); f.start('devil'); const e=f.state().current;
  assert.strictEqual(e.devilBoss,true); assert.strictEqual(e.boss,true); assert.strictEqual(e.guardian,true); assert.strictEqual(e.enemyBarrier,5); assert.strictEqual(f.player.devilBurnStacks,0);
  assert.strictEqual(f.title(),'Secret Boss: The Pale Devil');
}
console.log('Combat encounter lifecycle deterministic contract: PASS');
