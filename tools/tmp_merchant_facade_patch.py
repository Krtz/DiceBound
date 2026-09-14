from pathlib import Path
import json
import re

ROOT=Path(__file__).resolve().parents[1]

FACADE=r'''/* DiceBound Merchant public subsystem facade.
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
      configured:Object.freeze({stock:!!stock,ui:!!ui,state:!!runtime.state}),
      internals:Object.freeze({stock:'merchant/stock',transaction:'merchant/transaction',ui:'merchant/ui'})
    });
  }

  const api=Object.freeze({configure,catalog,price,makeGear,buildStock,render,open,inspect,testing,owner:OWNER});
  window.DiceboundMerchant=api;
})();
'''

TEST_FACADE=r'''"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");

const calls=[];
let renderedVisit=null;
const transaction={
  createVisit(items){const v={items,active:false};renderedVisit=v;calls.push("tx:create");return v;},
  beginVisit(previous,items){calls.push("tx:begin");return renderedVisit&&renderedVisit.items===items?renderedVisit:{items,active:false};},
  ownsOffers(visit,items){return !!visit&&visit.items===items;},
  hasActiveChoice(visit){return !!visit?.active;},
  snapshot(visit){return visit?{active:visit.active,count:visit.items.length}:null;}
};
const stockController={catalog:()=>["catalog"],price:base=>base+1,makeGear:()=>({id:"gear"}),buildStock:()=>{calls.push("stock:build");return {items:[{id:"offer"}],title:"T",subtitle:"S"};}};
const stockOwner={createController(services){assert.equal(typeof services.random,"function");calls.push("stock:configure");return stockController;}};
const uiOwner={createController(services){calls.push("ui:configure");return {render(){calls.push("ui:render");services.getVisit();return true;}};}};
global.window={DiceboundMerchantStock:stockOwner,DiceboundMerchantTransaction:transaction,DiceboundMerchantUi:uiOwner};
require(path.resolve("runtime/js/events/merchant-facade.js"));
const merchant=window.DiceboundMerchant;
let items=[],notice="old",title="",subtitle="",visible=false;
merchant.configure({
  stock:{random:()=>.5},
  state:{getItems:()=>items,setItems:v=>{items=v;calls.push("state:items");},getNotice:()=>notice,setNotice:v=>{notice=v;calls.push("state:notice");},setTitle:v=>{title=v;calls.push("state:title");},setSubtitle:v=>{subtitle=v;calls.push("state:subtitle");},setVisible:v=>{visible=v;calls.push("state:visible");}},
  ui:{$:()=>({})}
});
assert.equal(merchant.owner,"merchant/facade");
assert.deepEqual(merchant.catalog(),["catalog"]);assert.equal(merchant.price(4),5);assert.deepEqual(merchant.makeGear(),{id:"gear"});
const before=calls.length;assert.equal(merchant.open(),undefined);
assert.deepEqual(calls.slice(before),["stock:build","state:items","state:notice","state:title","state:subtitle","state:visible","ui:render","tx:create","tx:begin"]);
assert.equal(notice,"");assert.equal(title,"T");assert.equal(subtitle,"S");assert.equal(visible,true);assert.equal(items.length,1);
assert.deepEqual(merchant.testing.snapshotVisit(),{active:false,count:1});
renderedVisit.active=true;const blockedCount=calls.length;assert.equal(merchant.open(),false);assert.equal(calls.length,blockedCount,"active Legendary choice must block stock rebuild");
const inspected=merchant.inspect();assert.equal(inspected.configured.stock,true);assert.equal(inspected.configured.ui,true);assert.equal(inspected.owner,"merchant/facade");
console.log("Merchant facade ownership tests passed");
'''

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise RuntimeError(f"{label}: expected 1 exact match, got {count}")
    return text.replace(old,new,1)

def regex_once(text,pattern,repl,label,flags=0):
    out,count=re.subn(pattern,repl,text,count=1,flags=flags)
    if count!=1: raise RuntimeError(f"{label}: expected 1 regex match, got {count}")
    return out

# New facade + focused owner test.
facade_path=ROOT/'runtime/js/events/merchant-facade.js'
facade_path.write_text(FACADE,encoding='utf-8',newline='\n')
(ROOT/'tools/test_merchant_facade.js').write_text(TEST_FACADE,encoding='utf-8',newline='\n')

