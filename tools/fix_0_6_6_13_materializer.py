#!/usr/bin/env python3
from pathlib import Path

path=Path(__file__).resolve().parent/'materialize_0_6_6_13_elements.py'
text=path.read_text(encoding='utf-8')

old="""mono=regex_once(mono,
    r'  function enemyElementProc\\(enemy\\)\\{.*?\\n  \\}\\n\\n  // Beta 0\\.6\\.6\\.0:',
    \"  function enemyElementProc(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.enemyElementProc.apply(this,args);}\\n\\n  // Beta 0.6.6.0:\",
    'base enemy element implementation')
"""
new="""mono=regex_once(mono,
    r'  function enemyElementProc\\(enemy\\)\\{\\n    if\\(!enemy\\?\\.affinity\\|\\|random\\(\\)>enemy\\.elementProcChance\\)return \"\";.*?\\n    addCombatHistory\\(note\\);return note;\\n  \\}',
    \"  function enemyElementProc(...args){if(!dbCombatElementResolution)throw new Error('Element-resolution owner is not configured.');return dbCombatElementResolution.enemyElementProc.apply(this,args);}\",
    'base enemy element implementation')
"""
if text.count(old)!=1:
    raise SystemExit(f'expected exactly one unsafe enemy-element regex, found {text.count(old)}')
text=text.replace(old,new,1)

old_legendary="""# 0.6 Legendary element wrappers.
mono=regex_once(mono,
    r'\\n  // Weapon-proc effects and Pet Mirror element memory\\.\\n  const db060TriggerElementBase=triggerElementEffect;\\n  triggerElementEffect=function\\(key,target=currentEnemy,opts=\\{\\}\\)\\{.*?\\n  \\};\\n  const db060TriggerWeaponBase=triggerWeaponElement;\\n  triggerWeaponElement=function\\(target=currentEnemy\\)\\{.*?\\n  \\};\\n',
    '\\n  // Weapon-proc effects and Pet Mirror element memory are owned by combat/element-resolution.js.\\n',
    '0.6 Legendary element wrappers')
"""
new_legendary="""# 0.6 Legendary element wrappers. Keep the two historical wrappers as separate
# cuts because triggerWeaponElement is intentionally a compact one-line wrapper.
mono=regex_once(mono,
    r'\\n  // Weapon-proc effects and Pet Mirror element memory\\.\\n  const db060TriggerElementBase=triggerElementEffect;\\n  triggerElementEffect=function\\(key,target=currentEnemy,opts=\\{\\}\\)\\{.*?\\n    return r;\\n  \\};\\n',
    '\\n  // Weapon-proc effects and Pet Mirror element memory are owned by combat/element-resolution.js.\\n',
    '0.6 Second Barrel element wrapper')
mono=regex_once(mono,
    r'  const db060TriggerWeaponBase=triggerWeaponElement;\\n  triggerWeaponElement=function\\(target=currentEnemy\\)\\{.*?return r;\\};\\n',
    '',
    '0.6 Prismatic Weapon wrapper')
"""
if text.count(old_legendary)!=1:
    raise SystemExit(f'expected exactly one unsafe Legendary wrapper regex, found {text.count(old_legendary)}')
text=text.replace(old_legendary,new_legendary,1)

old_helper="""def regex_once(text:str, pattern:str, replacement:str, label:str)->str:
    matches=list(re.finditer(pattern,text,flags=re.S))
    if len(matches)!=1: raise SystemExit(f'materialize 0.6.6.13: expected one {label}, found {len(matches)}')
    return re.sub(pattern,replacement,text,count=1,flags=re.S)
"""
new_helper="""def regex_once(text:str, pattern:str, replacement:str, label:str)->str:
    matches=list(re.finditer(pattern,text,flags=re.S))
    if len(matches)!=1: raise SystemExit(f'materialize 0.6.6.13: expected one {label}, found {len(matches)}')
    result=re.sub(pattern,replacement,text,count=1,flags=re.S)
    anchor='db0631RecordObservedProgress'
    if anchor in text and anchor not in result:
        raise SystemExit(f'materialize 0.6.6.13: {label} crossed protected progression anchor {anchor}')
    return result
"""
if text.count(old_helper)!=1:
    raise SystemExit(f'expected exactly one regex_once helper, found {text.count(old_helper)}')
text=text.replace(old_helper,new_helper,1)

path.write_text(text,encoding='utf-8')

# VFX mechanics moved with the elemental owner; keep the VFX test following the
# new ownership boundary instead of requiring the retired monolith wrappers.
test_path=Path(__file__).resolve().parent/'test_combat_vfx.js'
test=test_path.read_text(encoding='utf-8')
replacements={
    'const monolith = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");\n':
        'const monolith = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");\nconst elementOwner = fs.readFileSync(path.join(root, "runtime", "js", "combat", "element-resolution.js"), "utf8");\n',
    'assert.match(monolith, /dbCombatVfx\\.playDonutRain\\(\\{origin:\'player\',enemy:target\\}\\)/, "Player-origin Donut presentation is not routed with its real target");\n':
        'assert.match(monolith, /playDonutRain:payload=>dbCombatVfx\\.playDonutRain\\(payload\\)/, "Element owner composition must inject the authored Donut presentation callback");\nassert.match(elementOwner, /if \\(key === "donut" && result\\) rt\\.playDonutRain\\(\\{ origin: "player", enemy: target \\}\\);/, "Player-origin Donut presentation is not routed with its real target");\n',
    'assert.match(monolith, /const db064DonutEnemyElementProcBase=enemyElementProc;/, "Enemy-origin Donut procs are not routed through the authored VFX owner");\n':
        'assert.doesNotMatch(monolith, /db064DonutEnemyElementProcBase|db064DonutTriggerElementBase/, "Retired Donut mechanic/VFX wrappers must not survive in the monolith");\n',
    'assert.match(monolith, /if\\(isDonut&&result\\)dbCombatVfx\\.playDonutRain\\(\\{origin:\'enemy\',enemy\\}\\);/, "Enemy-origin Donut proc must play the authored rain after a real completed proc");\n':
        'assert.match(elementOwner, /if \\(isDonut && result\\) rt\\.playDonutRain\\(\\{ origin: "enemy", enemy \\}\\);/, "Enemy-origin Donut proc must play the authored rain after a real completed proc");\n',
    'assert.match(monolith, /dbCombatVfx\\.playProjectileProc\\?\\.\\(key,\\{origin:\'player\',enemy:target\\}\\)/, "Player Fire/Gun procs must use the authored projectile owner");\n':
        'assert.match(monolith, /playProjectileProc:\\(key,payload\\)=>dbCombatVfx\\.playProjectileProc\\?\\.\\(key,payload\\)/, "Element owner composition must inject the authored projectile presentation callback");\nassert.match(elementOwner, /if \\(result && \\(key === "fire" \\|\\| key === "gun"\\)\\) rt\\.playProjectileProc\\(key, \\{ origin: "player", enemy: target \\}\\);/, "Player Fire/Gun procs must use the authored projectile owner");\n'
}
for old_text,new_text in replacements.items():
    if test.count(old_text)!=1:
        raise SystemExit(f'expected one stale VFX assertion, found {test.count(old_text)}: {old_text[:80]!r}')
    test=test.replace(old_text,new_text,1)
test_path.write_text(test,encoding='utf-8')

print('Tightened materializer boundaries and updated VFX ownership assertions for 0.6.6.13')
