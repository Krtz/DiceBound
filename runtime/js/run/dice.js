/* DiceBound Double Dice runtime owner.
 *
 * Owns the 2d6 control, its exact roll sequence and the Fate/Long Stride/
 * Titanstep presentation. Board movement remains in DiceboundRun; all mutable
 * game state and neighbouring systems are injected capabilities.
 */
(()=>{
  "use strict";
  const OWNER="run/dice";
  let runtime=Object.freeze({});
  function configure(next={}){runtime=Object.freeze({...runtime,...next});return api;}
  function need(name){const value=runtime[name];if(typeof value!=="function")throw new Error("DiceboundRunDice capability is not configured: "+name);return value;}
  function call(name,...args){return need(name)(...args);}
  function $(id){return need("find")(id);}

  function ensureButton(){
    if($("roll2Btn"))return $("roll2Btn");
    const one=$("rollBtn");if(!one)return null;
    one.textContent="\u{1F3B2} Roll 1d6";
    const two=call("getDocument").createElement("button");
    two.id="roll2Btn";two.className="main-btn double-dice-btn";two.textContent="\u{1F3B2}\u{1F3B2} Roll 2d6";
    two.addEventListener("click",roll);one.parentElement.insertBefore(two,one.nextSibling);
    return two;
  }
  function refreshControls(){
    const meta=call("getMeta"),button=ensureButton();
    if(button){button.style.display=meta.doubleDiceUnlocked?"block":"none";button.disabled=call("isRollLocked")||!call("isGameStarted");}
    const one=$("rollBtn");if(one)one.textContent=meta.doubleDiceUnlocked?"\u{1F3B2} Roll 1d6":"\u{1F3B2} Roll the dice";
  }
  async function chooseDice(count,reason="Fate"){
    const values=[];
    for(let index=0;index<count;index++){
      call("showToast",count===2?reason+": choose die "+(index+1)+" of 2":reason+": choose the die");
      values.push(await call("chooseDieResult"));
    }
    return values;
  }
  function shouldChooseRoll(){
    const meta=call("getMeta"),player=call("getPlayer");
    return !!meta.debugAlwaysChooseRolls||(player.diceChoiceChance>0&&call("random")<player.diceChoiceChance);
  }
  async function roll(){
    const meta=call("getMeta"),player=call("getPlayer");
    if(call("isRollLocked")||!call("isGameStarted")||!meta.doubleDiceUnlocked)return;
    const die=$("dice"),faces=call("diceFaces");
    let movementStarted=false;
    call("ensureAudio");call("setRollLocked",true);
    try{
      call("updateHud");die.classList.add("rolling","double-mode");
      for(let index=0;index<10;index++){die.textContent=call("pick",faces)+" + "+call("pick",faces);call("rollSound");await call("delay",45+index*5);}
      let first=call("rand",1,6),second=call("rand",1,6),chosen=false;

      // The animation is presentation only. Fate can legitimately wait on one
      // or two player choices, so never leave the die shaking while that modal
      // interaction is pending. This was the visible symptom of #371.
      die.classList.remove("rolling");

      if(shouldChooseRoll()){[first,second]=await chooseDice(2,meta.debugAlwaysChooseRolls?"Debug fate":"Fate");chosen=true;call("showToast","\u{1F3B2}\u{1F3B2} Fate chosen: "+first+"+"+second+"="+(first+second));}
      let bonus=0;if(!chosen&&call("random")<call("clamp",player.extraStepChance,0,.75))bonus=1;
      die.textContent=faces[first-1]+" + "+faces[second-1];call("incrementRolls");
      if(call("hasMythicPiece","boots")&&(first>=5||second>=5)){
        const healed=Math.min(player.maxHp-player.hp,Math.max(1,Math.ceil(player.maxHp*.05)));
        player.hp+=healed;player.ultimateCharge=call("clamp",player.ultimateCharge+10,0,100);call("showToast","\u{1F97E} Titanstep!");
      }
      const total=first+second;
      call("addLog",(chosen?"Fate bends. You choose":"Double Dice rolls")+" <b>"+first+" + "+second+" = "+total+"</b>"+(bonus?" and Long Stride adds <b>+1</b>":"")+".");
      movementStarted=true;
      await call("move",total+bonus,total,bonus>0,chosen);
    }catch(error){
      // Movement owns the road lock after handoff. Before that boundary, an
      // interrupted animation/chooser must not permanently brick travel.
      if(!movementStarted){
        call("setRollLocked",false);
        try{call("updateHud");}catch(_){}
        try{call("showToast","\u26A0\uFE0F Double Dice roll interrupted. Try again.");}catch(_){}
      }
      throw error;
    }finally{
      die?.classList?.remove("rolling");
    }
  }
  const api=Object.freeze({apiVersion:1,owner:OWNER,configure,ensureButton,refreshControls,roll,inspect:()=>Object.freeze({owner:OWNER,apiVersion:1})});
  window.DiceboundRunDice=api;
})();
