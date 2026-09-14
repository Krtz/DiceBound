from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / "runtime" / "js" / "dicebound.js"
CAMP = ROOT / "runtime" / "js" / "ui" / "camp.js"
SHELL = ROOT / "runtime" / "js" / "ui" / "camp-shell.js"
INDEX = ROOT / "runtime" / "index.html"
MANIFEST = ROOT / "runtime" / "js" / "module-manifest.json"
TEST = ROOT / "tools" / "test_camp_shell_owner.js"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# Public facade: keep DiceboundCamp as the only public Camp/App-Shell owner and
# install the focused shell policy internally.
# ---------------------------------------------------------------------------
camp = CAMP.read_text(encoding="utf-8")
camp = replace_once(camp, "  let runtime={};\n  let resizeBound=false;", "  let runtime={};\n  let shell=null;\n  let resizeBound=false;", "Camp shell slot")
old_config = '''  function configure(nextRuntime={}){
    runtime={...runtime,...nextRuntime,actions:{...runtime.actions,...nextRuntime.actions}};
    installLayoutStyles();
    if(!resizeBound&&root.addEventListener){resizeBound=true;root.addEventListener('resize',()=>{scheduleRefresh();scheduleHitTargetSync();scheduleViewportPositionSync();},{passive:true});}
    return api;
  }

  const api=Object.freeze({
    configure,ensure,refresh,refreshArt,renderClassFigure,renderPetFigure,openPanel,closePanels,scrollPanel,ensureCompatStartButton,ensureOptionsButton,
'''
new_config = '''  function configure(nextRuntime={}){
    runtime={...runtime,...nextRuntime,actions:{...runtime.actions,...nextRuntime.actions}};
    installLayoutStyles();
    if(!resizeBound&&root.addEventListener){resizeBound=true;root.addEventListener('resize',()=>{scheduleRefresh();scheduleHitTargetSync();scheduleViewportPositionSync();},{passive:true});}
    return api;
  }

  function requireShell(){if(!shell)throw new Error('DiceboundCamp shell policy is not installed.');return shell;}
  function installShell(next){
    if(!next||typeof next.configure!=='function'||typeof next.enter!=='function'||typeof next.refreshMeta!=='function'||typeof next.refreshHud!=='function')throw new Error('Invalid DiceboundCamp shell policy.');
    shell=next;return api;
  }
  function configureShell(nextRuntime={}){requireShell().configure(nextRuntime);return api;}
  function enterShell(base,thisArg,args=[]){return requireShell().enter(base,thisArg,args);}
  function refreshMetaShell(base,thisArg,args=[]){return requireShell().refreshMeta(base,thisArg,args);}
  function refreshHudShell(base,thisArg,args=[]){return requireShell().refreshHud(base,thisArg,args);}

  const api=Object.freeze({
    configure,configureShell,enterShell,refreshMetaShell,refreshHudShell,_installShell:installShell,ensure,refresh,refreshArt,renderClassFigure,renderPetFigure,openPanel,closePanels,scrollPanel,ensureCompatStartButton,ensureOptionsButton,
'''
camp = replace_once(camp, old_config, new_config, "Camp facade shell delegation")
CAMP.write_text(camp, encoding="utf-8", newline="\n")

