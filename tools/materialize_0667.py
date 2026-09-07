#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRANCH_VERSION = "0.6.6.7"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"materialize 0.6.6.7: expected one {label}, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str, flags: int = 0) -> str:
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"materialize 0.6.6.7: expected one {label}, found {count}")
    return next_text


def remove_regex_once(text: str, pattern: str, label: str, flags: int = 0) -> str:
    return regex_once(text, pattern, "", label, flags)


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


# ---------------------------------------------------------------------------
# Complete the Pet owner API so current compatibility consumers can stay thin.
# ---------------------------------------------------------------------------
owner_path = "runtime/js/combat/pet-turn-resolution.js"
owner = read(owner_path)
owner = replace_once(
    owner,
    'const api=Object.freeze({owner:"combat/pet-turn-resolution",apiVersion:1,configure,petDamage,trainerPetDamage,petElementFor,trainerStrike,maybePetElementProc,petTurn});',
    'const api=Object.freeze({owner:"combat/pet-turn-resolution",apiVersion:1,configure,petDamage,trainerPetDamage,petElementFor,activeTrainerPetId,trainerStrike,maybePetElementProc,petTurn});',
    "Pet owner API export",
)
write(owner_path, owner)

# ---------------------------------------------------------------------------
# Drain the live Pet/Trainer/Summoner resolution tower from the monolith while
# preserving thin lexical adapters for current callers/debug composition hooks.
# ---------------------------------------------------------------------------
mono_path = "runtime/js/dicebound.js"
mono = read(mono_path)

mono = replace_once(
    mono,
    '  let dbCombatGuardResolution=null;\n',
    '  let dbCombatGuardResolution=null;\n  let dbCombatPetTurnResolution=null;\n',
    "Pet owner composition slot",
)

mono = replace_once(
    mono,
    '  function petDamage(){const talentBonus=gameStarted?player.petDamageBonus:talentRank("companion_damage")+talentRank("companion_ascendant")*2;return 1+Math.ceil((activePetState()?.level||1)*.8)+talentBonus;}\n',
    '  function petDamage(){if(!dbCombatPetTurnResolution)throw new Error("Combat Pet turn-resolution owner is not configured.");return dbCombatPetTurnResolution.petDamage();}\n',
    "base Pet damage implementation",
)

mono = regex_once(
    mono,
    r'  async function petTurn\(\)\{\n.*?\n  \}\n\n  async function animateUltimate',
    '  async function petTurn(...args){if(!dbCombatPetTurnResolution)throw new Error("Combat Pet turn-resolution owner is not configured.");return dbCombatPetTurnResolution.petTurn(...args);}\n\n  async function animateUltimate',
    "base Pet turn implementation",
    re.S,
)

# V13 Beastmaster Pet ownership.
mono = remove_regex_once(
    mono,
    r'  const petDamageV13=petDamage;\n  petDamage=function\(\)\{[^\n]*\};\n  const petTurnV13=petTurn;\n  petTurn=async function\(\)\{[^\n]*\};\n',
    "V13 Beastmaster Pet wrapper block",
)

# V15 Trainer/Summoner helpers become compatibility adapters to the owner.
helper_replacements = {
    r'^  function trainerPetDamage\(id\)\{[^\n]*\}$': '  function trainerPetDamage(id){if(!dbCombatPetTurnResolution)throw new Error("Combat Pet turn-resolution owner is not configured.");return dbCombatPetTurnResolution.trainerPetDamage(id);}',
    r'^  function petElementFor\(id\)\{[^\n]*\}$': '  function petElementFor(id){if(!dbCombatPetTurnResolution)throw new Error("Combat Pet turn-resolution owner is not configured.");return dbCombatPetTurnResolution.petElementFor(id);}',
    r'^  function activeTrainerPetId\(\)\{[^\n]*\}$': '  function activeTrainerPetId(){if(!dbCombatPetTurnResolution)throw new Error("Combat Pet turn-resolution owner is not configured.");return dbCombatPetTurnResolution.activeTrainerPetId();}',
    r'^  async function maybePetElementProc\(id,target,source="Companion Spark"\)\{[^\n]*\}$': '  async function maybePetElementProc(id,target,source="Companion Spark"){if(!dbCombatPetTurnResolution)throw new Error("Combat Pet turn-resolution owner is not configured.");return dbCombatPetTurnResolution.maybePetElementProc(id,target,source);}',
    r'^  async function trainerStrike\(id,target,scale=1,label="attacks"\)\{[^\n]*\}$': '  async function trainerStrike(id,target,scale=1,label="attacks"){if(!dbCombatPetTurnResolution)throw new Error("Combat Pet turn-resolution owner is not configured.");return dbCombatPetTurnResolution.trainerStrike(id,target,scale,label);}',
}
for pattern, replacement in helper_replacements.items():
    mono = regex_once(mono, pattern, replacement, pattern, re.M)

