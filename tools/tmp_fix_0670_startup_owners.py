from __future__ import annotations

import pathlib
import re

ROOT=pathlib.Path(__file__).resolve().parents[1]
MONOLITH=ROOT/"runtime/js/dicebound.js"
PROGRESSION=ROOT/"runtime/js/progression/lifecycle.js"


def replace_once(text: str, pattern: str, replacement: str, label: str, flags=0) -> str:
    text,count=re.subn(pattern,replacement,text,count=1,flags=flags)
    if count!=1:
        raise RuntimeError(f"Expected exactly one {label}, found {count}")
    return text


def main()->int:
    text=MONOLITH.read_text(encoding="utf-8")
    progression=PROGRESSION.read_text(encoding="utf-8")

    # Achievement reward text now derives achievement-gated Powerups directly
    # from the authoritative Powerup registry.  The old composition callback
    # existed only to expose a table built by replaying historical mutations.
    progression=replace_once(
        progression,
        r"    const ids=call\('getAchievementGateRewards'\)\?\.\[a\.id\]\|\|\[\];\n    const names=ids\.map\(id=>upgrades\(\)\.find\(upgrade=>upgrade\.id===id\)\?\.name\)\.filter\(Boolean\)\.filter\(name=>!base\.includes\(name\)\);",
        "    const names=upgrades().filter(upgrade=>String(upgrade.achievementGate||'')===`achievement:${a.id}`)\n      .map(upgrade=>upgrade.name).filter(Boolean).filter(name=>!base.includes(name));",
        "canonical achievement reward lookup",
    )
    if "getAchievementGateRewards" in progression:
        raise RuntimeError("Progression still depends on historical achievement reward table")

    # Beta 0.5.12 used to mutate the monolith-owned powerup array and copy those
    # writes into db0512GateRewards. Powerup metadata is now authored once in
    # DiceboundPowerupRegistry, so remove that replay entirely. Preserve only
    # the old regression API as a read-only view derived from canonical data.
    start=text.index("  // ACHIEVEMENT GATES — 0.5.12 expands the long-term reward pool.")
    end_marker="  window.DiceboundBeta0512Test=Object.freeze({"
    end_start=text.index(end_marker,start)
    end=text.index("\n  });",end_start)+len("\n  });")
    replacement='''  // Beta 0.5.12 reward gates are now authored once in DiceboundPowerupRegistry.\n  // Keep only a read-only regression snapshot here; do not replay historical\n  // mutation/copy passes into the canonical registry during startup.\n  const DB0512_GLOBAL_POWER_IDS=Object.freeze([\n    'toxic_bloom','elemental_predator','mana_overflow','true_legend_attack_v24','true_legend_guard_v24',\n    'legendary_star_eater_v27','legendary_venom_throne_v27','legendary_kings_ransom_v27','legendary_prismatic_choir_v27',\n    'legendary_echo_crown','legendary_blood_contract','legendary_loaded_road','legendary_packbreaker','legendary_second_sun','perfected_signature'\n  ]);\n  function db0512GlobalGateSnapshot(){\n    return DB0512_GLOBAL_POWER_IDS.map(id=>{\n      const up=upgrades.find(entry=>entry.id===id),gate=String(up?.achievementGate||''),achievement=gate.startsWith('achievement:')?gate.slice('achievement:'.length):gate;\n      return {id,name:up?.name,achievement,unlocked:!!gate&&dbProgression.achievementGateUnlocked(gate)};\n    });\n  }\n  function db0512ClassMasterySnapshot(){\n    const out={};\n    Object.keys(CLASSES).forEach(classId=>{\n      const rows=[];\n      upgrades.forEach(up=>{\n        if(up?.achievementGate===`class_b2:${classId}`)rows.push({board:2,id:up.id});\n        if(up?.achievementGate===`class_b5:${classId}`)rows.push({board:5,id:up.id});\n      });\n      if(rows.length)out[classId]=rows;\n    });\n    return out;\n  }\n\n  window.DiceboundBeta0512Test=Object.freeze({\n    globalGates:()=>db0512GlobalGateSnapshot(),\n    classGates:()=>db0512ClassMasterySnapshot(),\n    eligibleLegendaryCount:()=>eligibleUpgrades(u=>u.rarity==='legendary').length,\n    eligibleEpicCount:()=>eligibleUpgrades(u=>u.rarity==='epic').length\n  });'''
    text=text[:start]+replacement+text[end:]
    text,count=re.subn(r",getAchievementGateRewards:\(\)=>db0512GateRewards", "", text, count=1)
    if count!=1:
        raise RuntimeError(f"Expected one historical Progression reward-table callback, found {count}")

    # db060GuardianArt was a patch-era composition alias. Route each surviving
    # consumer straight to the canonical Guardian owner, falling back to the
    # canonical asset manifest only for secret bosses not represented by boards.
    text=replace_once(
        text,
        r"tile\.enemyBase\?\.id&&db060GuardianArt\(tile\.enemyBase\.id\)",
        "tile.enemyBase?.id&&DB317_GUARDIANS.resolveById(tile.enemyBase.id)?.art?.boardMarker",
        "tileMeta guardian-art predicate",
    )
    text=replace_once(
        text,
        r"const src=db060GuardianArt\(enemy\?\.id\)\?\.battle;",
        "const src=DB317_GUARDIANS.resolveById(enemy?.id)?.art?.battle||window.DiceboundAssets.resolveGuardianArt(enemy?.id)?.battle;",
        "guardian portrait resolver",
    )
    text=replace_once(
        text,
        r"function db060GuardianTileArt\(id,alt='Guardian'\)\{\s*\n\s*const src=db060GuardianArt\(id\)\?\.boardMarker;",
        "function guardianTileArt(id,alt='Guardian'){\n    const src=DB317_GUARDIANS.resolveById(id)?.art?.boardMarker||window.DiceboundAssets.resolveGuardianArt(id)?.boardMarker;",
        "guardian tile resolver",
    )
    text=text.replace("db060GuardianTileArt(","guardianTileArt(")

    # Deleted compatibility aliases must stay deleted. A direct reference here
    # would recreate the exact startup failure the browser oracle caught.
    code=re.sub(r"//.*?$|/\*.*?\*/|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`","",text,flags=re.M|re.S)
    for stale in ("db0512GateRewards","db0512RememberReward","db060GuardianArt","db060GuardianTileArt"):
        if re.search(rf"\b{re.escape(stale)}\b",code):
            raise RuntimeError(f"Historical startup alias still referenced: {stale}")
    if "window.DiceboundAssets.resolveGuardianArt" not in text or "DB317_GUARDIANS.resolveById" not in text:
        raise RuntimeError("Guardian art consumers are not routed through canonical owners")

    MONOLITH.write_text(text,encoding="utf-8",newline="\n")
    PROGRESSION.write_text(progression,encoding="utf-8",newline="\n")
    print("0.6.7.0 startup-owner repair: canonical reward lookup + direct guardian art routing")
    return 0


if __name__=="__main__":
    raise SystemExit(main())
