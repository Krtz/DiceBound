from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
for adapter in ['renderInfo', 'renderLifetimeStats', 'activateInfoTab', 'openInfo']:
    assert len(re.findall(rf'function\s+{re.escape(adapter)}\s*\(', mono)) == 1, f'{adapter} must have one stable Info/Guide adapter'
    assert not re.search(rf'(?m)^\s*{re.escape(adapter)}\s*=', mono), f'{adapter} reassignment chain returned'
assert 'let dbInfoGuide=null;' in mono
assert 'openInfoV15' not in mono
assert 'if(!meta.infoSeen)setTimeout(()=>activateInfoTab("guide"),250);' in mono
for retired_transfer in ['function exportSave(', 'function importSave(', 'exportSave=dbInfoExportSave;', 'importSave=dbInfoImportSave;']:
    assert retired_transfer not in mono, f'retired Info save-transfer implementation returned: {retired_transfer}'
for name in [
    'renderInfoBase','renderInfoV13','renderInfoV14Base','renderInfoV15Patch','renderInfoV16Base','renderInfoV18Base','renderInfoV19Base','renderInfoV24Base','renderInfoV24PresentationBase','renderInfoV27Base',
    'buildAISim','DiceboundAITest','buildCareerHarness','DiceboundCareerTestLegacy','buildDiceboundHumanHarness235','DiceboundCareerTest','v235HumanHarness','DB235','DiceboundModules','v235ScaleEnemyBase','v235UpdateMetaBase','feedActivePetV26Base','v24MigratePrestigeHeirloomPurchases','prestigeHeirloomPurchasesMigrated','legacy_storage',
    'v235TabHints','v24TabHints','v24Brand','v24BrandSub','v25Brand','v25BrandSub'
]:
    assert not re.search(rf'(?<![\w$]){re.escape(name)}(?![\w$])',mono),name
enemy_scaling=(root/'runtime/js/combat/enemy-scaling-resolution.js').read_text(encoding='utf-8')
assert 'window.DiceboundEnemyScalingResolution=Object.freeze({apiVersion:1,configure});' in enemy_scaling, 'Enemy scaling authoritative owner missing'
assert 'if(boardLevel===6){const balance=db317Board(6).balance;' in enemy_scaling, 'Board 6 scaling must survive in the extracted owner'
assert mono.count('function scaleEnemy(') == 1, 'scaleEnemy must have exactly one thin compatibility adapter'
assert not re.search(r'(?<![\w$])scaleEnemy\s*=\s*function',mono), 'scaleEnemy reassignment chain returned'
assert 'return dbCombat.scaleEnemy(...args);' in mono, 'scaleEnemy thin adapter must delegate through Combat'
presentation_retired = [
    'updateCombatUIBase','updateCombatUIV12','updateCombatUIV13','updateCombatUIV15Patch','updateCombatUIV16Base',
    'updateCombatUIV17Base','updateCombatUIV17SmokeBase','updateCombatUIV18Base','updateCombatUIV19Base','updateCombatUIV24Base',
    'updateCombatUIV25BurnBase','updateCombatUIV27EnemyBase','updateCombatUIV28SmokeBase','updateCombatUIV28RougeBase',
    'updateCombatUIBeta04Base','db0511UpdateCombatUIBase','db060UpdateCombatUIBase','dbFriendUpdateCombatUiBase',
    'renderEnemyPartyV17Base','db0636RenderEnemyPartyBase','updateBossSpecialIndicatorV24Base',
    'setResourceUI','hideResourceUI','v17RenderSummonerSpirits','v17CompactPoisonMarkers','v24EnsureShieldBars',
]
for symbol in presentation_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired combat presentation owner returned: {symbol}"
assert mono.count('function updateCombatUI(') == 1, 'updateCombatUI must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*updateCombatUI\s*=', mono), 'updateCombatUI reassignment chain must not return'
assert mono.count('function renderEnemyParty(') == 0, 'call-only renderEnemyParty adapter must stay retired'
assert not re.search(r'(?m)^\s*renderEnemyParty\s*=', mono), 'renderEnemyParty reassignment chain must not return'
assert 'dbCombatView.renderEnemyParty(' in mono, 'enemy-party callers no longer route through Combat View'
assert "dbCombatView.configurePresentation({" in mono, 'combat presentation must be configured through Combat View'
assert not re.search(r"(?<![\w$])dbCombatPresentation(?![\w$])", mono), 'peer-public Combat Presentation variable returned'
assert not re.search(r"(?<![\w$])dbCombatVfx(?![\w$])", mono), 'peer-public Combat VFX variable returned'

