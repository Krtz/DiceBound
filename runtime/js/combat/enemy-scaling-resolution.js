(() => {
  "use strict";

  // #309 / #40 / #209: authoritative enemy scaling and difficulty resolution.
  // This is deliberately a single ordered pipeline. The historical monolith
  // implemented the same behavior as eleven nested scaleEnemy reassignments;
  // each stage below preserves that exact order, rounding and RNG consumption.
  function configure(deps={}){
    const getState=deps.getState;
    const currentTileCount=deps.currentTileCount;
    const clamp=deps.clamp;
    const random=deps.random;
    const pick=deps.pick;
    const db317Board=deps.getBoard;
    const db064EnemyPolicy=deps.enemyPolicy;
    const ELEMENT_KEYS=[...(deps.elementKeys||[])];
    const beta045EnemyArtForName=deps.beta045EnemyArtForName||(()=>null);
    const db046EnemyArtForName=deps.db046EnemyArtForName||(()=>null);
    const db047UiArt=deps.db047UiArt||(()=>null);

    if(typeof getState!=="function")throw new Error("Enemy scaling requires getState().");
    if(typeof currentTileCount!=="function")throw new Error("Enemy scaling requires currentTileCount().");
    if(typeof clamp!=="function"||typeof random!=="function"||typeof pick!=="function")throw new Error("Enemy scaling requires clamp/random/pick callbacks.");
    if(typeof db317Board!=="function")throw new Error("Enemy scaling requires board lookup.");
    if(!db064EnemyPolicy?.standardDevilFlameChance)throw new Error("Enemy scaling requires enemy policy.");
    if(!ELEMENT_KEYS.length)throw new Error("Enemy scaling requires element ids.");

    function combatMode(hellMode,nightmareMode){return hellMode?'hell':nightmareMode?'nightmare':'normal';}
    function isStandardDevil(enemy){return /\bdevil\b/i.test(String(enemy?.name||''))&&!/\bpale\s+devil\b/i.test(String(enemy?.name||''));}

    function scale(base,kind="normal",packSize=1){
      const state=getState()||{},player=state.player||{},boardLevel=Number(state.boardLevel)||1,nightmareMode=!!state.nightmareMode,hellMode=!!state.hellMode;

      // Original owner ----------------------------------------------------
      const progress=player.position/Math.max(1,currentTileCount()-1),global=(boardLevel-1)+progress,isMini=kind==="miniboss",isFinal=kind==="final",isMerchant=kind==="merchant",isBoss=isMini||isFinal||isMerchant,levelScale=1+(player.level-1)*.15+global*.84,boardScale=boardLevel===4?2.30:boardLevel===3?1.68:boardLevel===2?1.28:1,packHp=packSize>1?(packSize===2?.78:.66):1,packAtk=packSize>1?(packSize===2?.82:.70):1;
      let hp=Math.round(base.hp*levelScale*boardScale*(isFinal?2.65:isMini?1.66:isMerchant?2.9:1)*packHp),attack=Math.round(base.attack*(1+(player.level-1)*.095+global*.62)*(boardLevel===4?1.82:boardLevel===3?1.48:boardLevel===2?1.22:1)*(isFinal?1.27:isMini?1.12:isMerchant?1.5:1)*packAtk);const archetype=Number(base.defenseBias||0),roadArmor=global*(1.25+Math.max(0,archetype)*.16)+(boardLevel-1)*.75;let defense=Math.max(0,Math.floor(roadArmor+archetype+(isMini?2:isFinal?4:isMerchant?8:0)));if(nightmareMode){hp*=2;attack*=2;defense*=2;}
      const elementalChance=clamp(.04+global*.065+(nightmareMode?.18:0),.04,.62),affinity=isBoss?(base.affinity||pick(ELEMENT_KEYS)):(random()<elementalChance?pick(ELEMENT_KEYS):null),elementProcChance=affinity?clamp((isBoss?.28:.10)+global*.025+(nightmareMode?.08:0),.10,.55):0;
      const enemy={...base,hp,maxHp:hp,attack,defense,xp:Math.round(base.xp*(1+global*.72)*(isFinal?4.4:isMini?2.4:isMerchant?5:1)),gold:Math.round(base.gold*(1+global*.72)*(isFinal?4.5:isMini?2.5:isMerchant?5:1)),boss:isBoss,guardian:isBoss,miniBoss:isMini,finalBoss:isFinal,merchantBoss:isMerchant,skipTurns:0,poisonStacks:0,affinity,elementProcChance};
      if(boardLevel===6){const balance=db317Board(6).balance;enemy.hp=Math.round(enemy.hp*balance.extraHp);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*balance.extraAttack);enemy.defense=Math.round((enemy.defense||0)*balance.extraDefenseMult+balance.extraDefenseFlat);if(kind==="miniboss"||kind==="final"){enemy.hp=Math.round(enemy.hp*balance.guardianHp);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*balance.guardianAttack);}}
      if(enemy.name==="Cultist")enemy.lifeSteal=hellMode?.20:nightmareMode?.10:.01;

      // Alpha v1 Board 4 hardening ---------------------------------------
      if(boardLevel===4){enemy.hp=Math.round(enemy.hp*1.45);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*1.35);enemy.defense+=enemy.guardian?6:3;if(enemy.finalBoss){enemy.hp=Math.round(enemy.hp*1.12);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*1.10);}}

      // v1.1 Board 5 + Hell ---------------------------------------------
      if(boardLevel===5){enemy.hp=Math.round(enemy.hp*1.55);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*1.45);enemy.defense+=(enemy.guardian?8:4);}if(hellMode){enemy.hp=Math.round(enemy.hp*2.1);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*1.85);enemy.defense+=(enemy.guardian?14:7);enemy.affinity=enemy.affinity||pick(ELEMENT_KEYS);enemy.elementProcChance=Math.max(enemy.elementProcChance||0,.36);}

      // v1.4 board curve + reward rebalance ------------------------------
      {const b=boardLevel,mods={2:[1.12,1.08,1],3:[1.18,1.12,2],4:[1.12,1.08,2],5:[1.16,1.10,3]}[b];if(mods){enemy.hp=Math.round(enemy.hp*mods[0]);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*mods[1]);enemy.defense+=mods[2];}
        const rewardProgress=player.position/Math.max(1,currentTileCount()-1),normalMult=[0,1.40,1.55,1.75,2.00,2.25][b]||2.25;let rewardMult=normalMult*(1+rewardProgress*.25);
        if(kind==="miniboss")rewardMult*=2.4;else if(kind==="final")rewardMult=[0,4.4,5.0,5.5,6.0,6.0][b]||6;else if(kind==="merchant"||kind==="bloodmage")rewardMult*=3.5;
        enemy.gold=Math.max(1,Math.round((base.gold||enemy.gold||1)*rewardMult));}

      // v1.6 affinity cannot contradict weakness -------------------------
      if(enemy.affinity&&enemy.affinity===enemy.weakness){const pool=ELEMENT_KEYS.filter(k=>k!==enemy.weakness);enemy.affinity=pool.length?pick(pool):null;}

      // v1.7 explicit late-road curve ------------------------------------
      {const mods={2:[1.04,1.03,0],3:[1.05,1.04,0],4:[1.16,1.11,2],5:[1.34,1.22,4]}[boardLevel];if(mods){enemy.hp=Math.round(enemy.hp*mods[0]);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*mods[1]);enemy.defense+=mods[2];}}
      if(boardLevel===4){enemy.hp=Math.max(1,Math.round(enemy.hp/1.85));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack/1.55));}

      // v1.9 Board 6 ------------------------------------------------------
      if(boardLevel===6){enemy.hp=Math.round(enemy.hp*1.85);enemy.maxHp=enemy.hp;enemy.attack=Math.round(enemy.attack*1.58);enemy.defense=Math.round((enemy.defense||0)*1.25+10);enemy.xp=Math.round((enemy.xp||1)*1.35);enemy.gold=Math.round((enemy.gold||1)*1.18);}

      // Beta 0.4.5 --------------------------------------------------------
      {const tune={1:[1.00,1.00,0],2:[1.02,1.01,0],3:[1.05,1.04,1],4:[0.99,1.00,0],5:[1.20,1.14,2],6:[1.08,1.06,1]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*tune[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*tune[1]));enemy.defense=Math.max(0,(enemy.defense||0)+tune[2]);if(enemy.name==='Cultist')enemy.lifeSteal=hellMode?.20:nightmareMode?.10:.01;const art=beta045EnemyArtForName(enemy.name);if(art)enemy.icon=art;}

      // Beta 0.4.6 --------------------------------------------------------
      {const tune={1:[1.00,1.00,0],2:[1.03,1.02,0],3:[1.07,1.05,1],4:[1.10,1.08,2],5:[1.30,1.20,4],6:[1.12,1.10,2]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*tune[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*tune[1]));enemy.defense=Math.max(0,(enemy.defense||0)+tune[2]);const art=db046EnemyArtForName(enemy.name);if(art)enemy.icon=art;}

      // Beta 0.4.7 --------------------------------------------------------
      {const perBoard={1:[1.00,1.00,0],2:[1.03,1.02,0],3:[1.08,1.06,1],4:[1.15,1.10,2],5:[1.38,1.24,5],6:[1.55,1.33,7]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*perBoard[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*perBoard[1]));enemy.defense=Math.max(0,(enemy.defense||0)+perBoard[2]);const name=(enemy.name||'').toLowerCase();if(name.includes('bandit'))enemy.icon=db047UiArt('bandit',enemy.name,'db-art-portrait')||enemy.icon;if(name.includes('troll'))enemy.icon=db047UiArt('troll',enemy.name,'db-art-portrait')||enemy.icon;}

      // Beta 0.6.4 ordinary Devil policy ---------------------------------
      if(isStandardDevil(enemy)){enemy.innateElement='fire';enemy.elementProcChance=db064EnemyPolicy.standardDevilFlameChance(boardLevel,combatMode(hellMode,nightmareMode));}
      return enemy;
    }

    return Object.freeze({scale,isStandardDevil});
  }

  window.DiceboundEnemyScalingResolution=Object.freeze({apiVersion:1,configure});
})();
