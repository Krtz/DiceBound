"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ window: {}, document: undefined, setTimeout, Image: undefined });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "assets.js"), "utf8"), context, { filename: "assets.js" });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "combat", "vfx.js"), "utf8"), context, { filename: "vfx.js" });

const api = context.window.DiceboundCombatVfx;
assert.ok(Object.isFrozen(api));
const defeated = { name: "defeated", hp: 0 };
const living = { name: "living", hp: 12 };
const vfx = api.create({ getEnemies: () => [defeated, living], getPlayer: () => ({ hp: 10 }) });
assert.ok(Object.isFrozen(vfx));
assert.equal(vfx.natureEffect().frameDurationMs, 75);
assert.equal(vfx.donutEffect().durationMs, 1450);
assert.equal(vfx.donutEffect().frames.length, 6);
assert.deepEqual(JSON.parse(JSON.stringify(vfx.livingNatureTargets())), [living]);
assert.equal(vfx.suppressLegacyElementAnimation("nature"), false);
const result = vfx.withNatureLegacyPresentation("nature", () => {
  assert.equal(vfx.suppressLegacyElementAnimation("nature"), true);
  assert.equal(vfx.suppressLegacyElementAnimation("fire"), false);
  return "resolved";
});
assert.equal(result, "resolved");
assert.equal(vfx.suppressLegacyElementAnimation("nature"), false);
vfx.withNatureLegacyPresentation("donut", () => assert.equal(vfx.suppressLegacyElementAnimation("nature"), false));
assert.deepEqual(JSON.parse(JSON.stringify(vfx.natureEntries())), []);
assert.deepEqual(JSON.parse(JSON.stringify(vfx.donutEntries())), []);

function createDonutDocument() {
  const nodes = [];
  const ids = new Map();
  function node(id = "") {
    const current = {
      id,
      className: "",
      dataset: {},
      style: {},
      children: [],
      connected: true,
      append(child) { child.parentNode = current; current.children.push(child); },
      appendChild(child) { current.append(child); },
      remove() {
        current.connected = false;
        if (current.parentNode) current.parentNode.children = current.parentNode.children.filter(child => child !== current);
      },
    };
    nodes.push(current);
    if (id) ids.set(id, current);
    return current;
  }
  const player = node("combatPlayerIcon");
  const enemy = node();
  enemy.dataset.enemyIndex = "0";
  const document = {
    head: node("head"),
    body: node("body"),
    createElement: () => node(),
    getElementById: id => ids.get(id) || null,
    querySelectorAll: selector => selector === ".db-donut-rain-vfx" ? nodes.filter(current => current.connected && current.className === "db-donut-rain-vfx") : [],
    querySelector: selector => selector.includes(".stage-enemy") ? enemy : null,
  };
  return { document, player, enemy };
}

const donutDom = createDonutDocument();
const donutTimers = [];
const donutContext = vm.createContext({
  window: {},
  document: donutDom.document,
  setTimeout: callback => { donutTimers.push(callback); return donutTimers.length; },
  Image: undefined,
});
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "assets.js"), "utf8"), donutContext, { filename: "assets.js" });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "combat", "vfx.js"), "utf8"), donutContext, { filename: "vfx.js" });
const donutEnemy = { hp: 10 };
const renderedDonuts = donutContext.window.DiceboundCombatVfx.create({ getEnemies: () => [donutEnemy] });
assert.equal(renderedDonuts.playDonutRain({ origin: "player", enemy: donutEnemy }), true);
assert.deepEqual(JSON.parse(JSON.stringify(renderedDonuts.donutEntries())), [
  { src: "assets/combat/effects/donut/donut-proc-rain-01.png", effect: "donutProcRain", target: "player", origin: "player", frame: 0 },
  { src: "assets/combat/effects/donut/donut-proc-rain-01.png", effect: "donutProcRain", target: "enemy", origin: "player", frame: 0 },
]);
assert.equal(donutDom.player.children[0].children[0].src, "assets/combat/effects/donut/donut-proc-rain-01.png");
assert.equal(donutDom.enemy.children[0].children[0].src, "assets/combat/effects/donut/donut-proc-rain-01.png");
donutTimers[0]();
assert.deepEqual(JSON.parse(JSON.stringify(renderedDonuts.donutEntries())).map(entry => entry.frame), [1, 1]);
assert.deepEqual(JSON.parse(JSON.stringify(renderedDonuts.donutEntries())).map(entry => entry.src), ["assets/combat/effects/donut/donut-proc-rain-02.png", "assets/combat/effects/donut/donut-proc-rain-02.png"]);
assert.equal(renderedDonuts.playDonutRain({ origin: "enemy", enemy: donutEnemy }), true);
assert.ok(renderedDonuts.donutEntries().every(entry => entry.origin === "enemy"));