encounter_retired = [
    'startCombatV13','startCombatV15Patch','startCombatV16Base','startCombatV17Base','startCombatV18Base','startCombatV19Base','startCombatV19SetBase',
    'startCombatV24Base','startCombatV25DevilBase','startCombatV26StoneBase','startCombatV27DifficultyBase','db0511StartCombatBase','db060StartCombatBase',
    'db0635StartCombatBase','db064StartCombatBase','dbFriendStartCombatBase',
]
for symbol in encounter_retired:
    assert symbol not in mono, f"retired encounter-lifecycle owner returned to compatibility monolith: {symbol}"
assert mono.count('function startCombat(') == 1, 'startCombat must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*startCombat\s*=', mono), 'startCombat reassignment chain must not return'
assert "return dbCombat.startEncounter(kind);" in mono, 'Combat facade encounter adapter is missing'
assert "dbCombatEncounterLifecycle=dbCombatEncounterOwner.configure({" in mono, 'encounter lifecycle owner is not configured by the composition root'

combat_turn_retired = [
    "v24ApplyDamage", "v24ResolveNormalHits", "v24AttackPattern", "beta03TickEnemyBurns",
    "db0511TickPlayerElementStatuses", "db064ResolveWolfEchoes",
    "enemyTurnV11", "enemyTurnV25DevilBase", "db0511EnemyTurnBase", "db060EnemyTurnBase", "db064EnemyTurnBase", "dbFriendEnemyTurnBase",
    "resolveEnemyResponseV15", "resolveEnemyResponseV19Base", "resolveEnemyResponseV24Base", "resolveEnemyResponseBeta045Base",
    "db046ResolveEnemyBase", "db047ResolveEnemyBase", "db0511ResolveEnemyResponseBase",
]
for symbol in combat_turn_retired:
    assert symbol not in mono, f"retired combat turn owner returned to compatibility monolith: {symbol}"
assert mono.count("async function enemyTurn(") == 0, "retired enemyTurn compatibility adapter returned"
assert mono.count("async function resolveEnemyResponse(") == 1, "resolveEnemyResponse must have exactly one thin compatibility adapter"
assert "dbCombatTurns=dbCombatTurnOwner.configure({" in mono, "combat turn owner is not configured by the compatibility composition root"

strike_retired = [
    'strikeBaseDamageV13','strikeBaseDamageV15','strikeBaseDamageV26OuroBase','db060StrikeBaseDamageBase',
    'performStrikeV13','performStrikeV16Base','performStrikeV17Base','performStrikeV18Base','performStrikeV24Base','performStrikeV25PoisonBase',
    'performStrikeV26SpeedBase','performStrikeV27SpeedDodgeBase','performStrikeV28SmokeBase','performStrikeBeta04Base','db060PerformStrikeBase',
]
for symbol in strike_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired strike-resolution owner returned: {symbol}"
assert mono.count('function strikeBaseDamage(') == 0, 'retired strikeBaseDamage compatibility adapter returned'
assert mono.count('async function performStrike(') == 0, 'retired performStrike compatibility adapter returned'
assert not re.search(r'(?m)^\s*strikeBaseDamage\s*=\s*function', mono), 'strikeBaseDamage reassignment chain must not return'
assert not re.search(r'(?m)^\s*performStrike\s*=\s*async function', mono), 'performStrike reassignment chain must not return'
assert "dbCombatStrikes=dbCombatStrikeOwner.configure({" in mono, 'combat strike-resolution owner is not configured by the composition root'

ultimate_retired = [
    'useUltimateV11','useUltimateV13','useUltimateV15Patch','useUltimateV16Base','useUltimateV17Base','useUltimateV18Base',
    'useUltimateV25CroakBase','useUltimateV27SpeedBase','useUltimateV28Base','db060UseUltimateBase','dbFriendUltimateBase',
    'dbFriendDragonDive','rerollClownGagV16',
]
for symbol in ultimate_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Ultimate-resolution owner returned: {symbol}"
assert mono.count('async function useUltimate(') == 0, 'retired useUltimate compatibility adapter returned'
assert not re.search(r'(?m)^\s*useUltimate\s*=', mono), 'useUltimate reassignment chain must not return'
assert "dbCombatUltimateResolution=dbCombatUltimateOwner.configure({" in mono, 'combat Ultimate-resolution owner is not configured by the composition root'
assert 'dbCombat.ultimate(' in mono, 'Ultimate callers no longer route through the Combat facade'


