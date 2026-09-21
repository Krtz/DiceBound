#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const vfxPath=path.join(root,"runtime","js","combat","vfx.js");
const source=fs.readFileSync(vfxPath,"utf8");

function createDocument(){
  const nodes=[];
  const ids=new Map();
  function node(id="",rect=null){
    const classes=new Set();
    const current={
      id,
      className:"",
      dataset:{},
      style:{},
      textContent:"",
      connected:true,
      children:[],
      parentNode:null,
      classList:{
        add:(...values)=>values.forEach(value=>classes.add(value)),
        remove:(...values)=>values.forEach(value=>classes.delete(value)),
        contains:value=>classes.has(value),
      },
      append(child){child.parentNode=current;current.children.push(child);if(child.id)ids.set(child.id,child);},
      appendChild(child){current.append(child);},
      remove(){
        current.connected=false;
        if(current.parentNode)current.parentNode.children=current.parentNode.children.filter(child=>child!==current);
      },
      setAttribute(name,value){current[name]=String(value);},
      getBoundingClientRect:()=>rect,
    };
    nodes.push(current);
    if(id)ids.set(id,current);
    return current;
  }

  const head=node("head"),body=node("body");
  const player=node("combatPlayerIcon",{left:40,top:80,width:90,height:100});
  const enemy0=node("",{left:260,top:110,width:80,height:90});enemy0.dataset.enemyIndex="0";
  const enemy1=node("",{left:470,top:130,width:100,height:110});enemy1.dataset.enemyIndex="1";

  const document={
    head,body,
    createElement:()=>node(),
    getElementById:id=>ids.get(id)||null,
    querySelector(selector){
      const match=String(selector).match(/data-enemy-index="(\d+)"/);
      if(match)return Number(match[1])===0?enemy0:Number(match[1])===1?enemy1:null;
      return null;
    },
    querySelectorAll(selector){
      if(String(selector).includes(".db-combat-float-vfx")){
        return nodes.filter(current=>current.connected&&String(current.className).includes("db-combat-float-vfx"));
      }
      return [];
    },
  };
  return {document,nodes,player,enemy0,enemy1};
}

const dom=createDocument();
const timers=[];
const cleared=[];
let reduced=false;
let enabled=true;
const sandbox={
  window:{matchMedia:()=>({matches:reduced})},
  document:dom.document,
  console,
  setTimeout:callback=>{timers.push(callback);return timers.length;},
  clearTimeout:id=>cleared.push(id),
  Image:undefined,
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:vfxPath});
const api=sandbox.window.DiceboundCombatVfx;
assert.ok(api&&Object.isFrozen(api),"Combat VFX owner must remain frozen");

const enemyA={name:"Pack A",hp:20};
const enemyB={name:"Pack B",hp:30};
const vfx=api.create({
  getEnemies:()=>[enemyA,enemyB],
  getPlayer:()=>({hp:40}),
  getFloatingCombatNumbersEnabled:()=>enabled,
});

assert.equal(vfx.floatCombatText({kind:"damage",amount:17,target:{unit:"enemy",enemy:enemyB}}),true);
assert.equal(vfx.floatCombatText({kind:"damage",amount:5,target:{unit:"enemy",enemy:enemyB}}),true);
assert.equal(vfx.floatCombatText({kind:"damage",amount:9,target:{unit:"enemy",enemy:enemyA}}),true);
assert.equal(vfx.floatCombatText({kind:"absorb",amount:6,target:{unit:"player"}}),true);
assert.equal(vfx.floatCombatText({kind:"damage",amount:4,target:{unit:"player"}}),true);
assert.equal(vfx.floatCombatText({kind:"heal",amount:8,target:{unit:"player"}}),true);

const entries=JSON.parse(JSON.stringify(vfx.floatingEntries()));
assert.deepEqual(entries.map(entry=>[entry.kind,entry.target,entry.amount,entry.label,entry.lane]),[
  ["damage","enemy:1",17,"-17",0],
  ["damage","enemy:1",5,"-5",1],
  ["damage","enemy:0",9,"-9",0],
  ["absorb","player",6,"6 Absorbed",0],
  ["damage","player",4,"-4",1],
  ["heal","player",8,"+8 Heal",2],
],"floating text must preserve semantic recipient identity and readable rapid-hit lanes");

const enemyBNode=dom.document.body.children.find(node=>node.dataset?.target==="enemy:1");
assert.equal(enemyBNode.style.left,"520px","pack damage must anchor to the actual second enemy, not the selected/default enemy");
assert.ok(Number.parseInt(enemyBNode.style.top,10)>0);

enabled=false;
const beforeDisabled=vfx.floatingEntries().length;
assert.equal(vfx.floatCombatText({kind:"damage",amount:99,target:{unit:"enemy",enemy:enemyA}}),false,"Options toggle must suppress new floating values");
assert.equal(vfx.floatingEntries().length,beforeDisabled,"disabled floating text must not mutate presentation state");
enabled=true;

assert.equal(vfx.floatCombatText({kind:"blocked",target:{unit:"enemy",enemy:enemyA},label:"Barrier"}),true);
assert.equal(vfx.floatingEntries().at(-1).label,"Barrier","barrier presentation must not rely on color alone");

assert.equal(vfx.clearTransient(),1);
assert.equal(vfx.floatingEntries().length,0,"combat-boundary cleanup must remove every floating value");
assert.ok(cleared.length>=7,"combat-boundary cleanup must cancel pending floating-text timers");

reduced=true;
assert.equal(vfx.floatCombatText({kind:"damage",amount:3,target:{unit:"player"}}),true);
const reducedNode=dom.document.body.children.find(node=>node.connected&&node.dataset?.target==="player");
assert.match(reducedNode.className,/db-reduced-motion/,"prefers-reduced-motion must retain readable text without travel animation");
assert.match(source,/prefers-reduced-motion: reduce/);
assert.match(source,/\+\$\{value\} Heal/);
assert.match(source,/\+\$\{value\} Shield/);
assert.match(source,/\$\{value\} Absorbed/);

const monolith=fs.readFileSync(path.join(root,"runtime","js","dicebound.js"),"utf8").replace(/\r\n/g,"\n");
assert.match(monolith,/currentEnemies\.includes\(enemy\)/,"enemy floating text must only present for live combat participants");
assert.match(monolith,/target:\{unit:'enemy',enemy\}/,"enemy damage must carry the resolved semantic enemy object into Combat View");
assert.match(monolith,/getFloatingCombatNumbersEnabled:\(\)=>meta\.settings\?\.floatingCombatNumbers!==false/,"Combat View must consume the persistent display preference without owning settings");
assert.match(monolith,/setFloatingCombatNumbers:value=>\{meta\.settings=meta\.settings\|\|defaultSettings\(\);meta\.settings\.floatingCombatNumbers=!!value;saveMeta\(\);return meta\.settings\.floatingCombatNumbers;\}/,"Options must persist the toggle through canonical settings");
assert.doesNotMatch(source,/Math\.random|\brandom\s*\(/,"floating presentation must never consume gameplay RNG");

console.log("Floating combat text PASS: semantic pack targeting, rapid lanes, heal/shield labels, option suppression, reduced motion and combat cleanup");