SHELL.write_text(r'''/* DiceBound Camp / App-Shell lifecycle and HUD policy owner.
 *
 * This focused internal owns only orchestration/order. Camp DOM/layout remains
 * in ui/camp.js; Run, Classes, Progression, Combat View and Pets remain the
 * authoritative mechanics/data owners supplied here as collaborators.
 */
(function(root){
  'use strict';

  const camp=root.DiceboundCamp;
  if(!camp?._installShell)throw new Error('camp-shell.js requires DiceboundCamp before loading.');

  let runtime={};
  function configure(next={}){runtime={...runtime,...next};return api;}
  function invoke(name,...args){const fn=runtime[name];return typeof fn==='function'?fn(...args):undefined;}
  function applyBase(base,thisArg,args){if(typeof base!=='function')throw new Error('Camp shell requires a base function.');return Reflect.apply(base,thisArg,args||[]);}

  // Preserve the exact released wrapper unwind order. In particular Run owns
  // checkpoint clearing, while Camp owns when that collaborator is invoked.
  function enter(base,thisArg,args=[]){
    invoke('clearCheckpoint');
    invoke('clearRunTalentSnapshot');
    const result=applyBase(base,thisArg,args);
    invoke('ensureHellToggle');
    invoke('ensureCampScene');
    invoke('refreshCampV110');
    invoke('refreshCampV22');
    invoke('refreshCampV24');
    invoke('refreshRunControls');
    invoke('syncCampProgressionObjects');
    invoke('resetInvokerCombat');
    invoke('healAtCamp');
    invoke('clearCombatPresentation');
    invoke('refreshActivePetArt');
    return result;
  }

  function refreshMeta(base,thisArg,args=[]){
    const result=applyBase(base,thisArg,args);
    invoke('ensureCampScene');
    invoke('refreshCampV110');
    invoke('refreshCampV22');
    invoke('refreshCampV24');
    invoke('refreshCampProgression');
    invoke('scheduleCampHitTargetSync');
    invoke('refreshActivePetArt');
    return result;
  }

  function refreshHud(base,thisArg,args=[]){
    // Historical outer pre-hooks first.
    invoke('syncOuroborosEconomy');
    if(invoke('isOuroboros'))invoke('syncOuroborosAttack');
    invoke('syncBloodmageHpPassive',false);
    invoke('syncOuroborosAttack');
    invoke('recordVitals');

    const result=applyBase(base,thisArg,args);

    // Historical inner-to-outer post-hooks, kept deliberately explicit so a
    // later change cannot silently reorder UI/state synchronization.
    invoke('refreshLegacyHeroAvatar');
    invoke('checkDynamicClassUnlocks');
    invoke('refreshClassHudAndRoadLabels');
    invoke('refreshDefenseTooltip');
    invoke('checkDynamicClassUnlocks');
    invoke('refreshStatTooltips');
    invoke('refreshDoubleDiceControls');
    invoke('refreshBoard6RoadLabels');
    invoke('refreshFinalGuardianLabel');
    invoke('ensureDoubleDiceButton');
    invoke('refreshShieldBars');
    invoke('refreshPoisonStat');
    invoke('syncGoldGainStat');
    if(invoke('isOuroboros'))invoke('forceOuroborosAttackLabel');
    invoke('scheduleRunCheckpoint');
    return result;
  }

  const api=Object.freeze({apiVersion:1,configure,enter,refreshMeta,refreshHud});
  camp._installShell(api);
})(window);
''', encoding="utf-8", newline="\n")

# ---------------------------------------------------------------------------
# Script graph.
# ---------------------------------------------------------------------------
index = INDEX.read_text(encoding="utf-8")
index = replace_once(index, '<script src="js/ui/camp.js"></script>\n<script src="js/ui/options.js"></script>', '<script src="js/ui/camp.js"></script>\n<script src="js/ui/camp-shell.js"></script>\n<script src="js/ui/options.js"></script>', "Camp shell script order")
INDEX.write_text(index, encoding="utf-8", newline="\n")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
modules = manifest["modules"]
if any(entry.get("id") == "ui-camp-shell-policy" for entry in modules):
    raise SystemExit("ui-camp-shell-policy already exists")
idx = next((i for i, entry in enumerate(modules) if entry.get("id") == "ui-camp"), None)
if idx is None:
    raise SystemExit("ui-camp manifest entry missing")
modules.insert(idx + 1, {
    "id": "ui-camp-shell-policy",
    "path": "js/ui/camp-shell.js",
    "domain": "ui/camp-app-shell-lifecycle-meta-and-hud-policy",
    "status": "extracted",
    "requires": ["ui-camp"],
    "provides": []
})
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")