guard_retired = [
    'identityGuardActionV17Base','identityGuardActionV18Base','identityGuardActionV19Base','identityGuardActionV19OffhandBase',
    'db060GuardActionBase','dbFriendGuardActionBase',
]
for symbol in guard_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Guard-resolution owner returned: {symbol}"
assert mono.count('async function guardAction(') == 0, 'retired guardAction compatibility adapter returned'
assert mono.count('async function identityGuardAction(') == 1, 'identityGuardAction must have exactly one thin traced compatibility adapter'
assert not re.search(r'(?m)^  guardAction\s*=', mono), 'top-level guardAction reassignment chain must not return'
assert not re.search(r'(?m)^  identityGuardAction\s*=', mono), 'identityGuardAction reassignment chain must not return'
assert "dbCombatGuardResolution=dbCombatGuardOwner.configure({" in mono, 'combat Guard-resolution owner is not configured by the composition root'
assert 'dbCombat.guard(' in mono, 'Guard callers no longer route directly through the Combat facade'
assert "dbCombat.identityGuard" in mono, 'Combat facade identity Guard adapter is missing'


pet_retired = [
    'petTurnV13', 'petTurnV15Patch', 'petTurnV18Base', 'petTurnV19Base', 'db060PetTurnBase',
    'petDamageV13', 'petDamageV16Base', 'petDamageV17Base',
    'trainerPetDamageV16Base', 'trainerPetDamageV17Base',
]
for symbol in pet_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Pet-resolution owner returned: {symbol}"
assert mono.count('async function petTurn(') == 0, 'retired petTurn compatibility adapter returned'
assert mono.count('function petDamage(') == 1, 'petDamage must have exactly one thin compatibility adapter'
assert mono.count('function trainerPetDamage(') == 0, 'retired trainerPetDamage compatibility adapter returned'
assert not re.search(r'(?m)^  petTurn\s*=', mono), 'top-level petTurn reassignment chain must not return'
assert not re.search(r'(?m)^  petDamage\s*=', mono), 'top-level petDamage reassignment chain must not return'
assert not re.search(r'(?m)^  trainerPetDamage\s*=', mono), 'top-level trainerPetDamage reassignment chain must not return'
assert "dbCombatPetTurnResolution=dbCombatPetTurnOwner.configure({" in mono, 'combat Pet turn-resolution owner is not configured by the composition root'
assert 'dbCombat.petTurn(' in mono, 'Pet turn callers no longer route through the Combat facade'
assert "if(dbCombat)return dbCombat.petDamage();" in mono, 'Combat facade Pet damage adapter/fallback is missing'
assert 'trainerPetDamage:id=>dbCombat.trainerPetDamage(id)' in mono, 'Combat owner configuration no longer routes trainer Pet damage through the facade'

victory_retired = [
    'winCombatV15','winCombatV15Patch','winCombatV16Base','winCombatV19Base','v266ResolveLateFinalBase',
    'winCombatV24Base','winCombatV251Base','winCombatV26Base','db0511WinCombatBase','db060WinCombatBase','db0631WinCombatBase',
    'v19ResolveLateFinal',
]
for symbol in victory_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Victory-resolution owner returned: {symbol}"
assert mono.count('async function winCombat(') == 0, 'retired winCombat compatibility adapter returned'
assert not re.search(r'(?m)^  winCombat\s*=\s*async function', mono), 'winCombat reassignment chain must not return'
assert "dbCombatVictoryResolution=dbCombatVictoryOwner.configure({" in mono, 'combat Victory-resolution owner is not configured by the composition root'
assert 'dbCombat.win(' in mono, 'Victory callers no longer route through the Combat facade'


