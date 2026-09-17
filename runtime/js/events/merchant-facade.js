/* DiceBound Merchant public subsystem facade.
 *
 * Ordinary callers should depend on DiceboundMerchant rather than coordinating
 * stock, transaction and presentation owners directly. Those focused owners
 * remain authoritative internals behind this boundary.
 */
(function(){
  'use strict';

  const OWNER='merchant/facade';
  const stockOwner=window.DiceboundMerchantStock;
  const transaction=window.DiceboundMerchantTransaction;
  const uiOwner=window.DiceboundMerchantUi;
  if(!stockOwner?.createController)throw new Error('DiceboundMerchant requires DiceboundMerchantStock before loading.');
  if(!transaction?.createVisit)throw new Error('DiceboundMerchant requires DiceboundMerchantTransaction before loading.');
  if(!uiOwner?.createController)throw new Error('DiceboundMerchant requires DiceboundMerchantUi before loading.');

  let runtime=Object.freeze({});
  let stock=null;
  let ui=null;
  let visit=null;

  function requireFn(group,name){
    const fn=runtime[group]?.[name];
    if(typeof fn!=='function')throw new Error(`DiceboundMerchant capability is not configured: ${group}.${name}`);
    return fn;
  }
  function getItems(){return requireFn('state','getItems')();}
  function visitForCurrentStock(){
    const items=getItems();
    if(!visit||(!transaction.hasActiveChoice(visit)&&!transaction.ownsOffers(visit,items)))visit=transaction.createVisit(items);
    return visit;
  }
  function configure(nextRuntime={}){
    runtime=Object.freeze({...runtime,...nextRuntime});
    if(!runtime.stock||!runtime.state||!runtime.ui)throw new Error('DiceboundMerchant requires stock, state and ui configuration groups.');
    stock=stockOwner.createController(runtime.stock);
    ui=uiOwner.createController({
      ...runtime.ui,
      getItems:()=>getItems(),
      getNotice:()=>requireFn('state','getNotice')(),
      setNotice:value=>requireFn('state','setNotice')(value),
      priceFor:base=>price(base),
      getVisit:()=>visitForCurrentStock(),
      transaction,
      setMerchantVisible:visible=>requireFn('state','setVisible')(visible)
    });
    return api;
  }
  function requireStock(){if(!stock)throw new Error('DiceboundMerchant stock owner is not configured.');return stock;}
  function requireUi(){if(!ui)throw new Error('DiceboundMerchant UI owner is not configured.');return ui;}
  function catalog(){return requireStock().catalog();}
  function price(base){return requireStock().price(base);}
  function makeGear(){return requireStock().makeGear();}
  function buildStock(){return requireStock().buildStock();}
  function render(){return requireUi().render();}
  function bindRoadTileInteraction(element,tile,index){
    if(tile?.type!=="merchant"||!element?.querySelector)return false;
    const face=element.querySelector(".tile-icon");
    if(!face)return false;
    const isFaceActivated=requireFn("secret","isFaceActivated");
    face.title="Click every merchant face on this board for a secret.";
    face.classList?.toggle?.("merchant-primed",!!isFaceActivated(index));
    if(face.dataset?.merchantSecretBound==="1")return true;
    if(face.dataset)face.dataset.merchantSecretBound="1";
    face.addEventListener("click",event=>{
      event.stopPropagation();
      const result=requireFn("secret","activateFace")(index)||{};
      face.classList?.add?.("merchant-primed");
      requireFn("secret","toast")(`Merchant faces: ${Number(result.count)||0}/${Number(result.total)||0}`);
      if(result.primedNow){
        requireFn("secret","log")("Every merchant portrait smiles at once. <b>The next merchant is waiting for a fight.</b>");
        requireFn("secret","toast")("🧔 Secret merchant boss primed!");
      }
    });
    return true;
  }
  function open(){
    requireStock();requireUi();
    if(transaction.hasActiveChoice(visit))return false;
    const view=buildStock();
    requireFn('state','setItems')(view.items);
    requireFn('state','setNotice')('');
    requireFn('state','setTitle')(view.title);
    requireFn('state','setSubtitle')(view.subtitle);
    requireFn('state','setVisible')(true);
    render();
    visit=transaction.beginVisit(null,getItems());
  }
  const testing=Object.freeze({
    createVisitForCurrentStock(){visit=transaction.createVisit(getItems());return transaction.snapshot(visit);},
    snapshotVisit(){return transaction.snapshot(visit);},
    hasActiveChoice(){return transaction.hasActiveChoice(visit);}
  });
  function inspect(){
    return Object.freeze({
      owner:OWNER,
      configured:Object.freeze({stock:!!stock,ui:!!ui,state:!!runtime.state,secret:!!runtime.secret}),
      internals:Object.freeze({stock:'merchant/stock',transaction:'merchant/transaction',ui:'merchant/ui'})
    });
  }

  const api=Object.freeze({configure,catalog,price,makeGear,buildStock,render,open,bindRoadTileInteraction,inspect,testing,owner:OWNER});
  window.DiceboundMerchant=api;
})();
