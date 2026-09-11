(() => {
  "use strict";

  function createController(services = {}) {
    const {
      getPlayer,
      getBoardLevel,
      random,
      pick,
      rollGearRarity,
      generateEquipment,
      rawSellValue,
      equipItem,
      formatBonuses,
      getSlotLabel,
      clamp,
      eligibleUpgrades,
      isPowerupRarityAtLeast,
      applyUpgrade,
      applyRandomHighRarity
    } = services;

    const required = {
      getPlayer,getBoardLevel,random,pick,rollGearRarity,generateEquipment,rawSellValue,
      equipItem,formatBonuses,getSlotLabel,clamp,eligibleUpgrades,isPowerupRarityAtLeast,
      applyUpgrade,applyRandomHighRarity
    };
    for (const [name, value] of Object.entries(required)) {
      if (typeof value !== "function") throw new Error(`DiceboundMerchantStock requires ${name}.`);
    }

    function catalog() {
      const player = getPlayer();
      const boardLevel = Number(getBoardLevel()) || 1;

      if (boardLevel === 6) return [
        {id:"heal6",icon:"❤️‍🔥",name:"Impossible Restoration",desc:"Restore all HP and gain +12 max HP this run.",base:520,buy(){player.maxHp+=12;player.hp=player.maxHp;}},
        {id:"potion6",icon:"🧪",name:"Grand Flask Case",desc:"Gain 7 potions.",base:430,buy(){player.potions+=7;}},
        {id:"attack6",icon:"⚔️",name:"Sixth-Road Edge",desc:"Gain +5 Attack this run.",base:720,buy(){player.attack+=5;}},
        {id:"armor6",icon:"🛡️",name:"Abyssal Plate",desc:"Gain +5 Defense and +2 flat reduction this run.",base:760,buy(){player.defense+=5;player.flatReduction+=2;}},
        {id:"charm6",icon:"🌈",name:"Entropy Prism",desc:"Gain +20% elemental proc and +25% elemental power this run.",base:840,buy(){player.elementProcBonus+=.20;player.elementDamageBonus+=.25;}},
        {id:"contract6",icon:"👑",name:"Tyrant's Legendary Contract",desc:"Choose one Legendary power.",base:1050,alphaChooseLegendary:true,buy(){return null;}}
      ];

      if (boardLevel === 5) return [
        {id:"potion",icon:"🧪",name:"Ouroboros Apothecary",desc:"Gain 12 potions and +100% potion healing.",base:520+player.position*4,buy(){player.potions+=12;player.potionPower+=1;}},
        {id:"heal",icon:"💖",name:"Fifth-Road Reconstruction",desc:"Restore all HP and gain +40 max HP.",base:680+player.position*4,buy(){player.maxHp+=40;player.hp=player.maxHp;}},
        {id:"attack",icon:"⚔️",name:"Tyrant Edge Charter",desc:"Gain +10 attack and +25% Boss Damage.",base:890+player.position*5,buy(){player.attack+=10;player.bossDamage+=.25;}},
        {id:"armor",icon:"🏰",name:"Ringbound Sovereign Plating",desc:"Gain +10 defense and 3 flat damage reduction.",base:930+player.position*5,buy(){player.defense+=10;player.flatReduction+=3;}},
        {id:"charm",icon:"🌈",name:"Ouroboros Fate Engine",desc:"Gain +40 Luck, +20% Crit, +20% Echo and +20% element power.",base:940+player.position*5,buy(){player.luck+=.40;player.crit+=.20;player.doubleStrike+=.20;player.elementDamageBonus+=.20;}},
        {id:"relic",icon:"💍",name:"Tyrant's Legendary Contract",desc:"Choose from three random Legendary powerups.",base:1320+player.position*6,alphaChooseLegendary:true,buy(){return null;}}
      ];

      if (boardLevel === 4) return [
        {id:"potion",icon:"🧪",name:"Crownroad Pharmacy",desc:"Gain 9 potions and +75% potion healing.",base:185+player.position*2,buy(){player.potions+=9;player.potionPower+=.75;}},
        {id:"heal",icon:"💖",name:"Total Timeline Restoration",desc:"Restore all HP and gain +25 max HP.",base:240+player.position*2,buy(){player.maxHp+=25;player.hp=player.maxHp;}},
        {id:"attack",icon:"⚔️",name:"Omega Edge License",desc:"Gain +7 attack and +15% Boss Damage.",base:310+player.position*2,buy(){player.attack+=7;player.bossDamage+=.15;}},
        {id:"armor",icon:"🏰",name:"Sovereign Plating",desc:"Gain +7 defense and 2 flat reduction.",base:330+player.position*2,buy(){player.defense+=7;player.flatReduction+=2;}},
        {id:"charm",icon:"🌈",name:"Final-Road Fate Engine",desc:"Gain +30 Luck, +15% Crit, +15% Echo and +15% element power.",base:325+player.position*2,buy(){player.luck+=.30;player.crit+=.15;player.doubleStrike+=.15;player.elementDamageBonus+=.15;}},
        {id:"relic",icon:"👑",name:"Sovereign Relic",desc:"Choose one of three random Legendary powerups.",base:455+player.position*3,alphaChooseLegendary:true,buy(){return null;}}
      ];

      if (boardLevel === 3) return [
        {id:"potion",icon:"🧪",name:"Impossible Apothecary Chest",desc:"Gain 6 potions and +50% potion power.",base:95+player.position,buy(){player.potions+=6;player.potionPower+=.50;}},
        {id:"heal",icon:"❤️",name:"Reality Reconstruction",desc:"Restore all HP and gain +14 max HP.",base:135+player.position,buy(){player.maxHp+=14;player.hp=player.maxHp;}},
        {id:"attack",icon:"⚔️",name:"Nullstar Edge Treatment",desc:"Gain +4 attack.",base:178+player.position,buy(){player.attack+=4;}},
        {id:"armor",icon:"🛡️",name:"Paradox Armor Plating",desc:"Gain +4 defense and 1 flat reduction.",base:192+player.position,buy(){player.defense+=4;player.flatReduction+=1;}},
        {id:"charm",icon:"🌈",name:"Impossible Fate Engine",desc:"Gain +20 Luck, +10% Crit and +10% Echo.",base:180+player.position,buy(){player.luck+=.20;player.crit+=.10;player.doubleStrike+=.10;}},
        {id:"relic",icon:"🌌",name:"Unbound Impossible Relic",desc:"Reveal one Rare+ powerup.",base:285+player.position*2,buy(){const up=pick(eligibleUpgrades(u=>isPowerupRarityAtLeast(u.rarity,"rare")));applyUpgrade(up,"Unbound Impossible Relic");return up;}}
      ];

      if (boardLevel === 2) return [
        {id:"potion",icon:"🧪",name:"Astral Potion Crate",desc:"Gain 4 potions.",base:58+player.position,buy(){player.potions+=4;}},
        {id:"heal",icon:"❤️",name:"Devourer-Safe Restoration",desc:"Restore all HP and gain +6 max HP.",base:82+player.position,buy(){player.maxHp+=6;player.hp=player.maxHp;}},
        {id:"attack",icon:"⚔️",name:"Starforged Whetstone",desc:"Gain +2 attack.",base:112+player.position,buy(){player.attack+=2;}},
        {id:"armor",icon:"🛡️",name:"Titan Plate Rivets",desc:"Gain +2 defense.",base:126+player.position,buy(){player.defense+=2;}},
        {id:"charm",icon:"🍀",name:"Astral Fate Prism",desc:"Gain +10 Luck and +5% Crit.",base:108+player.position,buy(){player.luck+=.10;player.crit+=.05;}},
        {id:"relic",icon:"🌌",name:"Unsealed Astral Relic",desc:"Reveal an Epic or Legendary powerup.",base:190+player.position*2,buy(){const up=pick(eligibleUpgrades(u=>u.rarity==="epic"||u.rarity==="legendary"));applyUpgrade(up,"Astral Relic");return up;}}
      ];

      return [
        {id:"potion",icon:"🧪",name:"Potion Pack",desc:"Gain 2 potions.",base:24+player.position,buy(){player.potions+=2;}},
        {id:"heal",icon:"❤️",name:"Full Service Healing",desc:"Restore all HP.",base:32+player.position,buy(){player.hp=player.maxHp;}},
        {id:"attack",icon:"⚔️",name:"Tempered Whetstone",desc:"Gain +1 attack.",base:58+player.position,buy(){player.attack+=1;}},
        {id:"armor",icon:"🛡️",name:"Armor Reinforcement",desc:"Gain +1 defense.",base:66+player.position,buy(){player.defense+=1;}},
        {id:"charm",icon:"🎯",name:"Lucky Charm",desc:"Gain +4% Crit.",base:52+player.position,buy(){player.crit+=.04;}},
        {id:"relic",icon:"🔮",name:"Sealed Relic",desc:"Reveal a Rare or Epic powerup.",base:105+player.position*2,buy(){return applyRandomHighRarity();}}
      ];
    }

    function price(base) {
      const player = getPlayer();
      const boardLevel = Number(getBoardLevel()) || 1;
      const scale = boardLevel===1?.90:boardLevel===2?1.08:boardLevel===3?1.20:boardLevel===4?1.34:1.48;
      return player.freeMerchantRun ? 0 : Math.max(1,Math.round(base*scale*(1-clamp(player.shopDiscount,0,.55))));
    }

    function makeGear() {
      const player = getPlayer();
      const b = Number(getBoardLevel()) || 1;
      const bonus = {1:.05,2:.18,3:.34,4:.52,5:.72,6:.95}[b]||.95;
      let rarity = rollGearRarity(bonus);
      if(b>=2&&rarity==='poor'&&random()<.60)rarity='common';
      if(b>=3&&rarity==='poor')rarity='common';
      if(b>=3&&rarity==='common'&&random()<(b===3?.22:b===4?.34:.48))rarity='uncommon';
      if(b>=4&&rarity==='uncommon'&&random()<(b===4?.12:b===5?.20:.32))rarity='rare';
      if(b>=5&&rarity==='rare'&&random()<(b===5?.08:.18))rarity='epic';
      const gear=generateEquipment(rarity),markup=[0,1.7,1.9,2.15,2.45,2.75,3.25][b]||3.25,base=Math.round(rawSellValue(gear)*markup);
      return {id:gear.id,icon:gear.icon,name:gear.name,desc:`${getSlotLabel(gear.slot)} · ${formatBonuses(gear)}`,gear,base,buy(){equipItem(gear);return gear;}};
    }

    function buildStock() {
      const player = getPlayer();
      const boardLevel = Number(getBoardLevel()) || 1;
      const source = catalog();
      const stock = [];

      if (boardLevel === 6) {
        source.forEach(item=>stock.push({...item,sold:false}));
        for(let i=0;i<6;i++)stock.push({...makeGear(),sold:false});
        return {
          items:stock,
          title:"Merchant at the End of Mathematics",
          subtitle:"Board 6 stock is exceptional. Its prices assume you survived five roads to reach it."
        };
      }

      const catalogCount=boardLevel>=5?6:boardLevel===4?6:boardLevel===3?5:boardLevel===2?4:3;
      while(stock.length<Math.min(catalogCount,source.length)){
        const item=pick(source);
        if(!stock.some(entry=>entry.id===item.id))stock.push({...item,sold:false});
      }
      const gearCount=boardLevel>=5?5:boardLevel===4?4:boardLevel===3?3:boardLevel===2?2:1;
      for(let i=0;i<gearCount;i++)stock.push({...makeGear(),sold:false});
      return {
        items:stock,
        title:player.freeMerchantRun?"The Merchant Owes You Everything":boardLevel===5?"Ouroboros Exchange":boardLevel===4?"Crownroad Merchant":boardLevel===3?"Impossible Merchant":boardLevel===2?"Astral Merchant":"Roadside Merchant",
        subtitle:player.freeMerchantRun?"After defeating the merchant, every shop item is free for the rest of this run.":boardLevel===5?"The final road sells final-road gear at final-road prices.":boardLevel>=4?"Late-road merchants carry exceptional gear, but no longer pretend endgame money is pocket change.":"Compare equipment before buying."
      };
    }

    return Object.freeze({catalog,price,makeGear,buildStock});
  }

  window.DiceboundMerchantStock = Object.freeze({apiVersion:1,createController});
})();