consumables_retired = [
    'usePotionOutsideCombatV24Base', 'dbFriendPotionBase',
]
for symbol in consumables_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Consumables owner returned: {symbol}"
assert mono.count('async function usePotion(') == 1, 'usePotion must have exactly one thin compatibility adapter'
assert mono.count('function usePotionOutsideCombat(') == 1, 'usePotionOutsideCombat must have exactly one thin compatibility adapter'
assert mono.count('async function identityPotionAction(') == 1, 'identityPotionAction must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*usePotion\s*=\s*async function', mono), 'usePotion reassignment chain must not return'
assert not re.search(r'(?m)^\s*usePotionOutsideCombat\s*=\s*function', mono), 'road Potion reassignment chain must not return'
assert not re.search(r'(?m)^\s*identityPotionAction\s*=\s*async function', mono), 'identity Potion reassignment chain must not return'
assert "dbConsumablesResolution=dbConsumablesOwner.configure({" in mono, 'Consumables owner is not configured by the composition root'
assert "dbConsumablesResolution.usePotion.apply(this,args)" in mono, 'combat Potion thin adapter is missing'
assert "dbConsumablesResolution.usePotionOutsideCombat.apply(this,args)" in mono, 'road Potion thin adapter is missing'
assert "dbConsumablesResolution.identityPotionAction.apply(this,args)" in mono, 'identity Potion thin adapter is missing'


healing_retired = [
    'healPlayerV13', 'healPlayerV18Base', 'healPlayerV19Base', 'healPlayerV21Base',
    'healPlayerV24Base', 'healPlayerV26StoneBase', 'healPlayerV27AegisBase', 'v26HasStone',
]
for symbol in healing_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Healing owner returned: {symbol}"
assert mono.count('function healPlayer(') == 0, 'retired healPlayer compatibility adapter returned'
assert mono.count('function recordHealing(') == 0, 'retired recordHealing compatibility adapter returned'
assert mono.count('function clearBloodOverhealTemp(') == 0, 'retired Blood Overheal cleanup compatibility adapter returned'
assert mono.count('function v26ClearStoneBattle(') == 1, 'Stone cleanup must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*healPlayer\s*=\s*function', mono), 'healPlayer reassignment chain must not return'
assert "dbCombatHealingResolution=dbCombatHealingOwner.configure({" in mono, 'Healing owner is not configured by the composition root'
assert 'dbCombat.heal(' in mono, 'Healing callers no longer route through the Combat facade'
assert 'dbCombat.recordHealing(' in mono, 'Healing-record callers no longer route through the Combat facade'
assert 'dbCombat.clearBloodOverhealTemp(' in mono, 'Blood Overheal cleanup no longer routes through the Combat facade'
assert 'dbCombat.clearStoneBattle(' in mono, 'Stone cleanup no longer routes through the Combat facade'


element_retired = [
    'triggerElementEffectV15', 'triggerElementEffectV16Base', 'enemyElementProcV16Base',
    'triggerElementEffectV19Base', 'triggerElementEffectV27Base', 'triggerElementEffectBeta045Base',
    'db046TriggerElementBase', 'db047TriggerElementBase', 'db060TriggerElementBase',
    'db060TriggerWeaponBase', 'dbTriggerElementBase', 'dbEnemyElementProcBase',
    'db064EnemyElementProcBase', 'db064DonutTriggerElementBase', 'db064DonutEnemyElementProcBase',
    'db0648TriggerElementBase', 'dbFriendElementProcBase', 'dbFriendEnemyElementProcBase',
    'db0511PlayerElementDamage', 'db0511AddPlayerBurn', 'db0511AddPlayerPoison', 'db0511QueueControl',
]
for symbol in element_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Element owner returned: {symbol}"
assert mono.count('function triggerElementEffect(') == 0, 'retired triggerElementEffect compatibility adapter returned'
assert mono.count('function enemyElementProc(') == 0, 'retired enemyElementProc compatibility adapter returned'
assert mono.count('function triggerWeaponElement(') == 0, 'retired triggerWeaponElement compatibility adapter returned'
assert not re.search(r'(?m)^\s*triggerElementEffect\s*=\s*function', mono), 'triggerElementEffect reassignment chain must not return'
assert not re.search(r'(?m)^\s*enemyElementProc\s*=\s*function', mono), 'enemyElementProc reassignment chain must not return'
assert not re.search(r'(?m)^\s*triggerWeaponElement\s*=\s*function', mono), 'triggerWeaponElement reassignment chain must not return'
assert "dbCombatElementResolution=dbCombatElementOwner.configure({" in mono, 'Element owner is not configured by the composition root'
assert 'dbCombat.element(' in mono, 'Element callers no longer route through the Combat facade'
assert 'dbCombat.enemyElementProc(' in mono, 'Enemy-element callers no longer route through the Combat facade'
assert 'dbCombat.triggerWeaponElement(' in mono, 'Weapon-element callers no longer route through the Combat facade'
assert 'dbCombat.restoreEnemyElementDebuffs(' in mono, 'Enemy-element cleanup no longer routes through the Combat facade'



