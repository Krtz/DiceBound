from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
mono_path = root / "runtime/js/dicebound.js"
owner_path = root / "runtime/js/combat/enemy-scaling-resolution.js"
mono = mono_path.read_text(encoding="utf-8")

# #309 freezes the complete live scaleEnemy ownership ladder before moving it.
# These captures are cumulative behavior, not dead-code candidates: each wraps
# the predecessor and therefore must either exist together (legacy state) or be
# absent together once the authoritative owner reproduces the full pipeline.
retired_captures = [
    "scaleEnemyV15",
    "scaleEnemyV11",
    "scaleEnemyV14Base",
    "scaleEnemyV16Base",
    "scaleEnemyV17Base",
    "scaleEnemyV17Normalized",
    "scaleEnemyV19Base",
    "scaleEnemyBeta045Base",
    "db046ScaleEnemyBase",
    "db047ScaleEnemyBase",
    "db064ScaleEnemyBase",
]

base_owner_pattern = re.compile(
    r"function\s+scaleEnemy\s*\(base,kind=\"normal\",packSize=1\)\s*\{"
)
# Historical patches sometimes capture and replace scaleEnemy on the same
# physical line, so this deliberately must not be line-anchored.
reassignment_pattern = re.compile(r"(?<![\w$])scaleEnemy\s*=\s*function")
cultist_scaling_pattern = re.compile(
    r"if\(scaled\.name={2,3}[\"']Cultist[\"']\)"
    r"scaled\.lifeSteal=hellMode\?\.20:nightmareMode\?\.10:\.01;"
)

if not owner_path.exists():
    # Pre-extraction checkpoint. This branch must begin from the exact released
    # 0.6.6.19 scaling ladder rather than silently losing one historical layer.
    assert len(base_owner_pattern.findall(mono)) == 1, "legacy scaleEnemy base owner changed before extraction"
    for symbol in retired_captures:
        assert re.search(rf"(?<![\w$]){re.escape(symbol)}(?![\w$])", mono), (
            f"legacy scaling capture disappeared before #309 migration: {symbol}"
        )
    # There are multiple live reassignments, including two adjacent V17 layers.
    replacement_count = len(reassignment_pattern.findall(mono))
    assert replacement_count >= 10, "legacy scaleEnemy wrapper ladder unexpectedly shrank"
    assert "if(boardLevel===6){const balance=db317Board(6).balance;" in mono
    assert cultist_scaling_pattern.search(mono), "Cultist mode lifesteal scaling branch changed before extraction"
    assert "enemy.innateElement='fire';" in mono
    assert "db064EnemyPolicy.standardDevilFlameChance(boardLevel,db064CombatMode())" in mono
    print(
        "Enemy scaling extraction boundary PASS "
        f"(legacy ladder: {len(retired_captures)} captures / {replacement_count} replacements)"
    )
else:
    # Post-extraction architecture contract. The monolith may keep exactly one
    # thin composition adapter, but no implementation/reassignment sediment.
    owner = owner_path.read_text(encoding="utf-8")
    assert len(re.findall(r"function\s+scaleEnemy\s*\(", mono)) == 1, (
        "scaleEnemy must have exactly one thin compatibility adapter"
    )
    assert not reassignment_pattern.search(mono), "scaleEnemy reassignment ladder returned"
    for symbol in retired_captures:
        assert not re.search(rf"(?<![\w$]){re.escape(symbol)}(?![\w$])", mono), (
            f"retired enemy-scaling capture returned: {symbol}"
        )
    assert "DiceboundEnemyScalingResolution" in owner, "enemy-scaling owner export missing"
    assert "dbEnemyScalingResolution" in mono, "enemy-scaling composition binding missing"
    assert re.search(r"return\s+dbEnemyScalingResolution\.scale\(", mono), (
        "scaleEnemy thin adapter must delegate to the authoritative owner"
    )
    print("Enemy scaling extraction boundary PASS (authoritative owner + thin adapter)")
