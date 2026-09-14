(() => {
  "use strict";

  const OWNER="classes/runtime-hooks";
  let deps=null;

  function configure(next={}){
    for(const name of ["getPlayer","isClassActive","clamp","scaleBerserkerRageDamage","hasEffect"]){
      if(typeof next?.[name]!=="function")throw new Error(`Classes runtime hooks require ${name}().`);
    }
    deps=next;
    return api;
  }
  function runtime(){if(!deps)throw new Error("Classes runtime hooks must be configured before use.");return deps;}

  function legacyMonkDodge(base){
    const rt=runtime();
    return rt.isClassActive("monk")?1-(1-base)*(1-base):base;
  }

  function identityDodgeAdjustments(base){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.isClassActive("monk"))base=rt.clamp(base+(player.monkCombo||0)*.018,0,.92);
    if(rt.isClassActive("clown")&&player.clownGimmick==="Big Shoes")base=rt.clamp(base+.12,0,.92);
    return base;
  }

  function berserkerDamage(amount){
    const rt=runtime(),player=rt.getPlayer();
    if(rt.isClassActive("berserker")&&player.maxHp>0)return rt.scaleBerserkerRageDamage(amount,player);
    return amount;
  }

  function ninjaExecutionDamage(amount,ignoreDefense=false){
    const player=runtime().getPlayer();
    if(player._ninjaExecution)return Object.freeze({amount:amount*1.65,ignoreDefense:true});
    return Object.freeze({amount,ignoreDefense:!!ignoreDefense});
  }

  function syncOuroborosAttack(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.isClassActive("ouroboros"))return false;
    if(rt.hasEffect("perfect_specimen")){
      const delta=(Number(player.attack)||0)-30;
      if(delta>0){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=30;}
      else if(player.attack<30)player.attack=30;
      return true;
    }
    const delta=(Number(player.attack)||0)-10;
    if(Math.abs(delta)>.0001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=10;}
    return true;
  }

  function syncOuroborosEconomy(){
    const rt=runtime(),player=rt.getPlayer();
    if(!rt.isClassActive("ouroboros"))return false;
    if((player.goldAttackScale||0)!==0){
      player.v27OuroGoldEchoScale=(player.v27OuroGoldEchoScale||0)+player.goldAttackScale*.10;
      player.goldAttackScale=0;
    }
    const desired=(player.gold||0)*(player.v27OuroGoldEchoScale||0),old=player.v27OuroGoldEchoApplied||0;
    if(Math.abs(desired-old)>.0000001){
      player.doubleStrike=Math.max(0,(player.doubleStrike||0)+(desired-old));
      player.v27OuroGoldEchoApplied=desired;
    }
    syncOuroborosAttack();
    return true;
  }

  const api=Object.freeze({
    owner:OWNER,apiVersion:1,configure,legacyMonkDodge,identityDodgeAdjustments,berserkerDamage,ninjaExecutionDamage,
    syncOuroborosAttack,syncOuroborosEconomy
  });
  const facade=window.DiceboundClasses;
  if(!facade?._installHooks)throw new Error("classes/hooks.js requires DiceboundClasses facade before loading.");
  facade._installHooks(api);
})();
