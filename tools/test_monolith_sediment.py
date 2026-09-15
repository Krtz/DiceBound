from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
mono=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
index=(ROOT/'runtime/index.html').read_text(encoding='utf-8')
camp=(ROOT/'runtime/js/ui/camp.js').read_text(encoding='utf-8')

retired_functions=[
    'refreshEffectiveGoldDisplays','applyRandomLegendary','closeTalentTree','applyRunThemeV13',
    'impossibleRoadTierData','campSummaryText','setCampMode','v110CloseCampPanels','v110OpenCampPanel',
    'v22OpenCampPanel','v22MovePrestigeControls','v22ScrollPanel','v23SetTierData','v23SetPanelHtml',
    'db054ApplyBoardMarker','renderAchievements',
]
for name in retired_functions:
    if re.search(rf'function\s+{re.escape(name)}\s*\(',mono):
        raise SystemExit(f'retired monolith function declaration returned: {name}')

retired_consts=['ROWS','COLS','TILE_COUNT','MINIBOSS_TILE','META_KEY','RUN_THEMES','SOUND_KEY_ORDER','statusDotsHTMLV17Base','unboundPreciousGearV24Base','DB26','DB27','DB30']
for name in retired_consts:
    if re.search(rf'\bconst\s+{re.escape(name)}\b',mono):
        raise SystemExit(f'retired monolith const declaration returned: {name}')
if re.search(r'\bcombatModal\s*=',mono):
    raise SystemExit('retired combatModal declarator returned')

# The current guardian-loot policy is the single db060 implementation near the
# final composition wiring. Earlier direct assignments were historical balance
# generations: none may return and silently shadow the released policy.
if mono.count('openCombatLootChain=function') != 1:
    raise SystemExit('combat loot must retain exactly one final implementation')
if re.search(r'function\s+openCombatLootChain\s*\(',mono):
    raise SystemExit('retired combat-loot function declaration returned')
for retired_loot_marker in [
    'merchant=.001',
    'the seventh set piece offhand at exactly 0.5% / 5%',
    "A slightly leaner Artifact table. Board 6's offhand is now 0.4% / 4%.",
]:
    if retired_loot_marker in mono:
        raise SystemExit(f'retired combat-loot generation returned: {retired_loot_marker}')
for retired_set_summary in [
    '45 starting Ultimate, +17% pet double chance, 21% less guardian-special damage',
    '4-piece no longer grants the starting Barrier',
]:
    if retired_set_summary in mono:
        raise SystemExit(f'retired artifact-set summary generation returned: {retired_set_summary}')

# Current Item and Artifact policy is installed only after all historical
# versions have loaded. The composition root must not regain pre-final
# rarity/effect/set definitions that no caller can reach in the released app.
for retired_definition in [
    'function elementChanceForRarity(',
    'function rollGearRarity(',
    'function generatePhilosophersStone(',
    'function v19SetDamageBonus(',
    'function v19SetProcBonus(',
    'function v19SetPetDoubleBonus(',
    'function v19SetElementPower(',
    'function v19SetStartUltimate(',
    'function v19SetGuardianSpecialMult(',
    'healing beyond full grants +2 attack for the rest of the battle',
]:
    if retired_definition in mono:
        raise SystemExit(f'retired Item/Artifact policy definition returned: {retired_definition}')

# Class portrait rendering now resolves through the semantic image contract and
# keeps only its deliberate later fallback chain. The first palette-only SVG
# generation had no caller once the script reached the current UI owners.
for retired_portrait_marker in ['const portraitPalette=', 'id="g_${classId}"']:
    if retired_portrait_marker in mono:
        raise SystemExit(f'retired class portrait generation returned: {retired_portrait_marker}')
if re.search(r'function\s+applyClassPortrait\s*\(',mono) or mono.count('applyClassPortrait=function') != 1:
    raise SystemExit('Class portrait application must retain only the semantic-image owner')

# The live Legendary chooser is the final shared route. Its two older DOM
# implementations and Edge-specific fallback token were superseded before any
# player interaction can happen during startup.
if mono.count('v17OpenLegendaryChoice=function') != 1:
    raise SystemExit('Legendary chooser must retain one final shared route')
for retired_legendary_marker in [
    'function v17OpenLegendaryChoice(',
    'v18LegendaryChoiceToken',
    'data-v18-legendary-index',
    'Choice UI fallback: random Legendary granted',
]:
    if retired_legendary_marker in mono:
        raise SystemExit(f'retired Legendary chooser generation returned: {retired_legendary_marker}')

# Status marker markup belongs to Combat View. The monolith may retain its
# compatibility adapter, never a later renderer that shadows that owner.
if mono.count('function statusDotsHTML(') != 1:
    raise SystemExit('status markers must retain one Combat View compatibility adapter')
if re.search(r'(?m)^\s*statusDotsHTML\s*=',mono):
    raise SystemExit('status marker renderer reassignment chain returned')
for retired_status_marker in ['poison-count-compact', 'v17-poison-count']:
    if retired_status_marker in mono:
        raise SystemExit(f'retired status marker presentation returned: {retired_status_marker}')

for dom_id in ['startLegacyLevel','startLegacyXp','startHeirloom','nightmareText','startTalentBtn']:
    if dom_id in index or dom_id in mono or dom_id in camp:
        raise SystemExit(f'retired start compatibility target returned: {dom_id}')
if 'id="endTalentBtn"' in index:
    raise SystemExit('retired Journey End Talent button returned to static markup')
if "const endTalent=$('endTalentBtn')" in mono:
    raise SystemExit('retired Journey End runtime-removal shim returned')

for live_id in ['startCompatibilityState','nightmareBox','nightmareToggle','startBtn']:
    if f'id="{live_id}"' not in index:
        raise SystemExit(f'required live compatibility target missing: {live_id}')
if 'v22EnsureCompatStartBtn' not in mono:
    raise SystemExit('live start-button compatibility adapter was removed accidentally')
if "['nightmareBox','hellBox']" not in camp:
    raise SystemExit('Camp no longer suppresses live legacy difficulty anchors')

print('Monolith sediment cleanup PASS: retired declarations/UI fossils are absent; live compatibility anchors remain.')
