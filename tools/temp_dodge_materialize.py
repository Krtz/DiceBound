from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(relpath, old, new, label):
    path = ROOT / relpath
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match in {relpath}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# Canonical Combat Presentation owns generic unit Dodge motion and cleanup.
replace_once(
    "runtime/js/combat/presentation.js",
    "  let runtime = null;\n  let dragoonLandingTimer = 0;\n",
    "  let runtime = null;\n  let dragoonLandingTimer = 0;\n  const dodgeTimers = new Map();\n",
    "Dodge timer registry",
)
replace_once(
    "runtime/js/combat/presentation.js",
    "  function syncDragoonPresentation() {\n",
    '''  function combatUnitElement(unit = "player") {
    const rt = requireRuntime();
    if (unit && typeof unit === "object" && unit.classList) return unit;
    if (unit === "player") return rt.find("combatPlayerIcon");
    if (unit === "enemy" || unit === "target") return rt.find("enemyIcon");
    return typeof unit === "string" ? rt.find(unit) : null;
  }

  function dodge(unit = "player") {
    const icon = combatUnitElement(unit);
    if (!icon?.classList) return false;
    const prior = dodgeTimers.get(icon);
    if (prior != null) clearTimeout(prior);
    icon.classList.remove("db-dodge-backflip");
    void icon.offsetWidth;
    icon.classList.add("db-dodge-backflip");
    const timer = setTimeout(() => {
      icon.classList.remove("db-dodge-backflip");
      dodgeTimers.delete(icon);
    }, 420);
    dodgeTimers.set(icon, timer);
    return true;
  }

  function clearDodgePresentation(unit = null) {
    const rt = requireRuntime();
    const targets = unit == null ? [...dodgeTimers.keys()] : [combatUnitElement(unit)].filter(Boolean);
    for (const icon of targets) {
      const timer = dodgeTimers.get(icon);
      if (timer != null) clearTimeout(timer);
      dodgeTimers.delete(icon);
      icon.classList?.remove("db-dodge-backflip");
    }
    if (unit == null) {
      rt.find("combatPlayerIcon")?.classList?.remove("db-dodge-backflip");
      rt.find("enemyIcon")?.classList?.remove("db-dodge-backflip");
    }
  }

  function syncDragoonPresentation() {
''',
    "generic Dodge presentation functions",
)
replace_once(
    "runtime/js/combat/presentation.js",
    "    syncEnergyShieldBars,\n    syncDragoonPresentation,\n",
    "    syncEnergyShieldBars,\n    dodge,\n    clearDodgePresentation,\n    syncDragoonPresentation,\n",
    "Dodge presentation API",
)

# Combat View is the public presentation boundary.
replace_once(
    "runtime/js/combat/view-facade.js",
    '    syncEnergyShieldBars: (...args) => optionalPresentation("syncEnergyShieldBars", args),\n    syncDragoonPresentation: (...args) => optionalPresentation("syncDragoonPresentation", args),\n',
    '    syncEnergyShieldBars: (...args) => optionalPresentation("syncEnergyShieldBars", args),\n    dodge: (...args) => requirePresentation().dodge(...args),\n    clearDodgePresentation: (...args) => optionalPresentation("clearDodgePresentation", args),\n    syncDragoonPresentation: (...args) => optionalPresentation("syncDragoonPresentation", args),\n',
    "Combat View Dodge facade",
)
replace_once(
    "runtime/js/combat/view-facade.js",
    "      if (presentation) presentation.clearDragoonPresentation();\n",
    "      if (presentation) { presentation.clearDodgePresentation(); presentation.clearDragoonPresentation(); }\n",
    "Combat View transient Dodge cleanup",
)

