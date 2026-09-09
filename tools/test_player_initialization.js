'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const monoPath=path.join(root,'runtime','js','dicebound.js');
const ownerPath=path.join(root,'runtime','js','run','player-initialization.js');
const fixturePath=path.join(root,'tools','fixtures','player_initialization_0_6_6_20.json');

const CAPTURES=[
  'resetPlayerV15','resetPlayerV12','resetPlayerV13','resetPlayerV15Patch',
  'resetPlayerV16Base','resetPlayerV17Base','resetPlayerV18Base','resetPlayerV19Base',
  'resetPlayerV21Base','resetPlayerV23TalentBase','resetPlayerV24Base','resetPlayerV26TalentBase',
  'resetPlayerV27Base','resetPlayerV28Base','db060ResetPlayerBase','db06421ResetPlayerBase',
  'dbFriendResetPlayerBase'
];
const RNG_STREAM=[.91,.12,.77,.33,.02,.64,.48,.15,.83,.27,.56,.04,.71,.39,.95,.18,.61,.08,.44,.87,.23,.52,.31,.69,.06,.74,.41,.97,.14,.58,.36,.81,.11,.66,.29,.93,.17,.47,.73,.25,.84,.09,.54,.38,.99,.21,.63,.42,.79,.01,.57,.34,.88,.19,.68,.46,.76,.13,.59,.26,.82,.05,.72,.37,.96,.16,.62,.43,.86,.24,.53,.32,.67,.07,.75,.4,.94,.2,.6,.35];
const ELEMENT_KEYS=['fire','ice','electric','light','void','nature','donut','tech','metal','coffee','radiation'];
const PET_IDS=['neutral','fire','ice','electric','light','void','nature','donut','tech','metal','coffee','radiation'];

function base(id,maxHp=40,attack=7,defense=2){return {id,name:id,icon:id.slice(0,1).toUpperCase(),ultimate:{icon:'U',name:`${id} ultimate`},base:{maxHp,attack,defense,crit:.1,dodge:.05,luck:.02,doubleStrike:.03,guardPower:.55,classBurst:.1,lifeSteal:0},tags:[]};}
function classes(){
  const out={};
  for(const id of ['ranger','fighter','sorcerer','clown','turtle','frog','d20','slime','vampire','ninja','rouge','ceo','merchant','cleric','rogue','beastmaster','paladin','alchemist','summoner','pokemontrainer','bloodmage','ouroboros','slimerouge','dragoon'])out[id]=base(id);
  out.slime.base.maxHp=36;out.sorcerer.base.maxHp=27;out.bloodmage.base.maxHp=42;out.paladin.base.maxHp=52;out.alchemist.base.maxHp=34;
  return out;
}
const MECHANICS={sorcerer:['mana'],vampire:['mana'],rouge:['mana'],merchant:['mana'],summoner:['mana','spirits','pet'],pokemontrainer:['roster','pet'],cleric:['faith'],ninja:['smoke'],alchemist:['alchemy'],beastmaster:['pet']};
const PASSIVES=Object.fromEntries(Object.keys(classes()).map(id=>[id,{name:`${id} passive`}]))
function clone(value){return JSON.parse(JSON.stringify(value));}

