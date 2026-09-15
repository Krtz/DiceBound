from pathlib import Path
import re

from audit_monolith_shadow_ownership import mask_non_code

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")
CODE = mask_non_code(SOURCE)

if len(re.findall(r"\bfunction\s+tileMeta\s*\(", CODE)) != 1:
    raise SystemExit("tileMeta must have exactly one canonical declaration")
if re.search(r"\btileMeta\s*=\s*function\b", CODE):
    raise SystemExit("historical tileMeta function replacement returned")
if re.search(r"\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*tileMeta\s*;", CODE):
    raise SystemExit("historical tileMeta predecessor capture returned")

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
    if re.search(rf"\b{re.escape(alias)}\b", CODE):
        raise SystemExit(f"retired tileMeta/guardian alias returned as executable code: {alias}")

for fragment in (
    "let dbTileMetaFinalReady=false;",
    "dbTileMetaFinalReady=true;",
    "tile.enemyBase?.id&&DB317_GUARDIANS.resolveById(tile.enemyBase.id)?.art?.boardMarker",
    "guardianTileArt(tile.enemyBase.id,tile.enemyBase.name)",
    "DB317_GUARDIANS.resolveFinal(boardLevel)",
    "guardianTileArt(boss.id,boss.name)",
    "db049EnemyTileIcon(tile)",
    "db047UiArt('bandit'",
    "db047UiArt('troll'",
    "db046EnemyArtForName(tile.enemyBase.name)",
    "beta045EnemyArtForName(tile.enemyBase.name)",
    "beta043Art('coins','Treasure','db-art-tile')",
    "beta043Art('gambler','Gambler','db-art-tile')",
    "tile?.type==='devilboss'",
    'start:["🏠","Start"]',
):
    if fragment not in SOURCE:
        raise SystemExit("canonical tileMeta is missing released behavior: " + fragment)

resolver = re.search(r"function guardianTileArt\(id,alt='Guardian'\)\{(?P<body>.*?)\n\s*\}", SOURCE, re.S)
if not resolver:
    raise SystemExit("canonical guardianTileArt helper is missing")
resolver_body = resolver.group("body")
for fragment in (
    "DB317_GUARDIANS.resolveById(id)?.art?.boardMarker",
    "window.DiceboundAssets.resolveGuardianArt(id)?.boardMarker",
):
    if fragment not in resolver_body:
        raise SystemExit("guardianTileArt is not routed through canonical Guardian/Asset owners: " + fragment)

start = SOURCE.find("function tileMeta(")
end = SOURCE.find("function buildBoard(", start)
if start < 0 or end < 0:
    raise SystemExit("could not isolate canonical tileMeta region")
body = SOURCE[start:end]

# Final runtime precedence is the old wrapper chain walked newest-to-oldest:
# guardian art -> current enemy art -> 0.4.7 fallback -> 0.4.6 -> 0.4.5 ->
# 0.4.3 event art -> v24 secret tile -> base metadata. The historical db060
# alias is gone; the same released result now comes from the canonical Guardian
# owner plus the focused guardianTileArt presentation helper.
order = [
    "guardianTileArt(tile.enemyBase.id,tile.enemyBase.name)",
    "db049EnemyTileIcon(tile)",
    "db047UiArt('bandit'",
    "db046EnemyArtForName(tile.enemyBase.name)",
    "beta045EnemyArtForName(tile.enemyBase.name)",
    "beta043Art('coins','Treasure','db-art-tile')",
    "tile?.type==='devilboss'",
    'if(tile.type==="enemy"&&tile.enemyBase)',
]
positions = []
for fragment in order:
    index = body.find(fragment)
    if index < 0:
        raise SystemExit("tileMeta precedence anchor missing: " + fragment)
    positions.append(index)
if positions != sorted(positions):
    raise SystemExit("canonical tileMeta final precedence changed")

# Preserve the two distinct pack-label generations that are observably different:
# 0.4.9 current enemy packs say "pack · N enemies"; 0.4.7 fallback says "· N enemies".
for fragment in (
    "`${name} pack · ${count} enemies`",
    "`${enemyName} · ${n} enemies`",
    "Mini Boss · 1 enemy",
    "Final Boss · 1 enemy",
    "['👿🌙','???']",
):
    if fragment not in body:
        raise SystemExit("canonical tileMeta lost released label semantics: " + fragment)

print("Canonical tileMeta PASS: eight generations remain collapsed; guardian presentation now routes through canonical owners with precedence and labels guarded")
