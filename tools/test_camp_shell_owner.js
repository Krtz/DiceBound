#!/usr/bin/env node
"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const campSource=fs.readFileSync(path.join(ROOT,'runtime/js/ui/camp.js'),'utf8');
const shellSource=fs.readFileSync(path.join(ROOT,'runtime/js/ui/camp-shell.js'),'utf8');
const monolith=fs.readFileSync(path.join(ROOT,'runtime/js/dicebound.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'runtime/index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'runtime/js/module-manifest.json'),'utf8'));

const sandbox={console,setTimeout,clearTimeout,window:null};sandbox.window=sandbox;
vm.runInNewContext(campSource,sandbox,{filename:'camp.js'});
vm.runInNewContext(shellSource,sandbox,{filename:'camp-shell.js'});
const camp=sandbox.DiceboundCamp;
assert.ok(camp,'DiceboundCamp must remain the one public Camp/App-Shell facade');
for(const method of ['configureShell','enterShell','refreshMetaShell','refreshHudShell'])assert.equal(typeof camp[method],'function',`missing Camp shell facade method ${method}`);
assert.equal(sandbox.DiceboundCampShell,undefined,'focused Camp shell policy must not leak a peer public global');

function configureTrace(trace,ouroboros=true){
  const names=['clearCheckpoint','clearRunTalentSnapshot','ensureHellToggle','ensureCampScene','refreshCampV110','refreshCampV22','refreshCampV24','refreshRunControls','syncCampProgressionObjects','resetInvokerCombat','healAtCamp','clearCombatPresentation','refreshActivePetArt','refreshCampProgression','scheduleCampHitTargetSync','syncOuroborosEconomy','syncOuroborosAttack','syncBloodmageHpPassive','recordVitals','checkDynamicClassUnlocks','refreshClassHudAndRoadLabels','refreshDefenseTooltip','refreshStatTooltips','refreshDoubleDiceControls','refreshBoard6RoadLabels','refreshFinalGuardianLabel','ensureDoubleDiceButton','refreshShieldBars','refreshPoisonStat','syncGoldGainStat','forceOuroborosAttackLabel','scheduleRunCheckpoint'];
  const callbacks=Object.fromEntries(names.map(name=>[name,(...args)=>{trace.push(args.length?`${name}:${args.join(',')}`:name);}]))
  callbacks.isOuroboros=()=>ouroboros;
  camp.configureShell(callbacks);
}

let trace=[];configureTrace(trace);
const entryResult=camp.enterShell(()=>{trace.push('base-entry');return 'entry-result';},null,[]);
assert.equal(entryResult,'entry-result');
assert.deepEqual(trace,['clearCheckpoint','clearRunTalentSnapshot','base-entry','ensureHellToggle','ensureCampScene','refreshCampV110','refreshCampV22','refreshCampV24','refreshRunControls','syncCampProgressionObjects','resetInvokerCombat','healAtCamp','clearCombatPresentation','refreshActivePetArt']);

trace=[];configureTrace(trace);
const metaResult=camp.refreshMetaShell(()=>{trace.push('base-meta');return 'meta-result';},null,[]);
assert.equal(metaResult,'meta-result');
assert.deepEqual(trace,['base-meta','ensureCampScene','refreshCampV110','refreshCampV22','refreshCampV24','refreshCampProgression','scheduleCampHitTargetSync','refreshActivePetArt']);

trace=[];configureTrace(trace,true);
const hudResult=camp.refreshHudShell(()=>{trace.push('base-hud');return 'hud-result';},null,[]);
assert.equal(hudResult,'hud-result');
assert.deepEqual(trace,['syncOuroborosEconomy','syncOuroborosAttack','syncBloodmageHpPassive:false','syncOuroborosAttack','recordVitals','base-hud','checkDynamicClassUnlocks','refreshClassHudAndRoadLabels','refreshDefenseTooltip','checkDynamicClassUnlocks','refreshStatTooltips','refreshDoubleDiceControls','refreshBoard6RoadLabels','refreshFinalGuardianLabel','ensureDoubleDiceButton','refreshShieldBars','refreshPoisonStat','syncGoldGainStat','forceOuroborosAttackLabel','scheduleRunCheckpoint']);

