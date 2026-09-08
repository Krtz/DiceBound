#!/usr/bin/env node
"use strict";

const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/ui/info-guide.js"),"utf8");
const window={};
window.window=window;
vm.runInNewContext(source,{window,console},{filename:"runtime/js/ui/info-guide.js"});

const guide=window.DiceboundInfoGuide;
assert.ok(guide,"Info/Guide owner is not public");
guide.configure({
  getClasses:()=>[
    {id:"ranger",icon:"🏹",name:"Ranger",desc:"A precise explorer.",scaleNotes:"Attack and Echo."},
    {id:"secret",icon:"?",name:"Secret",secret:true,desc:"Hidden."}
  ],
  isClassUnlocked:id=>id!=="secret",
  getElements:()=>({fire:{icon:"🔥",name:"Fire",spell:"Flame",description:"Burn."},ice:{icon:"❄️",name:"Ice",spell:"Nova",description:"Freeze."}}),
  getArtifactSet:()=>({count:3,tiers:[{pieces:2,text:"Small bonus"},{pieces:4,text:"Large bonus"}]}),
  getLifetimeStats:()=>({runsStarted:3,runsFinished:2,boardClears:{"ranger:normal:b4":1,"ranger:normal:b2":1,"ranger:hell:b5":1}}),
  isGameStarted:()=>true
});

const model=guide.viewModel();
assert.equal(model.owner,"ui/info-guide");
assert.equal(model.classCount,1,"secret classes must stay absent until unlocked");
assert.equal(model.elementCount,2);
assert.ok(model.guideSections.includes("artifact-set"));
const stats=window.DiceboundInfoGuideTest.lifetimeModel();
assert.deepStrictEqual([...stats.clears],["🏹 Ranger — Hell: Board 5","🏹 Ranger — Normal: Board 4"]);
assert.equal(stats.gold,undefined,"current-run Gold gain belongs in the visible board HUD rather than the Info lifetime panel");

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
const indexHtml=fs.readFileSync(path.join(root,"runtime/index.html"),"utf8");
for(const adapter of [
  "let dbInfoGuide=null;",
  "function renderInfo(){return dbInfoGuide?.render();}",
  "function renderLifetimeStats(){return dbInfoGuide?.renderStats();}",
  "function activateInfoTab(name='guide'){return dbInfoGuide?.activateTab(name);}",
  "function openInfo(){return dbInfoGuide?.open();}"
])assert.ok(monolith.includes(adapter),`missing thin Info/Guide adapter: ${adapter}`);
for(const retiredLayer of ["db060RenderInfoBase","renderInfoV28Base","openInfoV15"])assert.ok(!monolith.includes(retiredLayer),`retired final Info/Guide layer remains: ${retiredLayer}`);
for(const adapter of ["renderInfo","renderLifetimeStats","activateInfoTab","openInfo"])assert.ok(!new RegExp(`^\\s*${adapter}\\s*=`,"m").test(monolith),`retired ${adapter} reassignment remains`);
assert.ok(monolith.includes('if(!meta.infoSeen)setTimeout(()=>activateInfoTab("guide"),250);'),"first-run Guide preparation must not capture an obsolete openInfo wrapper");
for(const retiredTransfer of ["function exportSave(","function importSave(","exportSave=dbInfoExportSave;","importSave=dbInfoImportSave;"])assert.ok(!monolith.includes(retiredTransfer),`retired Info save-transfer implementation remains: ${retiredTransfer}`);
for(const injectedCallback of ["exportSave:dbInfoExportSave,","importSave:dbInfoImportSave,"])assert.ok(monolith.includes(injectedCallback),`Info/Guide owner is missing ${injectedCallback}`);
for(const legacy of ["infoCloseBtn","exportSaveBtn","importSaveBtn"])assert.ok(!fs.readFileSync(path.join(root,"runtime/index.html"),"utf8").includes(`id=\"${legacy}\"`),`static legacy Info markup remains: ${legacy}`);
assert.match(indexHtml,/id="goldGainStat"/,"current-run Gold gain must be a real visible board HUD stat");
assert.match(indexHtml,/id="goldGainText"/,"Gold gain HUD stat needs a dedicated value node");
assert.match(monolith,/function v266SyncGoldGainStat\(\)/,"HUD must synchronize the authoritative effective Gold value");
assert.doesNotMatch(source,/data-effective-gold/,"Info lifetime panel must not retain the moved current-run Gold gain card");
for(const retiredStyle of [".info-tabs{display:grid",".lifetime-stats{display:grid",".info-sections{display:grid"])assert.ok(!fs.readFileSync(path.join(root,"runtime/css/dicebound.css"),"utf8").includes(retiredStyle),`shared Info style remains: ${retiredStyle}`);

console.log("Info/Guide UI owner tests passed.");