# ---------------------------------------------------------------------------
# Drain historical wrapper ladders from the compatibility composition root.
# ---------------------------------------------------------------------------
source = MONOLITH.read_text(encoding="utf-8")
retired = [
'''  const updateHUDV15=updateHUD;updateHUD=function(){recordVitals();updateHUDV15();const avatar=$("heroAvatar");if(player.classId==="ranger"){avatar.classList.add("ranger-portrait");avatar.innerHTML=rangerPortraitSVG();}else{avatar.classList.remove("ranger-portrait");avatar.textContent=CLASSES[player.classId]?.icon||"🎲";}checkDynamicClassUnlocks();};
''',
'''  const openStartScreenV15=openStartScreen;openStartScreen=function(){runTalentSnapshot=null;openStartScreenV15();};
''',
'''  const updateHUDBase=updateHUD;
  updateHUD=function(){updateHUDBase();const cls=CLASSES[player.classId]||CLASSES.ranger;applyClassPortrait($("heroAvatar"),cls.id,false);applyClassPortrait($("combatPlayerIcon"),cls.id,true);applyClassBoardMarker($("pawn"),cls.id);if(boardLevel===5){$("guardianText").textContent=player.position<currentMinibossTile()-1?`Miniboss · tile ${currentMinibossTile()}`:`Ring Tyrant · tile ${currentTileCount()}`;}if(hellMode&&$("floorText"))$("floorText").textContent=`Board ${boardLevel} · Hell Mode · ${player.position+1} / ${currentTileCount()}`;};
''',
'''  const openStartScreenBase=openStartScreen;openStartScreen=function(){openStartScreenBase();ensureHellToggle();};
''',
'''  const updateHUDV16Base=updateHUD;updateHUD=function(){updateHUDV16Base();const d=$("defenseText");if(d){const pct=Math.round(defenseDamageReduction(player.defense)*100);d.classList.add("defense-tooltip");d.title=`${Math.round(player.defense)} Defense currently reduces ordinary incoming damage by about ${pct}%. Defense has diminishing returns; guardian specials receive only part of this reduction.`;const box=d.closest(".stat");if(box)box.title=d.title;}checkDynamicClassUnlocks();};
''',
'''  const updateHUDV18Base=updateHUD;
  updateHUD=function(){
    dbClasses.syncBloodmageHpPassive(false);v18SyncOuroborosAttack();updateHUDV18Base();
    v18ApplyStatTooltip("potionText",v18PotionTooltip());v18ApplyStatTooltip("defenseText",v18DefenseTooltip());v18ApplyStatTooltip("echoText",v18EchoTooltip());
  };
''',
'''  const updateHUDV19Base=updateHUD;
  updateHUD=function(){updateHUDV19Base();v19EnsureDoubleDiceButton();const b=$("roll2Btn");if(b){b.style.display=meta.doubleDiceUnlocked?"block":"none";b.disabled=rollLocked||!gameStarted;}const one=$("rollBtn");if(one)one.textContent=meta.doubleDiceUnlocked?"🎲 Roll 1d6":"🎲 Roll the dice";};
''',
'''  const updateHUDV19RoadBase=updateHUD;
  updateHUD=function(){updateHUDV19RoadBase();if(boardLevel===6&&gameStarted){const count=currentTileCount(),mini=currentMinibossTile();$("floorText").textContent=`Board 6 · ${player.position+1} / ${count}`;$("guardianText").textContent=player.position<mini-1?`Abyssal Custodian · tile ${mini}`:`The Last Equation · tile ${count}`;}};
''',
'''  const updateHUDV20GuardianBase=updateHUD;
  updateHUD=function(){updateHUDV20GuardianBase();if(!gameStarted)return;const guardian=DB317_GUARDIANS.resolveFinal(boardLevel),count=currentTileCount(),mini=currentMinibossTile();if(guardian&&player.position>=mini-1)$("guardianText").textContent=`${guardian.name} · tile ${count}`;};
''',
'''  const openStartScreenV110Base=openStartScreen;
  openStartScreen=function(){const result=openStartScreenV110Base();v110EnsureCampScene();v110UpdateCampScene();return result;};
  const updateMetaUIV110Base=updateMetaUI;
  updateMetaUI=function(){const result=updateMetaUIV110Base();v110EnsureCampScene();v110UpdateCampScene();return result;};
''',
'''  const updateMetaUIV22Base=updateMetaUI;
  updateMetaUI=function(){const result=updateMetaUIV22Base();v22UpdateCamp();return result;};
  const openStartScreenV22Base=openStartScreen;
  openStartScreen=function(){const result=openStartScreenV22Base();v22UpdateCamp();return result;};
''',
'''  const updateHUDV22Base=updateHUD;
  updateHUD=function(){updateHUDV22Base();v19EnsureDoubleDiceButton();};
''',
'''  const updateHUDV24Base=updateHUD;updateHUD=function(){updateHUDV24Base();v24UpdateShieldBars();};
''',
'''  const updateMetaUIV24CampBase=updateMetaUI;updateMetaUI=function(){updateMetaUIV24CampBase();v24RefreshCamp();};const openStartScreenV24CampBase=openStartScreen;openStartScreen=function(){const r=openStartScreenV24CampBase();v24RefreshCamp();return r;};
''',
'''  const updateHUDV26PoisonBase=updateHUD;updateHUD=function(){if(classIdentityActive('ouroboros'))v18SyncOuroborosAttack();const r=updateHUDV26PoisonBase();v26EnsurePoisonStat();const t=$('poisonChanceText'),box=$('poisonChanceStat');if(t)t.textContent=`${Math.round((player.poisonOnHitChance||0)*100)}%`;if(box)box.dataset.tip=`${Math.round((player.poisonOnHitChance||0)*100)}% Poison Chance per eligible strike. Chance above 100% guarantees stacks and rolls the overflow for extra stacks. One Poison stack currently deals ${v26PoisonStackDamage()} damage each Poison tick before affinity modifiers.`;return r;};
''',
'''  const updateHUDV266GoldGainBase=updateHUD;updateHUD=function(){const result=updateHUDV266GoldGainBase();v266SyncGoldGainStat();return result;};
''',
'''  const updateHUDV27OuroBase=updateHUD;updateHUD=function(){v27SyncOuroborosEconomy();const r=updateHUDV27OuroBase();if(classIdentityActive('ouroboros')&&$('attackText'))$('attackText').textContent='10';return r;};
''',
'''  const dbRunUpdateHudBase=updateHUD;updateHUD=function(...args){const result=dbRunUpdateHudBase.apply(this,args);dbRunScheduleCheckpoint();return result;};
  const dbRunOpenStartBase=openStartScreen;openStartScreen=function(...args){dbRunClearCheckpoint();const result=dbRunOpenStartBase.apply(this,args);dbRunRefreshControls();return result;};
''',
'''  const db0633OpenStartScreenBase=openStartScreen;
  openStartScreen=function(...args){const result=db0633OpenStartScreenBase.apply(this,args);db0633SyncCampObjects();return result;};
  const db0633UpdateMetaUIBase=updateMetaUI;
  updateMetaUI=function(...args){const result=db0633UpdateMetaUIBase.apply(this,args);db0633RefreshCampProgression();return result;};
''',
'''  const db064FriendsUpdateMetaUiBase=updateMetaUI;
  updateMetaUI=function(...args){const result=db064FriendsUpdateMetaUiBase.apply(this,args);db064Camp.scheduleHitTargetSync();return result;};
''',
'''  const dbFriendUpdateMetaUiBase=updateMetaUI;
  updateMetaUI=function(...args){const result=dbFriendUpdateMetaUiBase.apply(this,args);db059RefreshActivePetArt?.();return result;};
''',
'''  const dbFriendOpenStartScreenBase=openStartScreen;
  openStartScreen=function(...args){const result=dbFriendOpenStartScreenBase.apply(this,args);dbClasses.invokerResetCombat();dbFriendHealAtCamp();dbFriendClearCombatPresentation();db059RefreshActivePetArt?.();return result;};
'''
]
for index, old in enumerate(retired, 1):
    source = replace_once(source, old, "", f"retired Camp shell wrapper {index}")