function findClosingBrace(source,open){
  let depth=0,state='code',quote='',escaped=false;
  for(let i=open;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(state==='line'){if(ch==='\n')state='code';continue;}
    if(state==='block'){if(ch==='*'&&next==='/'){state='code';i++;}continue;}
    if(state==='string'){
      if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote){state='code';quote='';}continue;
    }
    if(ch==='/'&&next==='/'){state='line';i++;continue;}if(ch==='/'&&next==='*'){state='block';i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){state='string';quote=ch;continue;}
    if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0)return i;}
  }
  throw new Error(`Unclosed brace at ${open}`);
}
function expressionEnd(source,assign){const open=source.indexOf('{',assign);const end=findClosingBrace(source,open);let finish=end+1;while(/\s/.test(source[finish]||''))finish++;if(source[finish]===';')finish++;return finish;}
function extractLegacyPipeline(){
  const source=fs.readFileSync(monoPath,'utf8');
  const baseMatch=/function\s+resetPlayer\s*\(classId=selectedClassId\)\s*\{/.exec(source);assert(baseMatch,'legacy resetPlayer base missing');
  const baseOpen=source.indexOf('{',baseMatch.index),baseEnd=findClosingBrace(source,baseOpen),blocks=[source.slice(baseMatch.index,baseEnd+1)];
  const located=[];
  for(const marker of CAPTURES){
    const capture=`const ${marker}=resetPlayer;`,start=source.indexOf(capture);assert(start>=0,`legacy capture missing: ${marker}`);
    const assign=source.indexOf('resetPlayer=function',start+capture.length);assert(assign>=0,`legacy assignment missing after ${marker}`);
    located.push({start,block:source.slice(start,expressionEnd(source,assign))});
  }
  located.sort((a,b)=>a.start-b.start).forEach(x=>blocks.push(x.block));return blocks.join('\n');
}

function makeCases(){return [
  {id:'ranger-baseline',classId:'ranger'},
  {id:'fighter-passive',classId:'fighter'},
  {id:'sorcerer-mana',classId:'sorcerer'},
  {id:'slime-normalization',classId:'slime'},
  {id:'paladin-start',classId:'paladin'},
  {id:'alchemist-start',classId:'alchemist'},
  {id:'summoner-start',classId:'summoner'},
  {id:'pokemon-trainer-rng',classId:'pokemontrainer'},
  {id:'bloodmage-start',classId:'bloodmage'},
  {id:'ouroboros-start',classId:'ouroboros'},
  {id:'dragoon-reset',classId:'dragoon'},
  {id:'active-fire-pet',classId:'ranger',activePet:'fire'},
  {id:'active-donut-pet',classId:'ranger',activePet:'donut'},
  {id:'talent-stack',classId:'fighter',purchased:{fortune_powerup_rerolls:3,fortune_extra_choice:1,monk_flow_ceiling:2,legacy_travel:2,legacy_heirloom:1,companion_recovery:1,talent_attack:2}},
  {id:'prismatic-r1',classId:'ranger',purchased:{element_prismatic:1}},
  {id:'prismatic-r2',classId:'ranger',purchased:{element_prismatic:2}},
  {id:'prismatic-r3',classId:'ranger',purchased:{element_prismatic:3}},
  {id:'prismatic-heirloom-suppression',classId:'ranger',purchased:{element_prismatic:3},heirlooms:[{id:'heirloom-weapon',slot:'weapon',rarity:'rare',name:'Old Bow',bonuses:{attack:4}}]},
  {id:'mana-heirlooms',classId:'sorcerer',purchased:{legacy_heirloom:1},heirlooms:[{id:'mana-book',slot:'offhand',rarity:'rare',name:'Mana Book',bonuses:{maxMana:25,attack:2}},{id:'mana-ring',slot:'ring',rarity:'rare',name:'Mana Ring',bonuses:{maxMana:7}}]},
  {id:'reverse-engineering-heirlooms',classId:'ranger',purchased:{legacy_heirloom:1},heirlooms:[{id:'reverse',slot:'weapon',rarity:'legendary',name:'Reverse',legendaryEffectId:'reverse_engineering',bonuses:{attack:8,defense:2}},{id:'armor',slot:'offhand',rarity:'epic',name:'Wall',bonuses:{attack:1,defense:10}}]},
  {id:'glass-fortress-heirloom',classId:'ranger',heirlooms:[{id:'glass',slot:'ring',rarity:'legendary',name:'Glass',legendaryEffectId:'glass_fortress',bonuses:{maxHp:20}}]},
  {id:'slime-rouge-rng',classId:'slimerouge',unlockAll:true},
  {id:'slime-rouge-forced-support',classId:'slimerouge',unlockAll:true,forcedIdentity:'summoner',forcedUltimate:'pokemontrainer'},
  {id:'successive-summoner-ranger',classId:'summoner',secondClassId:'ranger',activePet:'ice'}
];}

function makeHarness(spec){
  const CLASSES=classes(),player={},events=[],rngValues=[];let cursor=0,runTalentSnapshot=null;
  const meta={purchased:clone(spec.purchased||{}),heirlooms:clone(spec.heirlooms||[]),activePet:spec.activePet||'neutral',prestige:{count:0},unlocks:{}};
  if(spec.unlockAll)for(const id of Object.keys(CLASSES))meta.unlocks[id]=true;
  const SlimeRougeRuntime={forcedIdentity:spec.forcedIdentity||null,forcedUltimate:spec.forcedUltimate||null,pendingIdentity:null,pendingUltimate:null};
  const globals={boardLevel:5,rolls:99,tilesMovedThisRun:88,pendingLevelUps:7,currentEnemy:{id:'stale'},currentEnemies:[{id:'stale'}],currentEncounterLead:{id:'stale'},currentEnemyTile:42,currentMerchantItems:[{id:'stale'}],runFinalized:true,lastLegacyAward:7,lastGoldLegacyAward:9,merchantBossBattle:true,v16CombatKind:'stale'};
  const random=()=>{assert(cursor<RNG_STREAM.length,`RNG exhausted: ${spec.id}`);const v=RNG_STREAM[cursor++];rngValues.push(v);return v;};
  const rand=(min,max)=>Math.floor(random()*(max-min+1))+min;
  const pick=list=>list[Math.floor(random()*list.length)%list.length];
  const gameplayTalentRank=id=>Math.max(0,Number((runTalentSnapshot||meta.purchased||{})[id])||0);
  const identityId=()=>player.classId==='slimerouge'?(SlimeRougeRuntime.pendingIdentity||player.slimeRougeIdentityClass||'slimerouge'):player.classId;
  const classIdentityActive=id=>identityId()===id;
  const classHasMechanic=mechanic=>(MECHANICS[identityId()]||[]).includes(mechanic);
  const applyTalentBonuses=()=>{player.attack+=(gameplayTalentRank('talent_attack')||0);player.fastTravelBonus+=(gameplayTalentRank('legacy_travel')||0);};
  const getHeirloomSlots=()=>1+(gameplayTalentRank('legacy_heirloom')||0)+(meta.prestige.count>=20?1:0);
  const itemBonuses=item=>item?.bonuses||{};
  const equipItem=(item)=>{const copy=clone(item);player.equipment[copy.slot]=copy;for(const [k,v] of Object.entries(itemBonuses(copy))){if(k==='maxHp'){player.maxHp+=v;player.hp+=v;}else if(k==='maxMana'){player.maxMana=(player.maxMana||0)+v;}else player[k]=(Number(player[k])||0)+v;}events.push(`equip:${copy.id}`);return copy;};
  const generateEquipment=(rarity,slot)=>{const a=random(),b=random(),c=random();return {id:`generated-${rarity}-${slot}-${Math.floor(a*1000)}-${Math.floor(b*1000)}-${Math.floor(c*1000)}`,slot,rarity,name:`${rarity} ${slot}`,bonuses:{attack:Math.floor(b*3)}};};
  const elementSummary=item=>item.element||'none';
  const recordRunBuff=(...args)=>{player.runBuffs.push({args:clone(args)});events.push(`buff:${args[1]}`);};
  const syncActivePetBonus=()=>{const id=meta.activePet;if(id==='fire')player.attack+=1;else if(id==='ice')player.defense+=1;else if(id==='electric')player.crit+=.03;else if(id==='light'){player.maxHp+=5;player.hp+=5;}else if(id==='void')player.doubleStrike+=.03;else if(id==='nature')player.potionPower+=.10;else if(id==='donut'){player.maxHp+=3;player.hp+=3;player.potionPower+=.05;}else if(id==='tech')player.bossDamage+=.08;else if(id==='metal')player.flatReduction+=1;else if(id==='coffee')player.luck+=.04;else if(id==='radiation')player.elementDamageBonus+=.06;events.push(`pet:${id}`);};
  const shuffledPetIds=()=>{const arr=[...PET_IDS];for(let i=arr.length-1;i>0;i--){const j=rand(0,i),t=arr[i];arr[i]=arr[j];arr[j]=t;}return arr;};
  const syncBloodmageHpPassive=initial=>{events.push(`blood:${initial?'initial':'sync'}`);if(!classIdentityActive('bloodmage'))return;if(initial){const baseHp=CLASSES.bloodmage.base.maxHp,bonus=Math.max(0,(player.maxHp||baseHp)-baseHp);if(bonus>0){player.maxHp+=bonus;player.hp+=bonus;}player._v18BloodmageMaxHp=player.maxHp;}};
  const syncOuroborosAttack=()=>{events.push('ouro:attack');if(!classIdentityActive('ouroboros'))return;const delta=(Number(player.attack)||0)-10;if(Math.abs(delta)>.0001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+delta*.10);player.attack=10;}};
  const syncOuroborosEconomy=()=>{events.push('ouro:economy');if(!classIdentityActive('ouroboros'))return;if((player.goldAttackScale||0)!==0){player.v27OuroGoldEchoScale=(player.v27OuroGoldEchoScale||0)+player.goldAttackScale*.10;player.goldAttackScale=0;}const desired=(player.gold||0)*(player.v27OuroGoldEchoScale||0),old=player.v27OuroGoldEchoApplied||0;if(Math.abs(desired-old)>.0000001){player.doubleStrike=Math.max(0,(player.doubleStrike||0)+(desired-old));player.v27OuroGoldEchoApplied=desired;}syncOuroborosAttack();};
  const slimeRougeDonorPool=()=>Object.values(CLASSES).filter(c=>c.id!=='slime'&&c.id!=='slimerouge'&&!!meta.unlocks[c.id]);
  const classMechanicsFor=id=>[...(MECHANICS[id]||[])];
  const initIdentitySupport=id=>{events.push(`identity-support:${id}`);const mechanics=new Set(classMechanicsFor(id));if(mechanics.has('mana')){const desiredMax=id==='summoner'?120:100,desiredStart=id==='summoner'?35:25;if((player.maxMana||0)<desiredMax)player.maxMana=desiredMax;if((player.mana||0)<=0)player.mana=desiredStart;else player.mana=Math.min(player.maxMana,Math.max(player.mana,desiredStart));}if(mechanics.has('spirits')){player.summonerSpirits=player.summonerSpirits||[];player.summonerCap=player.summonerCap||3;player.summonerSpiritScale=player.summonerSpiritScale||1;}if(mechanics.has('roster')&&!(player.trainerRoster||[]).length){player.trainerRoster=shuffledPetIds().slice(0,6);player.trainerActiveIndex=Math.min(player.trainerActiveIndex||0,Math.max(0,player.trainerRoster.length-1));player.trainerAssistScale=player.trainerAssistScale||.65;}if(mechanics.has('faith'))player.clericFaith=player.clericFaith||0;if(mechanics.has('smoke')){player.ninjaSmoke=player.ninjaSmoke||0;player.ninjaSmokeNeed=player.ninjaSmokeNeed||3;}if(mechanics.has('alchemy')){player.alchemistBrewCounter=player.alchemistBrewCounter||0;player.alchemistBrewNeed=player.alchemistBrewNeed||3;player.alchemistFlaskBonus=player.alchemistFlaskBonus||0;}};
  const initUltimateSupport=id=>{events.push(`ultimate-support:${id}`);const support=new Set(MECHANICS[id]||[]);if(support.has('spirits')){player.summonerSpirits=player.summonerSpirits||[];player.summonerCap=player.summonerCap||3;player.summonerSpiritScale=player.summonerSpiritScale||1;}if(support.has('roster')&&!(player.trainerRoster||[]).length){player.trainerRoster=shuffledPetIds().slice(0,6);player.trainerActiveIndex=Math.min(player.trainerActiveIndex||0,Math.max(0,player.trainerRoster.length-1));player.trainerAssistScale=player.trainerAssistScale||.65;}if(support.has('mana')&&!player.maxMana){player.maxMana=100;player.mana=Math.max(player.mana||0,25);}};
  const applyGearTransform=()=>{events.push('gear-transform');const effects=Object.values(player.equipment||{});if(effects.some(i=>i?.legendaryEffectId==='reverse_engineering')){const totals=effects.reduce((a,i)=>{a.attack+=Number(i?.bonuses?.attack)||0;a.defense+=Number(i?.bonuses?.defense)||0;return a;},{attack:0,defense:0});const aAdj=totals.defense-totals.attack,dAdj=totals.attack-totals.defense;player.attack+=aAdj;player.defense+=dAdj;player._db060GearSwapAttackAdj=aAdj;player._db060GearSwapDefenseAdj=dAdj;}if(effects.some(i=>i?.legendaryEffectId==='glass_fortress')){const penalty=Math.max(1,Math.floor(player.maxHp*.30));player.maxHp=Math.max(1,player.maxHp-penalty);player.hp=Math.min(player.hp,player.maxHp);player._db060GlassHpPenalty=penalty;}};
  const syncMana=({baseMaxMana=player.maxMana,currentMana=player.mana}={})=>{events.push('mana-sync');const equipmentMana=Object.values(player.equipment||{}).reduce((n,i)=>n+(Number(i?.bonuses?.maxMana)||0),0),uses=(MECHANICS[identityId()]||[]).includes('mana');player.maxMana=uses?Math.max(0,Number(baseMaxMana)||0)+equipmentMana:0;player.mana=uses?Math.min(player.maxMana,Math.max(0,Number(currentMana)||0)):0;return {maxMana:player.maxMana,mana:player.mana};};
  const resetDragoonState=()=>{Object.assign(player,{dragoonJumpCooldown:0,dragoonAirborneResponses:0,dragoonLandingReady:false});events.push('dragoon-reset');};
  const initializeD20State=()=>{player.hasteCooldown=player.hasteCooldown||0;events.push('d20-init');};
  const setRunGlobals=next=>Object.assign(globals,next);
  const deps={
    getPlayer:()=>player,getMeta:()=>meta,getClasses:()=>CLASSES,getClassPassives:()=>PASSIVES,getElementKeys:()=>ELEMENT_KEYS,
    setRunTalentSnapshot:value=>{runTalentSnapshot=value;},getRunTalentSnapshot:()=>runTalentSnapshot,
    applyTalentBonuses,getHeirloomSlots,equipItem,gameplayTalentRank,generateEquipment,pick,rand,recordRunBuff,elementSummary,
    classIdentityActive,classHasMechanic,shuffledPetIds,setCombatKind:value=>{globals.v16CombatKind=value;},syncActivePetBonus,
    syncBloodmageHpPassive,syncOuroborosAttack,syncOuroborosEconomy,slimeRougeDonorPool,getSlimeRougeRuntime:()=>SlimeRougeRuntime,
    initIdentitySupport,initUltimateSupport,classMechanicsFor,getUltimateSupportMechanics:id=>MECHANICS[id]||[],addLog:html=>events.push(`log:${html}`),
    applyGearTransform,syncMana,resetDragoonState,setStatsLast:({hp,gold})=>{globals.statsLastHp=hp;globals.statsLastGold=gold;},setRunGlobals,initializeD20State
  };
  const context={console,Math,JSON,Object,Array,Number,String,Set,Map,RegExp,window:{DiceboundContent:{ultimateSupportMechanics:MECHANICS}},selectedClassId:'ranger',player,meta,CLASSES,CLASS_PASSIVES:PASSIVES,ELEMENT_KEYS,SlimeRougeRuntime,
    applyTalentBonuses,getHeirloomSlots,equipItem,gameplayTalentRank,generateEquipment,pick,rand,recordRunBuff,elementSummary,classIdentityActive,classHasMechanic,shuffledPetIds,
    syncActivePetBonusV16:syncActivePetBonus,v18SyncBloodmageHpPassive:syncBloodmageHpPassive,v18SyncOuroborosAttack:syncOuroborosAttack,v27SyncOuroborosEconomy:syncOuroborosEconomy,
    v318SlimeRougeDonorPool:slimeRougeDonorPool,v32InitIdentitySupport:initIdentitySupport,v318InitUltimateSupport:initUltimateSupport,classMechanicsFor,addLog:deps.addLog,
    db060ApplyGearTransform:applyGearTransform,db06421SyncMana:syncMana,dbFriendResetDragoonState:resetDragoonState,
    dbCombatD20ChaosResolution:{initializePlayerState:initializeD20State},
    get boardLevel(){return globals.boardLevel;},set boardLevel(v){globals.boardLevel=v;},get rolls(){return globals.rolls;},set rolls(v){globals.rolls=v;},get tilesMovedThisRun(){return globals.tilesMovedThisRun;},set tilesMovedThisRun(v){globals.tilesMovedThisRun=v;},get pendingLevelUps(){return globals.pendingLevelUps;},set pendingLevelUps(v){globals.pendingLevelUps=v;},get currentEnemy(){return globals.currentEnemy;},set currentEnemy(v){globals.currentEnemy=v;},get currentEnemies(){return globals.currentEnemies;},set currentEnemies(v){globals.currentEnemies=v;},get currentEncounterLead(){return globals.currentEncounterLead;},set currentEncounterLead(v){globals.currentEncounterLead=v;},get currentEnemyTile(){return globals.currentEnemyTile;},set currentEnemyTile(v){globals.currentEnemyTile=v;},get currentMerchantItems(){return globals.currentMerchantItems;},set currentMerchantItems(v){globals.currentMerchantItems=v;},get runFinalized(){return globals.runFinalized;},set runFinalized(v){globals.runFinalized=v;},get lastLegacyAward(){return globals.lastLegacyAward;},set lastLegacyAward(v){globals.lastLegacyAward=v;},get lastGoldLegacyAward(){return globals.lastGoldLegacyAward;},set lastGoldLegacyAward(v){globals.lastGoldLegacyAward=v;},get merchantBossBattle(){return globals.merchantBossBattle;},set merchantBossBattle(v){globals.merchantBossBattle=v;},get v16CombatKind(){return globals.v16CombatKind;},set v16CombatKind(v){globals.v16CombatKind=v;},
    get runTalentSnapshot(){return runTalentSnapshot;},set runTalentSnapshot(v){runTalentSnapshot=v;},get statsLastHp(){return globals.statsLastHp;},set statsLastHp(v){globals.statsLastHp=v;},get statsLastGold(){return globals.statsLastGold;},set statsLastGold(v){globals.statsLastGold=v;}
  };
  function snapshot(){return {player:clone(player),globals:clone(globals),runTalentSnapshot:clone(runTalentSnapshot),slimeRuntime:clone(SlimeRougeRuntime),events:clone(events),rng:clone(rngValues)};}
  return {context,deps,snapshot};
}