d20_retired = [
    'd20ResultTitle', 'rollD20ChaosV15Patch', 'rollD20ChaosV17Base', 'rollD20ChaosV19Base',
    'rollD20ChaosBeta045Base', 'db046RollD20Base', 'db047RollD20Base',
    'db046ResetPlayerBase', 'db047ResetPlayerBase',
]
for symbol in d20_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired D20 chaos owner returned: {symbol}"
assert mono.count('async function rollD20Chaos(action){') == 1, 'rollD20Chaos must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^\s*rollD20Chaos\s*=\s*async function', mono), 'rollD20Chaos reassignment tower must not return'
assert 'let dbCombatD20ChaosResolution=null;' in mono, 'D20 resolution composition handle is missing'
assert 'dbCombatD20ChaosResolution=dbCombatD20ChaosOwner.configure({' in mono, 'D20 chaos owner is not configured by the composition root'
assert 'return dbCombat.chaos(action);' in mono, 'Combat facade D20 chaos adapter is missing'
assert 'dbCombatD20ChaosResolution.initializePlayerState();' in mono, 'D20 state initialization bridge is missing'

for direct_peer_call in [
    'return dbEnemyScalingResolution.scale(...args);',
    'return dbCombatEncounterLifecycle.start(kind);',
    'return dbCombatUltimateResolution.start(...args);',
    'return dbCombatGuardResolution.guardAction(...args);',
    'return dbCombatPetTurnResolution.petTurn(...args);',
    'if(dbCombatPetTurnResolution)return dbCombatPetTurnResolution.petDamage();',
    'return dbCombatPetTurnResolution.trainerPetDamage(id);',
    'return dbCombatVictoryResolution.winCombat(...args);',
    'dbCombatHealingResolution.healPlayer.apply(this,args)',
    'dbCombatElementResolution.triggerElementEffect.apply(this,args)',
    'return dbCombatD20ChaosResolution.rollD20Chaos(action);'
]:
    assert direct_peer_call not in mono, f'direct peer-public Combat call returned: {direct_peer_call}'
assert 'dbCombat=dbCombatOwner.configure({' in mono, 'public Combat facade is not configured by the composition root'

print('Monolith spring-clean guard PASS')


# MERCHANT_UI_OWNERSHIP_GUARD — #313 / Beta 0.6.6.23
merchant_mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
merchant_owner=(root/'runtime/js/ui/merchant.js').read_text(encoding='utf-8')
merchant_facade=(root/'runtime/js/events/merchant-facade.js').read_text(encoding='utf-8')
assert not re.search(r'\bfunction\s+renderMerchant\s*\(',merchant_mono), 'retired Merchant render compatibility adapter returned'
assert not re.search(r'\brenderMerchant\s*=\s*function\b',merchant_mono), 'Merchant renderer replacement stack returned to monolith'
assert not re.search(r'(?<![\w$])renderMerchant\s*\(',merchant_mono), 'Merchant render callers must stay behind DiceboundMerchant'
assert 'openMerchant:()=>dbMerchant.open()' in merchant_mono, 'Merchant tile handoff no longer routes directly through DiceboundMerchant'
assert not re.search(r'window\.DiceboundMerchant(?:Ui|Stock|Transaction)(?!Test)', merchant_mono), 'ordinary monolith must not coordinate Merchant peers directly'
assert 'DiceboundMerchantUi' in merchant_owner and 'createController' in merchant_owner, 'Merchant UI owner missing'
assert 'window.DiceboundMerchant=api' in merchant_facade and 'stockOwner.createController' in merchant_facade and 'uiOwner.createController' in merchant_facade, 'Merchant facade ownership missing'