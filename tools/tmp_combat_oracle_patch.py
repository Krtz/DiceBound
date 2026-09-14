from pathlib import Path

path=Path('runtime/js/dicebound.js')
text=path.read_text(encoding='utf-8')
anchor="  // Test-only characterization surface for the Progression subsystem migration.\n"
if anchor not in text:
    raise SystemExit('Combat oracle insertion anchor missing')
if 'window.DiceboundCombatOracleTest=Object.freeze({' in text:
    raise SystemExit('Combat oracle surface already present')

surface=r'''  // Test-only characterization surface for the Combat subsystem migration.
  // This freezes released 0.6.6.30 engine composition before DiceboundCombat
  // becomes the ordinary public facade. It is never wired to player-facing UI.
  function dbCombatOracleClone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function dbCombatOracleEnemy(spec={},index=0){
    const hp=Math.max(0,Number(spec.hp??100)||0),maxHp=Math.max(hp,Number(spec.maxHp??hp)||hp||1);
    return Object.assign({id:`combat-oracle-${index}`,name:`Combat Oracle ${index+1}`,icon:'🎯',hp,maxHp,attack:1,defense:0,gold:0,xp:0,weakness:null,affinity:null,poisonStacks:0,rangerMarks:0,boss:false,miniBoss:false,finalBoss:false,guardian:false},dbCombatOracleClone(spec));
  }
  function dbCombatOraclePlayerState(){
    const keys=['classId','level','hp','maxHp','attack','defense','gold','xp','xpNext','crit','doubleStrike','damageBonus','bossDamage','lifeSteal','luck','ultimateCharge','ultimateAttackGain','critUltimateGain','guardCooldown','combatShield','mana','maxMana','potions','combatActionCount','combatAttackCount','poisonStacks','energyShield','hasteQueued','hastePrimed','skipNextEnemyResponse','petDoubleChance','petDamageBonus','elementDamageBonus','monkCombo','clownGimmick','beastStance','summonerSpirits','trainerRoster','dragoonJumpCooldown','dragoonAirborneResponses','dragoonLandingReady'];
    const out={};for(const key of keys)if(player[key]!==undefined)out[key]=dbCombatOracleClone(player[key]);return out;
  }
  function dbCombatOracleSnapshot(){
    const stats=meta?.stats||{};
    return dbCombatOracleClone({
      boardLevel,nightmareMode:!!nightmareMode,hellMode:!!hellMode,gameStarted:!!gameStarted,rollLocked:!!rollLocked,combatBusy:!!combatBusy,combatKind:v16CombatKind,
      encounterTurn:currentEncounterTurn,currentEnemyIndex,currentEnemyName:currentEnemy?.name||null,currentEnemyTile,
      player:dbCombatOraclePlayerState(),enemies:(currentEnemies||[]).map(enemy=>dbCombatOracleClone(enemy)),
      meta:{activePet:meta?.activePet||null,petCookies:meta?.petCookies||0,classUnlockFacts:dbCombatOracleClone(meta?.classUnlockFacts||{}),stats:{enemiesDefeated:stats.enemiesDefeated||0,bossesDefeated:stats.bossesDefeated||0,minibossesDefeated:stats.minibossesDefeated||0}},
      text:String($('combatText')?.textContent||''),history:String($('combatHistory')?.textContent||''),overlayHidden:$('combatOverlay')?.classList.contains('hidden')!==false,lootVisible:$('lootOverlay')?.classList.contains('hidden')===false,pendingLevelUps
    });
  }
  function dbCombatOracleDismissTransient(){
    $('lootOverlay')?.classList.add('hidden');$('legendaryChoiceOverlay')?.classList.add('hidden');$('levelUpOverlay')?.classList.add('hidden');
    pendingLootItem=null;pendingLootCallback=null;return true;
  }
  function dbCombatOracleCleanup(){
    dbCombatOracleDismissTransient();
    currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEnemyTile=null;currentEnemyIndex=0;currentEncounterTurn=0;combatBusy=false;
    $('combatOverlay')?.classList.add('hidden');
    if($('combatHistory'))$('combatHistory').innerHTML='';if($('combatText'))$('combatText').textContent='';
    return true;
  }
  function dbCombatOracleSetup(spec={}){
    dbCombatOracleCleanup();
    resetPlayer(spec.classId||'ranger');
    Object.assign(player,dbCombatOracleClone(spec.player||{}));
    boardLevel=Math.max(1,Math.min(6,Math.floor(Number(spec.board)||1)));nightmareMode=!!spec.nightmare;hellMode=!!spec.hell;gameStarted=true;rollLocked=false;combatBusy=!!spec.busy;runFinalized=false;
    const enemySpecs=Array.isArray(spec.enemies)&&spec.enemies.length?spec.enemies:[{}];currentEnemies=enemySpecs.map((enemy,index)=>dbCombatOracleEnemy(enemy,index));currentEnemyIndex=Math.max(0,Math.min(currentEnemies.length-1,Math.floor(Number(spec.currentIndex)||0)));currentEnemy=currentEnemies[currentEnemyIndex]||null;currentEncounterLead=currentEnemies[0]||currentEnemy;
    if(currentEncounterLead&&spec.lead)Object.assign(currentEncounterLead,dbCombatOracleClone(spec.lead));
    currentEncounterTurn=Math.max(0,Math.floor(Number(spec.turn)||0));v16CombatKind=String(spec.combatKind||'normal');
    const tileIndex=Math.max(0,Math.floor(Number(spec.tileIndex)||Math.max(1,Number(player.position)||1)));player.position=tileIndex;while(tiles.length<=tileIndex)tiles.push({type:'empty',cleared:false});tiles[tileIndex]={type:String(spec.tileType||'enemy'),cleared:false,enemyBase:dbCombatOracleClone(currentEncounterLead)};currentEnemyTile=tileIndex;
    meta.activePet='neutral';meta.pets=meta.pets||{};meta.pets.neutral=Object.assign({unlocked:true,level:1,xp:0},meta.pets.neutral||{});
    if($('combatHistory'))$('combatHistory').innerHTML='';if($('combatText'))$('combatText').textContent='';$('combatOverlay')?.classList.remove('hidden');
    updateCombatUI();return dbCombatOracleSnapshot();
  }
  function dbCombatOraclePrepareEncounter(spec={}){
    dbCombatOracleCleanup();resetPlayer(spec.classId||'ranger');Object.assign(player,dbCombatOracleClone(spec.player||{}));
    boardLevel=Math.max(1,Math.min(6,Math.floor(Number(spec.board)||1));nightmareMode=!!spec.nightmare;hellMode=!!spec.hell;gameStarted=true;rollLocked=false;combatBusy=false;runFinalized=false;v16CombatKind='normal';
    const tileIndex=Math.max(1,Math.floor(Number(spec.tileIndex)||1);player.position=tileIndex;while(tiles.length<=tileIndex)tiles.push({type:'empty',cleared:false});const base=enemyForPosition(tileIndex);if(!base)throw new Error('Combat oracle could not resolve ordinary encounter base.');tiles[tileIndex]={type:'enemy',cleared:false,enemyBase:dbCombatOracleClone(base)};currentEnemyTile=null;return dbCombatOracleClone(base);
  }
  window.DiceboundCombatOracleTest=Object.freeze({
    snapshot:dbCombatOracleSnapshot,cleanup:dbCombatOracleCleanup,dismissTransient:dbCombatOracleDismissTransient,setup:dbCombatOracleSetup,prepareEncounter:dbCombatOraclePrepareEncounter,
    startEncounter:kind=>startCombat(kind||'normal'),attack:(...args)=>playerAttack(...args),guard:(...args)=>guardAction(...args),channel:(...args)=>occultChannelAttack(...args),spell:(...args)=>occultSpellAttack(...args),ultimate:(...args)=>useUltimate(...args),petTurn:(...args)=>petTurn(...args),enemyResponse:(...args)=>resolveEnemyResponse(...args),
    element:(key,options={})=>triggerElementEffect(key,currentEnemy,options),heal:(amount,options)=>healPlayer(amount,options),chaos:action=>rollD20Chaos(action),win:(...args)=>winCombat(...args),select:index=>setCurrentEnemy(index),patchPlayer:patch=>Object.assign(player,dbCombatOracleClone(patch||{})),patchEnemy:(index,patch)=>Object.assign(currentEnemies[index],dbCombatOracleClone(patch||{}))
  });

'''
# Fix two deliberate formatting-sensitive expressions after raw insertion construction.
surface=surface.replace("boardLevel=Math.max(1,Math.min(6,Math.floor(Number(spec.board)||1));", "boardLevel=Math.max(1,Math.min(6,Math.floor(Number(spec.board)||1)));")
surface=surface.replace("const tileIndex=Math.max(1,Math.floor(Number(spec.tileIndex)||1);", "const tileIndex=Math.max(1,Math.floor(Number(spec.tileIndex)||1));")
text=text.replace(anchor,surface+anchor,1)
path.write_text(text,encoding='utf-8',newline='\n')
print('Combat oracle characterization surface inserted')