mono = remove_regex_once(
    mono,
    r'  const petTurnV15Patch=petTurn;\n  petTurn=async function\(\)\{[^\n]*\};\n',
    "V15 Trainer/Summoner Pet wrapper",
)

# V16/V17 Pet-damage compatibility ladders are now composed in the owner.
mono = remove_regex_once(
    mono,
    r'  const petDamageV16Base=petDamage;petDamage=function\(\)\{[^\n]*\};\n  if\(typeof trainerPetDamage==="function"\)\{const trainerPetDamageV16Base=trainerPetDamage;trainerPetDamage=function\(id\)\{[^\n]*\};\}\n',
    "V16 Pet damage wrapper block",
)
mono = remove_regex_once(
    mono,
    r'  const petDamageV17Base=petDamage;petDamage=function\(\)\{[^\n]*\};\n  if\(typeof trainerPetDamage==="function"\)\{const trainerPetDamageV17Base=trainerPetDamage;trainerPetDamage=function\(id\)\{[^\n]*\};\}\n',
    "V17 Pet damage wrapper block",
)

# V18 Healing Nuzzle wrapper.
mono = remove_regex_once(
    mono,
    r'  const petTurnV18Base=petTurn;\n  petTurn=async function\(\)\{\n.*?\n  \};\n',
    "V18 Healing Nuzzle Pet wrapper",
    re.S,
)

# V19 set-bonus wrapper and 0.6 Pet Mirror wrapper.
mono = remove_regex_once(
    mono,
    r'  const petTurnV19Base=petTurn;\n  petTurn=async function\(\)\{[^\n]*\};\n',
    "V19 set Pet-double wrapper",
)
mono = remove_regex_once(
    mono,
    r'  const db060PetTurnBase=petTurn;\n  petTurn=async function\(\.\.\.args\)\{[^\n]*\};\n',
    "Pet Mirror wrapper",
)

# Later affinity-aware full Pet-body replacement is also owner material now.
mono = remove_regex_once(
    mono,
    r'^  petTurn=async function\(\)\{const targets=livingEnemies\(\);[^\n]*affinity resisted half[^\n]*\};\n',
    "late affinity-aware Pet implementation",
    re.M,
)

