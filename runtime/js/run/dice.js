/* DiceBound road-dice runtime owner.
 *
 * Owns every player-facing road roll: 1d6, 2d6, Fate choice presentation,
 * roll-button state, exact RNG ordering, Long Stride and Titanstep handling.
 * Board movement remains in DiceboundRun; mutable game state and neighbouring
 * systems are injected capabilities. dicebound.js should compose this owner,
 * not implement or wrap road-dice gameplay.
 */
(()=>{
  "use strict";
  const OWNER="run/dice";
  let runtime=Object.freeze({});
  function configure(next={}){runtime=Object.freeze({...runtime,...next});return api;}
  function need(name){const value=runtime[name];if(typeof value!=="function")throw new Error("DiceboundRunDice capability is not configured: "+name);return value;}
  function call(name,...args){return need(name)(...args);}
  function $(id){return call("find",id);}
  function faces(){return call("diceFaces");}

  function ensureButton(){
    if($("roll2Btn"))return $("roll2Btn");
    const one=$("rollBtn");if(!one)return null;
    const two=call("getDocument").createElement("button");
    two.id="roll2Btn";two.className="main-btn double-dice-btn";two.textContent="🎲🎲 Roll 2d6";
    two.addEventListener("click",rollTwo);one.parentElement.insertBefore(two,one.nextSibling);
    return two;
  }
  function refreshControls(){
    const meta=call("getMeta"),locked=call("isRollLocked")||!call("isGameStarted"),one=$("rollBtn"),two=ensureButton();
    if(one){one.textContent=meta.doubleDiceUnlocked?"🎲 Roll 1d6":"🎲 Roll the dice";one.disabled=locked;}
    if(two){two.style.display=meta.doubleDiceUnlocked?"block":"none";two.disabled=locked;}
  }
  function bindPrimaryButton(){
    const one=$("rollBtn");if(!one||one.dataset.runDiceBound==="1")return one;
    one.dataset.runDiceBound="1";one.addEventListener("click",rollOne);return one;
  }
  function handleRoadKeydown(event){
    if((event?.key!==" "&&event?.key!=="Enter")||call("isRollLocked")||!call("isGameStarted")||call("hasCurrentEnemy"))return false;
    event.preventDefault?.();rollOne();return true;
  }

  function showChoice(){
    return new Promise(resolve=>{
      const grid=$("diceChoiceGrid"),overlay=$("diceChoiceOverlay"),list=faces();
      grid.innerHTML="";
      list.forEach((face,index)=>{const button=call("getDocument").createElement("button");button.textContent=face;button.addEventListener("click",()=>{overlay.classList.add("hidden");resolve(index+1);});grid.appendChild(button);});
      overlay.classList.remove("hidden");
    });
  }
  async function chooseDice(count,reason="Fate"){
    const values=[];
    for(let index=0;index<count;index++){
      call("showToast",count===2?reason+": choose die "+(index+1)+" of 2":reason+": choose the die");
      values.push(await showChoice());
    }
    return values;
  }
  function shouldChooseRoll(meta,player){return !!meta.debugAlwaysChooseRolls||(player.diceChoiceChance>0&&call("random")<player.diceChoiceChance);}
  function applyTitanstep(values){
    const player=call("getPlayer");if(!call("hasMythicPiece","boots")||!values.some(value=>value>=5))return "";
    const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.05)));
    player.hp+=healed;player.ultimateCharge=call("clamp",player.ultimateCharge+10,0,100);call("showToast","🥾 Titanstep!");
    return ` Titanstep restores <b>${healed} HP</b> and grants <b>10 ultimate</b>.`;
  }
  async function animate(count,frames,startDelay,stepDelay){
    const die=$("dice"),list=faces();die.classList.add("rolling");if(count===2)die.classList.add("double-mode");
    for(let index=0;index<frames;index++){
      die.textContent=count===2?call("pick",list)+" + "+call("pick",list):call("pick",list);
      call("rollSound");await call("delay",startDelay+index*stepDelay);
    }
    die.classList.remove("rolling");
    return die;
  }
  function recoverBeforeMovement(die){
    die?.classList.remove("rolling");call("setRollLocked",false);call("updateHud");
  }
  function beginRoll(){call("ensureAudio");call("setRollLocked",true);call("updateHud");}

  async function rollOne(){
    const meta=call("getMeta"),player=call("getPlayer");
    if(call("isRollLocked")||!call("isGameStarted"))return;
    let handedOff=false,die=null;
    try{
      beginRoll();
      if(!meta.debugAlwaysChooseRolls)call("resumeAudio");
      die=await animate(1,meta.debugAlwaysChooseRolls?8:11,meta.debugAlwaysChooseRolls?45:55,meta.debugAlwaysChooseRolls?5:6);
      let value=call("rand",1,6),chosen=false;
      if(meta.debugAlwaysChooseRolls){value=(await chooseDice(1,"Debug fate"))[0];chosen=true;}
      else if(shouldChooseRoll(meta,player)){value=(await chooseDice(1,"Fate"))[0];chosen=true;call("showToast","🎲 Fate chosen: "+value);}
      let bonus=0;if(!chosen&&call("random")<call("clamp",player.extraStepChance,0,.75))bonus=1;
      die.textContent=faces()[value-1];call("incrementRolls");
      const titanstep=applyTitanstep([value]);
      call("addLog",meta.debugAlwaysChooseRolls?`Debug fate chooses <b>${value}</b>. Long Stride does not alter chosen fate.`:`${chosen?"Fate bends. You choose":"You rolled"} <b>${value}</b>${bonus?" and Long Stride adds <b>+1</b>":""}.${titanstep}`);
      handedOff=true;await call("move",value+bonus,value,bonus>0,chosen);
    }catch(error){if(!handedOff)recoverBeforeMovement(die);throw error;}finally{die?.classList.remove("rolling");}
  }

  async function rollTwo(){
    const meta=call("getMeta"),player=call("getPlayer");
    if(call("isRollLocked")||!call("isGameStarted")||!meta.doubleDiceUnlocked)return;
    let handedOff=false,die=null;
    try{
      beginRoll();die=await animate(2,10,45,5);
      let first=call("rand",1,6),second=call("rand",1,6),chosen=false;
      if(shouldChooseRoll(meta,player)){[first,second]=await chooseDice(2,meta.debugAlwaysChooseRolls?"Debug fate":"Fate");chosen=true;call("showToast","🎲🎲 Fate chosen: "+first+"+"+second+"="+(first+second));}
      let bonus=0;if(!chosen&&call("random")<call("clamp",player.extraStepChance,0,.75))bonus=1;
      die.textContent=faces()[first-1]+" + "+faces()[second-1];call("incrementRolls");applyTitanstep([first,second]);
      const total=first+second;call("addLog",(chosen?"Fate bends. You choose":"Double Dice rolls")+" <b>"+first+" + "+second+" = "+total+"</b>"+(bonus?" and Long Stride adds <b>+1</b>":"")+".");
      handedOff=true;await call("move",total+bonus,total,bonus>0,chosen);
    }catch(error){if(!handedOff)recoverBeforeMovement(die);throw error;}finally{die?.classList.remove("rolling");}
  }

  const api=Object.freeze({apiVersion:1,owner:OWNER,configure,ensureButton,refreshControls,bindPrimaryButton,handleRoadKeydown,chooseDieResult:showChoice,rollOne,rollTwo,roll:rollTwo,inspect:()=>Object.freeze({owner:OWNER,apiVersion:1})});
  window.DiceboundRunDice=api;
})();
