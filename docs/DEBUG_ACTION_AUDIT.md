# Exact released debugAction generation audit

Found **10** generations in source order.

## 1. `BASE`

```js
function debugAction(action){if(action==="runxp"&&gameStarted)grantXp(250);if(action==="level"&&gameStarted)forceLevels(5);if(action==="legacy"){for(let i=0;i<5;i++){meta.level++;meta.points++;}meta.xpNext=legacyXpForLevel(meta.level);saveMeta();}if(action==="talents"){meta.points+=25;saveMeta();}if(action==="gold"&&gameStarted)player.gold+=5000;if(action==="cookies"){meta.petCookies+=25;saveMeta();}if(action==="heal"&&gameStarted){player.hp=player.maxHp;player.ultimateCharge=100;}if(action==="unlock"){Object.keys(CLASSES).forEach(k=>meta.unlocks[k]=true);Object.keys(meta.pets).forEach(k=>meta.pets[k].unlocked=true);saveMeta();renderClassChoices();}if(action==="mythic"&&gameStarted){equipItem(generateMythicalWeapon(),true);equipItem(generateMythicalBoots(),true);equipItem(generateMythicalPants(),true);equipItem(generateMythicalAmulet(),true);equipItem(generateMythicalHat(),true);}if(action==="dibo50"){meta.pets.neutral.level=30;saveMeta();checkDynamicClassUnlocks();}if(action==="nightmare"){meta.nightmareUnlocked=true;saveMeta();renderClassChoices();}if(/^board[234]$/.test(action)&&gameStarted){boardLevel=Number(action.slice(-1));player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");}if(action==="boss"&&gameStarted){$("debugOverlay").classList.add("hidden");player.position=currentTileCount()-1;refreshBoardHighlights();placePawn(false);rollLocked=true;dbRun.dispatchTile();}updateMetaUI();if(gameStarted)updateHUD();showToast(`Debug: ${action}`);}
```

## 2. `debugActionV11`

```js
const debugActionV11=debugAction;debugAction=function(action){if(action==="alwayschoose"){meta.debugAlwaysChooseRolls=!meta.debugAlwaysChooseRolls;saveMeta();refreshDebugButtons();showToast(`Always choose rolls ${meta.debugAlwaysChooseRolls?"enabled":"disabled"}`);return;}if(action==="board5"&&gameStarted){boardLevel=5;player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");updateHUD();showToast("Debug: board5");return;}if(action==="mythicring"&&gameStarted){equipItem(generateMythicalRing(),true);updateHUD();showToast("Artifact Ring added");return;}if(action==="omega_merchant"&&gameStarted){equipItem(generateMerchantWeapon(),true);updateHUD();showToast("The Final Price added");return;}if(action==="omega_stone"&&gameStarted){equipItem(generatePhilosophersStone(),true);updateHUD();showToast("Philosopher's Stone added");return;}return debugActionV11(action);}
```

## 3. `debugActionV15Patch`

```js
const debugActionV15Patch=debugAction;
  debugAction=function(action){const mythics={mythic_weapon:generateMythicalWeapon,mythic_boots:generateMythicalBoots,mythic_legs:generateMythicalPants,mythic_amulet:generateMythicalAmulet,mythic_hat:generateMythicalHat,mythic_ring:generateMythicalRing};if(mythics[action]){if(!gameStarted){showToast("Start a run first");return;}equipItem(mythics[action](),true);updateHUD();showToast(`${action.replace("mythic_","")} Mythic added`);return;}if(action==="seed_item"){if(!gameStarted){showToast("Start a run first");return;}const code=dbRuntime.platform.prompt("Paste a Dicebound v1.5 item seed code (starts with D15|):","");if(code==null)return;const item=v15GenerateEquipmentFromSeedCode(code);if(!item){dbRuntime.platform.alert("That seed code is not a valid Dicebound v1.5 ordinary-item seed.");return;}$("debugOverlay").classList.add("hidden");openLoot(item,()=>{});return;}return debugActionV15Patch(action);}
```

## 4. `debugActionV19Base`

```js
const debugActionV19Base=debugAction;
  debugAction=function(action){if(action==="mythic_offhand"){if(!gameStarted){showToast("Start a run first");return;}equipItem(generateMythicalOffhand(),true);updateHUD();showToast("Artifact offhand added");return;}if(action==="board6"&&gameStarted){boardLevel=6;player.position=0;applyRunTheme();generateBoard();buildBoard();rollLocked=false;$("debugOverlay").classList.add("hidden");updateHUD();showToast("Debug: board6");return;}if(action==="double_dice"){meta.doubleDiceUnlocked=true;saveMeta();updateHUD();showToast("Double Dice unlocked");return;}return debugActionV19Base(action);}
```

