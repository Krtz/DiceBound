'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const monoPath=path.join(root,'runtime','js','dicebound.js');
const ownerPath=path.join(root,'runtime','js','combat','enemy-scaling-resolution.js');
const fixturePath=path.join(root,'tools','fixtures','enemy_scaling_0_6_6_19.json');

const ELEMENT_KEYS=['fire','ice','electric','nature','light','void'];
const BOARDS={
  1:{tiles:100},2:{tiles:100},3:{tiles:100},4:{tiles:64},5:{tiles:64},
  6:{tiles:64,balance:{extraHp:1.65,extraAttack:1.38,extraDefenseMult:1.22,extraDefenseFlat:12,guardianHp:1.35,guardianAttack:1.22,threePackChance:.95}}
};
const RNG_STREAM=[.91,.12,.77,.33,.02,.64,.48,.15,.83,.27,.56,.04,.71,.39,.95,.18,.61,.08,.44,.87,.23,.52,.31,.69,.06,.74,.41,.97,.14,.58,.36,.81];
const CAPTURES=['scaleEnemyV15','scaleEnemyV11','scaleEnemyV14Base','scaleEnemyV16Base','scaleEnemyV17Base','scaleEnemyV17Normalized','scaleEnemyV19Base','scaleEnemyBeta045Base','db046ScaleEnemyBase','db047ScaleEnemyBase','db064ScaleEnemyBase'];

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function devilFlameChance(board,mode='normal'){
  const b=Math.min(6,Math.max(1,Math.floor(Number(board)||1)));
  const m=String(mode||'normal').toLowerCase()==='hell'?'hell':String(mode||'normal').toLowerCase()==='nightmare'?'nightmare':'normal';
  const bonus={normal:0,nightmare:.30,hell:.60}[m];
  return Number(Math.min(.90,b*.05+bonus).toFixed(2));
}
function isStandardDevil(enemy){return /\bdevil\b/i.test(String(enemy?.name||''))&&!/\bpale\s+devil\b/i.test(String(enemy?.name||''));}
function clone(value){return JSON.parse(JSON.stringify(value));}

function findClosingBrace(source,open){
  let depth=0,state='code',quote='',escaped=false;
  for(let i=open;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(state==='line'){if(ch==='\n')state='code';continue;}
    if(state==='block'){if(ch==='*'&&next==='/'){state='code';i++;}continue;}
    if(state==='string'){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if(ch===quote){state='code';quote='';}
      continue;
    }
    if(ch==='/'&&next==='/'){state='line';i++;continue;}
    if(ch==='/'&&next==='*'){state='block';i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){state='string';quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0)return i;}
  }
  throw new Error(`Unclosed brace at ${open}`);
}

