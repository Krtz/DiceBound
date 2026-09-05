from pathlib import Path

root = Path(__file__).resolve().parents[1]
materializer_path = Path(__file__).with_name('materialize_0664_ultimate.py')
owner_path = root / 'runtime/js/combat/ultimate-resolution.js'
test_path = root / 'tools/test_combat_ultimate_resolution.js'

# 1) Replace the brittle live-generic regex with exact audited source markers.
s = materializer_path.read_text(encoding='utf-8')
old = '''# The later full generic owner is the semantically live base beneath the wrapper tower.\nmono = remove_once(\n    mono,\n    r'\\n  useUltimate=async function\\(\\)\\{\\n    if\\(combatBusy\\|\\|!currentEnemy\\|\\|player\\.ultimateCharge<100\\)[\\s\\S]*?\\n  \\};(?=\\n\\n\\n  async function bloodmageExsanguinate)',\n    'remove later generic Ultimate base',\n)\n'''
new = '''# The later full generic owner is the semantically live base beneath the wrapper tower.\n# Use audited source markers rather than a body regex: class-body details are intentionally\n# allowed to be dense, while both section boundaries must still match exactly once.\ngeneric_start = '\\n  useUltimate=async function(){\\n'\ngeneric_end = '\\n  // Board 4 is now intentionally cruel.'\nstart_at = mono.find(generic_start)\nif start_at < 0:\n    raise RuntimeError('remove later generic Ultimate base: start marker missing')\nend_at = mono.find(generic_end, start_at)\nif end_at < 0:\n    raise RuntimeError('remove later generic Ultimate base: end marker missing')\nif mono.find(generic_start, start_at + len(generic_start), end_at) >= 0:\n    raise RuntimeError('remove later generic Ultimate base: ambiguous nested start marker')\nmono = mono[:start_at] + mono[end_at:]\n'''
if old not in s:
    # The earlier temporary patch may have changed only the regex literal in a runner.
    # Repository source should normally take this branch only once; fail rather than guess.
    start = s.find('# The later full generic owner is the semantically live base beneath the wrapper tower.\n')
    end = s.find('\n# V11 Bloodmage intercept.', start)
    if start < 0 or end < 0:
        raise SystemExit('audited generic Ultimate materializer section not found')
    s = s[:start] + new + s[end+1:]
else:
    s = s.replace(old, new, 1)

# Compose the old ALPHA_COMBAT_DELAY through the new owner.
needle = '    delay:ms=>delay(ms),\n'
if 'getCombatActionDelay:()=>ALPHA_COMBAT_DELAY' not in s:
    if needle not in s:
        raise SystemExit('Ultimate composition delay anchor missing')
    s = s.replace(needle, needle + '    getCombatActionDelay:()=>ALPHA_COMBAT_DELAY,\n', 1)
materializer_path.write_text(s, encoding='utf-8', newline='\n')

# 2) Make the owner consume lexical combatBusy and preserve the historical per-hit pause
# in Frog/Ninja generic Ultimates.
o = owner_path.read_text(encoding='utf-8')
if '"getCombatBusy"' not in o:
    o = o.replace('"getEncounterLead","livingEnemies","setCombatBusy"', '"getEncounterLead","livingEnemies","getCombatBusy","setCombatBusy"', 1)
if '"getCombatActionDelay"' not in o:
    o = o.replace('"playCritSfx","playHolySfx","delay","winCombat"', '"playCritSfx","playHolySfx","delay","getCombatActionDelay","winCombat"', 1)
o = o.replace('p.combatBusy', 'rt.getCombatBusy()')

frog_old = 'await rt.animateClassAttack(i ? "echo" : "normal"); }'
frog_new = 'await rt.animateClassAttack(i ? "echo" : "normal"); await rt.delay(rt.getCombatActionDelay()); }'
if frog_new not in o:
    if frog_old not in o:
        raise SystemExit('Frog Ultimate per-hit animation anchor missing')
    o = o.replace(frog_old, frog_new, 1)

ninja_old = 'await rt.animateClassAttack("crit"); }'
ninja_new = 'await rt.animateClassAttack("crit"); await rt.delay(rt.getCombatActionDelay()); }'
if ninja_new not in o:
    if ninja_old not in o:
        raise SystemExit('Ninja Ultimate per-hit animation anchor missing')
    o = o.replace(ninja_old, ninja_new, 1)
owner_path.write_text(o, encoding='utf-8', newline='\n')

# 3) Pin those pauses in deterministic tests so they cannot vanish in a later cleanup.
t = test_path.read_text(encoding='utf-8')
if 'getCombatActionDelay: () => 200' not in t:
    anchor = "    delay: async ms => trace.push(['delay', ms]), winCombat: async () => { trace.push(['win']); return 'win'; },\n"
    if anchor not in t:
        raise SystemExit('Ultimate test delay runtime anchor missing')
    t = t.replace(anchor, "    delay: async ms => trace.push(['delay', ms]), getCombatActionDelay: () => 200, winCombat: async () => { trace.push(['win']); return 'win'; },\n", 1)

# Add a charged Ninja timing fixture immediately before the Ouroboros fixture.
if 'Ninja charged Ultimate preserves five 200ms per-hit pauses' not in t:
    anchor = "  // Ouroboros bypasses lower generic/D20 logic, picks only after its first target, rolls once per hit, then calls petTurn.\n"
    fixture = '''  // Ninja charged Ultimate preserves five 200ms per-hit pauses before the final 850ms handoff.\n  {\n    const h = makeHarness({ classId: 'ninja', player: { ultimateCharge: 100, ninjaSmoke: 0, ninjaSmokeNeed: 3 }, critValues: [0,0,0,0,0] });\n    await owner.start();\n    const delays = h.trace.filter(x => x[0] === 'delay').map(x => x[1]);\n    assert.deepStrictEqual(delays, [200,200,200,200,200,850], 'Ninja charged Ultimate preserves five 200ms per-hit pauses');\n  }\n\n'''
    if anchor not in t:
        raise SystemExit('Ultimate Ninja timing fixture anchor missing')
    t = t.replace(anchor, fixture + anchor, 1)

# Strengthen the existing Frog fixture with its exact 10 per-hit pauses at 100% Echo.
if 'Frog charged Ultimate preserves ten 200ms per-hit pauses' not in t:
    anchor = "    const packets = h.trace.filter(x => x[0] === 'damageEnemy'); assert(packets.length > 0 && packets.every(x => x[4] > 0), 'Croak hit lifetime must surround damage calls'); assert.strictEqual(h.player._v25CroakHitsRemaining, 0);\n"
    addition = anchor + "    const frogDelays = h.trace.filter(x => x[0] === 'delay').map(x => x[1]); assert.deepStrictEqual(frogDelays, [...Array(10).fill(200),850], 'Frog charged Ultimate preserves ten 200ms per-hit pauses');\n"
    if anchor not in t:
        raise SystemExit('Ultimate Frog timing assertion anchor missing')
    t = t.replace(anchor, addition, 1)

test_path.write_text(t, encoding='utf-8', newline='\n')
print('Patched 0.6.6.4 Ultimate materializer markers, combatBusy ownership and per-hit delay contract')
