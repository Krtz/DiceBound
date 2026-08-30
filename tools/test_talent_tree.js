#!/usr/bin/env node
/* Deterministic contract checks for the extracted Talent constellation UI. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/ui/talent-tree.js'),'utf8');
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:'talent-tree.js'});

const tree=sandbox.window.DiceboundTalentTree;
assert(tree,'Talent tree module should publish one presentation owner');
const audit=tree.layoutAudit();
assert.equal(audit.ok,true,`constellation geometry must stay collision-free: ${JSON.stringify(audit)}`);
assert(audit.nodeCount>=45,'constellation should retain the authored Talent layout');
assert(audit.connectorCount>=50,'constellation should retain explicit connector routes');

let purchased=[];
const talents=[
  {id:'roadborn',branch:'Root',cost:1,maxRank:1,requires:[]},
  {id:'power_attack',branch:'Power',cost:1,maxRank:1,requires:[{id:'roadborn',rank:1}]},
  {id:'legacy_storage',branch:'Heirlooms',cost:3,maxRank:1,requires:[{id:'roadborn',rank:1}]}
];
tree.configure({
  getTalents:()=>talents,
  rankFor:id=>id==='roadborn'?1:0,
  isAvailable:t=>t.id!=='legacy_storage',
  isVisible:t=>t.id!=='legacy_storage',
  canPurchase:t=>t.id==='power_attack',
  purchase:id=>{purchased.push(id);return true;}
});
assert.equal(tree.purchase('power_attack'),true,'available node should delegate to authoritative purchase action');
assert.deepEqual(purchased,['power_attack']);
assert.equal(tree.purchase('legacy_storage'),false,'hidden/locked node must not call purchase action');

assert.match(source,/data-talent-done/,'Talent destination must own semantic Done chrome');
assert.match(source,/talent-tree-chrome/,'Done must live in non-scrolling destination chrome');
assert.match(source,/MIN_ZOOM=\.28/,'tree must support the required wide overview zoom');
assert.match(source,/MAX_ZOOM=2\.3/,'tree must support close inspection zoom');
assert.match(source,/event\.deltaY/,'tree must use wheel zoom');
assert.match(source,/view\.setPointerCapture/,'tree must own drag-to-pan lifecycle');
assert.match(source,/layoutAudit/,'layout must retain a deterministic geometry guard');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
const stylesheet=fs.readFileSync(path.join(root,'runtime/css/dicebound.css'),'utf8');
assert.match(monolith,/function renderTalents\(\)\{return window\.DiceboundTalentTree\?\.render\?\.\(\)\|\|null;\}/,'monolith must retain only the documented Talent render adapter');
assert.match(monolith,/function openTalentTree\(returnOverlay=null\)\{return window\.DiceboundTalentTree\?\.open\?\.\(returnOverlay\)\|\|null;\}/,'monolith must retain only the documented Talent open adapter');
for(const retired of ['renderTalents=function','renderTalentsV','createTalentButton','applyTalentZoom','changeTalentZoom','V235_TALENT','v235Talent','db050Talent','db056Talent'])assert(!monolith.includes(retired),`retired Talent presentation chain remains in dicebound.js: ${retired}`);
for(const retiredStyle of ['.talent-summary{','.talent-viewport{','.talent-canvas{','.talent-node.radial{','.modal.talent-modal{'])assert(!stylesheet.includes(retiredStyle),`retired Talent presentation style remains in shared CSS: ${retiredStyle}`);

console.log('Talent tree UI owner PASS: geometry, owner contract and monolith drain guards');