# Script/load graph.
index_path=ROOT/'runtime/index.html'; index=index_path.read_text(encoding='utf-8')
index=replace_once(index,'<script src="js/ui/merchant.js"></script>\n<script src="js/dicebound.js"></script>','<script src="js/ui/merchant.js"></script>\n<script src="js/events/merchant-facade.js"></script>\n<script src="js/dicebound.js"></script>','index Merchant facade order')
index_path.write_text(index,encoding='utf-8',newline='\n')

manifest_path=ROOT/'runtime/js/module-manifest.json'; manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
load=manifest['loadOrder']
if 'merchant-facade' in load: raise RuntimeError('merchant-facade already in loadOrder')
mono_i=load.index('dicebound-monolith'); load.insert(mono_i,'merchant-facade')
if any(m.get('id')=='merchant-facade' for m in manifest['modules']): raise RuntimeError('merchant-facade module already exists')
entry={"id":"merchant-facade","path":"js/events/merchant-facade.js","domain":"events/public-merchant-subsystem-facade","status":"extracted","requires":["merchant-transactions","merchant-stock","ui-merchant"],"provides":["DiceboundMerchant"]}
mono_i=next(i for i,m in enumerate(manifest['modules']) if m.get('id')=='dicebound-monolith');manifest['modules'].insert(mono_i,entry)
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding='utf-8',newline='\n')

# Compatibility monolith: ordinary Merchant callers now see only DiceboundMerchant.
mono_path=ROOT/'runtime/js/dicebound.js'; mono=mono_path.read_text(encoding='utf-8')
mono=replace_once(mono,'  const MERCHANT_SPACING = 12;','  const dbMerchantOwner=window.DiceboundMerchant;\n  if(!dbMerchantOwner)throw new Error("dicebound.js requires DiceboundMerchant before loading.");\n  let dbMerchant=null;\n  const MERCHANT_SPACING = 12;','Merchant facade bootstrap')
mono=replace_once(mono,'  let dbMerchantStock = null;\n','', 'retire dbMerchantStock state')

mono=regex_once(mono,r"  function makeMerchantGear\(\)\{if\(!dbMerchantStock\)throw new Error\('Merchant stock owner is not configured\.'\);return dbMerchantStock\.makeGear\(\);\}\n  function merchantCatalog\(\)\{if\(!dbMerchantStock\)throw new Error\('Merchant stock owner is not configured\.'\);return dbMerchantStock\.catalog\(\);\}\n  function merchantPrice\(base\)\{if\(!dbMerchantStock\)throw new Error\('Merchant stock owner is not configured\.'\);return dbMerchantStock\.price\(base\);\}\n  // Merchant stock/economy construction is owned by events/merchant-stock\.js\.\n  // This lexical adapter remains for Board/event callers inside the compatibility monolith\.\n  function openMerchant\(\)\{\n    if\(!dbMerchantStock\)throw new Error\('Merchant stock owner is not configured\.'\);\n    if\(db0646MerchantTransaction\.hasActiveChoice\(db0646MerchantVisit\)\)return false;\n    const view=dbMerchantStock\.buildStock\(\);\n    currentMerchantItems=view\.items;currentMerchantNotice=\"\";\n    \$\(\"merchantTitle\"\)\.textContent=view\.title;\$\(\"merchantSubtitle\"\)\.textContent=view\.subtitle;\n    \$\(\"merchantOverlay\"\)\.classList\.remove\(\"hidden\"\);renderMerchant\(\);\n    db0646MerchantVisit=db0646MerchantTransaction\.beginVisit\(null,currentMerchantItems\);\n  \}","  function makeMerchantGear(){if(!dbMerchant)throw new Error('Merchant facade is not configured.');return dbMerchant.makeGear();}\n  function merchantCatalog(){if(!dbMerchant)throw new Error('Merchant facade is not configured.');return dbMerchant.catalog();}\n  function merchantPrice(base){if(!dbMerchant)throw new Error('Merchant facade is not configured.');return dbMerchant.price(base);}\n  // Merchant stock, transactions and presentation are internal to DiceboundMerchant.\n  // These lexical adapters remain only for compatibility callers inside this composition root.\n  function openMerchant(){if(!dbMerchant)throw new Error('Merchant facade is not configured.');return dbMerchant.open();}",'stock/open facade adapters')

