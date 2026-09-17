from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
if len(re.findall(r'\bfunction\s+mythicalSetSummary\s*\(',SOURCE))!=1:
    raise SystemExit('mythicalSetSummary must have exactly one canonical declaration')
if re.search(r'\bmythicalSetSummary\s*=\s*function\b',SOURCE):
    raise SystemExit('historical mythicalSetSummary replacement returned')
start=SOURCE.find('function mythicalSetSummary()')
if start<0: raise SystemExit('canonical mythicalSetSummary missing')
brace=SOURCE.find('{',start)
if brace<0: raise SystemExit('canonical mythicalSetSummary has no body')
depth=0
end=-1
for pos in range(brace,len(SOURCE)):
    ch=SOURCE[pos]
    if ch=='{': depth+=1
    elif ch=='}':
        depth-=1
        if depth==0:
            end=pos+1
            break
if end<0: raise SystemExit('canonical mythicalSetSummary body is unbalanced')
body=SOURCE[start:end]
# enemyForPosition is intentionally gone; this test must never need a retired wrapper as a delimiter.
if re.search(r'\bfunction\s+enemyForPosition\s*\(',SOURCE):
    raise SystemExit('retired enemyForPosition wrapper returned just to delimit mythicalSetSummary')
final="return `${n}/7 Artifact-tier Impossible Road pieces · `+v24SetTierData().map(t=>`${t.pieces}: ${t.text}`).join(' · ');"
if final not in body: raise SystemExit('canonical mythicalSetSummary does not use final v24 summary policy')
for obsolete in ('/5 Impossible Road pieces','/6 Impossible Road pieces','/7 Impossible Road pieces · 2: +3% all damage'):
    if obsolete in SOURCE: raise SystemExit('obsolete set-summary generation remains: '+obsolete)

tier_start=SOURCE.find('function v24SetTierData()')
tier_end=SOURCE.find('mythicalSetSummary',tier_start)
if tier_start<0: raise SystemExit('v24SetTierData final policy missing')
tier=SOURCE[tier_start:tier_end if tier_end>tier_start else tier_start+2500]
expected=(
    "{pieces:2,text:'+2% all damage.'}",
    "{pieces:3,text:'+4% all damage and +4% elemental proc chance.'}",
    "{pieces:4,text:'+7% all damage, +5% elemental proc chance, 25 starting Ultimate, +8% pet double-attack chance and 5% less Guardian-special damage.'}",
    "{pieces:5,text:'+10% all damage, +7% elemental proc chance, +5% elemental power, 30 starting Ultimate, 1 starting Barrier, +10% pet double-attack chance and 10% less Guardian-special damage.'}",
    "{pieces:6,text:'+14% all damage, +10% elemental proc chance, +9% elemental power, 35 starting Ultimate, +13% pet double-attack chance and 15% less Guardian-special damage.'}",
    "{pieces:7,text:'+20% all damage, +13% elemental proc chance, +14% elemental power, 40 starting Ultimate, +16% pet double-attack chance, 20% less Guardian-special damage, and once per battle at ≤25% HP restore 18% max HP + gain 1 Barrier.'}",
)
for fragment in expected:
    if fragment not in tier: raise SystemExit('final set tier text changed: '+fragment)
print('Canonical mythicalSetSummary PASS: four generations collapsed to final seven-piece Artifact-tier presentation')
