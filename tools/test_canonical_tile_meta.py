from pathlib import Path
import re

from audit_monolith_shadow_ownership import mask_non_code

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")
PRESENTATION = (ROOT / "runtime/js/board/presentation.js").read_text(encoding="utf-8")
MONOLITH_CODE = mask_non_code(MONOLITH)
PRESENTATION_CODE = mask_non_code(PRESENTATION)

# tileMeta is no longer a monolith-owned function. Wave 10 extracted the released
# presentation behavior into DiceboundBoardPresentation; the composition layer
# should only configure and call that owner.
if re.search(r"\bfunction\s+tileMeta\s*\(", MONOLITH_CODE):
    raise SystemExit("historical monolith-owned tileMeta returned")
if re.search(r"\btileMeta\s*=\s*function\b", MONOLITH_CODE):
    raise SystemExit("historical tileMeta function replacement returned")
if re.search(r"\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*tileMeta\s*;", MONOLITH_CODE):
    raise SystemExit("historical tileMeta predecessor capture returned")

if len(re.findall(r"\bfunction\s+tileMeta\s*\(", PRESENTATION_CODE)) != 1:
    raise SystemExit("Board Presentation must own exactly one canonical tileMeta declaration")

for fragment in (
    'const dbBoardPresentation=window.DiceboundBoardPresentation;',
    'if(!dbBoardPresentation?.configure||!dbBoardPresentation?.tileMeta)',
    'dbBoardPresentation.configure({getBoardLevel:()=>boardLevel});',
    'let dbTileMetaFinalReady=false;',
    'dbTileMetaFinalReady=true;',
):
    if fragment not in MONOLITH:
        raise SystemExit("composition is missing canonical Board Presentation routing: " + fragment)

if MONOLITH.count("dbBoardPresentation.tileMeta(") != 2:
    raise SystemExit("composition must route both board build and tile refresh directly through Board Presentation")

for fragment in (
    'const OWNER="board/presentation";',
    'const assets=window.DiceboundAssets;',
    'const guardians=window.DiceboundGuardians;',
    'function tileMeta(tile,{ready=true}={})',
    'guardians.resolveById(tile.enemyBase.id)?.art?.boardMarker',
    'guardians.resolveFinal(runtime.getBoardLevel())',
    '`${name} pack · ${count} enemies`',
    'uiArt("coins","Treasure","db-art-tile")',
    'uiArt("gambler","Gambler","db-art-tile")',
    'if(tile?.type==="devilboss")return ["👿🌙","???"]',
    'start:["🏠","Start"]',
    'const api=Object.freeze({owner:OWNER,apiVersion:1,configure,tileMeta,enemyArtForId',
    'window.DiceboundBoardPresentation=api;',
):
    if fragment not in PRESENTATION:
        raise SystemExit("canonical Board Presentation tileMeta owner is missing released behavior/routing: " + fragment)

retired = {
    "tileMetaV24Base",
    "tileMetaBeta043Base",
    "tileMetaBeta045Base",
    "db046TileMetaBase",
    "db047TileMetaBase",
    "db049TileMetaBase",
    "db060TileMetaBase",
    "db060GuardianArt",
    "db060GuardianTileArt",
}
for alias in sorted(retired):
    if re.search(rf"\b{re.escape(alias)}\b", MONOLITH_CODE) or re.search(rf"\b{re.escape(alias)}\b", PRESENTATION_CODE):
        raise SystemExit(f"retired tileMeta/guardian alias returned as executable code: {alias}")

# Detailed bootstrap/final labels, guardian art, enemy packs, event art and
# zero-gameplay-RNG semantics are frozen by test_board_presentation_oracle.js.
print("Canonical tileMeta PASS: released tile presentation is owned by Board Presentation; composition routes directly to it and retired monolith chains remain absent")
