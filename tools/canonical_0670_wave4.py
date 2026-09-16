from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / "runtime/js/dicebound.js"
ANTI_RETURN = ROOT / "tools/test_monolith_chainsaw.py"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def main() -> int:
    text = MONOLITH.read_text(encoding="utf-8").replace("\r\n", "\n")
    before_lines = text.count("\n") + 1
    before_bytes = len(text.encode("utf-8"))

    text = replace_once(
        text,
        "  function v13NormalizeMeta(raw={}){",
        "  function normalizeCareerMeta(raw={}){",
        "rename career normalizer",
    )

    text = replace_once(
        text,
        "    out.points=(out.points||0)+refund;\n    return out;\n  }",
        "    out.points=(out.points||0)+refund;\n"
        "    const statsBase=defaultLifetimeStats(),stats=out.stats||{};\n"
        "    out.version=\"Alpha v1\";\n"
        "    out.stats={...statsBase,...stats,boardClears:{...(stats.boardClears||{})},classMaxLevel:{...(stats.classMaxLevel||{})}};\n"
        "    out.stats.damageTaken=Math.max(Number(out.stats.damageTaken)||0,Number(out.damageTaken)||0);\n"
        "    out.achievements={...(out.achievements||{})};\n"
        "    return out;\n  }",
        "fold lifetime normalization into canonical career normalizer",
    )

    text = replace_once(
        text,
        "  const normalizeV15=v13NormalizeMeta;\n"
        "  v13NormalizeMeta=function(raw={}){const out=normalizeV15(raw);const base=defaultLifetimeStats(),r=out.stats||{};out.version=\"Alpha v1\";out.stats={...base,...r,boardClears:{...(r.boardClears||{})},classMaxLevel:{...(r.classMaxLevel||{})}};out.stats.damageTaken=Math.max(Number(out.stats.damageTaken)||0,Number(out.damageTaken)||0);out.achievements={...(out.achievements||{})};return out;};\n",
        "",
        "remove predecessor normalizer wrapper",
    )

    text = text.replace("v13NormalizeMeta(", "normalizeCareerMeta(")
    if "v13NormalizeMeta" in text or "normalizeV15" in text:
        raise SystemExit("historical meta normalizer names survived canonicalization")

    text = replace_once(
        text,
        "  function importOldSaveIfNeeded(){\n\n"
        "    try{meta=normalizeCareerMeta(meta);saveMeta();}\n"
        "    catch(e){meta=normalizeCareerMeta({});saveMeta();}\n"
        "    dbProgression.repairTalentPrerequisites();\n"
        "  }\n"
        "  importOldSaveIfNeeded();",
        "  try{meta=normalizeCareerMeta(meta);}catch(e){meta=normalizeCareerMeta({});}\n"
        "  saveMeta();\n"
        "  dbProgression.repairTalentPrerequisites();",
        "inline current-schema normalization",
    )

    text = replace_once(
        text,
        "powerupsTaken:0,highestRunLevel:1",
        "powerupsTaken:0,potionsUsed:0,highestRunLevel:1",
        "make potion lifetime stat part of canonical defaults",
    )

    text = replace_once(
        text,
        "  const defaultLifetimeStats=()=>({runsStarted:0,runsFinished:0,fullVictories:0,deaths:0,rolls:0,tilesTraveled:0,damageDealt:0,healingDone:0,goldEarned:0,goldSpent:0,highestGold:0,enemiesDefeated:0,bossesDefeated:0,minibossesDefeated:0,powerupsTaken:0,potionsUsed:0,highestRunLevel:1,boardClears:{},classMaxLevel:{}});",
        "  function defaultLifetimeStats(){return {runsStarted:0,runsFinished:0,fullVictories:0,deaths:0,rolls:0,tilesTraveled:0,damageDealt:0,healingDone:0,goldEarned:0,goldSpent:0,highestGold:0,enemiesDefeated:0,bossesDefeated:0,minibossesDefeated:0,powerupsTaken:0,potionsUsed:0,highestRunLevel:1,boardClears:{},classMaxLevel:{}};}",
        "hoist lifetime-stat defaults for startup normalization",
    )

    text = replace_once(
        text,
        "\n  if(!meta.pets.gun)meta.pets.gun=defaultPetState(false);\n"
        "  if(meta.elementProgress.gun==null)meta.elementProgress.gun=0;\n",
        "\n",
        "remove Gun save-shape patch",
    )

    text = replace_once(
        text,
        "\n  const ACHIEVEMENT_POWER_GATES={destiny:\"prestige10\",godslayer:\"road2\",immortal:\"road3\",chaos:\"road4\",plague_lord:\"nature_master\"};\n"
        "  for(const [id,gate] of Object.entries(ACHIEVEMENT_POWER_GATES)){const up=upgrades.find(x=>x.id===id);}\n",
        "\n",
        "remove dead achievement gate probe",
    )

    text = replace_once(
        text,
        "  meta.pets=meta.pets||{};if(!meta.pets.radiation)meta.pets.radiation=defaultPetState(false);\n"
        "  meta.elementProgress=meta.elementProgress||{};if(meta.elementProgress.radiation==null)meta.elementProgress.radiation=0;\n"
        "  meta.stats=meta.stats||defaultLifetimeStats();if(meta.stats.potionsUsed==null)meta.stats.potionsUsed=0;\n"
        "  meta.unlocks=meta.unlocks||{};if(meta.unlocks.alchemist==null)meta.unlocks.alchemist=false;\n",
        "",
        "remove Radiation/Alchemist save-shape patch",
    )

    text = replace_once(
        text,
        "  function v24MigrateItemRarity(item){\n"
        "    if(!item||item.v24Rarity)return item;\n"
        "    const old=item.rarity;\n"
        "    if(item.setName==='Impossible Road')item.rarity='artifact';\n"
        "    else item.rarity=({common:'poor',uncommon:'common',rare:'uncommon',epic:'rare',legendary:'epic'}[old]||old);\n"
        "    item.v24Rarity=true;return item;\n"
        "  }\n"
        "  if(!meta.raritySchemaV24){\n"
        "    (meta.heirlooms||[]).forEach(v24MigrateItemRarity);meta.heirloomStorage.forEach(v24MigrateItemRarity);meta.raritySchemaV24=true;saveMeta();\n"
        "  }\n",
        "",
        "remove retired rarity-schema migration",
    )

    text = replace_once(
        text,
        "  function db060MythicalizeNamed(item){if(!item||!db060NamedMythicals.has(item.name))return item;item.rarity='mythical';item.specialMythical=true;item.specialLegendary=true;item.v24Rarity=true;return item;}",
        "  function db060MythicalizeNamed(item){if(!item||!db060NamedMythicals.has(item.name))return item;item.rarity='mythical';item.specialMythical=true;item.specialLegendary=true;return item;}",
        "remove retired v24 item marker",
    )

    text = replace_once(
        text,
        "  let db060MigratedNamed=false;\n"
        "  for(const list of [meta.heirlooms||[],meta.heirloomStorage||[]])for(const item of list)if(db060NamedMythicals.has(item?.name)&&item.rarity!=='mythical'){db060MythicalizeNamed(item);db060MigratedNamed=true;}\n"
        "  for(const item of Object.values(player.equipment||{}))if(db060NamedMythicals.has(item?.name)&&item.rarity!=='mythical'){db060MythicalizeNamed(item);db060MigratedNamed=true;}\n"
        "  if(db060MigratedNamed)saveMeta();\n",
        "",
        "remove named-legendary one-time migration",
    )

    text = replace_once(
        text,
        "  const v26CounterIdx=talents.findIndex(t=>t.id==='fighter_counter_reserve');\n"
        "  if(v26CounterIdx>=0){const t=talents[v26CounterIdx],rank=Math.max(0,Number(meta.purchased?.fighter_counter_reserve)||0);if(rank){meta.points=(meta.points||0)+rank*(t.cost||2);delete meta.purchased.fighter_counter_reserve;showToast('Counter Reserve refunded — its effect moved into Endless Form');}if(runTalentSnapshot?.fighter_counter_reserve)delete runTalentSnapshot.fighter_counter_reserve;saveMeta();}\n",
        "",
        "remove retired Counter Reserve migration",
    )

    stale = [
        "v13NormalizeMeta",
        "normalizeV15",
        "importOldSaveIfNeeded",
        "v24MigrateItemRarity",
        "raritySchemaV24",
        "v24Rarity",
        "db060MigratedNamed",
        "ACHIEVEMENT_POWER_GATES",
        "fighter_counter_reserve",
    ]
    for marker in stale:
        if marker in text:
            raise SystemExit(f"historical schema marker survived: {marker}")

    MONOLITH.write_text(text, encoding="utf-8", newline="\n")

    test = ANTI_RETURN.read_text(encoding="utf-8").replace("\r\n", "\n")
    test = replace_once(
        test,
        "STALE_ARTIFACT_FACTORY_NAMES=['generateMythicalWeapon','generateMythicalOffhand','generateMythicalBoots','generateMythicalPants','generateMythicalAmulet','generateMythicalHat','generateMythicalRing','v24Artifactize','DB060_ARTIFACT_FACTORIES']\n",
        "STALE_ARTIFACT_FACTORY_NAMES=['generateMythicalWeapon','generateMythicalOffhand','generateMythicalBoots','generateMythicalPants','generateMythicalAmulet','generateMythicalHat','generateMythicalRing','v24Artifactize','DB060_ARTIFACT_FACTORIES']\n"
        "STALE_SCHEMA_MARKERS=['v13NormalizeMeta','normalizeV15','importOldSaveIfNeeded','v24MigrateItemRarity','raritySchemaV24','v24Rarity','db060MigratedNamed','ACHIEVEMENT_POWER_GATES','fighter_counter_reserve']\n",
        "add schema anti-return markers",
    )
    test = replace_once(
        test,
        "    legacy_import=\"importOldSaveIfNeeded();\"\n"
        "    repair_call=\"dbProgression.repairTalentPrerequisites();\"\n"
        "    assert early_progression in text, \"Progression owner is not bootstrapped directly\"\n"
        "    assert repair_call in text, \"legacy-meta repair no longer routes directly to Progression owner\"\n"
        "    assert text.index(early_progression)<text.index(legacy_import), \"Progression owner bootstrap must precede legacy-meta repair\"\n",
        "    canonical_normalize=\"meta=normalizeCareerMeta(meta)\"\n"
        "    repair_call=\"dbProgression.repairTalentPrerequisites();\"\n"
        "    assert early_progression in text, \"Progression owner is not bootstrapped directly\"\n"
        "    assert canonical_normalize in text, \"current career meta is no longer normalized canonically\"\n"
        "    assert repair_call in text, \"career-meta repair no longer routes directly to Progression owner\"\n"
        "    assert text.index(early_progression)<text.index(canonical_normalize), \"Progression owner bootstrap must precede career-meta normalization\"\n",
        "update startup normalization guard",
    )
    test = replace_once(
        test,
        "    assert \"dbArtifacts.configure({\" in text and \"dbArtifacts.create(\" in text, \"monolith no longer routes Artifact creation through items/artifacts.js\"\n\n"
        "    print(f\"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element and Artifact owners, {len(KILLED)} shadow delegates absent, startup aliases, class portraits and Double Dice ladders retired\")\n",
        "    assert \"dbArtifacts.configure({\" in text and \"dbArtifacts.create(\" in text, \"monolith no longer routes Artifact creation through items/artifacts.js\"\n"
        "    for marker in STALE_SCHEMA_MARKERS:\n"
        "        assert marker not in text, f\"historical schema/migration marker {marker} returned\"\n"
        "    assert \"function normalizeCareerMeta(raw={}){\" in code, \"canonical career normalizer is missing\"\n\n"
        "    print(f\"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element and Artifact owners, {len(KILLED)} shadow delegates absent, startup aliases, class portraits, Double Dice ladders and retired schema migrations absent\")\n",
        "add schema anti-return assertions",
    )
    ANTI_RETURN.write_text(test, encoding="utf-8", newline="\n")

    after_lines = text.count("\n") + 1
    after_bytes = len(text.encode("utf-8"))
    print(
        f"CANONICAL_0670_WAVE4 {before_lines}->{after_lines} lines, "
        f"{before_bytes}->{after_bytes} bytes; current-schema normalizer collapsed; "
        "rarity/named-item/talent migrations and dead save-shape probes retired"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