mono=regex_once(mono,r"  // Merchant presentation is owned by ui/merchant\.js; this lexical adapter\n  // remains only for legacy callers inside the compatibility monolith\.\n  let dbMerchantUi=null;\n  function renderMerchant\(\)\{\n    if\(!dbMerchantUi\)throw new Error\('Merchant UI owner is not configured\.'\);\n    return dbMerchantUi\.render\(\);\n  \}","  // Merchant presentation is reached through the subsystem facade.\n  function renderMerchant(){if(!dbMerchant)throw new Error('Merchant facade is not configured.');return dbMerchant.render();}",'UI facade adapter')

mono=regex_once(mono,r"  const db0646MerchantTransaction=window\.DiceboundMerchantTransaction;\n  if\(!db0646MerchantTransaction\)throw new Error\('DiceboundMerchantTransaction must load before dicebound\.js'\);\n  let db0646MerchantVisit=null;\n  function db0646MerchantVisitForCurrentStock\(\)\{\n    if\(!db0646MerchantVisit\|\|\(!db0646MerchantTransaction\.hasActiveChoice\(db0646MerchantVisit\)&&!db0646MerchantTransaction\.ownsOffers\(db0646MerchantVisit,currentMerchantItems\)\)\)\{db0646MerchantVisit=db0646MerchantTransaction\.createVisit\(currentMerchantItems\);\}\n    return db0646MerchantVisit;\n  \}\n",'', 'retire transaction composition state')

config=r'''  // Merchant subsystem composition: focused stock, transaction and UI owners live
  // behind one ordinary public DiceboundMerchant boundary.
  dbMerchant=dbMerchantOwner.configure({
    stock:{
      getPlayer:()=>player,getBoardLevel:()=>boardLevel,random:()=>random(),pick:list=>pick(list),
      rollGearRarity:bonus=>dbItems.rollGearRarity(bonus),generateEquipment:(rarity,slot)=>dbItems.generateEquipment(rarity,slot),
      rawSellValue:item=>dbItems.rawSellValue(item),equipItem:item=>dbItems.equip(item),formatBonuses:item=>dbItems.formatBonuses(item),
      getSlotLabel:slot=>SLOT_LABELS[slot],clamp:(value,min,max)=>clamp(value,min,max),eligibleUpgrades:filter=>eligibleUpgrades(filter),
      isPowerupRarityAtLeast:(rarity,floor)=>DB_RARITIES.isPowerupRarityAtLeast(rarity,floor),
      applyUpgrade:(up,source)=>applyUpgrade(up,source),applyRandomHighRarity:(source,announce)=>applyRandomHighRarity(source,announce)
    },
    state:{
      getItems:()=>currentMerchantItems,setItems:value=>{currentMerchantItems=value;},
      getNotice:()=>currentMerchantNotice,setNotice:value=>{currentMerchantNotice=value;},
      setTitle:value=>{$('merchantTitle').textContent=value;},setSubtitle:value=>{$('merchantSubtitle').textContent=value;},
      setVisible:visible=>$('merchantOverlay').classList.toggle('hidden',!visible)
    },
    ui:{
      $:id=>$(id),getPlayer:()=>player,
      formatGearComparison:(item,current)=>formatGearComparison(item,current),gearPowerScore:item=>gearPowerScore(item),
      confirmWeakerGear:(gear,current)=>diceboundConfirm(`${gear.name} appears weaker overall than ${current.name}. Buy and replace it anyway?`,{title:'Buy weaker gear?',confirmLabel:'Buy anyway',danger:true}),
      chargeOffer:(item,price)=>{player.gold-=price;ensureAlphaMeta().goldSpent+=price;statsLastGold=player.gold;item.sold=true;sfx.coin();addLog(`Bought <b>${item.name}</b> for ${price} gold.`);},
      refundOffer:price=>{player.gold+=price;},applyOffer:item=>item.buy?.(),
      recordRunBuff:item=>recordRunBuff(item.icon,item.name,item.desc,'merchant','Merchant'),formatBonuses:item=>formatBonuses(item),
      rarityInfoFor:rarity=>rarityInfo[rarity],showToast:(...args)=>showToast(...args),updateHud:()=>updateHUD(),
      openLegendaryChoice:(source,done)=>db0410OpenSovereignChoice(source,done),schedule:(fn,ms)=>setTimeout(fn,ms)
    }
  });

'''
mono=regex_once(mono,r"  // Final Merchant renderer: transaction ownership lives in[\s\S]*?    schedule:\(fn,ms\)=>setTimeout\(fn,ms\)\n  \}\);\n\n",config,'replace Merchant peer composition',re.S)
mono=replace_once(mono,"db0646MerchantVisit=db0646MerchantTransaction.createVisit(currentMerchantItems);","dbMerchant.testing.createVisitForCurrentStock();",'Merchant test create visit')
mono=replace_once(mono,"visit:db0646MerchantTransaction.snapshot(db0646MerchantVisit)","visit:dbMerchant.testing.snapshotVisit()",'Merchant test snapshot')
for retired in ('dbMerchantStock','dbMerchantUi','db0646MerchantTransaction','db0646MerchantVisit'):
    if retired in mono: raise RuntimeError(f'retired Merchant peer symbol still in monolith: {retired}')