marker = "\n\n  // Test-only characterization surface for the Camp / App Shell convergence."
composition = r'''

  /* BETA 0.6.6.36 — Camp / App-Shell public-owner convergence.
     The focused policy owner preserves the released wrapper ordering while the
     compatibility root supplies domain collaborators. No peer HUD global is
     introduced: DiceboundCamp remains the one ordinary shell boundary. */
  db064Camp.configureShell({
    clearCheckpoint:()=>dbRunClearCheckpoint(),
    clearRunTalentSnapshot:()=>{runTalentSnapshot=null;},
    ensureHellToggle:()=>ensureHellToggle(),
    ensureCampScene:()=>v110EnsureCampScene(),
    refreshCampV110:()=>v110UpdateCampScene(),
    refreshCampV22:()=>v22UpdateCamp(),
    refreshCampV24:()=>v24RefreshCamp(),
    refreshRunControls:()=>dbRunRefreshControls(),
    syncCampProgressionObjects:()=>db0633SyncCampObjects(),
    resetInvokerCombat:()=>dbClasses.invokerResetCombat(),
    healAtCamp:()=>dbFriendHealAtCamp(),
    clearCombatPresentation:()=>dbFriendClearCombatPresentation(),
    refreshActivePetArt:()=>db059RefreshActivePetArt?.(),
    refreshCampProgression:()=>db0633RefreshCampProgression(),
    scheduleCampHitTargetSync:()=>db064Camp.scheduleHitTargetSync(),
    syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),
    isOuroboros:()=>classIdentityActive('ouroboros'),
    syncOuroborosAttack:()=>v18SyncOuroborosAttack(),
    syncBloodmageHpPassive:initial=>dbClasses.syncBloodmageHpPassive(initial),
    recordVitals:()=>recordVitals(),
    refreshLegacyHeroAvatar:()=>{const avatar=$("heroAvatar");if(player.classId==="ranger"){avatar.classList.add("ranger-portrait");avatar.innerHTML=rangerPortraitSVG();}else{avatar.classList.remove("ranger-portrait");avatar.textContent=CLASSES[player.classId]?.icon||"🎲";}},
    checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks(),
    refreshClassHudAndRoadLabels:()=>{const cls=CLASSES[player.classId]||CLASSES.ranger;applyClassPortrait($("heroAvatar"),cls.id,false);applyClassPortrait($("combatPlayerIcon"),cls.id,true);applyClassBoardMarker($("pawn"),cls.id);if(boardLevel===5){$("guardianText").textContent=player.position<currentMinibossTile()-1?`Miniboss · tile ${currentMinibossTile()}`:`Ring Tyrant · tile ${currentTileCount()}`;}if(hellMode&&$("floorText"))$("floorText").textContent=`Board ${boardLevel} · Hell Mode · ${player.position+1} / ${currentTileCount()}`;},
    refreshDefenseTooltip:()=>{const d=$("defenseText");if(d){const pct=Math.round(defenseDamageReduction(player.defense)*100);d.classList.add("defense-tooltip");d.title=`${Math.round(player.defense)} Defense currently reduces ordinary incoming damage by about ${pct}%. Defense has diminishing returns; guardian specials receive only part of this reduction.`;const box=d.closest(".stat");if(box)box.title=d.title;}},
    refreshStatTooltips:()=>{v18ApplyStatTooltip("potionText",v18PotionTooltip());v18ApplyStatTooltip("defenseText",v18DefenseTooltip());v18ApplyStatTooltip("echoText",v18EchoTooltip());},
    refreshDoubleDiceControls:()=>{v19EnsureDoubleDiceButton();const b=$("roll2Btn");if(b){b.style.display=meta.doubleDiceUnlocked?"block":"none";b.disabled=rollLocked||!gameStarted;}const one=$("rollBtn");if(one)one.textContent=meta.doubleDiceUnlocked?"🎲 Roll 1d6":"🎲 Roll the dice";},
    refreshBoard6RoadLabels:()=>{if(boardLevel===6&&gameStarted){const count=currentTileCount(),mini=currentMinibossTile();$("floorText").textContent=`Board 6 · ${player.position+1} / ${count}`;$("guardianText").textContent=player.position<mini-1?`Abyssal Custodian · tile ${mini}`:`The Last Equation · tile ${count}`;}},
    refreshFinalGuardianLabel:()=>{if(!gameStarted)return;const guardian=DB317_GUARDIANS.resolveFinal(boardLevel),count=currentTileCount(),mini=currentMinibossTile();if(guardian&&player.position>=mini-1)$("guardianText").textContent=`${guardian.name} · tile ${count}`;},
    ensureDoubleDiceButton:()=>v19EnsureDoubleDiceButton(),
    refreshShieldBars:()=>v24UpdateShieldBars(),
    refreshPoisonStat:()=>{v26EnsurePoisonStat();const t=$('poisonChanceText'),box=$('poisonChanceStat');if(t)t.textContent=`${Math.round((player.poisonOnHitChance||0)*100)}%`;if(box)box.dataset.tip=`${Math.round((player.poisonOnHitChance||0)*100)}% Poison Chance per eligible strike. Chance above 100% guarantees stacks and rolls the overflow for extra stacks. One Poison stack currently deals ${v26PoisonStackDamage()} damage each Poison tick before affinity modifiers.`;},
    syncGoldGainStat:()=>v266SyncGoldGainStat(),
    forceOuroborosAttackLabel:()=>{if($('attackText'))$('attackText').textContent='10';},
    scheduleRunCheckpoint:()=>dbRunScheduleCheckpoint()
  });
  const dbCampOpenStartCore=openStartScreen;
  openStartScreen=function(...args){return db064Camp.enterShell(dbCampOpenStartCore,this,args);};
  const dbCampMetaUiCore=updateMetaUI;
  updateMetaUI=function(...args){return db064Camp.refreshMetaShell(dbCampMetaUiCore,this,args);};
  const dbCampHudCore=updateHUD;
  updateHUD=function(...args){return db064Camp.refreshHudShell(dbCampHudCore,this,args);};
'''
source = replace_once(source, marker, composition + marker, "Camp shell final composition")
MONOLITH.write_text(source, encoding="utf-8", newline="\n")

