#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8", newline="\n")


def replace_exact(text: str, old: str, new: str, label: str, expected: int = 1) -> str:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} exact matches, found {count}")
    return text.replace(old, new)


def remove_between(text: str, start_marker: str, end_marker: str, label: str) -> str:
    starts = [m.start() for m in re.finditer(re.escape(start_marker), text)]
    if len(starts) != 1:
        raise SystemExit(f"{label}: expected exactly one start marker, found {len(starts)}")
    start = starts[0]
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        raise SystemExit(f"{label}: end marker missing")
    return text[:start] + text[end:]


def mono_metrics(text: str) -> dict:
    names = re.findall(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\(", text)
    unique = sorted(set(names))
    refs = {
        name: len(re.findall(rf"(?<![\w$]){re.escape(name)}(?![\w$])", text))
        for name in unique
    }
    wrapper_bases = re.findall(r"\bconst\s+([A-Za-z_$][\w$]*Base)\s*=\s*([A-Za-z_$][\w$]*)\s*;", text)
    return {
        "bytes": len(text.encode("utf-8")),
        "lines": len(text.splitlines()),
        "namedFunctionDeclarations": len(names),
        "uniqueNamedFunctions": len(unique),
        "functionsWithAtMost2Refs": sum(1 for n in unique if refs[n] <= 2),
        "functionsWithAtMost4Refs": sum(1 for n in unique if refs[n] <= 4),
        "baseCaptureAssignments": len(wrapper_bases),
        "lowestReferenceFunctions": sorted(
            ({"name": n, "refs": refs[n]} for n in unique if refs[n] <= 2),
            key=lambda item: (item["refs"], item["name"]),
        )[:80],
        "baseCaptureSample": [{"base": a, "target": b} for a, b in wrapper_bases[:80]],
    }


# ---------------------------------------------------------------------------
# Baseline / monolith edits
# ---------------------------------------------------------------------------
mono_path = "runtime/js/dicebound.js"
mono = read(mono_path)
before_metrics = mono_metrics(mono)

# Retire the production-embedded Alpha v1.4 career simulator. Its only surviving
# consumer was the later DB235 testing manifest that is also retired below.
mono = remove_between(
    mono,
    "  // ---- Progression-aware career test harness -------------------------------",
    "  /* ---------- Alpha v1.5: defense, treasure scaling, summon classes & completion hardening ---------- */",
    "legacy career harness island",
)

# Fold the one genuinely-live DB235 behavior (Board 6 post-scaling + Cultist LS)
# into the existing scaleEnemy owner before deleting the historical DB235 patch.
old_scale_return = '''    return {...base,hp,maxHp:hp,attack,defense,xp:Math.round(base.xp*(1+global*.72)*(isFinal?4.4:isMini?2.4:isMerchant?5:1)),gold:Math.round(base.gold*(1+global*.72)*(isFinal?4.5:isMini?2.5:isMerchant?5:1)),boss:isBoss,guardian:isBoss,miniBoss:isMini,finalBoss:isFinal,merchantBoss:isMerchant,skipTurns:0,poisonStacks:0,affinity,elementProcChance};'''
new_scale_return = '''    const scaled={...base,hp,maxHp:hp,attack,defense,xp:Math.round(base.xp*(1+global*.72)*(isFinal?4.4:isMini?2.4:isMerchant?5:1)),gold:Math.round(base.gold*(1+global*.72)*(isFinal?4.5:isMini?2.5:isMerchant?5:1)),boss:isBoss,guardian:isBoss,miniBoss:isMini,finalBoss:isFinal,merchantBoss:isMerchant,skipTurns:0,poisonStacks:0,affinity,elementProcChance};
    if(boardLevel===6){const balance=db317Board(6).balance;scaled.hp=Math.round(scaled.hp*balance.extraHp);scaled.maxHp=scaled.hp;scaled.attack=Math.round(scaled.attack*balance.extraAttack);scaled.defense=Math.round((scaled.defense||0)*balance.extraDefenseMult+balance.extraDefenseFlat);if(kind==="miniboss"||kind==="final"){scaled.hp=Math.round(scaled.hp*balance.guardianHp);scaled.maxHp=scaled.hp;scaled.attack=Math.round(scaled.attack*balance.guardianAttack);}}
    if(scaled.name==="Cultist")scaled.lifeSteal=hellMode?.20:nightmareMode?.10:.01;
    return scaled;'''
mono = replace_exact(mono, old_scale_return, new_scale_return, "fold DB235 Board 6 scale behavior")

# Delete the full 2.3.5 half-patch now that its only gameplay behavior was folded
# above. This removes the human harness, historical title/brand writes, old Camp
# Hell presentation wrapper, testing/public manifest and scaleEnemy base capture.
mono = remove_between(
    mono,
    "  /* ========================================================================\n     Alpha v2.3.5 half-patch",
    "  /* ========================================================================\n     Alpha v2.4 — rarity rebuild, heirloom storage and the Pale Devil",
    "DB235 historical patch island",
)

# A later compatibility refresh only mutated DB235's now-retired balance object.
lines = mono.splitlines()
kept = []
removed_db235_refresh = 0
for line in lines:
    if "if(DB235?.modules?.balance?.board6)Object.assign" in line:
        removed_db235_refresh += 1
        continue
    kept.append(line)
if removed_db235_refresh != 1:
    raise SystemExit(f"later DB235 balance refresh: expected 1 line, found {removed_db235_refresh}")
mono = "\n".join(kept) + "\n"

# The v26 feed wrapper was synchronously overwritten later by the published final
# feedActivePet implementation, so it could never affect a user click. Drain it.
v26_feed_wrapper = "  const feedActivePetV26Base=feedActivePet;feedActivePet=function(count=1){const old=player.cookieBondBonus;if(!gameStarted)player.cookieBondBonus=talentRank('companion_bond');try{return feedActivePetV26Base(count);}finally{if(!gameStarted)player.cookieBondBonus=old;renderPetCollection();}};\n"
mono = replace_exact(mono, v26_feed_wrapper, "", "retire overwritten v26 feed wrapper")
mono = mono.replace("  /* CAMPSITE PET COOKIE FEEDING ------------------------------------------- */\n", "", 1)

# Heirloom Storage is now exclusively a Prestige Moon purchase. Beta saves are
# disposable, so retire the old Legacy-Talent grandfather/refund migration.
mono = remove_between(
    mono,
    "  function v24MigratePrestigeHeirloomPurchases(){",
    "  function v24StorageUnlocked(){return DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_STORAGE_NODE);}",
    "retired Heirloom Talent migration",
)
# restore the retained end marker removed by remove_between's replacement model
storage_unlock = "  function v24StorageUnlocked(){return DB_PRESTIGE.hasPurchase(meta.prestige,DB_HEIRLOOM_STORAGE_NODE);}\n"
if storage_unlock not in mono:
    marker = "  function v24StorageCapacity()"
    idx = mono.find(marker)
    if idx < 0:
        raise SystemExit("storage capacity marker missing while restoring storage unlock owner")
    mono = mono[:idx] + storage_unlock + mono[idx:]

migration_prefix = "  setTimeout(()=>{const migration=v24MigratePrestigeHeirloomPurchases();"
mig_start = mono.find(migration_prefix)
if mig_start < 0 or mono.find(migration_prefix, mig_start + 1) >= 0:
    raise SystemExit("expected exactly one Heirloom migration startup block")
migration_suffix = "v24EnsureShieldBars();},0);"
mig_end = mono.find(migration_suffix, mig_start)
if mig_end < 0:
    raise SystemExit("Heirloom migration startup block end missing")
mig_end += len(migration_suffix)
mono = mono[:mig_start] + "  setTimeout(()=>{if(v24StorageUnlocked())v24SyncStorage();v24RefreshCamp();renderTalents();renderEquipment();v24EnsureShieldBars();},0);" + mono[mig_end:]

for banned in [
    "buildCareerHarness", "DiceboundCareerTestLegacy", "buildDiceboundHumanHarness235",
    "DiceboundCareerTest", "v235HumanHarness", "DB235", "v235ScaleEnemyBase",
    "v235UpdateMetaBase", "feedActivePetV26Base", "v24MigratePrestigeHeirloomPurchases",
    "prestigeHeirloomPurchasesMigrated", "legacy_storage",
]:
    if re.search(rf"(?<![\w$]){re.escape(banned)}(?![\w$])", mono):
        raise SystemExit(f"retired monolith symbol remains: {banned}")

write(mono_path, mono)

# ---------------------------------------------------------------------------
# Pet chooser: fix the real click bug (DOM `feed` shadowed feed(count)).
# ---------------------------------------------------------------------------
pet_path = "runtime/js/ui/pet-chooser.js"
pet = read(pet_path)
pet = replace_exact(pet, "    const feed=overlay.querySelector('[data-pet-chooser-feed]');", "    const feedControls=overlay.querySelector('[data-pet-chooser-feed]');", "Pet feed DOM binding")
pet = replace_exact(pet, "    if(feed){", "    if(feedControls){", "Pet feed DOM guard")
pet = replace_exact(pet, "      feed.hidden=!!model.runActive;", "      feedControls.hidden=!!model.runActive;", "Pet feed hidden state")
pet = replace_exact(pet, "      feed.innerHTML=model.runActive?'':", "      feedControls.innerHTML=model.runActive?'':", "Pet feed markup")
write(pet_path, pet)

# ---------------------------------------------------------------------------
# Camp authored coordinates requested by Axel.
# ---------------------------------------------------------------------------
camp_path = "runtime/js/ui/camp.js"
camp = read(camp_path)
replacements = [
    ("['#campTalentBtn','left:30.5%;top:12.5%;translate:none']", "['#campTalentBtn','left:55.5%;top:12.5%;translate:none']", 2, "wide/compact Talent right 25"),
    ("['#campMoonBtn','left:48%;top:11.5%;translate:none']", "['#campMoonBtn','left:83%;top:11.5%;translate:none']", 2, "wide/compact Moon right 35"),
    ("['#campClassBtn','left:39%;top:55%;translate:none']", "['#campClassBtn','left:39%;top:65%;translate:none']", 2, "wide/compact Class down 10"),
    ("['#campTalentBtn','left:30.5%;top:18%;translate:none']", "['#campTalentBtn','left:55.5%;top:18%;translate:none']", 1, "short Talent right 25"),
    ("['#campMoonBtn','left:48%;top:20%;translate:none']", "['#campMoonBtn','left:83%;top:20%;translate:none']", 1, "short Moon right 35"),
    ("['#campClassBtn','left:39%;top:68%;translate:none']", "['#campClassBtn','left:39%;top:78%;translate:none']", 1, "short Class down 10"),
    ("campTalentBtn:Object.freeze({x:.305,y:.125,w:165})", "campTalentBtn:Object.freeze({x:.555,y:.125,w:165})", 1, "Talent stage anchor"),
    ("campMoonBtn:Object.freeze({x:.48,y:.115,w:165})", "campMoonBtn:Object.freeze({x:.83,y:.115,w:165})", 1, "Moon stage anchor"),
    ("campClassBtn:Object.freeze({x:.39,y:.55,w:235})", "campClassBtn:Object.freeze({x:.39,y:.65,w:235})", 1, "Class stage anchor"),
    ("campPetBtn:Object.freeze({x:.39,y:.80,w:220})", "campPetBtn:Object.freeze({x:.39,y:.90,w:220})", 1, "Pet stage anchor"),
    ("campPetBtn:Object.freeze({x:.39,y:.80})", "campPetBtn:Object.freeze({x:.39,y:.90})", 2, "Pet stage refinements"),
]
for old, new, expected, label in replacements:
    camp = replace_exact(camp, old, new, label, expected)
write(camp_path, camp)

# ---------------------------------------------------------------------------
# Regression tests / architecture guards.
# ---------------------------------------------------------------------------
pet_test_path = "tools/test_pet_chooser.js"
pet_test = read(pet_test_path)
needle = "assert.match(source,/resolvePetArt/,'chooser must consume canonical semantic pet art');\n"
insert = needle + "assert.doesNotMatch(source,/const feed=overlay\\.querySelector\\('\\[data-pet-chooser-feed\\]'\\)/,'feed controls DOM handle must not shadow the feed(count) action');\nassert.match(source,/const feedControls=overlay\\.querySelector\\('\\[data-pet-chooser-feed\\]'\\)/,'feed controls must use a non-action DOM binding name');\n"
pet_test = replace_exact(pet_test, needle, insert, "Pet chooser feed-shadow regression guard")
write(pet_test_path, pet_test)

camp_test_path = "tools/test_camp_ui.js"
camp_test = read(camp_test_path)
for old, new, expected, label in [
    ("{x:.39,y:.55,w:235}", "{x:.39,y:.65,w:235}", 1, "Camp test Class anchor"),
    ("{x:.39,y:.80,w:220}", "{x:.39,y:.90,w:220}", 1, "Camp test Pet anchor"),
    ("left:30.5%;top:12.5%;translate:none", "left:55.5%;top:12.5%;translate:none", 1, "Camp test Talent wide"),
    ("left:48%;top:11.5%;translate:none", "left:83%;top:11.5%;translate:none", 1, "Camp test Moon wide"),
    ("left:39%;top:55%;translate:none", "left:39%;top:65%;translate:none", 1, "Camp test Class wide"),
    ("left:30.5%;top:18%;translate:none", "left:55.5%;top:18%;translate:none", 1, "Camp test Talent short"),
    ("left:48%;top:20%;translate:none", "left:83%;top:20%;translate:none", 1, "Camp test Moon short"),
    ("left:39%;top:68%;translate:none", "left:39%;top:78%;translate:none", 1, "Camp test Class short"),
]:
    camp_test = replace_exact(camp_test, old, new, label, expected)
camp_test = camp_test.replace("Class Choice must sit 10% lower on the authored Camp stage", "Class Choice must sit another 10% lower on the authored Camp stage")
camp_test = camp_test.replace("Pet Choice must sit 10% lower on the authored Camp stage", "Pet Choice must sit another 10% lower on the authored Camp stage")
write(camp_test_path, camp_test)

prestige_test_path = "tools/test_06515_prestige_heirloom_ui.js"
prestige_test = read(prestige_test_path)
prestige_test = replace_exact(prestige_test, "campClassBtn:Object\\.freeze\\(\\{x:\\.39,y:\\.55,w:235\\}\\)", "campClassBtn:Object\\.freeze\\(\\{x:\\.39,y:\\.65,w:235\\}\\)", "06515 Class coordinate contract")
prestige_test = replace_exact(prestige_test, "campPetBtn:Object\\.freeze\\(\\{x:\\.39,y:\\.80,w:220\\}\\)", "campPetBtn:Object\\.freeze\\(\\{x:\\.39,y:\\.90,w:220\\}\\)", "06515 Pet coordinate contract")
old_migration_tests = "assert.match(mono,/prestigeHeirloomPurchasesMigrated/,'old saves need a one-time Heirloom migration');\nassert.match(mono,/oldStorageRank\\*3/,'retired Storage Talent must refund its 3 Talent Points');"
new_migration_tests = "assert.doesNotMatch(mono,/prestigeHeirloomPurchasesMigrated|legacy_storage|oldStorageRank/,'retired Heirloom Storage Talent migration/refund path must be gone; Storage is a Prestige Moon purchase');"
prestige_test = replace_exact(prestige_test, old_migration_tests, new_migration_tests, "retire Heirloom Talent migration test")
prestige_test = prestige_test.replace("Beta 0.6.5.15 requested progression/UI patch contract PASS", "Prestige Heirloom/Camp positioning contract PASS")
write(prestige_test_path, prestige_test)

shadow_path = "tools/test_shadow_ownership_drain.py"
shadow = '''from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
assert re.search(r'renderInfo\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{\\s*return\\s+dbInfoGuide\\.render\\(\\)',mono)
for name in [
    'renderInfoBase','renderInfoV13','renderInfoV14Base','renderInfoV15Patch','renderInfoV16Base','renderInfoV18Base','renderInfoV19Base','renderInfoV24Base','renderInfoV24PresentationBase','renderInfoV27Base',
    'buildAISim','DiceboundAITest','buildCareerHarness','DiceboundCareerTestLegacy','buildDiceboundHumanHarness235','DiceboundCareerTest','v235HumanHarness','DB235','DiceboundModules','v235ScaleEnemyBase','v235UpdateMetaBase','feedActivePetV26Base','v24MigratePrestigeHeirloomPurchases','prestigeHeirloomPurchasesMigrated','legacy_storage'
]:
    assert not re.search(rf'(?<![\\w$]){re.escape(name)}(?![\\w$])',mono),name
assert re.search(r'function scaleEnemy\\([\\s\\S]*?const scaled=\\{[\\s\\S]*?if\\(boardLevel===6\\)\\{const balance=db317Board\\(6\\)\\.balance;[\\s\\S]*?return scaled;',mono), 'Board 6 scaling must survive inside the single scaleEnemy owner')
print('Monolith spring-clean guard PASS')
'''
write(shadow_path, shadow)

# Add a permanent post-cleanup census/guard. It prints the exact monolith shape
# on every CI run and rejects the production-embedded career harness families.
census_path = "tools/test_06520_monolith_census.py"
census = '''from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
names=re.findall(r'\\bfunction\\s+([A-Za-z_$][\\w$]*)\\s*\\(',mono)
unique=sorted(set(names))
refs={name:len(re.findall(rf'(?<![\\w$]){re.escape(name)}(?![\\w$])',mono)) for name in unique}
low2=sorted((refs[name],name) for name in unique if refs[name]<=2)
base_captures=re.findall(r'\\bconst\\s+([A-Za-z_$][\\w$]*Base)\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*;',mono)
for retired in ['DiceboundCareerTest','DiceboundCareerTestLegacy','buildCareerHarness','buildDiceboundHumanHarness235','DB235']:
    assert not re.search(rf'(?<![\\w$]){re.escape(retired)}(?![\\w$])',mono), retired
print(f'Monolith census PASS: {len(mono.encode("utf-8"))} bytes / {len(mono.splitlines())} lines / {len(names)} named declarations / {len(low2)} functions at <=2 refs / {len(base_captures)} base-capture assignments')
print('Lowest-reference sample:', low2[:40])
print('Base-capture sample:', base_captures[:40])
'''
write(census_path, census)

# ---------------------------------------------------------------------------
# Release notes.
# ---------------------------------------------------------------------------
changelog_path = "CHANGELOG.md"
changelog = read(changelog_path)
changelog_marker = "This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n"
new_changelog = '''## Beta 0.6.5.20

### Camp, Pet feeding and deeper monolith spring clean (#17, #40, #209, #234)
- Fixed Camp Pet feeding: the extracted chooser no longer shadows its `feed(count)` action with the feed-controls DOM element, and regression coverage protects the real click wiring.
- Moved Class and Pet selection another 10 percentage points down in the authored Camp scene, moved the Talent star 25 points right, and moved the Prestige moon 35 points right across supported desktop layouts.
- Heirloom Storage is now purely a Prestige Moon purchase; the retired Legacy-Talent migration/refund/grandfather shim is removed instead of keeping dead Beta-save compatibility sediment.
- Removed both production-embedded Career simulation harnesses, the DB235 testing/public-manifest island, historical DB235 Camp/title wrappers and an overwritten Pet-feed wrapper. Board 6 scaling/Cultist behavior was folded into the single live `scaleEnemy` owner before deleting the DB235 patch.
- Added permanent shadow-ownership and monolith-census guards. Gameplay values, RNG draw order and current Board 6 balance are intentionally preserved outside the explicitly requested UI/Storage changes.

'''
changelog = replace_exact(changelog, changelog_marker, changelog_marker + new_changelog, "insert 0.6.5.20 changelog")
write(changelog_path, changelog)

notes_path = "runtime/PATCH_NOTES.md"
notes = read(notes_path)
notes = replace_exact(notes, "# Unreleased — Beta 0.6.5.19", "# Unreleased — Beta 0.6.5.20", "patch notes version")
notes_marker = "# Unreleased — Beta 0.6.5.20\n\n"
notes_section = '''## Beta 0.6.5.20 Camp + monolith spring clean (#17, #40, #209, #234)
- Fixed the Camp Companion feed buttons by removing a JavaScript name-shadow collision between the feed-controls DOM element and the authoritative `feed(count)` action. Feed-one/feed-all now invoke the existing Pet transaction again.
- Moved Class and Pet scene objects another 10 percentage points downward, Talent 25 points right and Prestige 35 points right through the authoritative `ui/camp.js` stage coordinates.
- Removed the obsolete Heirloom Storage Legacy-Talent migration/refund path. Storage remains the permanent 1 PP Prestige Moon purchase and no longer carries Beta-save Talent Point compatibility sediment.
- Removed the old Alpha career simulators and DB235 human-test/testing-manifest island from production. The still-live Board 6 scaling and Cultist Lifesteal behavior was preserved by folding it into the original `scaleEnemy` owner before the DB235 wrapper was deleted.
- Removed the synchronously overwritten v26 Pet-feed wrapper, strengthened shadow-ownership guards, and added a CI monolith census so subsequent cleanup can target proven fake-liveness instead of guessing.

'''
notes = replace_exact(notes, notes_marker, notes_marker + notes_section, "insert 0.6.5.20 patch notes")
write(notes_path, notes)

# Stamp all canonical release identity files, then refresh the content-derived
# runtime build metadata.
subprocess.run(["python", "tools/set_project_version.py", "--version", "0.6.5.20", "--channel", "Beta"], cwd=ROOT, check=True)
index_path = "runtime/index.html"
index = read(index_path)
index = index.replace("Beta v0.6.5.20 · Monolith sediment cleanup.", "Beta v0.6.5.20 · Camp + monolith spring clean.", 1)
write(index_path, index)
subprocess.run(["python", "tools/refresh_runtime_manifest.py", "--version", "0.6.5.20", "--channel", "Beta", "--development-state", "Unreleased"], cwd=ROOT, check=True)

# Final invariants and census.
mono = read(mono_path)
after_metrics = mono_metrics(mono)
if after_metrics["bytes"] >= before_metrics["bytes"]:
    raise SystemExit("monolith cleanup unexpectedly failed to reduce bytes")
print("MONOLITH_CENSUS_BEFORE=" + json.dumps(before_metrics, sort_keys=True))
print("MONOLITH_CENSUS_AFTER=" + json.dumps(after_metrics, sort_keys=True))
print("MONOLITH_DELTA=" + json.dumps({
    "bytes": after_metrics["bytes"] - before_metrics["bytes"],
    "lines": after_metrics["lines"] - before_metrics["lines"],
    "namedFunctionDeclarations": after_metrics["namedFunctionDeclarations"] - before_metrics["namedFunctionDeclarations"],
    "baseCaptureAssignments": after_metrics["baseCaptureAssignments"] - before_metrics["baseCaptureAssignments"],
}, sort_keys=True))
