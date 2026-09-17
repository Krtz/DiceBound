/* DiceBound canonical road-dice runtime owner.
 *
 * Owns every player-facing road roll: 1d6, 2d6, Fate choice presentation,
 * roll controls, exact RNG ordering, Long Stride and Titanstep handling.
 * Board movement remains in DiceboundRun. dicebound.js composes this owner;
 * it must not implement or wrap road-dice gameplay.
 */
(()=>{
  "use strict";
  const OWNER="run/dice";
  const DICE_FACES=Object.freeze(["⚀","⚁","⚂","⚃","⚄","⚅"]);
  let runtime=Object.freeze({});
  function configure(next={}){runtime=Object.freeze({...runtime,...next});return api;}
  function need(name){const value=runtime[name];if(typeof value!=="function")throw new Error("DiceboundRunDice capability is not configured: "+name);return value;}
  function call(name,...args){return need(name)(...args);}
  function $(id){return call("find",id);}
  function traced(name,fn){return typeof runtime.traceCommand==="function"?runtime.traceCommand(name,fn):fn();}

  function ensureButton(){
    if($("roll2Btn"))return $("roll2Btn");
    const one=$("rollBtn");if(!one)return null;
    const two=call("getDocument").createElement("button");
    two.id="roll2Btn";two.className="main-btn double-dice-btn";two.textContent="🎲🎲 Roll 2d6";
    two.addEventListener("click",rollTwo);one.parentElement.insertBefore(two,one.nextSibling);
    return two;
  }
  function bindPrimaryButton(){
    const one=$("rollBtn");if(!one||one.dataset.runDiceBound==="1")return one;
    one.dataset.runDiceBound="1";one.addEventListener("click",rollOne);return one;
  }
  function refreshControls(){
    const meta=call("getMeta"),locked=call("isRollLocked")||!call("isGameStarted"),one=$("rollBtn"),two=ensureButton();
    if(one){one.textContent=meta.doubleDiceUnlocked?"🎲 Roll 1d6":"🎲 Roll the dice";one.disabled=locked;}
    if(two){two.style.display=meta.doubleDiceUnlocked?"block":"none";two.disabled=locked;}
  }
  function handleRoadKeydown(event){
    if((event?.key!==" "&&event?.key!=="Enter")||call("isRollLocked")||!call("isGameStarted")||call("hasCurrentEnemy"))return false;
    event.preventDefault?.();void rollOne();return true;
  }

  function chooseDieResult(){
    return new Promise(resolve=>{
      const grid=$("diceChoiceGrid"),overlay=$("diceChoiceOverlay");grid.innerHTML="";
      DICE_FACES.forEach((face,index)=>{const button=call("getDocument").createElement("button");button.textContent=face;button.addEventListener("click",()=>{overlay.classList.add("hidden");resolve(index+1);});grid.appendChild(button);});
      overlay.classList.remove("hidden");
    });
  }
  async function chooseDice(count,reason="Fate"){
    const values=[];
    for(let index=0;index<count;index++){
      call("showToast",count===2?reason+": choose die "+(index+1)+" of 2":reason+": choose the die");
      values.push(await chooseDieResult());
    }
    return values;
  }
  function shouldChooseRoll(meta,player){return !!meta.debugAlwaysChooseRolls||(player.diceChoiceChance>0&&call("random")<player.diceChoiceChance);}
  async function animate(count,frames,startDelay,stepDelay){
    const die=$("dice");die.classList.add("rolling");
    for(let index=0;index<frames;index++){
      die.textContent=count===2?call("pick",DICE_FACES)+" + "+call("pick",DICE_FACES):call("pick",DICE_FACES);
      call("rollSound");await call("delay",startDelay+index*stepDelay);
    }
    // Animation is presentation only. Never keep shaking during a legitimate
    // Fate-choice wait; this also makes failure cleanup deterministic.
    die.classList.remove("rolling");return die;
  }
  function applyTitanstep(values){
    const player=call("getPlayer");if(!call("hasMythicPiece","boots")||!values.some(value=>value>=5))return "";
    const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.05)));
    player.hp+=healed;player.ultimateCharge=call("clamp",player.ultimateCharge+10,0,100);call("showToast","🥾 Titanstep!");
    return ` Titanstep restores <b>${healed} HP</b> and grants <b>10 ultimate</b>.`;
  }
  function beginRoll(resumeAudio=false){call("ensureAudio");if(resumeAudio)call("resumeAudio");call("setRollLocked",true);call("updateHud");}
  function recoverBeforeMovement(die){die?.classList.remove("rolling");call("setRollLocked",false);call("updateHud");}

  async function rollOneCore(){
    const meta=call("getMeta"),player=call("getPlayer");
    if(call("isRollLocked")||!call("isGameStarted"))return;
    let handedOff=false,die=null;
    try{
      beginRoll(!meta.debugAlwaysChooseRolls);
      die=await animate(1,meta.debugAlwaysChooseRolls?8:11,meta.debugAlwaysChooseRolls?45:55,meta.debugAlwaysChooseRolls?5:6);
      let value,chosen=false,bonus=0;
      if(meta.debugAlwaysChooseRolls){
        value=(await chooseDice(1,"Debug fate"))[0];chosen=true;
      }else{
        value=call("rand",1,6);
        if(player.diceChoiceChance>0&&call("random")<player.diceChoiceChance){value=(await chooseDice(1,"Fate"))[0];chosen=true;call("showToast","🎲 Fate chosen: "+value);}
        if(!chosen&&call("random")<call("clamp",player.extraStepChance,0,.75))bonus=1;
      }
      die.textContent=DICE_FACES[value-1];call("incrementRolls");
      const titanstep=applyTitanstep([value]);
      call("addLog",meta.debugAlwaysChooseRolls?`Debug fate chooses <b>${value}</b>. Long Stride does not alter chosen fate.`:`${chosen?"Fate bends. You choose":"You rolled"} <b>${value}</b>${bonus?" and Long Stride adds <b>+1</b>":""}.${titanstep}`);
      handedOff=true;await call("move",value+bonus,value,bonus>0,chosen);
    }catch(error){if(!handedOff)recoverBeforeMovement(die);throw error;}finally{die?.classList.remove("rolling");}
  }
  async function rollTwoCore(){
    const meta=call("getMeta"),player=call("getPlayer");
    if(call("isRollLocked")||!call("isGameStarted")||!meta.doubleDiceUnlocked)return;
    let handedOff=false,die=null;
    try{
      beginRoll(false);die=await animate(2,10,45,5);
      // Preserve released ordering: both raw dice are rolled before Fate is
      // checked, including debug-always-choose mode.
      let first=call("rand",1,6),second=call("rand",1,6),chosen=false;
      if(shouldChooseRoll(meta,player)){[first,second]=await chooseDice(2,meta.debugAlwaysChooseRolls?"Debug fate":"Fate");chosen=true;call("showToast","🎲🎲 Fate chosen: "+first+"+"+second+"="+(first+second));}
      let bonus=0;if(!chosen&&call("random")<call("clamp",player.extraStepChance,0,.75))bonus=1;
      die.textContent=DICE_FACES[first-1]+" + "+DICE_FACES[second-1];call("incrementRolls");applyTitanstep([first,second]);
      const total=first+second;call("addLog",(chosen?"Fate bends. You choose":"Double Dice rolls")+" <b>"+first+" + "+second+" = "+total+"</b>"+(bonus?" and Long Stride adds <b>+1</b>":"")+".");
      handedOff=true;await call("move",total+bonus,total,bonus>0,chosen);
    }catch(error){if(!handedOff)recoverBeforeMovement(die);throw error;}finally{die?.classList.remove("rolling");}
  }
  function rollOne(){return traced("rollDice",rollOneCore);}
  function rollTwo(){return traced("rollTwoDice",rollTwoCore);}

  const api=Object.freeze({apiVersion:1,owner:OWNER,configure,ensureButton,bindPrimaryButton,refreshControls,handleRoadKeydown,chooseDieResult,rollOne,rollTwo,roll:rollTwo,faces:DICE_FACES,inspect:()=>Object.freeze({owner:OWNER,apiVersion:1})});
  window.DiceboundRunDice=api;
})();
