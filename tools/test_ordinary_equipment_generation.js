const assert=require("assert");
const crypto=require("crypto");
const fs=require("fs");
const path=require("path");
const vm=require("vm");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/items/equipment.js"),"utf8");const context={window:{}};vm.createContext(context);vm.runInContext(source,context);const equipment=context.window.DiceboundEquipment;assert.ok(equipment?.generateOrdinaryFromSeedCode&&equipment?.generateOrdinaryItem,"equipment ordinary-generation helpers missing");
const rarityBudgets={poor:[11,25],common:[11,25],uncommon:[26,55],rare:[56,95],epic:[96,150],legendary:[151,210]};const affixTiers={poor:1,common:1,uncommon:2,rare:3,epic:4,legendary:5};const prefixes=[{classes:["ranger"],slots:["weapon"],names:["Keen","Keen II","Keen III","Keen IV","Keen V"],cost:t=>6+t,apply:(b,t)=>{b.attack=(b.attack||0)+t;}}];const suffixes=[{classes:["ranger"],slots:["weapon"],names:["of Aim","of Aim II","of Aim III","of Aim IV","of Aim V"],cost:t=>5+t,apply:(b,t)=>{b.crit=(b.crit||0)+.01*t;}}];
function hashSeed(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}function seedRng(seed){let a=hashSeed(seed)||0x9e3779b9;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}const seedInt=(R,min,max)=>min+Math.floor(R()*(max-min+1)),seedPick=(R,values)=>values[Math.floor(R()*values.length)];
function parse(code){const m=String(code).match(/^D15\|(poor|common|uncommon|rare|epic|legendary)\|(weapon|offhand|boots|legs|chest|hat|ring|amulet)\|([a-z0-9_]+)\|q(\d+)\|([a-z0-9_-]+)$/i);return m?{rarity:m[1],slot:m[2],classId:m[3],qualityBoost:Number(m[4]),core:m[5]}:null;}
const deps={parseSeedCode:parse,seedRng,seedInt,seedPick,hashSeed,rarityBudgets,affixTiers,prefixes,suffixes,elementKeys:["fire","ice"],elementChanceForRarity:()=>.4,pickAffix:(R,pool,slot,classId)=>equipment.pickOrdinaryAffix(R,pool,slot,classId),spendBase:(item,R,remaining)=>{if(remaining>=7){item.bonuses.maxHp=(item.bonuses.maxHp||0)+4;return 5;}return 0;},gearIcon:()=>"🏹",baseName:()=>"Falcon Bow"};
const cases=["D15|common|weapon|ranger|q0|abc","D15|rare|weapon|ranger|q3|xyz","D15|legendary|weapon|ranger|q8|max"];
const snapshots=cases.map(code=>{const item=equipment.generateOrdinaryFromSeedCode(code,deps);return {code,item};});
assert.equal(equipment.generateOrdinaryFromSeedCode("not-a-seed",deps),null,"invalid seed should remain rejected");
assert.equal(crypto.createHash("sha256").update(JSON.stringify(snapshots)).digest("hex"),"c7a1425d8b6dddc1e47003dc02452bef4fb1ebae80bb6d884304f5d4943d7306","seeded ordinary-generation output drifted");

function runOuter(forcedSlot){let calls=0;const rolls=[.19,.37,.73,.91];const random=()=>{calls++;return rolls.shift()??.5;};const pick=values=>values[Math.floor(random()*values.length)];const actual=equipment.generateOrdinaryItem({rarity:"rare",forcedSlot,slots:equipment.createRegistry().slots,pick,random,classId:"ranger",seedCode:(rarity,slot,classId,boost,core)=>`D15|${rarity}|${slot}|${classId}|q${boost}|${core}`,generateFromSeedCode:code=>equipment.generateOrdinaryFromSeedCode(code,deps),rarityBudgets,clamp:(value,min,max)=>Math.max(min,Math.min(max,value))});return {actual,calls};}
const forced=runOuter("weapon"),unforced=runOuter(null),invalidSlot=runOuter("gloves");
assert.equal(forced.calls,2,"forced-slot generation changed outer RNG call count");
assert.equal(unforced.calls,3,"unforced-slot generation changed outer RNG call count");
assert.equal(invalidSlot.calls,3,"invalid forced slot changed fallback RNG call count");
assert.equal(forced.actual.slot,"weapon");assert.ok(equipment.createRegistry().slots.includes(unforced.actual.slot));assert.ok(equipment.createRegistry().slots.includes(invalidSlot.actual.slot));

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
const generation=fs.readFileSync(path.join(root,"runtime/js/items/generation.js"),"utf8");
assert.match(monolith,/DiceboundEquipment\.generateOrdinaryFromSeedCode/,"composition is not delegating deterministic construction");
assert.match(generation,/ordinaryApi\.generateOrdinaryItem/,"Items generation owner is not delegating ordinary-item normalization");
assert.doesNotMatch(monolith,/DiceboundEquipment\.generateOrdinaryItem/,"ordinary-item generation ownership leaked back into the monolith");
assert.doesNotMatch(monolith,/function v15AffixForClass\(/,"old ordinary-affix construction helper remains in the monolith");
console.log("PASS #127 ordinary equipment generation preserves seeded outputs, object shape, outer RNG order, and Items ownership");
