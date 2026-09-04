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
