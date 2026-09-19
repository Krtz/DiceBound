#!/usr/bin/env node
/* Deterministic ownership contract for active class HUD / Road presentation. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/ui/class-presentation.js'),'utf8');

function element(){
  return {
    innerHTML:'',textContent:'',dataset:{},attrs:{},children:[],
    classList:{values:new Set(),add(...xs){xs.forEach(x=>this.values.add(x));},remove(...xs){xs.forEach(x=>this.values.delete(x));}},
    setAttribute(name,value){this.attrs[name]=String(value);},
    appendChild(child){this.children=[child];return child;}
  };
}
function image(){
  return {className:'',alt:'',draggable:true,src:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}};
}
const nodes={heroAvatar:element(),combatPlayerIcon:element(),pawn:element()};
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
sandbox.window.document={createElement:tag=>{assert.equal(tag,'img');return image();}};
vm.runInNewContext(source,sandbox,{filename:'class-presentation.js'});
const owner=sandbox.window.DiceboundClassPresentation;
assert(owner&&owner.owner==='ui/class-presentation');

owner.configure({
  document:sandbox.window.document,
  find:id=>nodes[id]||null,
  getClass:id=>id==='ranger'?{id:'ranger',name:'Ranger',icon:'🏹'}:null,
  resolveClassArt:id=>id==='ranger'?{
    headshot:'assets/characters/classes/campsite/ranger.png',
    battle:'assets/characters/classes/battle/ranger.png',
    marker:'assets/characters/classes/markers/ranger.png'
  }:null
});
owner.syncActive('ranger');
assert.equal(nodes.heroAvatar.children[0].src,'assets/characters/classes/campsite/ranger.png');
assert.equal(nodes.combatPlayerIcon.children[0].src,'assets/characters/classes/battle/ranger.png');
assert.equal(nodes.pawn.children[0].src,'assets/characters/classes/markers/ranger.png');
assert.equal(nodes.heroAvatar.dataset.classArt,'ranger');
assert.equal(nodes.combatPlayerIcon.dataset.classArt,'ranger');
assert.equal(nodes.pawn.dataset.classArt,'ranger');
assert.equal(nodes.pawn.attrs['aria-label'],'Ranger board marker');

// A normal HUD/movement refresh must be idempotent and keep semantic art rather than
// replacing the Road marker with the historical class emoji.
owner.syncActive('ranger');
assert.equal(nodes.pawn.children[0].src,'assets/characters/classes/markers/ranger.png');
assert.equal(nodes.pawn.textContent,'');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
assert(monolith.includes('const dbClassPresentation=window.DiceboundClassPresentation;'),'composition must require the class presentation owner');
assert(monolith.includes('dbClassPresentation.syncActive(player.classId);'),'HUD refresh must synchronously render active class art');
assert(!monolith.includes('$("pawn").textContent=cls.icon'),'HUD must not restore the legacy moving emoji marker');
assert(!monolith.includes('$("heroAvatar").textContent=cls.icon'),'HUD must not overwrite semantic hero art');
assert(!monolith.includes('$("combatPlayerIcon").textContent=cls.icon'),'HUD must not overwrite semantic combat art');
for(const retired of ['function classBoardMarkerSrc(','function applyClassBoardMarker(','function db054ClassArt(','function db054ClassImageHtml(','function classPortraitSVG(']){
  assert(!monolith.includes(retired),`retired class-art presentation remains in dicebound.js: ${retired}`);
}
assert(!monolith.includes('applyClassPortrait=function'),'retired monolith portrait renderer must stay drained');

console.log('Class presentation owner PASS: immediate semantic HUD/Road art and monolith drain contract');
