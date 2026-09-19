from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
ASSETS=(ROOT/'runtime/js/assets.js').read_text(encoding='utf-8')
PRESENTATION=(ROOT/'runtime/js/ui/class-presentation.js').read_text(encoding='utf-8')

# 0.6.7.12 retires the monolith classPortraitSVG renderer entirely. Active class
# portrait/marker presentation must now have one focused owner.
if re.search(r'\bfunction\s+classPortraitSVG\s*\(',SOURCE):
    raise SystemExit('retired classPortraitSVG monolith renderer returned')
if re.search(r'\bclassPortraitSVG\s*=\s*function\b',SOURCE):
    raise SystemExit('classPortraitSVG replacement ladder returned')
for retired in (
    'classPortraitV13Base','classPortraitV15Patch','classPortraitV16Base',
    'classPortraitV18Base','classPortraitBeta042Base','db054LegacyPortraitSVG',
    'db054ClassArt','db054ClassImageHtml','applyClassBoardMarker',
    'refreshLegacyHeroAvatar','rangerPortraitSVG',
):
    if re.search(rf'\b{re.escape(retired)}\b',SOURCE):
        raise SystemExit('retired class portrait predecessor returned: '+retired)
for obsolete in (
    'Summoner portrait','Pokemon Trainer portrait','Alchemist portrait',
    'Ouroboros portrait','Slime Rouge portrait',
):
    if obsolete in SOURCE:
        raise SystemExit('dead inline class portrait SVG returned: '+obsolete)

if 'const OWNER="ui/class-presentation";' not in PRESENTATION:
    raise SystemExit('focused class presentation owner identity missing')
if 'function applyPortrait(el,classId,combat=false)' not in PRESENTATION:
    raise SystemExit('class portrait rendering is not owned by class-presentation')
if 'function applyBoardMarker(el,classId)' not in PRESENTATION:
    raise SystemExit('Road marker rendering is not owned by class-presentation')
if 'function syncActive(classId)' not in PRESENTATION:
    raise SystemExit('active class art synchronization owner missing')
if 'if(!art)throw new Error(`Missing class art asset: ${classId}`);' not in PRESENTATION:
    raise SystemExit('missing class art must fail closed in the focused owner')
if 'root.DiceboundClassPresentation=api;' not in PRESENTATION:
    raise SystemExit('class presentation owner public facade missing')
if 'const dbClassPresentation=window.DiceboundClassPresentation;' not in SOURCE:
    raise SystemExit('composition root must consume the focused class presentation owner')
if 'dbClassPresentation.syncActive(player.classId);' not in SOURCE:
    raise SystemExit('HUD refresh must route through focused class presentation ownership')
if '$("heroAvatar").textContent=cls.icon' in SOURCE or '$("pawn").textContent=cls.icon' in SOURCE:
    raise SystemExit('legacy direct emoji class-art writes returned in composition')

if 'const resolveClassArt=id=>manifest.classes[String(id)]||manifest.classes.ranger;' in ASSETS:
    raise SystemExit('asset registry Ranger fallback returned')
if 'const resolveClassArt=id=>manifest.classes[String(id)]||null;' not in ASSETS:
    raise SystemExit('class art registry must fail closed for unknown ids')

print('Canonical class portrait PASS: focused class-presentation owner is authoritative; monolith SVG/emoji renderers remain retired')