# Turn Resolution owns one semantic successful-Dodge route, irrespective of attack source.
replace_once(
    "runtime/js/combat/turn-resolution.js",
    '      "recordDamageTaken","wolfEchoChance","successfulDodgePresentation","dragoonActive"\n',
    '      "recordDamageTaken","wolfEchoChance","dodge","dragoonActive"\n',
    "generic Dodge runtime capability",
)
replace_once(
    "runtime/js/combat/turn-resolution.js",
    "  function getPlayer() { return requireRuntime().getPlayer(); }\n  function livingEnemies() { return requireRuntime().livingEnemies(); }\n\n",
    '''  function getPlayer() { return requireRuntime().getPlayer(); }
  function livingEnemies() { return requireRuntime().livingEnemies(); }

  function successfulDodge(messages, message) {
    requireRuntime().dodge("player");
    messages.push(message);
  }

''',
    "semantic successful Dodge helper",
)
replace_once(
    "runtime/js/combat/turn-resolution.js",
    '''      if (rt.random() < rt.effectiveDodgeChance()) {
        dodged += 1;
        messages.push(`${enemy.name} ${pattern.hits.length > 1 ? `${pattern.name} hit ${i + 1}` : pattern.name} is dodged.`);
        continue;
      }
''',
    '''      if (rt.random() < rt.effectiveDodgeChance()) {
        dodged += 1;
        successfulDodge(messages, `${enemy.name} ${pattern.hits.length > 1 ? `${pattern.name} hit ${i + 1}` : pattern.name} is dodged.`);
        continue;
      }
''',
    "ordinary Dodge route",
)
replace_once(
    "runtime/js/combat/turn-resolution.js",
    "    rt.checkDynamicClassUnlocks(); rt.saveMeta(); rt.playHitSfx();\n",
    "    rt.checkDynamicClassUnlocks(); rt.saveMeta(); if (roundState.hit) rt.playHitSfx();\n",
    "pure Dodge hit-SFX suppression",
)
replace_once(
    "runtime/js/combat/turn-resolution.js",
    "      if (rt.random() < rt.effectiveDodgeChance()) { rt.successfulDodgePresentation(); notes.push(`🐺 ${wolf.name}'s Echo Strike is dodged.`); continue; }\n",
    "      if (rt.random() < rt.effectiveDodgeChance()) { successfulDodge(notes, `🐺 ${wolf.name}'s Echo Strike is dodged.`); continue; }\n",
    "Wolf Echo generic Dodge route",
)

# Retire the monolith visual helper and compose Turn Resolution through Combat View.
replace_once(
    "runtime/js/dicebound.js",
    '''  function dbFriendSuccessfulDodgePresentation(){
    const icon=$(\'combatPlayerIcon\');if(!icon)return false;
    icon.classList.remove(\'db-dodge-backflip\');void icon.offsetWidth;icon.classList.add(\'db-dodge-backflip\');
    setTimeout(()=>icon.classList.remove(\'db-dodge-backflip\'),420);return true;
  }
''',
    "",
    "retire monolith Dodge helper",
)
replace_once(
    "runtime/js/dicebound.js",
    "    successfulDodgePresentation:()=>dbFriendSuccessfulDodgePresentation(),\n",
    "    dodge:unit=>dbCombatView.dodge(unit),\n",
    "compose generic Dodge via Combat View",
)

# Make the generic animation visibly backflip, land farther back, then slide home.
replace_once(
    "runtime/css/dicebound.css",
    ".fighter-icon.db-dodge-backflip{animation:dbDodgeBackflip .38s cubic-bezier(.25,.85,.32,1)}@keyframes dbDodgeBackflip{0%{transform:translateX(0) rotate(0) scale(1)}42%{transform:translateX(-28px) translateY(-14px) rotate(-155deg) scale(.97)}74%{transform:translateX(-34px) translateY(0) rotate(-310deg) scale(1)}100%{transform:translateX(0) rotate(-360deg) scale(1)}}",
    ".fighter-icon.db-dodge-backflip{animation:dbDodgeBackflip .40s cubic-bezier(.25,.85,.32,1)}@keyframes dbDodgeBackflip{0%{transform:translateX(0) translateY(0) rotate(0) scale(1)}38%{transform:translateX(-30px) translateY(-16px) rotate(-170deg) scale(.97)}62%{transform:translateX(-38px) translateY(0) rotate(-330deg) scale(1)}74%{transform:translateX(-38px) translateY(0) rotate(-360deg) scale(1)}100%{transform:translateX(0) translateY(0) rotate(-360deg) scale(1)}}",
    "backflip-land-slide animation",
)