# Configure the owner at the final composition root, before the other combat owners.
pet_config = '''  const dbCombatPetTurnOwner=window.DiceboundCombatPetTurnResolution;
  if(!dbCombatPetTurnOwner)throw new Error('DiceBound requires the combat Pet turn-resolution owner before dicebound.js');
  dbCombatPetTurnResolution=dbCombatPetTurnOwner.configure({
    getPlayer:()=>player,
    getMeta:()=>meta,
    getPets:()=>PETS,
    getElements:()=>ELEMENTS,
    getDiboElements:()=>DIBO_ELEMENTS,
    getBoardLevel:()=>boardLevel,
    isGameStarted:()=>gameStarted,
    talentRank:id=>talentRank(id),
    gameplayTalentRank:id=>gameplayTalentRank(id),
    isClassActive:id=>classIdentityActive(id),
    livingEnemies:()=>livingEnemies(),
    getCurrentEnemy:()=>currentEnemy,
    getCurrentEnemies:()=>currentEnemies,
    setCurrentEnemy:index=>setCurrentEnemy(index),
    animatePetAttack:async(duration=300,active=true)=>{const pet=$("combatPet");if(!pet)return;if(active){pet.classList.remove("pet-attack");void pet.offsetWidth;pet.classList.add("pet-attack");if(duration>0)await delay(duration);}else pet.classList.remove("pet-attack");},
    delay:ms=>delay(ms),
    random:()=>random(),
    pick:list=>pick(list),
    clamp:(value,min,max)=>clamp(value,min,max),
    damageEnemy:(enemy,amount,ignoreDefense=false)=>damageEnemy(enemy,amount,ignoreDefense),
    trackElementProgress:(key,amount)=>trackElementProgress(key,amount),
    tone:(frequency,duration,type,gain,slide)=>tone(frequency,duration,type,gain,slide),
    setCombatText:text=>setCombatText(text),
    updateCombatUI:()=>updateCombatUI(),
    addCombatHistory:text=>addCombatHistory(text),
    healPlayer:amount=>healPlayer(amount),
    triggerElementEffect:(key,target,options)=>triggerElementEffect(key,target,options),
    setPetDoubleBonus:()=>v19SetPetDoubleBonus(),
    petBondLevel:id=>v17PetBondLevel(id),
    hasLegendaryEffect:id=>db060HasEffect(id),
    getLastElement:()=>player._db060LastElement
  });

'''
mono = replace_once(
    mono,
    "  const dbCombatGuardOwner=window.DiceboundCombatGuardResolution;\n",
    pet_config + "  const dbCombatGuardOwner=window.DiceboundCombatGuardResolution;\n",
    "final Pet owner configuration seam",
)
write(mono_path, mono)

# ---------------------------------------------------------------------------
# Runtime ownership/load graph and browser script order.
# ---------------------------------------------------------------------------
manifest_path = ROOT / "runtime/js/module-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
load_order = manifest["loadOrder"]
if "combat-pet-turn-resolution" in load_order:
    raise SystemExit("materialize 0.6.6.7: Pet owner already in load order")
load_order.insert(load_order.index("combat-guard-resolution") + 1, "combat-pet-turn-resolution")
modules = manifest["modules"]
pet_module = {
    "id": "combat-pet-turn-resolution",
    "path": "js/combat/pet-turn-resolution.js",
    "domain": "combat/pet-and-companion-turn-resolution",
    "status": "extracted",
    "requires": [],
    "provides": ["DiceboundCombatPetTurnResolution"],
}
modules.insert(next(i for i, m in enumerate(modules) if m["id"] == "combat-enemy-policy"), pet_module)
monolith = next(m for m in modules if m["id"] == "dicebound-monolith")
requires = monolith.setdefault("requires", [])
if "combat-pet-turn-resolution" not in requires:
    requires.insert(requires.index("combat-guard-resolution") + 1, "combat-pet-turn-resolution")
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

index_path = "runtime/index.html"
index = read(index_path)
index = replace_once(
    index,
    '<script src="js/combat/guard-resolution.js"></script>\n',
    '<script src="js/combat/guard-resolution.js"></script>\n<script src="js/combat/pet-turn-resolution.js"></script>\n',
    "Pet browser script tag",
)
write(index_path, index)

# ---------------------------------------------------------------------------
# Changelog / patch notes and release identity.
# ---------------------------------------------------------------------------
changelog_path = "CHANGELOG.md"
changelog = read(changelog_path)
changelog_entry = '''## Beta 0.6.6.7

### Pet / Companion combat resolution ownership (#40, #209, #281)
- Extracted the complete Pet/companion combat transaction into `runtime/js/combat/pet-turn-resolution.js`, consolidating ordinary active-Pet turns, Beastmaster stance follow-up, Pokémon Trainer lead/assist, Summoner spirits, Primal Spark, Healing Nuzzle, set Pet-double handling, Pet Mirror and Pet/trainer damage formulas.
- Preserved Pet double/neutral-element RNG order, weakness/affinity rounding, Bond scaling, target reconciliation, presentation timing and temporary-state restoration, including the existing dynamic lexical `petTurn` compatibility seam.
- Pet chooser/feeding, Conjure orchestration, Trainer switch UI, saves/checkpoints and gameplay/balance values are unchanged.

'''
changelog = replace_once(changelog, "## Beta 0.6.6.6\n", changelog_entry + "## Beta 0.6.6.6\n", "0.6.6.7 changelog insertion")
write(changelog_path, changelog)