mono_path.write_text(mono,encoding='utf-8',newline='\n')

# Existing focused boundary tests now assert the facade boundary instead of direct monolith peer use.
stock_test=ROOT/'tools/test_merchant_stock_extraction_boundary.py'; text=stock_test.read_text(encoding='utf-8')
text=replace_once(text,"owner = (ROOT / \"runtime/js/events/merchant-stock.js\").read_text(encoding=\"utf-8\")\n", "owner = (ROOT / \"runtime/js/events/merchant-stock.js\").read_text(encoding=\"utf-8\")\nfacade = (ROOT / \"runtime/js/events/merchant-facade.js\").read_text(encoding=\"utf-8\")\n",'stock test facade source')
text=replace_once(text,"assert \"dbMerchantStock.buildStock()\" in js\nassert \"dbMerchantStockOwner.createController\" in js\n", "assert \"return dbMerchant.open();\" in js\nassert \"dbMerchantOwner.configure\" in js\nassert \"DiceboundMerchantStock\" not in js, 'ordinary monolith must not coordinate Merchant stock directly'\nassert \"stockOwner.createController\" in facade and \"window.DiceboundMerchant=api\" in facade\n",'stock test facade assertions')
text=replace_once(text,"ui_script = '<script src=\"js/ui/merchant.js\"></script>'\nmonolith_script = '<script src=\"js/dicebound.js\"></script>'\n", "ui_script = '<script src=\"js/ui/merchant.js\"></script>'\nfacade_script = '<script src=\"js/events/merchant-facade.js\"></script>'\nmonolith_script = '<script src=\"js/dicebound.js\"></script>'\n",'stock test script var')
text=replace_once(text,"assert index.index(transaction_script) < index.index(stock_script) < index.index(ui_script) < index.index(monolith_script)\n", "assert index.index(transaction_script) < index.index(stock_script) < index.index(ui_script) < index.index(facade_script) < index.index(monolith_script)\n",'stock test load order')
stock_test.write_text(text,encoding='utf-8',newline='\n')

ui_test=ROOT/'tools/test_merchant_ui_extraction_boundary.py'; text=ui_test.read_text(encoding='utf-8')
text=replace_once(text,"owner=(root/'runtime/js/ui/merchant.js').read_text(encoding='utf-8')\n", "owner=(root/'runtime/js/ui/merchant.js').read_text(encoding='utf-8')\nfacade=(root/'runtime/js/events/merchant-facade.js').read_text(encoding='utf-8')\n",'ui test facade source')
text=replace_once(text,"assert re.search(r'function\\s+renderMerchant\\s*\\(\\)\\s*\\{[^{}]*dbMerchantUi\\.render\\(\\)',mono,re.S), 'renderMerchant adapter must delegate to dbMerchantUi.render()'\nassert 'DiceboundMerchantUi must load before dicebound.js' in mono, 'monolith must configure the Merchant UI owner'\n", "assert re.search(r'function\\s+renderMerchant\\s*\\(\\)\\s*\\{[^{}]*dbMerchant\\.render\\(\\)',mono,re.S), 'renderMerchant adapter must delegate to DiceboundMerchant'\nassert 'dicebound.js requires DiceboundMerchant before loading.' in mono, 'monolith must require the Merchant facade'\nassert 'DiceboundMerchantUi' not in mono, 'ordinary monolith must not coordinate Merchant UI directly'\nassert 'uiOwner.createController' in facade and 'window.DiceboundMerchant=api' in facade, 'Merchant facade must own UI composition'\n",'ui test facade assertions')
text=replace_once(text,"assert manifest['loadOrder'].index('ui-merchant') < manifest['loadOrder'].index('dicebound-monolith'), 'Merchant UI load order must precede monolith'\n", "facade_entry=next((m for m in manifest['modules'] if m['id']=='merchant-facade'),None)\nassert facade_entry and facade_entry['requires']==['merchant-transactions','merchant-stock','ui-merchant']\nassert manifest['loadOrder'].index('ui-merchant') < manifest['loadOrder'].index('merchant-facade') < manifest['loadOrder'].index('dicebound-monolith'), 'Merchant UI must remain internal behind the facade'\n",'ui test manifest assertions')
ui_test.write_text(text,encoding='utf-8',newline='\n')

