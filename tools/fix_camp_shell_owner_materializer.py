from pathlib import Path

path=Path(__file__).with_name('materialize_camp_shell_owner.py')
text=path.read_text(encoding='utf-8')
old='''for index, old in enumerate(retired, 1):
    source = replace_once(source, old, "", f"retired Camp shell wrapper {index}")
'''
if text.count(old)!=1:
    raise SystemExit(f'Camp shell retired-loop patch expected once, found {text.count(old)}')

registrations=[
'''  window.DiceboundCamp.configureShell({recordVitals:()=>recordVitals(),refreshLegacyHeroAvatar:()=>{const avatar=$("heroAvatar");if(player.classId==="ranger"){avatar.classList.add("ranger-portrait");avatar.innerHTML=rangerPortraitSVG();}else{avatar.classList.remove("ranger-portrait");avatar.textContent=CLASSES[player.classId]?.icon||"🎲";}},checkDynamicClassUnlocks:()=>checkDynamicClassUnlocks()});\n''',
'''  window.DiceboundCamp.configureShell({clearRunTalentSnapshot:()=>{runTalentSnapshot=null;}});\n''',
'''  window.DiceboundCamp.configureShell({refreshClassHudAndRoadLabels:()=>{const cls=CLASSES[player.classId]||CLASSES.ranger;applyClassPortrait($("heroAvatar"),cls.id,false);applyClassPortrait($("combatPlayerIcon"),cls.id,true);applyClassBoardMarker($("pawn"),cls.id);if(boardLevel===5){$("guardianText").textContent=player.position<currentMinibossTile()-1?`Miniboss · tile ${currentMinibossTile()}`:`Ring Tyrant · tile ${currentTileCount()}`;}if(hellMode&&$("floorText"))$("floorText").textContent=`Board ${boardLevel} · Hell Mode · ${player.position+1} / ${currentTileCount()}`;}});\n''',
'''  window.DiceboundCamp.configureShell({ensureHellToggle:()=>ensureHellToggle()});\n''',
'''  window.DiceboundCamp.configureShell({refreshDefenseTooltip:()=>{const d=$("defenseText");if(d){const pct=Math.round(defenseDamageReduction(player.defense)*100);d.classList.add("defense-tooltip");d.title=`${Math.round(player.defense)} Defense currently reduces ordinary incoming damage by about ${pct}%. Defense has diminishing returns; guardian specials receive only part of this reduction.`;const box=d.closest(".stat");if(box)box.title=d.title;}}});\n''',
'''  window.DiceboundCamp.configureShell({syncBloodmageHpPassive:initial=>dbClasses.syncBloodmageHpPassive(initial),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),refreshStatTooltips:()=>{v18ApplyStatTooltip("potionText",v18PotionTooltip());v18ApplyStatTooltip("defenseText",v18DefenseTooltip());v18ApplyStatTooltip("echoText",v18EchoTooltip());}});\n''',
'''  window.DiceboundCamp.configureShell({refreshDoubleDiceControls:()=>{v19EnsureDoubleDiceButton();const b=$("roll2Btn");if(b){b.style.display=meta.doubleDiceUnlocked?"block":"none";b.disabled=rollLocked||!gameStarted;}const one=$("rollBtn");if(one)one.textContent=meta.doubleDiceUnlocked?"🎲 Roll 1d6":"🎲 Roll the dice";}});\n''',
'''  window.DiceboundCamp.configureShell({refreshBoard6RoadLabels:()=>{if(boardLevel===6&&gameStarted){const count=currentTileCount(),mini=currentMinibossTile();$("floorText").textContent=`Board 6 · ${player.position+1} / ${count}`;$("guardianText").textContent=player.position<mini-1?`Abyssal Custodian · tile ${mini}`:`The Last Equation · tile ${count}`;}}});\n''',
'''  window.DiceboundCamp.configureShell({refreshFinalGuardianLabel:()=>{if(!gameStarted)return;const guardian=DB317_GUARDIANS.resolveFinal(boardLevel),count=currentTileCount(),mini=currentMinibossTile();if(guardian&&player.position>=mini-1)$("guardianText").textContent=`${guardian.name} · tile ${count}`;}});\n''',
'''  window.DiceboundCamp.configureShell({ensureCampScene:()=>v110EnsureCampScene(),refreshCampV110:()=>v110UpdateCampScene()});\n''',
'''  window.DiceboundCamp.configureShell({refreshCampV22:()=>v22UpdateCamp()});\n''',
'''  window.DiceboundCamp.configureShell({ensureDoubleDiceButton:()=>v19EnsureDoubleDiceButton()});\n''',
'''  window.DiceboundCamp.configureShell({refreshShieldBars:()=>v24UpdateShieldBars()});\n''',
'''  window.DiceboundCamp.configureShell({refreshCampV24:()=>v24RefreshCamp()});\n''',
'''  window.DiceboundCamp.configureShell({isOuroboros:()=>classIdentityActive('ouroboros'),refreshPoisonStat:()=>{v26EnsurePoisonStat();const t=$('poisonChanceText'),box=$('poisonChanceStat');if(t)t.textContent=`${Math.round((player.poisonOnHitChance||0)*100)}%`;if(box)box.dataset.tip=`${Math.round((player.poisonOnHitChance||0)*100)}% Poison Chance per eligible strike. Chance above 100% guarantees stacks and rolls the overflow for extra stacks. One Poison stack currently deals ${v26PoisonStackDamage()} damage each Poison tick before affinity modifiers.`;}});\n''',
'''  window.DiceboundCamp.configureShell({syncGoldGainStat:()=>v266SyncGoldGainStat()});\n''',
'''  window.DiceboundCamp.configureShell({syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),forceOuroborosAttackLabel:()=>{if($('attackText'))$('attackText').textContent='10';}});\n''',
'''  window.DiceboundCamp.configureShell({scheduleRunCheckpoint:()=>dbRunScheduleCheckpoint(),clearCheckpoint:()=>dbRunClearCheckpoint(),refreshRunControls:()=>dbRunRefreshControls()});\n''',
'''  window.DiceboundCamp.configureShell({syncCampProgressionObjects:()=>db0633SyncCampObjects(),refreshCampProgression:()=>db0633RefreshCampProgression()});\n''',
'''  window.DiceboundCamp.configureShell({scheduleCampHitTargetSync:()=>db064Camp.scheduleHitTargetSync()});\n''',
'''  window.DiceboundCamp.configureShell({refreshActivePetArt:()=>db059RefreshActivePetArt?.()});\n''',
'''  window.DiceboundCamp.configureShell({resetInvokerCombat:()=>dbClasses.invokerResetCombat(),healAtCamp:()=>dbFriendHealAtCamp(),clearCombatPresentation:()=>dbFriendClearCombatPresentation()});\n'''
]
replacement='registrations = [\n'+''.join(f'    {snippet!r},\n' for snippet in registrations)+''']
if len(registrations) != len(retired):
    raise SystemExit(f"Camp shell registration count mismatch: {len(registrations)} vs {len(retired)}")
for index, (old, registration) in enumerate(zip(retired, registrations), 1):
    source = replace_once(source, old, registration, f"retired Camp shell wrapper {index}")
'''
text=text.replace(old,replacement,1)

start=text.find("  db064Camp.configureShell({", text.find("composition = r'''"))
end=text.find("  const dbCampOpenStartCore=openStartScreen;", start)
if start<0 or end<0:
    raise SystemExit('Camp shell final composition config block not found')
text=text[:start]+"  db064Camp.configureShell({});\n"+text[end:]

manifest_write='MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8", newline="\\n")'
if text.count(manifest_write)!=1:
    raise SystemExit(f'Camp shell manifest write expected once, found {text.count(manifest_write)}')
manifest_load_order='''load_order = manifest["loadOrder"]
if "ui-camp-shell-policy" in load_order:
    raise SystemExit("ui-camp-shell-policy already exists in loadOrder")
load_idx = load_order.index("ui-camp")
load_order.insert(load_idx + 1, "ui-camp-shell-policy")
'''
text=text.replace(manifest_write,manifest_load_order+manifest_write,1)

path.write_text(text,encoding='utf-8',newline='\n')
print('Camp shell materializer patched for lexical collaborator registration and manifest load order')
# Permanent Run checkpoint ownership assertions live in tools/test_run_checkpoint.js.