# Turn-resolution oracle covers ordinary, multi-hit, pack and Wolf Echo Dodge through one route.
replace_once(
    "tools/test_combat_turn_resolution.js",
    '    successfulDodgePresentation:()=>{calls.push(["dodge-presentation"]);},\n',
    '    dodge:unit=>{calls.push(["dodge",unit]);return true;},\n',
    "turn test generic Dodge runtime",
)
replace_once(
    "tools/test_combat_turn_resolution.js",
    '''  {
    const h=makeHarness();
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,90,"ordinary enemy turn must preserve incoming damage");
    assert.equal(h.damageTaken(),10);
    assert.equal(h.turn(),1);
    assert.deepEqual(h.calls.filter(call=>call[0]==="delay").map(call=>call[1]),[980]);
  }
''',
    '''  {
    const h=makeHarness();
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,90,"ordinary enemy turn must preserve incoming damage");
    assert.equal(h.damageTaken(),10);
    assert.equal(h.turn(),1);
    assert.equal(h.calls.filter(call=>call[0]==="hit-sfx").length,1,"a landed hit keeps hit presentation");
    assert.deepEqual(h.calls.filter(call=>call[0]==="delay").map(call=>call[1]),[980]);
  }
  {
    const h=makeHarness({dodgeChance:1,randomValues:[0]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100,"ordinary successful Dodge must prevent damage");
    assert.deepEqual(h.calls.filter(call=>call[0]==="dodge"),[["dodge","player"]]);
    assert.equal(h.calls.filter(call=>call[0]==="hit-sfx").length,0,"pure Dodge must not also play a hit SFX");
    assert.equal(h.calls.filter(call=>call[0]==="damage-taken").length,0);
  }
  {
    const hydra={name:"Nullstar Hydra",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0};
    const h=makeHarness({dodgeChance:1,randomValues:[0,0,0],enemies:[hydra]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100);
    assert.equal(h.calls.filter(call=>call[0]==="dodge").length,3,"each independently dodged multi-hit strike retriggers generic Dodge");
    assert.equal(h.calls.filter(call=>call[0]==="rand").length,0,"dodged hits consume no damage-variance RNG");
  }
  {
    const h=makeHarness({dodgeChance:1,randomValues:[0,0],enemies:[
      {name:"First Enemy",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0},
      {name:"Second Enemy",hp:100,maxHp:100,attack:10,defense:0,skipTurns:0,freezeCooldown:0,poisonStacks:0,burnStacks:0,lifeSteal:0}
    ]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100);
    assert.equal(h.calls.filter(call=>call[0]==="dodge").length,2,"every dodging enemy attack in a pack uses the same generic route");
  }
''',
    "turn Dodge matrix",
)
replace_once(
    "tools/test_combat_turn_resolution.js",
    '''  {
    const wolf={name:"Road Wolf",hp:100,maxHp:100,attack:5,defense:0,skipTurns:1,lifeSteal:0};
    const h=makeHarness({enemies:[wolf],wolfEchoChance:1,randomValues:[.5,.5]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,95,"Wolf Echo must still resolve after the ordinary turn");
    assert.equal(h.damageTaken(),10,"historical Wolf Echo damageTaken double-recording is intentionally preserved by extraction");
    assert.deepEqual(h.calls.filter(call=>call[0]==="random").map(call=>call[1]),[.5,.5],"Wolf Echo must preserve chance-then-dodge RNG order");
  }
''',
    '''  {
    const wolf={name:"Road Wolf",hp:100,maxHp:100,attack:5,defense:0,skipTurns:1,lifeSteal:0};
    const h=makeHarness({enemies:[wolf],wolfEchoChance:1,randomValues:[.5,.5]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,95,"Wolf Echo must still resolve after the ordinary turn");
    assert.equal(h.damageTaken(),10,"historical Wolf Echo damageTaken double-recording is intentionally preserved by extraction");
    assert.deepEqual(h.calls.filter(call=>call[0]==="random").map(call=>call[1]),[.5,.5],"Wolf Echo must preserve chance-then-dodge RNG order");
  }
  {
    const wolf={name:"Road Wolf",hp:100,maxHp:100,attack:5,defense:0,skipTurns:1,lifeSteal:0};
    const h=makeHarness({enemies:[wolf],wolfEchoChance:1,dodgeChance:1,randomValues:[.5,0]});
    await turns.enemyTurn(false,0);
    assert.equal(h.player.hp,100,"dodged Wolf Echo must deal no damage");
    assert.deepEqual(h.calls.filter(call=>call[0]==="dodge"),[["dodge","player"]],"Wolf Echo uses the generic Dodge route");
    assert.equal(h.calls.filter(call=>call[0]==="hit-sfx").length,0);
  }
''',
    "Wolf generic Dodge test",
)
replace_once(
    "tools/test_combat_turn_resolution.js",
    'assert.equal((monolith.match(/async function resolveEnemyResponse\\(/g)||[]).length,1,"resolveEnemyResponse is a real first-class interception seam and must remain singular");\n',
    '''assert.equal((monolith.match(/async function resolveEnemyResponse\\(/g)||[]).length,1,"resolveEnemyResponse is a real first-class interception seam and must remain singular");
assert.doesNotMatch(source,/successfulDodgePresentation/,"path-specific Dodge presentation capability must stay retired");
assert.match(source,/function successfulDodge\\(messages, message\\)/,"Turn Resolution must retain one semantic successful-Dodge route");
assert.doesNotMatch(monolith,/dbFriendSuccessfulDodgePresentation/,"Dodge presentation must not return to the monolith");
assert.match(monolith,/dodge:unit=>dbCombatView\\.dodge\\(unit\\)/,"Turn composition must route generic Dodge through Combat View");
''',
    "Dodge ownership anti-return tests",
)