patch_path = "runtime/PATCH_NOTES.md"
patch_notes = read(patch_path)
patch_entry = '''# Unreleased — Beta 0.6.6.7

## Beta 0.6.6.7 Pet / Companion combat resolution ownership (#40, #209, #281)
- Pet and companion combat now resolves through one authoritative `combat/pet-turn-resolution.js` owner instead of the historical Pet/Trainer/Summoner wrapper ladder in `dicebound.js`.
- Ordinary Pets, Beastmaster stance follow-up, Pokémon Trainer lead/assist, Summoner spirits, Primal Spark, Healing Nuzzle, set Pet-double behavior, Pet Mirror and Bond-scaled Pet damage preserve their current formulas, RNG order and timing.
- Pet chooser/feeding, Conjure orchestration, Trainer switch UI, saves/checkpoints and gameplay/balance values are unchanged.

'''
patch_notes = patch_entry + patch_notes
write(patch_path, patch_notes)

# Stamp every release-facing version and runtime-script list from the manifest.
run("python", "tools/set_project_version.py", "--version", BRANCH_VERSION, "--channel", "Beta")
version_path = "runtime/js/version.js"
version_js = read(version_path)
version_js = regex_once(
    version_js,
    r'const RELEASE_SUMMARY="[^"]*";',
    'const RELEASE_SUMMARY="Pet / Companion combat resolution ownership.";',
    "0.6.6.7 release summary",
)
write(version_path, version_js)
run("python", "tools/refresh_runtime_manifest.py", "--version", BRANCH_VERSION, "--channel", "Beta", "--development-state", "Unreleased")

# ---------------------------------------------------------------------------
# Strengthen architecture/shadow-ownership guards.
# ---------------------------------------------------------------------------
shadow_path = "tools/test_shadow_ownership_drain.py"
shadow = read(shadow_path)
shadow_block = r'''
pet_retired = [
    'petTurnV13', 'petTurnV15Patch', 'petTurnV18Base', 'petTurnV19Base', 'db060PetTurnBase',
    'petDamageV13', 'petDamageV16Base', 'petDamageV17Base',
    'trainerPetDamageV16Base', 'trainerPetDamageV17Base',
]
for symbol in pet_retired:
    assert not re.search(rf'(?<![\w$]){re.escape(symbol)}(?![\w$])', mono), f"retired Pet-resolution owner returned: {symbol}"
assert mono.count('async function petTurn(') == 1, 'petTurn must have exactly one thin compatibility adapter'
assert mono.count('function petDamage(') == 1, 'petDamage must have exactly one thin compatibility adapter'
assert mono.count('function trainerPetDamage(') == 1, 'trainerPetDamage must have exactly one thin compatibility adapter'
assert not re.search(r'(?m)^  petTurn\s*=', mono), 'top-level petTurn reassignment chain must not return'
assert not re.search(r'(?m)^  petDamage\s*=', mono), 'top-level petDamage reassignment chain must not return'
assert not re.search(r'(?m)^  trainerPetDamage\s*=', mono), 'top-level trainerPetDamage reassignment chain must not return'
assert "dbCombatPetTurnResolution=dbCombatPetTurnOwner.configure({" in mono, 'combat Pet turn-resolution owner is not configured by the composition root'
assert "return dbCombatPetTurnResolution.petTurn(...args);" in mono, 'Pet turn thin adapter is missing'
assert "return dbCombatPetTurnResolution.petDamage();" in mono, 'Pet damage thin adapter is missing'
assert "return dbCombatPetTurnResolution.trainerPetDamage(id);" in mono, 'Trainer Pet damage thin adapter is missing'
'''
shadow = replace_once(
    shadow,
    "print('Monolith spring-clean guard PASS')",
    shadow_block + "\nprint('Monolith spring-clean guard PASS')",
    "Pet shadow-ownership guard insertion",
)
write(shadow_path, shadow)

