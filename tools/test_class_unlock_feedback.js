const fs=require("fs");
const vm=require("vm");
const path=require("path");
const root=path.resolve(__dirname,"..");
function load(rel,window={}){const code=fs.readFileSync(path.join(root,rel),"utf8");vm.runInNewContext(code,{window,console});return window;}
function assert(value,message){if(!value)throw new Error(message);}
const w={};
load("runtime/js/classes/registry.js",w);
load("runtime/js/assets.js",w);
load("runtime/js/progression/class-unlock-feedback.js",w);
const F=w.DiceboundClassUnlockFeedback;
assert(F,"unlock feedback owner missing");
assert(F.toastFor("cleric")==="You healed 1,000 total HP: Cleric unlocked!","Cleric toast should explain healing trigger");
assert(F.toastFor("rogue")==="You held at least 5,000 Gold at once and defeated the Board 3 miniboss: Rogue unlocked!","Rogue compound toast drifted");
assert(F.reasonFor("paladin")==="You cleared Board 3 with both Fighter and Cleric.","Paladin reason should explain both prerequisite clears");
assert(F.reasonFor("pokemontrainer")==="You raised every companion to level 10 and cleared Board 5 with Beastmaster.","Pokemon Trainer compound reason drifted");
assert(F.reasonFor("vampire")==="You exceeded 100% Lifesteal and defeated the Board 3 boss.","Vampire compound reason drifted");
assert(F.reasonFor("slimerouge")==="You unlocked Slime and cleared Board 6 with the Random class.","Slime Rouge reason drifted");
const cleric=F.revealFor("cleric");
assert(cleric&&cleric.name==="Cleric","Cleric reveal missing");
assert(cleric.art&&cleric.art.endsWith("/characters/classes/campsite/cleric.png"),"Cleric reveal does not use canonical class art");
assert(cleric.identity&&cleric.identity.length>20,"Cleric identity copy missing");
assert(cleric.howItPlays&&cleric.howItPlays.length>20,"Cleric gameplay copy missing");
const secret=F.revealFor("bloodmage");
assert(secret.secret===true,"secret marker should be preserved after unlock");
assert(!F.reasonFor("bloodmage").toLowerCase().includes("secret:"),"post-unlock reason should be natural player-facing copy");
console.log("Class unlock feedback PASS: reasons, compound triggers, canonical art and reveal copy");
