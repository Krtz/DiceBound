#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const careerSource=fs.readFileSync(path.join(root,"runtime/js/progression/career-history.js"),"utf8");
const crucibleSource=fs.readFileSync(path.join(root,"runtime/js/progression/echo-crucible.js"),"utf8");
const source=fs.readFileSync(path.join(root,"runtime/js/progression/lifecycle.js"),"utf8");
const sandbox={window:{DiceboundPrestige:{award:(state,count)=>({...state,count:(state?.count||0)+count})}},console};
sandbox.window.window=sandbox.window;
vm.runInNewContext(careerSource,sandbox,{filename:"progression/career-history.js"});
vm.runInNewContext(crucibleSource,sandbox,{filename:"progression/echo-crucible.js"});
vm.runInNewContext(source,sandbox,{filename:"progression/lifecycle.js"});
const P=sandbox.window.DiceboundProgression;
assert.ok(P,"Progression facade did not publish");

const classes={ranger:{id:"ranger",icon:"🏹",name:"Ranger"},invoker:{id:"invoker",icon:"🔮",name:"Invoker"},bloodmage:{id:"bloodmage",icon:"🩸",name:"Bloodmage"},fighter:{id:"fighter",icon:"⚔️",name:"Fighter"}};
const meta={unlocks:{},classUnlockFacts:{},stats:{highestGold:10},purchased:{},points:0,prestige:{count:0}};
let gameStarted=true,saves=0,renders=0,feedbackCalls=0,logs=[],toasts=[],resolved=0;
let allowInvoker=false;
const ctx=()=>({persistedUnlocks:meta.unlocks,facts:meta.classUnlockFacts,gameStarted,storedHighestGold:meta.stats.highestGold});
P.configure({
  getMeta:()=>meta,getClasses:()=>classes,getGameStarted:()=>gameStarted,getClassUnlockContext:ctx,
  saveMeta:()=>{saves++;return true;},renderClassChoices:()=>{renders++;},addLog:html=>logs.push(html),showToast:(...args)=>toasts.push(args),
  classUnlockFeedback:id=>{feedbackCalls++;return {toast:`feedback:${id}`};},
  classUnlockIsUnlocked:(id,context)=>!!context.persistedUnlocks?.[id]||(id==='bloodmage'&&!!meta.bloodmageUnlocked),
  classUnlockMayCommit:(id)=>id!=='invoker'||allowInvoker,
  ensureAlphaMeta:()=>meta.stats,
  classUnlockRecordObservedProgress:()=>({changed:true,highestGold:99,facts:{observed:true}}),
  classUnlockResolveDynamic:({unlock})=>{resolved++;unlock('fighter');return {attempted:['fighter'],unlocked:['fighter']};}
});

assert.equal(P.isClassUnlocked('invoker'),false);
assert.equal(P.unlockClass('invoker'),false,"gated class must not commit before rule owner allows it");
assert.equal(saves,0);assert.equal(feedbackCalls,0);
allowInvoker=true;
assert.equal(P.unlockClass('invoker'),true);
assert.equal(meta.unlocks.invoker,true);assert.equal(P.isClassUnlocked('invoker'),true);
assert.equal(saves,1);assert.equal(renders,1);assert.equal(feedbackCalls,1);
assert.deepEqual(logs,["<b>Class unlocked:</b> 🔮 Invoker!"]);
assert.deepEqual(toasts,[["feedback:invoker",3400,true]]);
assert.equal(P.unlockClass('invoker'),false,"duplicate normal unlock must be a no-op");
assert.equal(saves,1);assert.equal(feedbackCalls,1);

const beforeFeedback=feedbackCalls,beforeLogs=logs.length,beforeToasts=toasts.length;
assert.equal(P.commitClassUnlock('bloodmage'),true,"Bloodmage legacy commit remains intentionally idempotent-true");
assert.equal(meta.bloodmageUnlocked,true);assert.equal(meta.unlocks.bloodmage,true);
assert.equal(feedbackCalls,beforeFeedback,"Bloodmage legacy path must not enqueue normal feedback");
assert.equal(logs.length,beforeLogs);assert.equal(toasts.length,beforeToasts);
assert.equal(saves,2);assert.equal(renders,2);
assert.equal(P.commitClassUnlock('bloodmage'),true,"repeated Bloodmage commit preserves shipped true result");
assert.equal(saves,3);assert.equal(renders,3);

P.checkDynamicClassUnlocks();
assert.equal(resolved,1);assert.equal(meta.stats.highestGold,99);assert.deepEqual(meta.classUnlockFacts,{observed:true});
assert.equal(meta.unlocks.fighter,true,"dynamic resolver must commit through the same facade transaction");
assert.equal(saves,5,"dynamic change persists once after the committed class save");
assert.equal(feedbackCalls,2);assert.equal(renders,4);

console.log("Progression class-unlock owner PASS: eligibility, commit feedback, Bloodmage quirk and dynamic coordination preserved");