function extractLegacyPipeline(){
  const source=fs.readFileSync(monoPath,'utf8');
  const baseMatch=/function\s+scaleEnemy\s*\(base,kind="normal",packSize=1\)\s*\{/.exec(source);
  assert(baseMatch,'legacy scaleEnemy base function not found for capture');
  const baseOpen=source.indexOf('{',baseMatch.index);
  const baseEnd=findClosingBrace(source,baseOpen);
  const blocks=[source.slice(baseMatch.index,baseEnd+1)];
  const located=[];
  for(const marker of CAPTURES){
    const capture=`const ${marker}=scaleEnemy;`;
    const start=source.indexOf(capture);
    assert(start>=0,`legacy capture missing: ${marker}`);
    const assign=source.indexOf('scaleEnemy=function',start+capture.length);
    assert(assign>=0,`legacy assignment missing after ${marker}`);
    const open=source.indexOf('{',assign);
    const end=findClosingBrace(source,open);
    let finish=end+1;while(/\s/.test(source[finish]||''))finish++;if(source[finish]===';')finish++;
    located.push({start,block:source.slice(start,finish)});
  }
  located.sort((a,b)=>a.start-b.start).forEach(entry=>blocks.push(entry.block));
  return blocks.join('\n');
}

function makeCases(){
  const cases=[];
  for(let board=1;board<=6;board++){
    const tiles=BOARDS[board].tiles;
    cases.push({id:`b${board}-normal-road`,board,mode:'normal',level:1+board*2,position:Math.floor((tiles-1)*.37),kind:'normal',packSize:(board%3)+1,base:{name:'Road Goblin',icon:'👹',hp:18,attack:5,defenseBias:1,xp:8,gold:7}});
    cases.push({id:`b${board}-nightmare-miniboss`,board,mode:'nightmare',level:2+board*3,position:Math.floor((tiles-1)*.52),kind:'miniboss',packSize:1,base:{name:'Test Guardian',icon:'🗿',hp:44,attack:11,defenseBias:3,xp:24,gold:18}});
    cases.push({id:`b${board}-hell-final`,board,mode:'hell',level:4+board*4,position:tiles-1,kind:'final',packSize:1,base:{name:'Test Dragon',icon:'🐉',hp:80,attack:16,defenseBias:5,xp:50,gold:40}});
  }
  cases.push(
    {id:'merchant-b4',board:4,mode:'normal',level:17,position:24,kind:'merchant',packSize:1,base:{name:'Road Merchant',icon:'🧳',hp:62,attack:13,defenseBias:4,xp:32,gold:35}},
    {id:'bloodmage-b5',board:5,mode:'nightmare',level:25,position:41,kind:'bloodmage',packSize:1,base:{name:'Bloodmage',icon:'🩸',hp:70,attack:17,defenseBias:2,xp:40,gold:30}},
    {id:'cultist-normal',board:3,mode:'normal',level:12,position:40,kind:'normal',packSize:2,base:{name:'Cultist',icon:'🕯️',hp:24,attack:7,defenseBias:1,xp:10,gold:9}},
    {id:'cultist-nightmare',board:3,mode:'nightmare',level:12,position:40,kind:'normal',packSize:2,base:{name:'Cultist',icon:'🕯️',hp:24,attack:7,defenseBias:1,xp:10,gold:9}},
    {id:'cultist-hell',board:3,mode:'hell',level:12,position:40,kind:'normal',packSize:2,base:{name:'Cultist',icon:'🕯️',hp:24,attack:7,defenseBias:1,xp:10,gold:9}},
    {id:'affinity-collision',board:2,mode:'normal',level:8,position:48,kind:'miniboss',packSize:1,base:{name:'Collision Guardian',icon:'🧿',hp:35,attack:9,defenseBias:2,xp:16,gold:13,affinity:'fire',weakness:'fire'}},
    {id:'standard-devil-normal',board:1,mode:'normal',level:6,position:62,kind:'normal',packSize:1,base:{name:'Devil',icon:'😈',hp:28,attack:8,defenseBias:1,xp:12,gold:11}},
    {id:'standard-devil-nightmare',board:4,mode:'nightmare',level:18,position:37,kind:'normal',packSize:3,base:{name:'Ash Devil',icon:'😈',hp:31,attack:9,defenseBias:2,xp:14,gold:12}},
    {id:'standard-devil-hell',board:6,mode:'hell',level:32,position:55,kind:'normal',packSize:3,base:{name:'Cinder Devil',icon:'😈',hp:36,attack:11,defenseBias:2,xp:18,gold:15}},
    {id:'pale-devil-exclusion',board:6,mode:'hell',level:32,position:55,kind:'normal',packSize:1,base:{name:'Pale Devil',icon:'👿',hp:45,attack:14,defenseBias:3,xp:22,gold:18}},
    {id:'bandit-art',board:2,mode:'normal',level:7,position:33,kind:'normal',packSize:1,base:{name:'Road Bandit',icon:'🗡️',hp:21,attack:6,defenseBias:1,xp:9,gold:8}},
    {id:'troll-art',board:5,mode:'normal',level:20,position:28,kind:'normal',packSize:2,base:{name:'Bridge Troll',icon:'👺',hp:42,attack:12,defenseBias:4,xp:21,gold:17}}
  );
  return cases;
}

function makeHarness(input){
  const rng=[];let cursor=0;
  const random=()=>{if(cursor>=RNG_STREAM.length)throw new Error(`RNG stream exhausted in ${input.id}`);const value=RNG_STREAM[cursor++];rng.push(value);return value;};
  const pick=list=>{assert(Array.isArray(list)&&list.length,'pick requires a non-empty array');return list[Math.floor(random()*list.length)%list.length];};
  const state={player:{level:input.level,position:input.position},boardLevel:input.board,nightmareMode:input.mode==='nightmare',hellMode:input.mode==='hell'};
  const callbacks={
    getState:()=>state,
    currentTileCount:()=>BOARDS[state.boardLevel].tiles,
    clamp,random,pick,
    getBoard:level=>clone(BOARDS[level]),
    enemyPolicy:{standardDevilFlameChance:devilFlameChance},
    elementKeys:ELEMENT_KEYS,
    beta045EnemyArtForName:name=>/bandit|troll/i.test(name||'')?`beta045:${name}`:null,
    db046EnemyArtForName:name=>/bandit|troll/i.test(name||'')?`db046:${name}`:null,
    db047UiArt:(key,name)=>`db047:${key}:${name}`
  };
  return {state,callbacks,rng,random,pick};
}

function runLegacy(input,pipeline){
  const h=makeHarness(input);
  const context={
    console,Math,JSON,Object,Array,Number,String,RegExp,Set,Map,
    player:h.state.player,boardLevel:h.state.boardLevel,nightmareMode:h.state.nightmareMode,hellMode:h.state.hellMode,
    ELEMENT_KEYS:[...ELEMENT_KEYS],clamp,random:h.random,pick:h.pick,currentTileCount:h.callbacks.currentTileCount,
    db317Board:h.callbacks.getBoard,db064EnemyPolicy:h.callbacks.enemyPolicy,
    beta045EnemyArtForName:h.callbacks.beta045EnemyArtForName,db046EnemyArtForName:h.callbacks.db046EnemyArtForName,db047UiArt:h.callbacks.db047UiArt,
    db064CombatMode:()=>h.state.hellMode?'hell':h.state.nightmareMode?'nightmare':'normal',db064IsStandardDevil:isStandardDevil
  };
  vm.createContext(context);vm.runInContext(pipeline,context,{filename:'legacy-enemy-scaling-oracle.js'});
  const output=context.scaleEnemy(clone(input.base),input.kind,input.packSize);
  return {output:clone(output),rng:[...h.rng]};
}

function loadOwner(){
  const context={window:{},console,Math,JSON,Object,Array,Number,String,RegExp,Set,Map};
  vm.createContext(context);vm.runInContext(fs.readFileSync(ownerPath,'utf8'),context,{filename:'enemy-scaling-resolution.js'});
  assert(context.window.DiceboundEnemyScalingResolution?.configure,'enemy scaling owner configure() missing');
  return context.window.DiceboundEnemyScalingResolution;
}

function runOwner(input,owner){
  const h=makeHarness(input);
  const configured=owner.configure(h.callbacks);
  const output=configured.scale(clone(input.base),input.kind,input.packSize);
  return {output:clone(output),rng:[...h.rng]};
}

const cases=makeCases();
if(process.argv.includes('--capture')){
  assert(!fs.existsSync(ownerPath),'capture must run against the pre-extraction runtime');
  const pipeline=extractLegacyPipeline();
  const fixture={format:1,sourceVersion:'0.6.6.19',caseCount:cases.length,cases:cases.map(input=>({id:input.id,input,result:runLegacy(input,pipeline)}))};
  fs.mkdirSync(path.dirname(fixturePath),{recursive:true});fs.writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n');
  console.log(`Enemy scaling legacy matrix CAPTURED: ${fixture.caseCount} cases -> ${path.relative(root,fixturePath)}`);
}else{
  assert(fs.existsSync(ownerPath),'enemy scaling owner missing');assert(fs.existsSync(fixturePath),'frozen 0.6.6.19 scaling fixture missing');
  const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));assert.strictEqual(fixture.caseCount,cases.length,'matrix case count drifted');
  const owner=loadOwner();
  for(const entry of fixture.cases){
    const actual=runOwner(entry.input,owner);
    assert.deepStrictEqual(actual,entry.result,`enemy scaling drift: ${entry.id}`);
  }
  console.log(`Enemy scaling resolution PASS: ${fixture.caseCount} frozen 0.6.6.19 cases, exact outputs + RNG consumption`);
}