function createProjectileDocument() {
  const nodes = [];
  const ids = new Map();
  function node(id = "", rect = null) {
    const classes = new Set();
    const current = {
      id,
      className: "",
      dataset: {},
      style: {},
      children: [],
      connected: true,
      classList: { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)) },
      append(child) { child.parentNode = current; current.children.push(child); },
      appendChild(child) { current.append(child); if (child.id) ids.set(child.id, child); },
      remove() { current.connected = false; if (current.parentNode) current.parentNode.children = current.parentNode.children.filter(child => child !== current); },
      getBoundingClientRect: () => rect,
    };
    nodes.push(current);
    if (id) ids.set(id, current);
    return current;
  }
  const player = node("combatPlayerIcon", { left: 20, top: 40, width: 80, height: 90 });
  const enemy = node("", { left: 360, top: 110, width: 100, height: 120 });
  enemy.dataset.enemyIndex = "0";
  const document = {
    head: node("head"), body: node("body"), createElement: () => node(), getElementById: id => ids.get(id) || null,
    querySelector: selector => selector.includes(".stage-enemy") ? enemy : null,
    querySelectorAll: selector => nodes.filter(current => current.connected && (
      (selector.includes(".db-combat-projectile-vfx") && current.className.includes("db-combat-projectile-vfx")) ||
      (selector.includes(".db-math-formula-vfx") && current.className.includes("db-math-formula-vfx"))
    )),
  };
  return { document, player, enemy, nodes };
}

const projectileDom = createProjectileDocument();
const projectileTimers = [];
const clearedTimers = [];
const projectileContext = vm.createContext({
  window: {}, document: projectileDom.document,
  setTimeout: callback => { projectileTimers.push(callback); return projectileTimers.length; },
  clearTimeout: timer => clearedTimers.push(timer), Image: undefined,
});
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "assets.js"), "utf8"), projectileContext, { filename: "assets.js" });
vm.runInContext(fs.readFileSync(path.join(root, "runtime", "js", "combat", "vfx.js"), "utf8"), projectileContext, { filename: "vfx.js" });
const projectileEnemy = { hp: 10 };
const projectileVfx = projectileContext.window.DiceboundCombatVfx.create({ getEnemies: () => [projectileEnemy], getPlayer: () => ({ hp: 10 }) });
assert.equal(projectileVfx.playProjectileProc("fire", { origin: "player", enemy: projectileEnemy }), true, "Fire must use the authored projectile path");
assert.equal(projectileTimers.length, 3, "Projectile VFX must schedule travel, impact and cleanup once");
assert.equal(projectileVfx.clearTransient(), 1, "Clearing a transition must advance the presentation epoch");
assert.deepEqual(clearedTimers, [1, 2, 3], "Stale projectile callbacks must be cancelled at the combat boundary");
assert.equal(projectileVfx.playProjectileProc("gun", { origin: "player", enemy: projectileEnemy }), true, "Gun must use the authored Deagle presentation path");
const gunNode = projectileDom.document.body.children.at(-1);
assert.equal(gunNode.children[0].src, "assets/combat/effects/gun/gun_spawn_01_no_arm.png", "The Deagle must materialize beside its proc owner before firing");
assert.equal(gunNode.style.left, "94px", "Player-origin Gun materialization must be offset beside the player rather than start on the target");
assert.equal(projectileTimers.length, 7, "Gun must schedule materialize, fire, travel, impact and cleanup stages");
projectileTimers[3]();
assert.equal(gunNode.children[0].src, "assets/combat/effects/gun/gun_fire_02_no_arm.png", "Gun must visibly enter its firing stage before travelling");
projectileTimers[4]();
assert.equal(gunNode.children[0].src, "assets/combat/effects/gun/gun_bullet_tracer_05.png", "Gun travel must use the authored bullet tracer");