trace=[];configureTrace(trace,false);camp.refreshHudShell(()=>trace.push('base-hud'),null,[]);
assert.deepEqual(trace.filter(value=>value==='syncOuroborosAttack'),['syncOuroborosAttack'],'non-Ouroboros HUD still preserves the unconditional historical sync but not the conditional pre-sync');
assert.equal(trace.includes('forceOuroborosAttackLabel'),false,'non-Ouroboros HUD must not force the Ouroboros Attack label');

const retired=[
  'updateHUDV15=updateHUD','openStartScreenV15=openStartScreen','updateHUDBase=updateHUD','openStartScreenBase=openStartScreen','updateHUDV16Base=updateHUD','updateHUDV18Base=updateHUD','updateHUDV19Base=updateHUD','updateHUDV19RoadBase=updateHUD','updateHUDV20GuardianBase=updateHUD','openStartScreenV110Base=openStartScreen','updateMetaUIV110Base=updateMetaUI','updateMetaUIV22Base=updateMetaUI','openStartScreenV22Base=openStartScreen','updateHUDV22Base=updateHUD','updateHUDV24Base=updateHUD','updateMetaUIV24CampBase=updateMetaUI','openStartScreenV24CampBase=openStartScreen','updateHUDV26PoisonBase=updateHUD','updateHUDV266GoldGainBase=updateHUD','updateHUDV27OuroBase=updateHUD','dbRunUpdateHudBase=updateHUD','dbRunOpenStartBase=openStartScreen','db0633OpenStartScreenBase=openStartScreen','db0633UpdateMetaUIBase=updateMetaUI','db064FriendsUpdateMetaUiBase=updateMetaUI','dbFriendUpdateMetaUiBase=updateMetaUI','dbFriendOpenStartScreenBase=openStartScreen'
];
for(const token of retired)assert.equal(monolith.includes(token),false,`retired Camp/App-Shell wrapper shadow remains: ${token}`);
for(const token of ['const dbCampOpenStartCore=openStartScreen;','const dbCampMetaUiCore=updateMetaUI;','const dbCampHudCore=updateHUD;'])assert.equal(monolith.split(token).length-1,1,`expected one final Camp shell composition capture: ${token}`);
assert.match(monolith,/db064Camp\.configureShell\(\{/,'composition root must configure shell policy through DiceboundCamp');
assert.match(monolith,/db064Camp\.enterShell\(dbCampOpenStartCore,this,args\)/,'Camp entry must route through DiceboundCamp');
assert.match(monolith,/db064Camp\.refreshMetaShell\(dbCampMetaUiCore,this,args\)/,'meta refresh must route through DiceboundCamp');
assert.match(monolith,/db064Camp\.refreshHudShell\(dbCampHudCore,this,args\)/,'HUD refresh must route through DiceboundCamp');

const shellEntry=manifest.modules.find(entry=>entry.id==='ui-camp-shell-policy');
assert.ok(shellEntry,'Camp shell policy manifest entry missing');
assert.equal(shellEntry.path,'js/ui/camp-shell.js');
assert.deepEqual(shellEntry.requires,['ui-camp']);
assert.deepEqual(shellEntry.provides,[],'focused shell policy must stay hidden behind DiceboundCamp');
const campIndex=index.indexOf('js/ui/camp.js'),shellIndex=index.indexOf('js/ui/camp-shell.js'),optionsIndex=index.indexOf('js/ui/options.js'),monolithIndex=index.indexOf('js/dicebound.js');
assert.ok(campIndex>=0&&campIndex<shellIndex&&shellIndex<optionsIndex&&shellIndex<monolithIndex,'Camp shell policy must install immediately after the Camp facade and before composition');
assert.doesNotMatch(shellSource,/window\.DiceboundCampShell\s*=/,'focused shell policy must never publish a peer global');
assert.equal(shellSource.includes("refreshLegacyHeroAvatar"),false,'retired legacy hero repaint hook must stay out of Camp shell policy');
assert.equal(monolith.includes("refreshLegacyHeroAvatar"),false,'retired legacy hero repaint callback must stay out of composition');
assert.match(campSource,/_installShell:installShell/,'Camp facade must own the focused shell installer');

console.log('Camp/App-Shell owner PASS: entry, meta and HUD orchestration converge behind DiceboundCamp with exact ordering and no shadow ladder');
