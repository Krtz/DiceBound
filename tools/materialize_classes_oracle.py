from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime" / "js" / "dicebound.js"

source = MONO.read_text(encoding="utf-8")
if "window.DiceboundClassesOracleTest" in source:
    raise SystemExit("Classes oracle seam already exists")
marker = "\n})();"
pos = source.rfind(marker)
if pos < 0:
    raise SystemExit("could not find final dicebound.js closure")

seam = r'''

  // Test-only characterization surface for the Classes subsystem migration.
  // This freezes released 0.6.6.33 class identity/capability/action behavior
  // before ordinary runtime ownership moves behind DiceboundClasses.
  const dbClassesOracleClone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  function dbClassesOracleEnemy(index=0,patch={}){
    return Object.assign({name:`Class Oracle Dummy ${index+1}`,icon:'👹',hp:5000,maxHp:5000,attack:1,defense:0,gold:0,xp:0,weakness:'fire',affinity:null,dodge:0,poisonStacks:0,enemyBarrier:0,guardian:false,boss:false},dbClassesOracleClone(patch||{}));
  }
  function dbClassesOracleClearIdentityRuntime(){
    SlimeRougeRuntime.pendingIdentity=null;SlimeRougeRuntime.pendingUltimate=null;SlimeRougeRuntime.forcedIdentity=null;SlimeRougeRuntime.forcedUltimate=null;
  }
  function dbClassesOracleSetup(classId='ranger',playerPatch={},enemyPatches=[{}]){
    dbClassesOracleClearIdentityRuntime();resetPlayer(classId);Object.assign(player,dbClassesOracleClone(playerPatch||{}));
    boardLevel=3;nightmareMode=false;hellMode=false;gameStarted=true;rollLocked=false;combatBusy=false;runFinalized=false;currentEncounterTurn=0;v16CombatKind='normal';
    currentEnemies=(Array.isArray(enemyPatches)&&enemyPatches.length?enemyPatches:[{}]).map((patch,index)=>dbClassesOracleEnemy(index,patch));currentEnemyIndex=0;currentEnemy=currentEnemies[0]||null;currentEncounterLead=currentEnemy;currentEnemyTile=1;player.position=1;
    while(tiles.length<=1)tiles.push({type:'empty',cleared:false});tiles[1]={type:'enemy',cleared:false,enemyBase:dbClassesOracleClone(currentEnemy)};
    if($('combatText'))$('combatText').textContent='';if($('combatHistory'))$('combatHistory').innerHTML='';$('combatOverlay')?.classList.remove('hidden');
    return dbClassesOracleState();
  }
  function dbClassesOracleState(){
    return {
      boardLevel,nightmareMode:!!nightmareMode,hellMode:!!hellMode,combatBusy:!!combatBusy,
      identity:classIdentityId(),capabilities:[...slimeRougeCapabilities()],
      player:{
        classId:player.classId,hp:player.hp,maxHp:player.maxHp,attack:player.attack,defense:player.defense,dodge:player.dodge,crit:player.crit,doubleStrike:player.doubleStrike,lifeSteal:player.lifeSteal,
        gold:player.gold,potions:player.potions,mana:player.mana,maxMana:player.maxMana,ultimateCharge:player.ultimateCharge,combatShield:player.combatShield,combatActionCount:player.combatActionCount,
        clericFaith:player.clericFaith,beastStance:player.beastStance,monkCombo:player.monkCombo,slimeRougeIdentityClass:player.slimeRougeIdentityClass,slimeRougeUltimateClass:player.slimeRougeUltimateClass,
        summonerSpirits:dbClassesOracleClone(player.summonerSpirits||[]),trainerRoster:dbClassesOracleClone(player.trainerRoster||[]),upgradeCounts:dbClassesOracleClone(player.upgradeCounts||{})
      },
      enemies:currentEnemies.map(enemy=>({name:enemy.name,hp:enemy.hp,maxHp:enemy.maxHp,attack:enemy.attack,defense:enemy.defense,barrier:enemy.enemyBarrier||0,poisonStacks:enemy.poisonStacks||0,rangerMarks:enemy.rangerMarks||0})),
      text:String($('combatText')?.textContent||''),
      meta:{potionsUsed:meta.stats?.potionsUsed||0,manaSpenderCasts:meta.classUnlockFacts?.manaSpenderCasts||0}
    };
  }
  async function dbClassesOracleWithoutResponse(action){
    const oldResponse=resolveEnemyResponse;resolveEnemyResponse=async()=>{combatBusy=false;return {suppressed:true};};
    try{return await action();}finally{resolveEnemyResponse=oldResponse;combatBusy=false;}
  }
  function dbClassesOracleMetadata(){
    const api=window.DiceboundClasses,registry=api.createRegistry(),passives=api.createPassiveRegistry(),unlocks=api.createUnlockRegistry(),mechanics=api.createMechanicsRegistry(),ultimateSupport=api.createUltimateSupportRegistry();
    return {apiVersion:api.apiVersion,ids:[...api.ids],tagVocabulary:[...api.tagVocabulary],classes:Object.fromEntries(api.ids.map(id=>{const c=registry[id];return [id,{id:c.id,name:c.name,secret:!!c.secret,unlock:c.unlock,stats:c.stats,tags:[...(c.tags||[])],base:dbClassesOracleClone(c.base),passive:dbClassesOracleClone(c.passive),ultimate:dbClassesOracleClone(c.ultimate)}];})),passives,unlocks,mechanics,ultimateSupport};
  }
  window.DiceboundClassesOracleTest=Object.freeze({
    apiVersion:1,
    cleanup:()=>{dbClassesOracleClearIdentityRuntime();combatBusy=false;currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;$('combatOverlay')?.classList.add('hidden');return true;},
    state:()=>dbClassesOracleState(),metadata:()=>dbClassesOracleMetadata(),
    identity:(classId='ranger',patch={})=>{dbClassesOracleSetup(classId,patch);return {classId:player.classId,id:classIdentityId(),active:classIdentityActive(classId),mechanics:classMechanicsFor(classIdentityId()),capabilities:[...slimeRougeCapabilities()]};},
    slimeRouge:(identity='summoner',ultimate='pokemontrainer')=>dbClassesOracleClone(window.DiceboundV318Test.forceRun(identity,ultimate)),
    slimeRougeRangerMarks:()=>window.DiceboundV318Test.rangerMarks(),
    slimeRougeConjure:()=>window.DiceboundV318Test.summonerConjure(),
    slimeRougeUltimate:(identity='summoner',ultimate='pokemontrainer')=>window.DiceboundV318Test.realUltimate(identity,ultimate),
    berserkerRage:(missing=.40)=>dbClassesOracleClone(window.DiceboundBeta021Test.rageDamage(missing)),
    rogueSteal:(seed='classes-oracle-rogue')=>window.DiceboundBeta021Test.rogueStealTrial(seed),
    clericConsecration:async()=>{dbClassesOracleSetup('cleric',{maxHp:100,hp:40,attack:20,clericFaith:100,combatShield:0,combatActionCount:0},[{hp:5000,maxHp:5000},{hp:5000,maxHp:5000}]);await dbClassesOracleWithoutResponse(()=>clericConsecration());return dbClassesOracleState();},
    beastmasterStances:()=>{dbClassesOracleSetup('beastmaster');const sequence=[player.beastStance];for(let i=0;i<4;i++){cycleBeastStance();sequence.push(player.beastStance);}return {sequence,state:dbClassesOracleState()};},
    bloodmageReplenish:async()=>{dbClassesOracleSetup('bloodmage',{maxHp:100,hp:40,ultimateCharge:0,combatActionCount:0},[{hp:600,maxHp:1000}]);await dbClassesOracleWithoutResponse(()=>bloodmageReplenish());return dbClassesOracleState();},
    bloodmageExsanguinate:async()=>{dbClassesOracleSetup('bloodmage',{maxHp:100,hp:100,attack:20,ultimateCharge:0,combatActionCount:0},[{hp:5000,maxHp:5000,defense:3}]);await dbClassesOracleWithoutResponse(()=>bloodmageExsanguinate());return dbClassesOracleState();},
    alchemistFlask:async()=>{dbClassesOracleSetup('alchemist',{maxHp:100,hp:100,attack:15,potions:3,potionPower:.50,alchemistFreeFlask:0,alchemistElementChance:0,combatActionCount:0},[{hp:5000,maxHp:5000},{hp:5000,maxHp:5000}]);await dbClassesOracleWithoutResponse(()=>alchemistVolatileFlaskV16());return dbClassesOracleState();},
    monkDodge:()=>{dbClassesOracleSetup('monk',{dodge:.10,monkCombo:3});return {chance:effectiveDodgeChance(),state:dbClassesOracleState()};},
    ninjaExecution:()=>{dbClassesOracleSetup('ninja',{attack:20,_ninjaExecution:true},[{hp:1000,maxHp:1000,defense:12}]);const dealt=damageEnemy(currentEnemy,100,false);return {dealt,state:dbClassesOracleState()};},
    ouroborosSync:()=>{dbClassesOracleSetup('ouroboros',{attack:37,doubleStrike:1.20});const before={attack:player.attack,doubleStrike:player.doubleStrike};v18SyncOuroborosAttack();return {before,after:{attack:player.attack,doubleStrike:player.doubleStrike},state:dbClassesOracleState()};},
    invokerFormula:()=>{dbClassesOracleSetup('invoker');dbInvoker.afterPlayerAction('guard');dbInvoker.afterPlayerAction('generator');dbInvoker.afterPlayerAction('spender');return {active:dbInvoker.active(),state:dbClassesOracleClone(dbInvoker.state(false)),recipe:dbClassesOracleClone(dbInvoker.recipeInfo()),bonuses:dbClassesOracleClone(dbInvoker.actionBonuses()),identity:classIdentityId()};},
    beastmasterButton:()=>{dbClassesOracleSetup('beastmaster');const before=player.beastStance;$('specialAttackBtn')?.click();return {before,after:player.beastStance,state:dbClassesOracleState()};}
  });
'''

MONO.write_text(source[:pos] + seam + source[pos:], encoding="utf-8")
print("Classes oracle seam materialized")