# Presentation oracle proves the generic unit API, retrigger and cleanup lifecycle.
replace_once(
    "tools/test_combat_presentation.js",
    '''const documentNodes = new Map();
const combatOverlay = { dataset: {}, style: fakeStyle(), classList: { add(){}, remove(){}, toggle(){} } };
''',
    '''function fakeClassList() {
  const values = new Set();
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    toggle(name, force) { if (force === undefined ? !values.has(name) : force) values.add(name); else values.delete(name); },
    contains(name) { return values.has(name); }
  };
}
const documentNodes = new Map();
const combatOverlay = { dataset: {}, style: fakeStyle(), classList: fakeClassList() };
const combatPlayerIcon = { classList: fakeClassList(), offsetWidth: 42 };
const combatEnemyIcon = { classList: fakeClassList(), offsetWidth: 42 };
''',
    "presentation Dodge DOM fixtures",
)
replace_once(
    "tools/test_combat_presentation.js",
    "    find: id => id === 'combatOverlay' ? combatOverlay : null,\n",
    "    find: id => id === 'combatOverlay' ? combatOverlay : id === 'combatPlayerIcon' ? combatPlayerIcon : id === 'enemyIcon' ? combatEnemyIcon : null,\n",
    "presentation generic unit resolver fixture",
)
replace_once(
    "tools/test_combat_presentation.js",
    "assert(owner.statusDotsHTML(2, 3, 'fire').includes('Fire affinity'));\n\n",
    '''assert(owner.statusDotsHTML(2, 3, 'fire').includes('Fire affinity'));

assert.strictEqual(owner.dodge('player'), true);
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), true);
assert.strictEqual(owner.dodge('player'), true, 'rapid repeated Dodge must retrigger cleanly');
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), true);
assert.strictEqual(owner.dodge('enemy'), true, 'the animation API is generic to a combat unit, not Wolf-specific');
assert.strictEqual(combatEnemyIcon.classList.contains('db-dodge-backflip'), true);
owner.clearDodgePresentation();
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), false);
assert.strictEqual(combatEnemyIcon.classList.contains('db-dodge-backflip'), false);

''',
    "presentation generic Dodge tests",
)