# ---------------------------------------------------------------------------
# Permanent ownership/order/anti-shadow test.
# ---------------------------------------------------------------------------
TEST.write_text(r'''#!/usr/bin/env node
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
  const names=['clearCheckpoint','clearRunTalentSnapshot','ensureHellToggle','ensureCampScene','refreshCampV110','refreshCampV22','refreshCampV24','refreshRunControls','syncCampProgressionObjects','resetInvokerCombat','healAtCamp','clearCombatPresentation','refreshActivePetArt','refreshCampProgression','scheduleCampHitTargetSync','syncOuroborosEconomy','syncOuroborosAttack','syncBloodmageHpPassive','recordVitals','refreshLegacyHeroAvatar','checkDynamicClassUnlocks','refreshClassHudAndRoadLabels','refreshDefenseTooltip','refreshStatTooltips','refreshDoubleDiceControls','refreshBoard6RoadLabels','refreshFinalGuardianLabel','ensureDoubleDiceButton','refreshShieldBars','refreshPoisonStat','syncGoldGainStat','forceOuroborosAttackLabel','scheduleRunCheckpoint'];
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
assert.deepEqual(trace,['syncOuroborosEconomy','syncOuroborosAttack','syncBloodmageHpPassive:false','syncOuroborosAttack','recordVitals','base-hud','refreshLegacyHeroAvatar','checkDynamicClassUnlocks','refreshClassHudAndRoadLabels','refreshDefenseTooltip','checkDynamicClassUnlocks','refreshStatTooltips','refreshDoubleDiceControls','refreshBoard6RoadLabels','refreshFinalGuardianLabel','ensureDoubleDiceButton','refreshShieldBars','refreshPoisonStat','syncGoldGainStat','forceOuroborosAttackLabel','scheduleRunCheckpoint']);

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
assert.match(campSource,/_installShell:installShell/,'Camp facade must own the focused shell installer');

console.log('Camp/App-Shell owner PASS: entry, meta and HUD orchestration converge behind DiceboundCamp with exact ordering and no shadow ladder');
''', encoding="utf-8", newline="\n")

print("Camp/App-Shell owner convergence materialized")