## 5. `debugActionV110Base`

```js
const debugActionV110Base=debugAction;
  debugAction=function(action){
    const result=debugActionV110Base(action);
    if(action==="mythic"&&gameStarted){[generateMythicalRing,generateMythicalOffhand].forEach(fn=>equipItem(fn(),true));renderEquipment();updateHUD();showToast("Full seven-piece Impossible Road set equipped");}
    if(action==="omega_stone"&&gameStarted){renderEquipment();updateHUD();}
    return result;
  }
```

## 6. `debugActionV21Base`

```js
const debugActionV21Base=debugAction;
  debugAction=function(action){if(action==='all_powerups'){if(!gameStarted){showToast('Start a run first');return;}$('debugOverlay').classList.add('hidden');showAllEligiblePowerupSelection('Debug · Full Eligible Powerup List',()=>{});return;}return debugActionV21Base(action);}
```

## 7. `debugActionV22Base`

```js
const debugActionV22Base=debugAction;
  debugAction=function(action){
    if(action==='unlockclasses'){meta.unlocks=meta.unlocks||{};Object.keys(CLASSES).forEach(id=>meta.unlocks[id]=true);saveMeta();renderClassChoices();showToast('Debug: all classes unlocked');return;}
    if(action==='unlockpets'){meta.pets=meta.pets||defaultPets();Object.keys(PETS).forEach(id=>{meta.pets[id]=meta.pets[id]||defaultPetState(false);meta.pets[id].unlocked=true;});ELEMENT_KEYS.forEach(k=>meta.elementProgress[k]=Math.max(meta.elementProgress[k]||0,PET_UNLOCK_REQUIREMENT));saveMeta();renderPetCollection();updateMetaUI();showToast('Debug: all pets unlocked');return;}
    return debugActionV22Base(action);
  }
```

## 8. `debugActionV25Base`

```js
const debugActionV25Base=debugAction;debugAction=function(action){
    v25Log('events','debug',`debugAction(${action})`,v25State());
    if(['legend_mug_v25','legend_headphones_v25','legend_jacket_v25','omega_horns_v25'].includes(action)){if(!gameStarted){showToast('Start a run first');return;}const item=action==='legend_mug_v25'?generateAxelsCoffeeMug():action==='legend_headphones_v25'?generateKratzHeadphones():action==='legend_jacket_v25'?generateKellysJeanJacket():generateDevilsHorns();equipItem(item,true);renderEquipment();updateHUD();showToast(`${item.name} added`);return;}
    if(action==='recover_road_v25'){v25RecoverRoadState('manual');return;}
    return debugActionV25Base(action);
  }
```

## 9. `debugActionV26Base`

```js
const debugActionV26Base=debugAction;debugAction=function(action){if(action==='kill_character_v26'){if(!gameStarted){showToast('Start a run first');return;}$('debugOverlay')?.classList.add('hidden');const damage=Math.max(1,Math.ceil(player.hp+player.maxHp));meta.damageTaken=(meta.damageTaken||0)+damage;player.hp=0;addLog('<b>Debug monster</b> deals lethal damage. Running the normal death/revive pipeline.');showToast('☠️ Debug monster attacks');handlePlayerDeath();updateHUD();return;}const artifactFns={mythic_weapon:generateMythicalWeapon,mythic_offhand:generateMythicalOffhand,mythic_boots:generateMythicalBoots,mythic_legs:generateMythicalPants,mythic_amulet:generateMythicalAmulet,mythic_hat:generateMythicalHat,mythic_ring:generateMythicalRing};if(artifactFns[action]){if(!gameStarted){showToast('Start a run first');return;}const item=artifactFns[action]();equipItem(item,true);renderEquipment();updateHUD();showToast(`Artifact ${SLOT_LABELS[item.slot]} added`);return;}if(action==='mythic'){if(!gameStarted){showToast('Start a run first');return;}[generateMythicalWeapon,generateMythicalOffhand,generateMythicalBoots,generateMythicalPants,generateMythicalAmulet,generateMythicalHat,generateMythicalRing].forEach(fn=>equipItem(fn(),true));renderEquipment();updateHUD();showToast('Full current seven-piece Artifact set equipped');return;}return debugActionV26Base(action);}
```

## 10. `debugActionBeta04Base`

```js
const debugActionBeta04Base=debugAction;
  debugAction=function(action){
    if(action==='unlock_hell'){
      meta.nightmareUnlocked=true;meta.hellUnlocked=true;saveMeta();
      try{renderClassChoices();}catch(_){}
      showToast('🔥 Hell Mode unlocked (debug)');
      return;
    }
    return debugActionBeta04Base(action);
  }
```