transaction_test=ROOT/'tools/test_merchant_transaction.js'; text=transaction_test.read_text(encoding='utf-8')
text=replace_once(text,'const merchantUi = fs.readFileSync("runtime/js/ui/merchant.js", "utf8");\n','const merchantUi = fs.readFileSync("runtime/js/ui/merchant.js", "utf8");\nconst merchantFacade = fs.readFileSync("runtime/js/events/merchant-facade.js", "utf8");\n','transaction test facade source')
text=replace_once(text,'assert.match(monolith, /DiceboundMerchantTransaction must load before dicebound\\.js/, "Merchant renderer is not wired to the transaction owner");\n','assert.match(monolith, /dicebound\\.js requires DiceboundMerchant before loading/, "monolith is not wired to the Merchant facade");\nassert.doesNotMatch(monolith, /DiceboundMerchantTransaction/, "ordinary monolith must not coordinate Merchant transactions directly");\nassert.match(merchantFacade, /const transaction=window\\.DiceboundMerchantTransaction/, "Merchant facade must internalize the transaction owner");\n','transaction facade boundary')
text=replace_once(text,'assert.match(monolith, /db0646MerchantTransaction\\.beginVisit/, "Merchant re-entry is not transaction-guarded");\nassert.match(monolith, /function renderMerchant\\(\\)\\{[\\s\\S]*?dbMerchantUi\\.render\\(\\)/, "compatibility renderer is not a thin Merchant UI adapter");\n','assert.match(merchantFacade, /transaction\\.beginVisit\\(null,getItems\\(\\)\\)/, "Merchant facade re-entry is not transaction-guarded");\nassert.match(monolith, /function renderMerchant\\(\\)\\{[\\s\\S]*?dbMerchant\\.render\\(\\)/, "compatibility renderer is not a thin Merchant facade adapter");\n','transaction render facade assertions')
transaction_test.write_text(text,encoding='utf-8',newline='\n')

shadow=ROOT/'tools/test_shadow_ownership_drain.py'; text=shadow.read_text(encoding='utf-8')
text=replace_once(text,"merchant_owner=(root/'runtime/js/ui/merchant.js').read_text(encoding='utf-8')\n", "merchant_owner=(root/'runtime/js/ui/merchant.js').read_text(encoding='utf-8')\nmerchant_facade=(root/'runtime/js/events/merchant-facade.js').read_text(encoding='utf-8')\n",'shadow facade source')
text=replace_once(text,"assert 'dbMerchantUi.render()' in merchant_mono, 'Merchant compatibility adapter no longer delegates to ui/merchant.js'\nassert 'DiceboundMerchantUi' in merchant_owner and 'createController' in merchant_owner, 'Merchant UI owner missing'\n", "assert 'dbMerchant.render()' in merchant_mono, 'Merchant compatibility adapter no longer delegates to DiceboundMerchant'\nassert 'DiceboundMerchantUi' not in merchant_mono and 'DiceboundMerchantStock' not in merchant_mono and 'DiceboundMerchantTransaction' not in merchant_mono, 'ordinary monolith must not coordinate Merchant peers directly'\nassert 'DiceboundMerchantUi' in merchant_owner and 'createController' in merchant_owner, 'Merchant UI owner missing'\nassert 'window.DiceboundMerchant=api' in merchant_facade and 'stockOwner.createController' in merchant_facade and 'uiOwner.createController' in merchant_facade, 'Merchant facade ownership missing'\n",'shadow facade assertions')
shadow.write_text(text,encoding='utf-8',newline='\n')

print('Merchant facade patch applied')
