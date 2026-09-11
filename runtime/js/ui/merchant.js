(() => {
  "use strict";

  function isLegendaryChoiceOffer(item){
    return !!item?.alphaChooseLegendary || /Sovereign Relic|Legendary Contract/i.test(item?.name || "");
  }

  function createController(services={}){
    const required=["$","getPlayer","getItems","getNotice","setNotice","priceFor","getVisit","transaction","formatGearComparison","gearPowerScore","confirmWeakerGear","chargeOffer","refundOffer","applyOffer","recordRunBuff","formatBonuses","rarityInfoFor","showToast","updateHud","openLegendaryChoice","setMerchantVisible"];
    for(const name of required)if(!services[name])throw new Error(`Merchant UI requires ${name}`);
    const schedule=services.schedule||((fn,ms)=>setTimeout(fn,ms));
    const tx=services.transaction;

    function render(){
      const visit=services.getVisit(),player=services.getPlayer(),items=services.getItems();
      services.$("merchantGold").textContent=player.gold;
      const notice=services.$("merchantNotice");notice.classList.toggle("show",!!services.getNotice());notice.innerHTML=services.getNotice();
      const grid=services.$("shopGrid");grid.innerHTML="";
      items.forEach((item,index)=>{
        const key=tx.offerKey(item,index),price=services.priceFor(item.base),sold=item.sold||!tx.canPurchase(visit,key),btn=document.createElement("button");
        btn.className=`shop-item${sold?" sold":""}`;btn.disabled=sold||player.gold<price;
        const comparison=item.gear?`<div class="shop-compare">${services.formatGearComparison(item.gear,player.equipment[item.gear.slot])}</div>`:"";
        btn.innerHTML=`<div class="shop-item-top"><span class="shop-item-icon">${item.icon}</span><span class="shop-price">${sold?"SOLD":price+"g"}</span></div><div class="shop-item-name">${item.name}</div><div class="shop-item-desc">${item.desc}</div>${comparison}`;
        btn.addEventListener("click",async()=>{
          const livePlayer=services.getPlayer();
          if(item.sold||livePlayer.gold<price)return;
          const reservation=tx.reservePurchase(visit,key);if(!reservation.ok)return;
          if(item.gear){
            const current=livePlayer.equipment[item.gear.slot];
            if(current&&services.gearPowerScore(item.gear)<services.gearPowerScore(current)&&!(await services.confirmWeakerGear(item.gear,current))){tx.cancelReservation(visit,reservation.token);render();return;}
          }
          if(services.getPlayer().gold<price){tx.cancelReservation(visit,reservation.token);render();return;}
          const chooser=isLegendaryChoiceOffer(item),purchase=chooser?tx.beginChoice(visit,reservation.token):tx.commitPurchase(visit,reservation.token);
          if(!purchase.ok){tx.cancelReservation(visit,reservation.token);return;}
          services.chargeOffer(item,price);
          if(chooser){
            services.setNotice(`<b>${item.name} purchased.</b> Choose one Legendary power.`);render();services.setMerchantVisible(false);
            schedule(()=>{
              if(!tx.hasActiveChoice(visit))return;
              services.openLegendaryChoice(item.name||"Legendary Contract",chosen=>{
                if(!tx.settleChoice(visit,purchase.token).ok)return;
                if(!chosen){services.refundOffer(price);services.setNotice(`No eligible Legendary powers remain; ${price} gold was refunded. This Merchant offer remains sold.`);}
                else services.setNotice(`<b>${item.name} claimed:</b> ${chosen.name}.`);
                services.setMerchantVisible(true);services.showToast(chosen?`Legendary: ${chosen.name}`:"Relic refunded");services.updateHud();render();
              });
            },0);
            return;
          }
          const result=services.applyOffer(item);
          if(item.id==="relic"&&result){const rarity=services.rarityInfoFor(result.rarity);services.setNotice(`<b>Relic opened:</b> ${rarity.label} <b>${result.name}</b><br>${result.desc}`);}
          else if(item.gear)services.setNotice(`Equipped <b>${item.gear.name}</b>.<br>${services.formatBonuses(item.gear)}`);
          if(["attack","armor","charm"].includes(item.id))services.recordRunBuff(item);
          const rarity=item.id==="relic"&&result?services.rarityInfoFor(result.rarity):null;
          services.showToast(rarity?`${rarity.label}: ${result.name}`:item.name);services.updateHud();render();
        });
        grid.appendChild(btn);
      });
      return visit;
    }

    return Object.freeze({render,isLegendaryChoiceOffer});
  }

  const api=Object.freeze({apiVersion:1,createController,isLegendaryChoiceOffer});
  window.DiceboundMerchantUi=api;
})();
