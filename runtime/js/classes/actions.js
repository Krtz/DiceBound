(() => {
  "use strict";

  const OWNER="classes/runtime-action-mechanics";
  let deps=null;

  function configure(next={}){
    for(const name of [
      "getPlayer","getCurrentEnemy","getCombatBusy","setCombatBusy","basicAttack","identityFlash","updateCombatUI",
      "healPlayer","damageAll","setCombatText","sfxHoly","delay","livingEnemies","winCombat","resolveEnemyResponse","isClassActive"
    ]){
      if(typeof next?.[name]!=="function")throw new Error(`Classes action mechanics requires ${name}().`);
    }
    deps=next;
    return api;
  }
  function runtime(){if(!deps)throw new Error("Classes action mechanics must be configured before use.");return deps;}

  async function bloodmageBloodletting(){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.getCombatBusy()||!rt.getCurrentEnemy())return;
    const oldLS=player.lifeSteal;
    player.lifeSteal+=.12;
    rt.identityFlash("🩸 Bloodletting restores fuel");
    try{await rt.basicAttack();}
    finally{player.lifeSteal=oldLS;}
    rt.updateCombatUI();
  }

  async function clericConsecration(){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.getCombatBusy()||!rt.getCurrentEnemy()||(player.clericFaith||0)<100)return;
    rt.setCombatBusy(true);
    player.clericFaith=0;
    player.combatActionCount++;
    const heal=rt.healPlayer(Math.ceil(player.maxHp*.22));
    player.combatShield+=1;
    const dmg=Math.round(player.attack*1.15+player.maxHp*.08),dealt=rt.damageAll(dmg,.75);
    rt.setCombatText(`☀️ Consecration spends 100 Faith, heals ${heal} HP, raises a Barrier and deals ${dealt} Light-touched damage across the pack.`);
    rt.identityFlash("☀️ CONSECRATION");
    rt.sfxHoly();
    rt.updateCombatUI();
    await rt.delay(760);
    if(!rt.livingEnemies().length)return rt.winCombat();
    await rt.resolveEnemyResponse(false);
  }

  function cycleBeastStance(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.isClassActive("beastmaster")||rt.getCombatBusy())return;
    const order=["aggressive","defensive","support"],i=order.indexOf(player.beastStance);
    player.beastStance=order[(i+1)%order.length];
    rt.identityFlash(`🐾 ${player.beastStance[0].toUpperCase()+player.beastStance.slice(1)} stance`);
    rt.updateCombatUI();
  }

  const api=Object.freeze({owner:OWNER,apiVersion:1,configure,bloodmageBloodletting,clericConsecration,cycleBeastStance});
  const facade=window.DiceboundClasses;
  if(!facade?._installActions)throw new Error("classes/actions.js requires DiceboundClasses facade before loading.");
  facade._installActions(api);
})();
