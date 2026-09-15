from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
ASSETS=(ROOT/'runtime/js/assets.js').read_text(encoding='utf-8')

if len(re.findall(r'\bfunction\s+classPortraitSVG\s*\(',SOURCE))!=1:
    raise SystemExit('classPortraitSVG must have exactly one canonical declaration')
if re.search(r'\bclassPortraitSVG\s*=\s*function\b',SOURCE):
    raise SystemExit('classPortraitSVG replacement ladder returned')
for retired in (
    'classPortraitV13Base','classPortraitV15Patch','classPortraitV16Base',
    'classPortraitV18Base','classPortraitBeta042Base','db054LegacyPortraitSVG',
):
    if re.search(rf'\b{re.escape(retired)}\b',SOURCE):
        raise SystemExit('retired class portrait predecessor returned: '+retired)
for obsolete in (
    'Summoner portrait','Pokemon Trainer portrait','Alchemist portrait',
    'Ouroboros portrait','Slime Rouge portrait',
):
    if obsolete in SOURCE:
        raise SystemExit('dead inline class portrait SVG returned: '+obsolete)

expected="""function classPortraitSVG(classId){
    return db054ClassImageHtml(classId,'headshot');
  }"""
if expected not in SOURCE:
    raise SystemExit('canonical class portrait no longer routes directly to authoritative image art')
if 'const cls=CLASSES[classId]||CLASSES.ranger' in SOURCE:
    raise SystemExit('Ranger class-art fallback returned')
if 'return fromRegistry||{' in SOURCE:
    raise SystemExit('synthetic class-art path fallback returned')
if "try{el.innerHTML=db054LegacyPortraitSVG" in SOURCE:
    raise SystemExit('inline-SVG image-error fallback returned')
if 'const resolveClassArt=id=>manifest.classes[String(id)]||manifest.classes.ranger;' in ASSETS:
    raise SystemExit('asset registry Ranger fallback returned')
if 'const resolveClassArt=id=>manifest.classes[String(id)]||null;' not in ASSETS:
    raise SystemExit('class art registry must fail closed for unknown ids')
if 'if(!art)throw new Error(`Missing class art asset: ${id}`);' not in SOURCE:
    raise SystemExit('missing class art must fail closed instead of falling back')
print('Canonical class portrait PASS: historical SVG ladder and all Ranger/legacy fallbacks removed')