validator_path = "tools/validate_runtime_architecture.py"
validator = read(validator_path)
validator_block = r'''
    pet_owner = next((m for m in modules if m.get("id") == "combat-pet-turn-resolution"), None)
    if not pet_owner or pet_owner.get("status") != "extracted":
        errors.append("combat Pet turn-resolution owner is missing or not extracted")
    else:
        if pet_owner.get("path") != "js/combat/pet-turn-resolution.js" or "DiceboundCombatPetTurnResolution" not in (pet_owner.get("provides") or []):
            errors.append("combat-pet-turn-resolution must provide DiceboundCombatPetTurnResolution from js/combat/pet-turn-resolution.js")
        if position.get("combat-pet-turn-resolution", -1) >= position.get(str(monolith_id), -1):
            errors.append("combat-pet-turn-resolution must load before the compatibility monolith")
    if monolith_source:
        if "dbCombatPetTurnResolution=dbCombatPetTurnOwner.configure({" not in monolith_source:
            errors.append("dicebound.js must configure the combat Pet turn-resolution owner")
        if monolith_source.count("async function petTurn(") != 1 or "return dbCombatPetTurnResolution.petTurn(...args);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin petTurn adapter")
        if monolith_source.count("function petDamage(") != 1 or "return dbCombatPetTurnResolution.petDamage();" not in monolith_source:
            errors.append("dicebound.js must retain only the thin petDamage adapter")
        if monolith_source.count("function trainerPetDamage(") != 1 or "return dbCombatPetTurnResolution.trainerPetDamage(id);" not in monolith_source:
            errors.append("dicebound.js must retain only the thin trainerPetDamage adapter")
        for pattern, label in (
            (r"(?m)^  petTurn\\s*=", "petTurn"),
            (r"(?m)^  petDamage\\s*=", "petDamage"),
            (r"(?m)^  trainerPetDamage\\s*=", "trainerPetDamage"),
        ):
            if re.search(pattern, monolith_source):
                errors.append(f"dicebound.js retains a top-level {label} reassignment after Pet extraction")
        for symbol in (
            "petTurnV13", "petTurnV15Patch", "petTurnV18Base", "petTurnV19Base", "db060PetTurnBase",
            "petDamageV13", "petDamageV16Base", "petDamageV17Base", "trainerPetDamageV16Base", "trainerPetDamageV17Base"
        ):
            if re.search(rf"(?<![\\w$]){re.escape(symbol)}(?![\\w$])", monolith_source):
                errors.append(f"retired combat Pet-resolution wrapper remains in dicebound.js: {symbol}")

'''
validator = replace_once(
    validator,
    '    planned_domains = [str(x) for x in manifest.get("plannedDomains") or []]\n',
    validator_block + '    planned_domains = [str(x) for x in manifest.get("plannedDomains") or []]\n',
    "Pet architecture validator insertion",
)
write(validator_path, validator)

# Fix the deterministic expectations for Bond Lv 21 / Pet Lv 11.
test_path = "tools/test_combat_pet_turn_resolution.js"
test_source = read(test_path)
test_source = replace_once(test_source, "assert.strictEqual(owner.petDamage(), 13,", "assert.strictEqual(owner.petDamage(), 14,", "active Pet Bond test expectation")
test_source = replace_once(test_source, "assert.strictEqual(owner.trainerPetDamage('fire'), 14,", "assert.strictEqual(owner.trainerPetDamage('fire'), 15,", "Trainer Pet Bond test expectation")
write(test_path, test_source)

print("Beta 0.6.6.7 Pet turn extraction materialized.")