# Facade oracle proves Combat View is the public presentation boundary and cleans transient Dodge state.
replace_once(
    "tools/test_combat_view_facade.js",
    '  syncEnergyShieldBars: (...args) => { calls.push(["presentation.syncEnergyShieldBars", ...args]); return "shield"; },\n  syncDragoonPresentation: (...args) => { calls.push(["presentation.syncDragoonPresentation", ...args]); return "dragoon-sync"; },\n',
    '  syncEnergyShieldBars: (...args) => { calls.push(["presentation.syncEnergyShieldBars", ...args]); return "shield"; },\n  dodge: (...args) => { calls.push(["presentation.dodge", ...args]); return true; },\n  clearDodgePresentation: (...args) => { calls.push(["presentation.clearDodgePresentation", ...args]); return "dodge-clear"; },\n  syncDragoonPresentation: (...args) => { calls.push(["presentation.syncDragoonPresentation", ...args]); return "dragoon-sync"; },\n',
    "Combat View Dodge fixtures",
)
replace_once(
    "tools/test_combat_view_facade.js",
    'assert.equal(view.syncEnergyShieldBars(), "shield");\nassert.equal(view.syncDragoonPresentation(), "dragoon-sync");\n',
    'assert.equal(view.syncEnergyShieldBars(), "shield");\nassert.equal(view.dodge("player"), true);\nassert.deepEqual(calls.at(-1), ["presentation.dodge", "player"]);\nassert.equal(view.syncDragoonPresentation(), "dragoon-sync");\n',
    "Combat View Dodge forwarding test",
)
replace_once(
    "tools/test_combat_view_facade.js",
    'assert.deepEqual(calls.slice(clearStart).map(call => call[0]), ["vfx.clearTransient", "presentation.clearDragoonPresentation"], "transition cleanup must retain VFX-then-Dragoon presentation order");\n',
    'assert.deepEqual(calls.slice(clearStart).map(call => call[0]), ["vfx.clearTransient", "presentation.clearDodgePresentation", "presentation.clearDragoonPresentation"], "transition cleanup must clear VFX, Dodge and Dragoon presentation state");\n',
    "Combat View Dodge cleanup test",
)
replace_once(
    "tools/test_combat_view_facade.js",
    'assert.doesNotMatch(monolith, /\\bdbCombatVfx\\b/, "peer-public VFX variable must not survive in the monolith");\n',
    'assert.doesNotMatch(monolith, /\\bdbCombatVfx\\b/, "peer-public VFX variable must not survive in the monolith");\nassert.doesNotMatch(monolith, /dbFriendSuccessfulDodgePresentation/, "generic Dodge presentation must not be owned by the monolith");\nassert.match(monolith, /dodge:unit=>dbCombatView\\.dodge\\(unit\\)/, "Turn composition must route generic Dodge through Combat View");\n',
    "Combat View Dodge anti-return test",
)

(ROOT / "runtime/release-notes/0.6.7.5.md").write_text(
    """# Beta 0.6.7.5 — Generic Dodge\n\n"
    "- Makes Dodge one generic incoming-combat outcome instead of path-specific presentation logic.\n"
    "- Routes ordinary hits, multi-hit attacks, enemy packs and Wolf Echo through the same Combat View Dodge presentation.\n"
    "- Moves the backflip/land/slide lifecycle out of `dicebound.js` and into canonical Combat Presentation, with retrigger-safe cleanup.\n"
    "- Prevents pure successful-Dodge turns from also playing hit SFX.\n"
    "- Adds deterministic coverage for the #331 regression and the automatable #162 verification matrix.\n"
    """,
    encoding="utf-8",
)