const timerStart=projectileTimers.length;
assert.equal(projectileVfx.playMathFormula({origin:"player",enemy:projectileEnemy}),true,"Math must use the dedicated formula path");
const mathNode=projectileDom.document.body.children.at(-1);
assert.equal(mathNode.dataset.effect,"math");
assert.equal(mathNode.dataset.origin,"player");
assert.match(mathNode.textContent,/∑.*π.*√∞.*÷/,"Math VFX must visibly throw a complex formula");
assert.equal(mathNode.style.left,"60px","Math formula must originate from the player center");
assert.equal(mathNode.style.top,"85px");
projectileTimers[timerStart]();
assert.equal(mathNode.style.left,"410px","Math formula must travel to the semantic enemy center");
assert.equal(mathNode.style.top,"170px");
projectileVfx.clearTransient();
assert.equal(mathNode.connected,false,"combat-boundary cleanup must remove a live Math formula even after cancelling its timers");


function createFloatingDocument() {
  const ids=new Map(),nodes=[];
  function node(id="",rect={left:0,top:0,width:0,height:0}) {
    const current={
      id,className:"",dataset:{},style:{},children:[],parentNode:null,isConnected:true,textContent:"",
      append(child){child.parentNode=current;current.children.push(child);if(child.id)ids.set(child.id,child);},
      appendChild(child){current.append(child);},
      remove(){current.isConnected=false;if(current.parentNode)current.parentNode.children=current.parentNode.children.filter(item=>item!==current);},
      setAttribute(){},
      getBoundingClientRect:()=>({...rect,right:rect.left+rect.width,bottom:rect.top+rect.height}),
      querySelector(selector){return selector===".stage-ally-sprite"?current.children.find(child=>child.className==="stage-ally-sprite")||null:null;},
      querySelectorAll(selector){return selector===".stage-ally"?current.children.filter(child=>child.className==="stage-ally"):[];},
      classList:{add(){},remove(){}}
    };
    nodes.push(current);if(id)ids.set(id,current);return current;
  }
  const head=node("head"),body=node("body"),player=node("combatPlayerIcon",{left:20,top:40,width:80,height:90});
  const party=node("alliedParty");
  const ally1=node("",{left:90,top:120,width:92,height:138});ally1.className="stage-ally";ally1.dataset.allyInstance="skel-1";
  const sprite1=node("",{left:100,top:130,width:72,height:110});sprite1.className="stage-ally-sprite";ally1.append(sprite1);
  const ally2=node("",{left:190,top:120,width:92,height:138});ally2.className="stage-ally";ally2.dataset.allyInstance="skel-2";
  const sprite2=node("",{left:200,top:130,width:72,height:110});sprite2.className="stage-ally-sprite";ally2.append(sprite2);
  party.append(ally1);party.append(ally2);
  const document={
    head,body,
    createElement:()=>node(),
    getElementById:id=>ids.get(id)||null,
    querySelectorAll:selector=>{
      if(selector===".db-combat-float-vfx")return body.children.filter(item=>item.isConnected&&item.className.includes("db-combat-float-vfx"));
      if(selector==="#alliedParty .stage-ally")return [ally1,ally2];
      return [];
    },
    querySelector:()=>null
  };
  return {document,ally1,ally2,sprite1,sprite2};
}
const floatingDom=createFloatingDocument(),floatingTimers=[];
const floatingContext=vm.createContext({
  window:{matchMedia:()=>({matches:false})},document:floatingDom.document,
  setTimeout:callback=>{floatingTimers.push(callback);return floatingTimers.length;},
  clearTimeout:()=>{},Image:undefined
});
vm.runInContext(fs.readFileSync(path.join(root,"runtime","js","assets.js"),"utf8"),floatingContext,{filename:"assets.js"});
vm.runInContext(fs.readFileSync(path.join(root,"runtime","js","combat","vfx.js"),"utf8"),floatingContext,{filename:"vfx.js"});
const floatingVfx=floatingContext.window.DiceboundCombatVfx.create({getFloatingCombatNumbersEnabled:()=>true});
assert.equal(floatingVfx.floatCombatText({kind:"damage",amount:7,target:{unit:"ally",allyId:"skel-1"}}),true,"allied damage must resolve an exact semantic summon host");
assert.equal(floatingVfx.floatCombatText({kind:"heal",amount:4,target:{unit:"ally",allyId:"skel-2"}}),true,"allied healing must resolve an exact semantic summon host");
assert.deepEqual(JSON.parse(JSON.stringify(floatingVfx.floatingEntries())).map(entry=>[entry.kind,entry.target,entry.amount]),[
  ["damage","ally:skel-1",7],["heal","ally:skel-2",4]
],"different allied instances must retain distinct floating-number target keys");
assert.equal(floatingDom.document.body.children[0].style.left,"136px","first summon number must anchor to the first summon sprite center");
assert.equal(floatingDom.document.body.children[1].style.left,"236px","second summon number must anchor to the second summon sprite center");
assert.equal(floatingVfx.floatCombatText({kind:"damage",amount:3,target:{unit:"ally",allyId:"missing"}}),false,"unknown allied instance must never fall back to hero/enemy presentation");