function runLegacy(spec,pipeline){const h=makeHarness(spec);vm.createContext(h.context);vm.runInContext(pipeline,h.context,{filename:'legacy-player-initialization-oracle.js'});h.context.resetPlayer(spec.classId);if(spec.secondClassId)h.context.resetPlayer(spec.secondClassId);return h.snapshot();}
function loadOwner(){const context={window:{},console,Math,JSON,Object,Array,Number,String,Set,Map};vm.createContext(context);vm.runInContext(fs.readFileSync(ownerPath,'utf8'),context,{filename:'player-initialization.js'});assert(context.window.DiceboundPlayerInitialization?.configure,'player initialization configure() missing');return context.window.DiceboundPlayerInitialization;}
function runOwner(spec,owner){const h=makeHarness(spec),configured=owner.configure(h.deps);configured.initialize(spec.classId);if(spec.secondClassId)configured.initialize(spec.secondClassId);return h.snapshot();}

const cases=makeCases();
if(process.argv.includes('--capture')){
  assert(!fs.existsSync(ownerPath),'capture must run before player initialization owner exists');
  const pipeline=extractLegacyPipeline(),fixture={format:1,sourceVersion:'0.6.6.20',caseCount:cases.length,captureNames:CAPTURES,cases:cases.map(spec=>({id:spec.id,result:runLegacy(spec,pipeline)}))};
  fs.mkdirSync(path.dirname(fixturePath),{recursive:true});fs.writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n');console.log(`Player initialization legacy matrix CAPTURED: ${fixture.caseCount} cases -> ${path.relative(root,fixturePath)}`);
}else{
  assert(fs.existsSync(ownerPath),'player initialization owner missing');assert(fs.existsSync(fixturePath),'frozen 0.6.6.20 player initialization fixture missing');
  const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));assert.strictEqual(fixture.caseCount,cases.length,'case-count drift');assert.deepStrictEqual(fixture.captureNames,CAPTURES,'capture-name drift');const owner=loadOwner();
  for(const spec of cases){const expected=fixture.cases.find(x=>x.id===spec.id)?.result;assert(expected,`fixture missing ${spec.id}`);assert.deepStrictEqual(runOwner(spec,owner),expected,`player initialization drift: ${spec.id}`);}
  console.log(`Player initialization PASS: ${cases.length} frozen 0.6.6.20 cases, exact state/events/RNG stream`);
}
