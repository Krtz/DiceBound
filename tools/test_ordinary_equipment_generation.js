"use strict";

const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const context=vm.createContext({window:{}});
for(const relative of [["items","rarities.js"],["items","equipment.js"]]){
  const source=fs.readFileSync(path.join(root,"runtime","js",...relative),"utf8");
  vm.runInContext(source,context,{filename:relative.join("/")});
}
const equipment=context.window.DiceboundEquipment;

function hashSeed(seed){let h=2166136261>>>0;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function seedRng(seed){let x=hashSeed(seed)||1;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function seedInt(random,min,max){return Math.floor(random()*(max-min+1))+min;}
function seedPick(random,values){return values[Math.floor(random()*values.length)];}
function parseSeedCode(code){const match=String(code||"").trim().match(/^D15\|(poor|common|uncommon|rare|epic|legendary)\|(weapon|offhand|boots|legs|chest|hat|ring|amulet)\|([a-z0-9_]+)\|q(\d+)\|([a-z0-9_-]+)$/i);if(!match)return null;return {rarity:match[1].toLowerCase(),slot:match[2].toLowerCase(),classId:match[3].toLowerCase(),qualityBoost:Math.max(0,Math.min(8,Number(match[4])||0)),core:match[5]};}

const rarityBudgets={poor:[11,25],common:[26,45],uncommon:[46,70],rare:[71,105],epic:[106,150],legendary:[151,210]};
const affixTiers={poor:1,common:2,uncommon:3,rare:4,epic:5,legendary:5};
const prefixes=[
  {id:"edge",names:["Keen","Sharp","Savage","Brutal","Infinite"],slots:["weapon","ring","hat"],cost:t=>4+t*3,apply:(bonuses,t)=>{bonuses.attack=(bonuses.attack||0)+t;}},
  {id:"guard",names:["Firm","Sturdy","Fortified","Adamant","Worldforged"],slots:["offhand","legs","chest","hat"],cost:t=>5+t*3,apply:(bonuses,t)=>{bonuses.defense=(bonuses.defense||0)+t;}},
  {id:"fortune",names:["Lucky","Gilded","Loaded","Royal","Midas"],slots:["boots","ring","amulet"],cost:t=>4+t*3,apply:(bonuses,t)=>{bonuses.luck=(bonuses.luck||0)+t/100;}}
];
const suffixes=[
  {id:"aim",names:["of Aim","of Sight","of Focus","of Stars","of Truth"],slots:["weapon","hat","ring"],cost:t=>4+t*3,apply:(bonuses,t)=>{bonuses.crit=(bonuses.crit||0)+t/100;}},
  {id:"ward",names:["of Guarding","of Warding","of Bastions","of Walls","of Keeps"],slots:["offhand","legs","chest","hat"],cost:t=>5+t*3,apply:(bonuses,t)=>{bonuses.maxHp=(bonuses.maxHp||0)+t*2;}},
  {id:"chance",names:["of Chance","of Fortune","of Fate","of Luck","of Destiny"],slots:["boots","ring","amulet"],cost:t=>4+t*3,apply:(bonuses,t)=>{bonuses.luck=(bonuses.luck||0)+t/100;}}
];
const baseStat={weapon:"attack",offhand:"defense",boots:"dodge",legs:"maxHp",chest:"defense",hat:"crit",ring:"luck",amulet:"lifeSteal"};
function spendBase(item,random,remaining){const bonuses=item.bonuses,key=baseStat[item.slot];let spent=0;const add=(field,value,cost)=>{if(remaining-spent<cost)return false;bonuses[field]=(bonuses[field]||0)+value;spent+=cost;return true;};while(remaining-spent>=4){if(key==="attack"){if(!add("attack",1,7))break;}else if(key==="defense"){if(!add("defense",1,8))break;}else if(key==="maxHp"){if(!add("maxHp",4,5))break;}else if(key==="dodge"){if(!add("dodge",.01,6))break;}else if(key==="crit"){if(!add("crit",.012,6))break;}else if(key==="luck"){if(!add("luck",.025,6))break;}else if(key==="lifeSteal"){if(!add("lifeSteal",.012,6))break;}if(random()<.28&&remaining-spent>=7){const extra=seedPick(random,["maxHp","attack","crit","luck","bossDamage"]);if(extra==="maxHp")add(extra,4,5);else if(extra==="attack")add(extra,1,7);else if(extra==="crit")add(extra,.01,6);else if(extra==="luck")add(extra,.02,6);else add(extra,.02,7);}}return spent;}
const deps={parseSeedCode,seedRng,seedInt,seedPick,hashSeed,rarityBudgets,affixTiers,prefixes,suffixes,elementKeys:["fire","ice","storm"],elementChanceForRarity:rarity=>({poor:.10,common:.28,uncommon:.39,rare:.52,epic:.66,legendary:.80}[rarity]||0),pickAffix:equipment.pickOrdinaryAffix,spendBase,gearIcon:slot=>`icon-${slot}`,baseName:equipment.ordinaryBaseName};

// This is the pre-extraction construction contract, retained only in the test
// to prove that the equipment-domain implementation remains equivalent.
function legacyGenerateFromSeedCode(code){const parsed=deps.parseSeedCode(code);if(!parsed)return null;const {rarity,slot,classId,qualityBoost,core}=parsed,R=deps.seedRng(code),range=deps.rarityBudgets[rarity],budget=deps.seedInt(R,range[0],range[1])+qualityBoost,maxTier=deps.affixTiers[rarity],bonuses={};let spent=0,elementReserve=0,element=null;if(slot==="weapon"&&R()<deps.elementChanceForRarity(rarity)){elementReserve=rarity==="common"?4:5;element=deps.seedPick(R,deps.elementKeys);}const available=Math.max(4,budget-elementReserve),prefix=deps.pickAffix(R,deps.prefixes,slot),prefixTier=Math.max(1,Math.min(maxTier,deps.seedInt(R,Math.max(1,maxTier-1),maxTier)));if(prefix&&prefix.cost(prefixTier)<=available){prefix.apply(bonuses,prefixTier);spent+=prefix.cost(prefixTier);}let suffix=null,suffixTier=0;const suffixChance={common:.40,uncommon:.68,rare:.94,epic:1,legendary:1}[rarity];if(R()<suffixChance){suffix=deps.pickAffix(R,deps.suffixes,slot);suffixTier=Math.max(1,Math.min(maxTier,deps.seedInt(R,Math.max(1,maxTier-1),maxTier)));while(suffixTier>1&&suffix&&spent+suffix.cost(suffixTier)>available-4)suffixTier--;if(suffix&&spent+suffix.cost(suffixTier)<=available){suffix.apply(bonuses,suffixTier);spent+=suffix.cost(suffixTier);}else suffix=null;}const item={id:`gear_${deps.hashSeed(code).toString(36)}_${core}`,seed:code,seedCode:code,itemPower:budget,slot,rarity,icon:deps.gearIcon(slot),name:"",bonuses,prefix:prefix?prefix.names[prefixTier-1]:null,suffix:suffix?suffix.names[suffixTier-1]:null,affixTier:prefixTier,suffixTier,elementPowerCost:elementReserve};spent+=deps.spendBase(item,R,Math.max(0,available-spent));if(element){item.element=element;spent+=elementReserve;}item.spentPower=Math.min(budget,spent);const base=deps.baseName(slot);item.name=`${item.prefix?item.prefix+" ":""}${base}${item.suffix?" "+item.suffix:""}`;return item;}

const snapshots=[];
for(const rarity of Object.keys(rarityBudgets))for(const slot of equipment.createRegistry().slots){const code=`D15|${rarity}|${slot}|ranger|q8|fixture-${rarity}-${slot}`;const actual=equipment.generateOrdinaryFromSeedCode(code,deps),expected=legacyGenerateFromSeedCode(code);assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)),`${rarity}/${slot} changed from the pre-extraction contract`);assert.deepEqual(Object.keys(actual).sort(),["affixTier","bonuses","elementPowerCost","icon","id","itemPower","name","prefix","rarity","seed","seedCode","slot","spentPower","suffix","suffixTier"].concat(slot==="weapon"&&actual.element?["element"]:[]).sort(),`${rarity}/${slot} shape drifted`);snapshots.push(actual);}
assert.equal(equipment.generateOrdinaryFromSeedCode("not-a-seed",deps),null,"invalid seed should remain rejected");
assert.equal(crypto.createHash("sha256").update(JSON.stringify(snapshots)).digest("hex"),"c7a1425d8b6dddc1e47003dc02452bef4fb1ebae80bb6d884304f5d4943d7306","seeded ordinary-generation output drifted");