const monolith = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");
const elementOwner = fs.readFileSync(path.join(root, "runtime", "js", "combat", "element-resolution.js"), "utf8");
assert.match(monolith, /dbCombatView\.configureVfx\(\{getEnemies:\(\)=>currentEnemies,getPlayer:\(\)=>player,getFloatingCombatNumbersEnabled:\(\)=>meta\.settings\?\.floatingCombatNumbers!==false\}\);/, "Combat VFX must be configured through Combat View with the persistent floating-number preference");
assert.match(monolith, /target=\{unit:'ally',allyId:entity\?\.instanceId\}/, "Allied damage/healing callbacks must target the exact semantic ally instance for floating combat numbers");
assert.match(monolith, /playDonutRain:payload=>dbCombatView\.playDonutRain\(payload\)/, "Element owner composition must inject the authored Donut presentation callback");
assert.match(elementOwner, /if \(key === "donut" && result\) rt\.playDonutRain\(\{ origin: "player", enemy: target \}\);/, "Player-origin Donut presentation is not routed with its real target");
assert.doesNotMatch(monolith, /db064DonutEnemyElementProcBase|db064DonutTriggerElementBase/, "Retired Donut mechanic/VFX wrappers must not survive in the monolith");
assert.match(elementOwner, /if \(isDonut && result\) rt\.playDonutRain\(\{ origin: "enemy", enemy, targetKind:friendly\.kind, targetId:friendly\.id \}\);/, "Enemy-origin Donut proc must play authored rain against the resolved semantic hero/summon target");
assert.doesNotMatch(monolith, /function dbPlayNatureVfx/, "Nature DOM presentation remained duplicated in the monolith");
assert.doesNotMatch(monolith, /function db064PlayDonutRain/, "Donut DOM presentation remained duplicated in the monolith");
assert.doesNotMatch(fs.readFileSync(path.join(root, "runtime", "js", "combat", "vfx.js"), "utf8"), /backgroundPosition: donutFramePosition/, "Donut must use its whole authored frames rather than CSS spritesheet cropping");
assert.match(monolith, /dbCombatView\.clearTransient\(\)/, "Combat transitions must explicitly clear authored transient VFX through the Combat View facade");
assert.match(monolith, /playProjectileProc:\(key,payload\)=>dbCombatView\.playProjectileProc\?\.\(key,payload\)/, "Element owner composition must inject the authored projectile presentation callback");
assert.match(monolith, /playMathFormula:payload=>dbCombatView\.playMathFormula\?\.\(payload\)/, "Element owner composition must inject Math formula presentation through Combat View");
assert.match(elementOwner, /if \(result && \(key === "fire" \|\| key === "gun"\)\) rt\.playProjectileProc\(key, \{ origin: "player", enemy: target \}\);/, "Player Fire/Gun procs must use the authored projectile owner");
assert.match(monolith, /if\(key==='fire'\|\|key==='gun'\|\|key==='donut'\|\|key==='math'\|\|dbCombatView\.suppressLegacyElementAnimation\(key\)\)return false;/, "Authored Fire/Gun/Donut/Math presentation and Combat View scoped suppression must share the canonical animation gate");

console.log("Combat VFX ownership PASS: Nature suppression scope, live-target filter, asset contracts and monolith adapters");

assert.doesNotMatch(monolith, /window\.DiceboundCombatVfx/, "monolith must not bind focused VFX owner directly");
