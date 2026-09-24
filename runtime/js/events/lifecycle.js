/* DiceBound Road Events lifecycle owner.
 *
 * Owns the shipped 0.6.6.25 Slot, Wheel, Blessing, Mystic, Bloodwell and
 * Gambler lifecycles behind the DiceboundRoadEvents public facade. Gameplay
 * state/services are injected by composition so ordinary callers never need to
 * coordinate these event implementations directly.
 */
(function(){
  'use strict';

  const OWNER='events/lifecycle';
  const SLOT_SYMBOLS=['⚔️','❤️','🪙','🛡️','⭐','💀'];
  const MYSTIC_RULE=Object.freeze({legendaryCutoff:.10,epicCutoff:.40,maxHpCost:10});
  let runtime={};
  let currentMysticBuff=null;
  let wheelRotation=0;
  let wheelBusy=false;
  let bound=false;

  function requireFn(name){
    const fn=runtime[name];
    if(typeof fn!=='function')throw new Error(`DiceboundRoadEventLifecycle ${name} is not configured.`);
    return fn;
  }
  function node(id){return requireFn('$')(id);}
  function player(){return requireFn('getPlayer')();}
  function meta(){return requireFn('getMeta')();}
  function tiles(){return requireFn('getTiles')();}
  function boardLevel(){return requireFn('getBoardLevel')();}
  function random(){return requireFn('random')();}
  function pick(values){return requireFn('pick')(values);}
  function clearTile(){
    const p=player(),tile=tiles()[p.position];
    if(tile){tile.type='empty';tile.cleared=true;requireFn('refreshTile')(p.position);}
  }
  function eventGold(source,multiplier=1){
    const base=window.DiceboundEventRewards.goldBaseFor(source,player().level,multiplier);
    return requireFn('modifiedGold')(base);
  }
  function powerupDescription(powerup){return requireFn('describePowerup')(powerup);}

  // SLOT -------------------------------------------------------------------
  function slotSymbolHTML(symbol){
    if(symbol!=='🪙')return symbol;
    const src=window.DiceboundAssets?.resolveUiIcon?.('coins')?.image||'assets/ui/currencies/coins.png';
    return `<img class="slot-coin-art" src="${src}" alt="Gold coins">`;
  }
  function setSlotReelSymbol(reel,symbol){if(reel)reel.innerHTML=slotSymbolHTML(symbol);}
  function generateSlotResult(){
    const p=player(),first=pick(SLOT_SYMBOLS),odds=window.DiceboundEventRewards.slotMatchOdds(p.luck);
    const second=random()<odds.secondMatch?first:pick(SLOT_SYMBOLS);let third;
    if(second===first)third=random()<odds.tripleFromPair?first:pick(SLOT_SYMBOLS);
    else third=random()<odds.pairFromMiss?second:pick(SLOT_SYMBOLS);
    return [first,second,third];
  }
  function openSlot(){bind();
    node('eventOverlay').classList.remove('hidden');node('spinBtn').style.display='block';node('eventContinueBtn').style.display='none';node('slotResult').textContent='The machine waits...';
    [1,2,3].forEach(n=>{node(`reel${n}`).textContent='❔';node(`reel${n}`).classList.remove('spinning');});
  }
  function applySlotReward(result){
    const p=player(),m=meta(),counts={};result.forEach(symbol=>counts[symbol]=(counts[symbol]||0)+1);
    const triple=Object.keys(counts).find(symbol=>counts[symbol]===3),pair=Object.keys(counts).find(symbol=>counts[symbol]===2);let text='';
    if(triple){
      switch(triple){
        case '⚔️':p.attack+=5;text='Jackpot! +5 attack permanently.';break;
        case '❤️':p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+20);text='Jackpot! +20 max HP and heal 20.';break;
        case '🪙':{const gold=eventGold('slotJackpot');p.gold+=gold;text=`Jackpot! +${gold} gold.`;break;}
        case '🛡️':p.defense+=4;text='Jackpot! +4 defense permanently.';break;
        case '⭐':p.attack+=5;p.maxHp+=18;p.hp+=18;p.crit+=.10;text='Legendary jackpot! +5 attack, +18 max HP and +10% Crit Chance.';break;
        case '💀':{const loss=Math.max(1,Math.floor(p.hp*.25));p.hp=Math.max(1,p.hp-loss);text=`Triple skulls! You lose ${loss} HP.`;break;}
      }
      requireFn('sfxLevel')();
    }else if(pair){
      switch(pair){
        case '⚔️':p.attack+=2;text='Two swords: +2 attack permanently.';break;
        case '❤️':{const heal=Math.min(p.maxHp-p.hp,18);p.hp+=heal;text=`Two hearts: heal ${heal} HP.`;break;}
        case '🪙':{const gold=eventGold('slotPair');p.gold+=gold;text=`Two coins: +${gold} gold.`;break;}
        case '🛡️':p.flatReduction+=2;text='Two shields: reduce incoming damage by 2.';break;
        case '⭐':p.crit+=.08;text='Two stars: +8% Crit Chance.';break;
        case '💀':{const loss=Math.max(1,Math.floor(p.hp*.10));p.hp=Math.max(1,p.hp-loss);text=`Two skulls: lose ${loss} HP.`;break;}
      }
      requireFn('tone')(650,.15,'triangle',.04,950);
    }else{
      const gold=eventGold('slotPity');p.gold+=gold;text=`No match. The machine pays ${gold} consolation gold.`;requireFn('sfxCoin')();
    }
    const cookieChance=.14+requireFn('gameplayTalentRank')('fortune_cookie')*.03;
    if(random()<cookieChance){m.petCookies++;requireFn('saveMeta')();text+=' A rare pet cookie drops from the machine!';requireFn('showToast')('🍪 Pet cookie found!');}
    node('slotResult').textContent=text;requireFn('addLog')(`<b>Slots:</b> ${text}`);requireFn('updateMetaUI')();
  }
  async function spinSlot(){
    const fast=!!requireFn('fastWheelSlots')(),btn=node('spinBtn');btn.disabled=true;const reels=[node('reel1'),node('reel2'),node('reel3')];
    if(!fast)reels.forEach(r=>r.classList.add('spinning'));
    // The reel-flutter symbols historically consume gameplay RNG. Fast mode
    // deliberately burns the exact same draws while skipping only DOM/audio delay.
    for(let i=0;i<18;i++){
      reels.forEach((r,j)=>{if(i<12+j*3){const symbol=pick(SLOT_SYMBOLS);if(!fast)setSlotReelSymbol(r,symbol);}});
      if(!fast){requireFn('tone')(220+i*12,.03,'square',.012);await requireFn('delay')(60+i*5);}
    }
    const result=generateSlotResult();
    for(let i=0;i<3;i++){setSlotReelSymbol(reels[i],result[i]);reels[i].classList.remove('spinning');if(!fast){requireFn('tone')(480+i*110,.08,'triangle',.025);await requireFn('delay')(180);}}
    applySlotReward(result);clearTile();btn.style.display='none';node('eventContinueBtn').style.display='block';btn.disabled=false;requireFn('updateHUD')();
  }

  // WHEEL ------------------------------------------------------------------
  function wheelScale(){const p=player();return 1+(boardLevel()-1)*.24+(p.position/Math.max(1,requireFn('currentTileCount')()-1))*.16;}
  function wheelRewards(){
    return [
      {icon:'🪙',name:'Golden Rain',apply(){const gold=eventGold('wheel');player().gold+=gold;return `The wheel grants ${gold} gold.`;}},
      {icon:'❤️',name:'Restoration',apply(){const p=player(),level=boardLevel(),sc=wheelScale();if(p.hp>=p.maxHp){const hp=Math.max(10,Math.round(10*sc));p.maxHp+=hp;p.hp+=hp;return `Full health converts Restoration into +${hp} max HP.`;}const heal=Math.min(p.maxHp-p.hp,Math.ceil(p.maxHp*Math.min(.85,.50+.06*level)));p.hp+=heal;return `The wheel restores ${heal} HP.`;}},
      {icon:'🍪',name:'Companion Cookie',apply(){const m=meta(),n=1+Math.floor((boardLevel()-1)/2);m.petCookies+=n;requireFn('saveMeta')();return `${n} permanent pet cookie${n===1?'':'s'} drop for ${requireFn('activePetName')()}.`;}},
      {icon:'⚔️',name:'Sharpened Fate',apply(){const n=2+Math.floor((boardLevel()-1)/2);player().attack+=n;return `Gain +${n} attack for this run.`;}},
      {icon:'🎁',name:'Rare Gift',apply(){const level=boardLevel(),filter=level>=5?(u=>u.rarity==='legendary'):level>=3?(u=>u.rarity==='epic'||u.rarity==='legendary'):(u=>u.rarity==='rare'||u.rarity==='epic'||u.rarity==='legendary'),pool=requireFn('eligibleUpgrades')(filter),up=pool.length?pick(pool):requireFn('applyRandomHighRarity')();if(pool.length)requireFn('applyUpgrade')(up,'Wheel of Fortune');return `The wheel reveals ${requireFn('rarityLabel')(up.rarity)} ${up.name}: ${powerupDescription(up)}`;}},
      {icon:'🧪',name:"Alchemist's Bundle",apply(){const n=3+Math.floor((boardLevel()-1)*1.5);player().potions+=n;return `Gain ${n} potions.`;}},
      {icon:'⭐',name:'Lucky Star',apply(){const p=player(),c=.08+(boardLevel()-1)*.012,l=.08+(boardLevel()-1)*.015;p.crit+=c;p.luck+=l;return `Gain +${Math.round(c*100)}% Crit Chance and +${Math.round(l*100)} Luck.`;}},
      {icon:'💀',name:'Cruel Turn',apply(){const p=player(),loss=Math.max(1,Math.floor(p.hp*.18));p.hp=Math.max(1,p.hp-loss);return `The wheel takes ${loss} HP.`;}}
    ];
  }
  function syncWheelIcons(){const rewards=wheelRewards();[...node('fortuneWheel').querySelectorAll('span')].forEach((el,i)=>{if(rewards[i])el.textContent=rewards[i].icon;});}
  function openWheel(){bind();syncWheelIcons();wheelBusy=false;const wheel=node('fortuneWheel');if(wheel)wheel.style.transition='';node('wheelOverlay').classList.remove('hidden');node('wheelSpinBtn').style.display='block';node('wheelContinueBtn').style.display='none';node('wheelResult').textContent='The wheel waits for a victim.';requireFn('addLog')('You find the <b>Wheel of Fortune</b>.');}
  async function spinWheel(){
    if(wheelBusy)return;wheelBusy=true;const fast=!!requireFn('fastWheelSlots')();node('wheelSpinBtn').disabled=true;const rewards=wheelRewards(),index=requireFn('rand')(0,rewards.length-1),reward=rewards[index];
    const current=((wheelRotation%360)+360)%360,target=((360-(index*45+22.5))%360+360)%360,delta=1440+((target-current+360)%360),wheel=node('fortuneWheel');
    wheelRotation+=delta;if(wheel){if(fast)wheel.style.transition='none';wheel.style.transform=`rotate(${wheelRotation}deg)`;}requireFn('sfxRoll')();if(!fast)await requireFn('delay')(2850);
    const result=reward.apply();node('wheelResult').textContent=`${reward.icon} ${reward.name}: ${result}`;requireFn('addLog')(`<b>Wheel:</b> ${reward.name} — ${result}`);requireFn('showToast')(reward.name);requireFn('sfxLevel')();
    clearTile();node('wheelSpinBtn').style.display='none';node('wheelContinueBtn').style.display='block';node('wheelSpinBtn').disabled=false;requireFn('updateHUD')();
  }

  // BLESSING ---------------------------------------------------------------
  function blessingPool(){
    const p=player();
    return [
      {icon:'🌟',name:'Divine Ascension',description(){const n=5+p.blessingBonus;return `Instantly gain ${n} levels and choose ${n} powerups`+(p.blessingBonus?` (Favored Mortal total bonus: +${p.blessingBonus} level${p.blessingBonus===1?'':'s'} and +${p.blessingBonus} choice${p.blessingBonus===1?'':'s'}).`:'.');},apply(){requireFn('forceLevels')(5+p.blessingBonus);}},
      {icon:'⚔️',name:'Avatar of War',description(){const atk=8+p.blessingBonus*2,hp=25+p.blessingBonus*8;return `Gain +${atk} attack, +2 defense, +${hp} max HP and heal fully`+(p.blessingBonus?` (Favored Mortal total bonus: +${p.blessingBonus*2} attack and +${p.blessingBonus*8} max HP).`:'.');},apply(){p.attack+=8+p.blessingBonus*2;p.defense+=2;p.maxHp+=25+p.blessingBonus*8;p.hp=p.maxHp;}},
      {icon:'💰',name:'Saint of Fortune',description(){const gold=150+p.blessingBonus*50,pots=2+p.blessingBonus;return `Gain ${gold} gold, +15% Crit Chance, +25 Luck and ${pots} potions`+(p.blessingBonus?` (Favored Mortal total bonus: +${p.blessingBonus*50} gold and +${p.blessingBonus} potion${p.blessingBonus===1?'':'s'}).`:'.');},apply(){p.gold+=requireFn('modifiedGold')(150+p.blessingBonus*50);p.crit+=.15;p.luck+=.25;p.potions+=2+p.blessingBonus;}},
      {icon:'🪽',name:"Seraph's Aegis",description(){const revives=2+p.blessingBonus,reduction=2+p.blessingBonus;return `Gain ${revives} revives, block the first hit of every battle and reduce damage by ${reduction}`+(p.blessingBonus?` (Favored Mortal adds +${p.blessingBonus} revive${p.blessingBonus===1?'':'s'} and +${p.blessingBonus} flat damage reduction).`:'.');},apply(){p.revives+=2+p.blessingBonus;p.firstHitBlocks+=1;p.flatReduction+=2+p.blessingBonus;}},
      {icon:'🌌',name:'Miracle Engine',description(){const n=3+p.blessingBonus;return `Receive ${n} random Rare or Epic powerups immediately. Every granted buff will be listed by name`+(p.blessingBonus?` (Favored Mortal total bonus: +${p.blessingBonus} powerup${p.blessingBonus===1?'':'s'}).`:'.');},apply(){const gifts=[];for(let i=0;i<3+p.blessingBonus;i++)gifts.push(requireFn('applyRandomHighRarity')('Miracle Engine',false));return gifts;}}
    ];
  }
  function openBlessing(){bind();
    requireFn('sfxHoly')();const pool=blessingPool(),choices=[];while(choices.length<3){const b=pick(pool);if(!choices.includes(b))choices.push(b);}const grid=node('blessingGrid');grid.innerHTML='';
    choices.forEach(blessing=>{const btn=document.createElement('button');btn.className='blessing-btn';btn.innerHTML=`<span class="blessing-icon">${blessing.icon}</span><span class="blessing-name">${blessing.name}</span><span class="blessing-desc">${blessing.description()}</span>`;
      btn.addEventListener('click',()=>{const result=blessing.apply();requireFn('recordRunBuff')(blessing.icon,blessing.name,blessing.description(),'divine','Blessing from God');clearTile();node('blessingOverlay').classList.add('hidden');requireFn('addLog')(`Received the divine blessing <b>${blessing.name}</b>.`);if(Array.isArray(result)&&result.length){const names=result.map(up=>`${requireFn('rarityLabel')(up.rarity)} ${up.name}`).join(', ');requireFn('addLog')(`<b>Miracle Engine granted:</b> ${names}.`);requireFn('showToast')(`Miracle: ${result.map(up=>up.name).join(' · ')}`);}else requireFn('showToast')(blessing.name);requireFn('updateHUD')();requireFn('returnToRoad')();});grid.appendChild(btn);});
    node('blessingOverlay').classList.remove('hidden');requireFn('addLog')('You step into a <b>Blessing from God</b>.');
  }

  // MYSTIC -----------------------------------------------------------------
  function clearMysticTile(){clearTile();node('mysticOverlay').classList.add('hidden');currentMysticBuff=null;requireFn('returnToRoad')();}
  function openMystic(){bind();
    const roll=random(),wanted=roll<MYSTIC_RULE.legendaryCutoff?'legendary':roll<MYSTIC_RULE.epicCutoff?'epic':'rare',choice=requireFn('fallbackRarityPool')(wanted);
    currentMysticBuff=choice.pool.length?pick(choice.pool):null;
    if(!currentMysticBuff){requireFn('addLog')('<b>Mystic:</b> no eligible powerups remain. The Mystic leaves without taking your HP.');requireFn('returnToRoad')();return;}
    const label=requireFn('rarityLabel')(currentMysticBuff.rarity),offer=node('mysticOffer');offer.className=`loot-card ${currentMysticBuff.rarity}`;offer.innerHTML=`<div class="loot-top"><div class="loot-icon">${currentMysticBuff.icon}</div><div><div class="rarity-badge">${label}</div><div class="loot-name">${currentMysticBuff.name}</div></div></div><div class="loot-bonuses">${powerupDescription(currentMysticBuff)}</div>`;
    const sub=node('mysticOverlay')?.querySelector('.subtitle');if(sub)sub.textContent=`The Mystic offers a ${label} power. Sacrifice ${MYSTIC_RULE.maxHpCost} maximum HP for the rest of this run to accept the gift.`;
    node('mysticOverlay').classList.remove('hidden');requireFn('addLog')(`A hooded <b>Mystic</b> offers a ${label} power for a permanent sacrifice.`);
  }
  function acceptMystic(){
    if(!currentMysticBuff)return;const p=player(),buff=currentMysticBuff,label=requireFn('rarityLabel')(buff.rarity);p.maxHp=Math.max(1,p.maxHp-MYSTIC_RULE.maxHpCost);p.hp=Math.min(p.hp,p.maxHp);requireFn('applyUpgrade')(buff,'The Mystic');requireFn('sfxHoly')();requireFn('addLog')(`The Mystic takes <b>${MYSTIC_RULE.maxHpCost} max HP</b>. You gain <b>${buff.name}</b> (${label}).`);requireFn('showToast')(`${label}: ${buff.name}`);clearMysticTile();
  }
  function declineMystic(){requireFn('addLog')("You refuse the Mystic's bargain.");clearMysticTile();}

  // BLOODWELL --------------------------------------------------------------
  function openBloodwell(){bind();
    const p=player(),stats=node('bloodwellStats');if(stats)stats.innerHTML=`<div class="stat"><span>HP</span><strong>${Math.round(p.hp)} / ${Math.round(p.maxHp)}</strong></div><div class="stat"><span>Potions</span><strong>${p.potions}</strong></div><div class="stat"><span>Attack</span><strong>${Math.round(p.attack)}</strong></div><div class="stat"><span>Defense</span><strong>${Math.round(p.defense)}</strong></div><div class="stat"><span>Luck</span><strong>${Math.round(p.luck*100)}</strong></div><div class="stat"><span>Crit Chance</span><strong>${Math.round(p.crit*100)}%</strong></div><div class="stat"><span>Dodge</span><strong>${Math.round(requireFn('effectiveDodgeChance')()*100)}%</strong></div><div class="stat"><span>Lifesteal</span><strong>${Math.round(p.lifeSteal*100)}%</strong></div><div class="stat"><span>Echo</span><strong>${Math.round(p.doubleStrike*100)}%</strong></div><div class="stat"><span>Boss dmg</span><strong>${Math.round(p.bossDamage*100)}%</strong></div>`;
    const options=[
      {id:'hp',label:'Sacrifice 20% max HP',ok:p.maxHp>15,apply(){const n=Math.max(5,Math.ceil(p.maxHp*.20));p.maxHp=Math.max(1,p.maxHp-n);p.hp=Math.min(p.hp,p.maxHp);return ['maxHp',n];}},
      {id:'potion',label:'Sacrifice 1 potion',ok:p.potions>0,apply(){p.potions--;return ['potions',1];}},
      {id:'luck',label:'Sacrifice 5 Luck',ok:p.luck>=.05,apply(){p.luck-=.05;return ['luck',5];}},
      {id:'attack',label:'Sacrifice 2 Attack',ok:p.attack>3,apply(){p.attack-=2;return ['attack',2];}},
      {id:'defense',label:'Sacrifice 2 Defense',ok:p.defense>1,apply(){p.defense-=2;return ['defense',2];}}
    ],grid=node('bloodwellGrid');grid.innerHTML='';
    options.forEach(o=>{const b=document.createElement('button');b.className='choice-btn rare';b.disabled=!o.ok;b.innerHTML=`<span class="choice-icon">🩸</span><span class="choice-name">${o.label}</span><span class="choice-desc">Receive a random increase in a different stat.</span>`;b.addEventListener('click',()=>{const [lost]=o.apply(),pool=['maxHp','attack','defense','luck','crit','dodge','lifeSteal','doubleStrike','bossDamage','potions'].filter(k=>k!==lost),gain=pick(pool),labels={maxHp:'+12 max HP',attack:'+3 attack',defense:'+3 defense',luck:'+8 Luck',crit:'+12% Crit Chance',dodge:'+12% raw Dodge',lifeSteal:'+15% Lifesteal',doubleStrike:'+15% Echo Strike',bossDamage:'+25% Boss Damage',potions:'+3 potions'};if(gain==='maxHp'){p.maxHp+=12;p.hp+=12;}if(gain==='attack')p.attack+=3;if(gain==='defense')p.defense+=3;if(gain==='luck')p.luck+=.08;if(gain==='crit')p.crit+=.12;if(gain==='dodge')p.dodge+=.12;if(gain==='lifeSteal')p.lifeSteal+=.15;if(gain==='doubleStrike')p.doubleStrike+=.15;if(gain==='bossDamage')p.bossDamage+=.25;if(gain==='potions')p.potions+=3;requireFn('recordRunBuff')('🩸','Bloodwell Exchange',`${o.label} → ${labels[gain]}`,'special','Bloodwell');clearTile();node('bloodwellOverlay').classList.add('hidden');requireFn('showToast')(labels[gain]);requireFn('addLog')(`<b>Bloodwell:</b> ${o.label}; received ${labels[gain]}.`);requireFn('updateHUD')();requireFn('returnToRoad')();});grid.appendChild(b);});
    const art=node('bloodwellOverlay')?.querySelector('.start-art'),ready=(meta().merchantKills||0)>=1;if(art){art.classList.toggle('bloodmage-secret-ready',ready);art.title=ready?'The blood icon seems to be watching you.':'';if(ready&&!art.dataset.v17Bloodmage){art.dataset.v17Bloodmage='1';art.addEventListener('click',()=>{if((meta().merchantKills||0)<1||node('bloodwellOverlay').classList.contains('hidden'))return;node('bloodwellOverlay').classList.add('hidden');requireFn('startCombat')('bloodmage');});}}
    node('bloodwellOverlay').classList.remove('hidden');
  }

  // GAMBLER ----------------------------------------------------------------
  function finishGambler(msg){node('gambleResult').textContent=msg;requireFn('addLog')(`<b>Gambler:</b> ${msg}`);requireFn('showToast')(msg);clearTile();requireFn('updateHUD')();setTimeout(()=>{node('gamblerOverlay').classList.add('hidden');requireFn('returnToRoad')();},700);}
  function openGambler(){bind();
    const p=player(),grid=node('gambleGrid');grid.innerHTML='';node('gambleResult').textContent=`You carry ${p.gold} gold.`;
    [0,.25,.5,1].forEach(percent=>{const wager=Math.floor(p.gold*percent),b=document.createElement('button');b.className='choice-btn uncommon';b.innerHTML=`<span class="choice-icon">${requireFn('art')('coins','Coins','db-art-choice')||'🪙'}</span><span class="choice-name">Bet ${Math.round(percent*100)}%</span><span class="choice-desc">${wager} gold on a coinflip.</span>`;b.addEventListener('click',()=>{if(percent===0){finishGambler('You politely decline.');return;}const actual=Math.floor(p.gold*percent),win=random()<.5;if(win){p.gold+=actual;finishGambler(`Heads! You win ${actual} gold.`);}else{p.gold-=actual;finishGambler(`Tails! You lose ${actual} gold.`);}});grid.appendChild(b);});
    const subtitle=document.querySelector('#gamblerOverlay .subtitle');if(subtitle&&!document.querySelector('#gamblerOverlay .gambler-art'))subtitle.insertAdjacentHTML('afterend',`<div class="gambler-art">${requireFn('art')('gambler','Gambler','db-art-portrait')}${requireFn('art')('coins','Coins','db-art-choice')}</div>`);
    node('gamblerOverlay').classList.remove('hidden');
  }

  function bind(){
    if(bound)return api;bound=true;
    node('spinBtn').addEventListener('click',spinSlot);
    node('wheelSpinBtn').addEventListener('click',spinWheel);
    node('eventContinueBtn').addEventListener('click',()=>{node('eventOverlay').classList.add('hidden');requireFn('returnToRoad')();});
    node('wheelContinueBtn').addEventListener('click',()=>{node('wheelOverlay').classList.add('hidden');requireFn('returnToRoad')();});
    node('acceptMysticBtn').addEventListener('click',acceptMystic);
    node('declineMysticBtn').addEventListener('click',declineMystic);
    node('bloodwellLeaveBtn').addEventListener('click',()=>{clearTile();node('bloodwellOverlay').classList.add('hidden');requireFn('returnToRoad')();});
    node('gamblerLeaveBtn').addEventListener('click',()=>{node('gamblerOverlay').classList.add('hidden');clearTile();requireFn('returnToRoad')();});
    return api;
  }
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};return api;}
  function resetTransient(){currentMysticBuff=null;wheelBusy=false;}
  function inspect(){return Object.freeze({owner:OWNER,bound,wheelBusy,fastWheelSlots:typeof runtime.fastWheelSlots==='function'&&!!runtime.fastWheelSlots(),hasMysticOffer:!!currentMysticBuff,mysticRarity:currentMysticBuff?.rarity||null});}

  const api=Object.freeze({configure,openSlot,openWheel,openBlessing,openMystic,openBloodwell,openGambler,spinSlot,spinWheel,applySlotReward,resetTransient,inspect,owner:OWNER});
  window.DiceboundRoadEventLifecycle=api;
})();