function runOuter(forcedSlot){let calls=0;const rolls=[.19,.37,.73,.91];const random=()=>{calls++;return rolls.shift()??.5;};const pick=values=>values[Math.floor(random()*values.length)];const actual=equipment.generateOrdinaryItem({rarity:"rare",forcedSlot,slots:equipment.createRegistry().slots,pick,random,classId:"ranger",seedCode:(rarity,slot,classId,boost,core)=>`D15|${rarity}|${slot}|${classId}|q${boost}|${core}`,generateFromSeedCode:code=>equipment.generateOrdinaryFromSeedCode(code,deps),rarityBudgets,clamp:(value,min,max)=>Math.max(min,Math.min(max,value))});return {actual,calls};}
const forced=runOuter("weapon"),unforced=runOuter(null),invalidSlot=runOuter("gloves");
assert.equal(forced.calls,2,"forced-slot generation changed outer RNG call count");
assert.equal(unforced.calls,3,"unforced-slot generation changed outer RNG call count");
assert.equal(invalidSlot.calls,3,"invalid forced slot changed fallback RNG call count");
assert.equal(forced.actual.slot,"weapon");assert.ok(equipment.createRegistry().slots.includes(unforced.actual.slot));assert.ok(equipment.createRegistry().slots.includes(invalidSlot.actual.slot));

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
assert.match(monolith,/DiceboundEquipment\.generateOrdinaryFromSeedCode/,"monolith is not delegating deterministic construction");
assert.match(monolith,/DiceboundEquipment\.generateOrdinaryItem/,"monolith is not delegating ordinary-item normalization");
assert.doesNotMatch(monolith,/function v15AffixForClass\(/,"old ordinary-affix construction helper remains in the monolith");
console.log("PASS #127 ordinary equipment generation preserves seeded outputs, object shape and outer RNG order");
