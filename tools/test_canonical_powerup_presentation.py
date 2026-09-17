from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")
FACADE = (ROOT / "runtime/js/powerups/facade.js").read_text(encoding="utf-8")
PRESENTATION = (ROOT / "runtime/js/powerups/presentation.js").read_text(encoding="utf-8")

for token in [
    "openLevelUpV16Base", "showPowerupChoiceV16Base", "openLevelUpV26Base",
    "showLegendaryChoiceV27Base", "db0511ChoiceHTMLBase", "attachPowerupRerollV16",
    "v18LevelChoices",
]:
    if token in SOURCE:
        raise SystemExit(f"historical Powerup presentation token returned: {token}")

for retired in [
    "const PERFECTED_SIGNATURES=", "function perfectedSignatureForCurrentClass(",
    "function applyPerfectedSignatureSafe(", "function showAllEligiblePowerupSelection(",
]:
    if retired in SOURCE:
        raise SystemExit(f"monolith Perfected Signature/full-picker ownership returned: {retired}")

for required in [
    'const OWNER="powerups/presentation"', "const PERFECTED_SIGNATURES=",
    "function perfectedSignatureForCurrentClass(", "function applyPerfectedSignatureSafe(",
    "function showAllEligiblePowerupSelection(", "window.DiceboundPerfectedSignature=",
    "window.DiceboundPowerupPresentation=api",
]:
    if required not in PRESENTATION:
        raise SystemExit(f"Powerup presentation owner missing {required!r}")

for route in [
    "dbPowerups.openAllEligible('Debug · Full Eligible Powerup List',()=>{})",
    "dbPowerupPresentation.openAllEligible('Powerups Oracle',()=>{})",
    "renderAllEligible:(source,onComplete,filter)=>dbPowerupPresentation.openAllEligible(source,onComplete,filter)",
]:
    if route not in SOURCE:
        raise SystemExit(f"Powerup presentation route missing {route!r}")

for retired in ["openLevelUp", "showPowerupChoice", "showLegendaryChoice"]:
    if f"function {retired}(" in SOURCE:
        raise SystemExit(f"monolith {retired} declaration returned")
    if re.search(rf"(?<![.\w$]){re.escape(retired)}\s*=\s*function\b", SOURCE):
        raise SystemExit(f"monolith {retired} replacement returned")

for canonical in ["choiceHTML", "attachPowerupReroll", "renderLevelUpChoices", "renderPowerupChoiceOverlay", "renderLegendaryChoice"]:
    count = SOURCE.count(f"function {canonical}(")
    if count != 1:
        raise SystemExit(f"expected one canonical {canonical}, found {count}")

if "function powerupDisplayDesc(" in SOURCE:
    raise SystemExit("retired powerupDisplayDesc pass-through returned")

required_source = [
    "${dbPowerups.describe(up)}</span><span class=\"choice-tags\">",
    "if(pendingLevelUps>0)dbPowerups.openLevelUp(onComplete);",
    "attachPowerupReroll(grid,()=>dbPowerups.openLevelUp(onComplete));",
    "attachPowerupReroll(grid,()=>dbPowerups.openChoice(source,onComplete,filter,subtitle));",
    "if(String(source).toLowerCase().includes('miniboss'))return v27ShowMinibossReward(source,onComplete);",
    "Every eligible Legendary is exhausted. Choose an Epic power instead.",
    "Legendary pool exhausted",
    "The guardian yields. Choose one guaranteed Legendary powerup.",
    "renderLevelUp:onComplete=>renderLevelUpChoices(onComplete)",
    "renderPowerupChoice:(source,onComplete,filter,subtitle)=>renderPowerupChoiceOverlay(source,onComplete,filter,subtitle)",
    "renderLegendaryChoice:(source,onComplete)=>renderLegendaryChoice(source,onComplete)",
    "return dbPowerups.openLegendary(source,onComplete);",
    "levelChoices:()=>dbPowerups.levelChoices().map(dbPowerupsOracleSummary)",
]
for marker in required_source:
    if marker not in SOURCE:
        raise SystemExit(f"canonical Powerup presentation missing {marker!r}")

if "if(call(\"isGameStarted\")&&p.v26ExpandedHorizons)p.levelChoiceBonus=1;" not in FACADE:
    raise SystemExit("Expanded Horizons policy no longer lives in DiceboundPowerups.openLevelUp")

print("Canonical Powerup presentation PASS: chooser/reroll/Legendary history collapsed behind DiceboundPowerups with one renderer per responsibility")
