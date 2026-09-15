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

    # Achievement reward text derives achievement-gated Powerups directly from
    # the authoritative Powerup registry. The old composition table/callback is
    # retired. Keep this repair idempotent because the temporary workflow runs
    # again after each checkpoint commit.
    if "getAchievementGateRewards" in progression:
        progression=replace_once(
            progression,
            r"    const ids=call\('getAchievementGateRewards'\)\?\.\[a\.id\]\|\|\[\];\n    const names=ids\.map\(id=>upgrades\(\)\.find\(upgrade=>upgrade\.id===id\)\?\.name\)\.filter\(Boolean\)\.filter\(name=>!base\.includes\(name\)\);",
            "    const names=upgrades().filter(upgrade=>String(upgrade.achievementGate||'')===`achievement:${a.id}`)\n      .map(upgrade=>upgrade.name).filter(Boolean).filter(name=>!base.includes(name));",
            "canonical achievement reward lookup",
        )
    if "getAchievementGateRewards" in progression:
        raise RuntimeError("Progression still depends on historical achievement reward table")

    old_gate_marker="  // ACHIEVEMENT GATES — 0.5.12 expands the long-term reward pool."
    if old_gate_marker in text:
        start=text.index(old_gate_marker)
        end_marker="  window.DiceboundBeta0512Test=Object.freeze({"
        end_start=text.index(end_marker,start)
        end=text.index("\n  });",end_start)+len("\n  });")
        replacement='''  // Beta 0.5.12 reward gates are now authored once in DiceboundPowerupRegistry.\n  // Keep only a read-only regression snapshot here; do not replay historical\n  // mutation/copy passes into the canonical registry during startup.\n  const DB0512_GLOBAL_POWER_IDS=Object.freeze([\n    'toxic_bloom','elemental_predator','mana_overflow','true_legend_attack_v24','true_legend_guard_v24',\n    'legendary_star_eater_v27','legendary_venom_throne_v27','legendary_kings_ransom_v27','legendary_prismatic_choir_v27',\n    'legendary_echo_crown','legendary_blood_contract','legendary_loaded_road','legendary_packbreaker','legendary_second_sun','perfected_signature'\n  ]);\n  function db0512GlobalGateSnapshot(){\n    return DB0512_GLOBAL_POWER_IDS.map(id=>{\n      const up=upgrades.find(entry=>entry.id===id),gate=String(up?.achievementGate||''),achievement=gate.startsWith('achievement:')?gate.slice('achievement:'.length):gate;\n      return {id,name:up?.name,achievement,unlocked:!!gate&&dbProgression.achievementGateUnlocked(gate)};\n    });\n  }\n  function db0512ClassMasterySnapshot(){\n    const out={};\n    Object.keys(CLASSES).forEach(classId=>{\n      const rows=[];\n      upgrades.forEach(up=>{\n        if(up?.achievementGate===`class_b2:${classId}`)rows.push({board:2,id:up.id});\n        if(up?.achievementGate===`class_b5:${classId}`)rows.push({board:5,id:up.id});\n      });\n      if(rows.length)out[classId]=rows;\n    });\n    return out;\n  }\n\n  window.DiceboundBeta0512Test=Object.freeze({\n    globalGates:()=>db0512GlobalGateSnapshot(),\n    classGates:()=>db0512ClassMasterySnapshot(),\n    eligibleLegendaryCount:()=>eligibleUpgrades(u=>u.rarity==='legendary').length,\n    eligibleEpicCount:()=>eligibleUpgrades(u=>u.rarity==='epic').length\n  });'''
        text=text[:start]+replacement+text[end:]
    text=re.sub(r",getAchievementGateRewards:\(\)=>db0512GateRewards", "", text)

    # Route guardian presentation directly through the canonical Guardian/Asset
    # owners rather than restoring the old db060GuardianArt alias.
    if "db060GuardianArt(tile.enemyBase.id)" in text:
        text=replace_once(text,r"tile\.enemyBase\?\.id&&db060GuardianArt\(tile\.enemyBase\.id\)","tile.enemyBase?.id&&DB317_GUARDIANS.resolveById(tile.enemyBase.id)?.art?.boardMarker","tileMeta guardian-art predicate")
    if "db060GuardianArt(enemy?.id)?.battle" in text:
        text=replace_once(text,r"const src=db060GuardianArt\(enemy\?\.id\)\?\.battle;","const src=DB317_GUARDIANS.resolveById(enemy?.id)?.art?.battle||window.DiceboundAssets.resolveGuardianArt(enemy?.id)?.battle;","guardian portrait resolver")
    if "function db060GuardianTileArt" in text:
        text=replace_once(text,r"function db060GuardianTileArt\(id,alt='Guardian'\)\{\s*\n\s*const src=db060GuardianArt\(id\)\?\.boardMarker;","function guardianTileArt(id,alt='Guardian'){\n    const src=DB317_GUARDIANS.resolveById(id)?.art?.boardMarker||window.DiceboundAssets.resolveGuardianArt(id)?.boardMarker;","guardian tile resolver")
        text=text.replace("db060GuardianTileArt(","guardianTileArt(")

    # Deleted class-unlock forwarding functions must not survive as ES object
    # shorthand. Route every remaining callback directly to Progression.
    text=re.sub(r"(?m)^(\s*)isClassUnlocked,\s*$",r"\1isClassUnlocked:id=>dbProgression.isClassUnlocked(id),",text)

    # Historical patch titles/subtitles were source-control jokes, not runtime
    # behavior. The canonical APP_IDENTITY assignment later in the file owns the
    # real title. Remove the old random Alpha title generators and fixed Alpha
    # version title/brand rewrites so composition no longer replays release history.
    text=re.sub(
        r"\n\s*document\.title=`Dicebound: Alpha v[0-9.]+ — \$\{pick\(\[.*?\]\)\}`;\n",
        "\n",text,flags=re.S,
    )
    text=re.sub(r"\n\s*document\.title=`Dicebound: \$\{(?:V|VERSION)\}`;", "", text)
    text=re.sub(r"\n\s*const brandTitle=document\.querySelector\('\.brand h1'\);if\(brandTitle\)brandTitle\.textContent=`Dicebound: \$\{(?:V|VERSION)\}`;", "", text)
    text=re.sub(r"\n\s*const brandSub=document\.querySelector\('\.brand p'\);if\(brandSub\)brandSub\.textContent=`\$\{(?:V|VERSION)\}[^`]*`;", "", text)
    text=re.sub(r"\n\s*const h=document\.querySelector\('\.brand h1'\);if\(h\)h\.textContent=`Dicebound: \$\{V\}`;", "", text)
    text=re.sub(r"\n\s*const p=document\.querySelector\('\.brand p'\);if\(p\)p\.textContent=`\$\{V\}[^`]*`;", "", text)

    # These two blocks literally built arrays and then iterated them with an
    # empty callback. Their real authored powerups already live in
    # powerups/registry.js, so retaining the dead historical literals only made
    # dicebound.js look like a second Powerups owner.
    mana_start="  // ---- More Mana augments --------------------------------------------------"
    if mana_start in text:
        start=text.index(mana_start)
        end=text.index("].forEach(u=>{});",start)+len("].forEach(u=>{});")
        text=text[:start]+"  // Mana augment definitions are owned by DiceboundPowerupRegistry.\n"+text[end:]
    ouro_start="  const ouroborosPowers=["
    if ouro_start in text:
        if text.count("ouroborosPowers")!=2:
            raise RuntimeError("Unexpected ouroborosPowers references; refusing unsafe dead-block removal")
        start=text.index(ouro_start)
        end=text.index("ouroborosPowers.forEach(u=>{});",start)+len("ouroborosPowers.forEach(u=>{});")
        text=text[:start]+"  // Ouroboros powerups are owned by DiceboundPowerupRegistry.\n"+text[end:]

    # Retire the old documentation claim that Alpha v1.8 intentionally forms a
    # compatibility layer. Current code must be canonical ownership only.
    text=text.replace(
        "  /* ========================================================================\n     Alpha v1.8 — Identity, tooltip and reliability pass\n     ------------------------------------------------------------------------\n     This section intentionally lives as a documented compatibility layer on\n     top of the older Alpha systems. The project has grown through many small\n     versions, so keeping the newest behavior together makes future audits much\n     easier: each wrapper below states exactly which older behavior it extends.\n     ======================================================================== */",
        "  /* Alpha v1.8 historical boundary — remaining live behavior below is being drained into canonical owners. */",
    )

    code=re.sub(r"//.*?$|/\*.*?\*/|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`","",text,flags=re.M|re.S)
    for stale in ("db0512GateRewards","db0512RememberReward","db060GuardianArt","db060GuardianTileArt"):
        if re.search(rf"\b{re.escape(stale)}\b",code):
            raise RuntimeError(f"Historical startup alias still referenced: {stale}")
    if re.search(r"(?m)^\s*isClassUnlocked,\s*$",code):
        raise RuntimeError("Deleted isClassUnlocked delegate is still used as shorthand")
    if "ouroborosPowers" in code:
        raise RuntimeError("Dead Ouroboros powerup shadow survived")
    if "window.DiceboundAssets.resolveGuardianArt" not in text or "DB317_GUARDIANS.resolveById" not in text:
        raise RuntimeError("Guardian art consumers are not routed through canonical owners")

    MONOLITH.write_text(text,encoding="utf-8",newline="\n")
    PROGRESSION.write_text(progression,encoding="utf-8",newline="\n")
    print("0.6.7.0 startup-owner repair: canonical rewards/art/class callbacks + dead patch-era noise removed")
    return 0


if __name__=="__main__":
    raise SystemExit(main())
