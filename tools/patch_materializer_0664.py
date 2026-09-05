from pathlib import Path

root = Path(__file__).resolve().parents[1]
materializer_path = Path(__file__).with_name('materialize_0664_ultimate.py')
owner_path = root / 'runtime/js/combat/ultimate-resolution.js'
test_path = root / 'tools/test_combat_ultimate_resolution.js'
effective_test_path = root / 'tools/test_effective_stats.js'

s = materializer_path.read_text(encoding='utf-8')

# 1) The first declared useUltimate sits immediately before rollTieredProc and the
# already-extracted strike adapters/playerAttack. Replace only that declaration;
# never span forward to guardAction, or we'd erase another owner's boundary.
first_section_start = s.find('# Earliest callable becomes the one compatibility adapter.')
first_section_end = s.find('\n# The later full generic owner is the semantically live base beneath the wrapper tower.', first_section_start)
if first_section_start < 0 or first_section_end < 0:
    raise SystemExit('audited first Ultimate adapter materializer section not found')
first_replacement = '''# Earliest callable becomes the one compatibility adapter. The later full generic
# implementation and every historical wrapper layer are deleted below. The end
# marker deliberately stops before rollTieredProc so strike ownership survives.
first_start = chr(10) + '  async function useUltimate(){' + chr(10)
first_end = chr(10) * 2 + '  function rollTieredProc('
start_at = mono.find(first_start)
if start_at < 0:
    raise RuntimeError('replace original useUltimate with adapter: start marker missing')
end_at = mono.find(first_end, start_at)
if end_at < 0:
    raise RuntimeError('replace original useUltimate with adapter: end marker missing')
adapter = chr(10) + "  async function useUltimate(...args){if(!dbCombatUltimateResolution)throw new Error('Combat Ultimate-resolution owner is not configured.');return dbCombatUltimateResolution.start(...args);}"
mono = mono[:start_at] + adapter + mono[end_at:]
'''
s = s[:first_section_start] + first_replacement + s[first_section_end+1:]

# 2) Remove the later semantically-live generic owner by audited section markers.
generic_section_start = s.find('# The later full generic owner is the semantically live base beneath the wrapper tower.')
generic_section_end = s.find('\n# V11 Bloodmage intercept.', generic_section_start)
if generic_section_start < 0 or generic_section_end < 0:
    raise SystemExit('audited generic Ultimate materializer section not found')
generic_replacement = '''# The later full generic owner is the semantically live base beneath the wrapper tower.
# Use audited source markers rather than a body regex: class-body details are intentionally
# allowed to be dense, while both section boundaries must still match exactly once.
generic_start = chr(10) + '  useUltimate=async function(){' + chr(10)
generic_end = chr(10) + '  // Board 4 is now intentionally cruel.'
start_at = mono.find(generic_start)
if start_at < 0:
    raise RuntimeError('remove later generic Ultimate base: start marker missing')
end_at = mono.find(generic_end, start_at)
if end_at < 0:
    raise RuntimeError('remove later generic Ultimate base: end marker missing')
if mono.find(generic_start, start_at + len(generic_start), end_at) >= 0:
    raise RuntimeError('remove later generic Ultimate base: ambiguous nested start marker')
mono = mono[:start_at] + mono[end_at:]
'''
s = s[:generic_section_start] + generic_replacement + s[generic_section_end+1:]

# Compose the old ALPHA_COMBAT_DELAY and authoritative effective-stat helpers through the new owner.
needle = '    delay:ms=>delay(ms),\n'
if 'getCombatActionDelay:()=>ALPHA_COMBAT_DELAY' not in s:
    if needle not in s:
        raise SystemExit('Ultimate composition delay anchor missing')
    s = s.replace(needle, needle + '    getCombatActionDelay:()=>ALPHA_COMBAT_DELAY,\n', 1)
stat_anchor = '    getSetDamageBonus:()=>v19SetDamageBonus(),\n'
if 'ultimateBaseDamage:(classId,actor,bonus)=>DB_EFFECTIVE_STATS.ultimateBaseDamage' not in s:
    if stat_anchor not in s:
        raise SystemExit('Ultimate effective-stat composition anchor missing')
    s = s.replace(stat_anchor, stat_anchor + '    ultimateBaseDamage:(classId,actor,bonus)=>DB_EFFECTIVE_STATS.ultimateBaseDamage(classId,actor,bonus),\n    scaleUltimateDamage:(damage,actor,opts)=>DB_EFFECTIVE_STATS.scaleUltimateDamage(damage,actor,opts),\n', 1)
materializer_path.write_text(s, encoding='utf-8', newline='\n')

# 3) Make the owner consume lexical combatBusy, authoritative effective stats, and preserve
# the historical per-hit pause in Frog/Ninja generic Ultimates.
o = owner_path.read_text(encoding='utf-8')
if '"getCombatBusy"' not in o:
    o = o.replace('"getEncounterLead","livingEnemies","setCombatBusy"', '"getEncounterLead","livingEnemies","getCombatBusy","setCombatBusy"', 1)
if '"getCombatActionDelay"' not in o:
    o = o.replace('"playCritSfx","playHolySfx","delay","winCombat"', '"playCritSfx","playHolySfx","delay","getCombatActionDelay","winCombat"', 1)
if '"ultimateBaseDamage"' not in o:
    o = o.replace('"isClassActive","hasLegendaryEffect","random","rand","pick","clamp","rollTieredProc","getSetDamageBonus",', '"isClassActive","hasLegendaryEffect","random","rand","pick","clamp","rollTieredProc","getSetDamageBonus","ultimateBaseDamage","scaleUltimateDamage",', 1)
o = o.replace('p.combatBusy', 'rt.getCombatBusy()')
berserker_old = 'damage = Math.round(p.attack * 2.8) + rt.rand(5, 10); text = "Ragequake shatters the pack for {DAMAGE}.";'
berserker_new = 'damage = rt.ultimateBaseDamage("berserker", p, rt.rand(5, 10)); text = "Ragequake shatters the pack for {DAMAGE}.";'
if berserker_new not in o:
    if berserker_old not in o:
        raise SystemExit('Berserker authoritative Ultimate base-damage anchor missing')
    o = o.replace(berserker_old, berserker_new, 1)
scale_old = 'damage = Math.round(damage * (chaos.mult || 1) * (1 + p.classUltimateBonus) * (1 + p.ultimateDamageBonus) * (1 + p.damageBonus + rt.getSetDamageBonus()));'
scale_new = 'damage = rt.scaleUltimateDamage(damage, p, { chaosMultiplier: chaos.mult || 1, setDamageBonus: rt.getSetDamageBonus() });'
if scale_new not in o:
    if scale_old not in o:
        raise SystemExit('authoritative Ultimate scaling anchor missing')
    o = o.replace(scale_old, scale_new, 1)

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

# 4) Pin pauses, historical Summoner retry RNG and stat-service delegation in deterministic tests.
t = test_path.read_text(encoding='utf-8')
if 'getCombatActionDelay: () => 200' not in t:
    anchor = "    delay: async ms => trace.push(['delay', ms]), winCombat: async () => { trace.push(['win']); return 'win'; },\n"
    if anchor not in t:
        raise SystemExit('Ultimate test delay runtime anchor missing')
    t = t.replace(anchor, "    delay: async ms => trace.push(['delay', ms]), getCombatActionDelay: () => 200, winCombat: async () => { trace.push(['win']); return 'win'; },\n", 1)

runtime_stat_anchor = '    getSetDamageBonus: () => options.setDamageBonus || 0,\n'
if 'ultimateBaseDamage: (classId, actor, bonus)' not in t:
    if runtime_stat_anchor not in t:
        raise SystemExit('Ultimate test effective-stat runtime anchor missing')
    t = t.replace(runtime_stat_anchor, runtime_stat_anchor + "    ultimateBaseDamage: (classId, actor, bonus) => { trace.push(['ultimateBaseDamage', classId, bonus]); return Math.round(actor.attack * 2.8) + bonus; },\n    scaleUltimateDamage: (damage, actor, opts) => { trace.push(['scaleUltimateDamage', damage, opts.chaosMultiplier, opts.setDamageBonus]); return Math.round(damage * (opts.chaosMultiplier || 1) * (1 + actor.classUltimateBonus) * (1 + actor.ultimateDamageBonus) * (1 + actor.damageBonus + (opts.setDamageBonus || 0))); },\n", 1)

summoner_old = "const picks = h.trace.filter(x => x[0] === 'pick'); assert.strictEqual(picks.length, 2); assert(h.trace.findIndex(x => x[0] === 'pick') < h.trace.findIndex(x => x[0] === 'damageAll'));"
summoner_new = "const picks = h.trace.filter(x => x[0] === 'pick'); assert.strictEqual(picks.length, 4, 'Summoner duplicate-spirit retries must preserve all four seeded pick RNG draws'); assert(h.trace.findIndex(x => x[0] === 'pick') < h.trace.findIndex(x => x[0] === 'damageAll'));"
if summoner_new not in t:
    if summoner_old not in t:
        raise SystemExit('Summoner retry RNG fixture anchor missing')
    t = t.replace(summoner_old, summoner_new, 1)

if 'Berserker generic Ultimate delegates base and final scaling to the effective-stat service' not in t:
    anchor = '  // D20 chaos is consumed before its class-specific rand.\n'
    fixture = '''  // Berserker generic Ultimate delegates base and final scaling to the effective-stat service.
  {
    const h = makeHarness({ classId: 'berserker', randValues: [5] });
    await owner._test.genericUltimate();
    assert(h.trace.some(x => x[0] === 'ultimateBaseDamage' && x[1] === 'berserker' && x[2] === 5));
    assert(h.trace.some(x => x[0] === 'scaleUltimateDamage'));
  }

'''
    if anchor not in t:
        raise SystemExit('Berserker stat-service fixture anchor missing')
    t = t.replace(anchor, fixture + anchor, 1)

if 'Ninja charged Ultimate preserves five 200ms per-hit pauses' not in t:
    anchor = "  // Ouroboros bypasses lower generic/D20 logic, picks only after its first target, rolls once per hit, then calls petTurn.\n"
    fixture = '''  // Ninja charged Ultimate preserves five 200ms per-hit pauses before the final 850ms handoff.
  {
    const h = makeHarness({ classId: 'ninja', player: { ultimateCharge: 100, ninjaSmoke: 0, ninjaSmokeNeed: 3 }, critValues: [0,0,0,0,0] });
    await owner.start();
    const delays = h.trace.filter(x => x[0] === 'delay').map(x => x[1]);
    assert.deepStrictEqual(delays, [200,200,200,200,200,850], 'Ninja charged Ultimate preserves five 200ms per-hit pauses');
  }

'''
    if anchor not in t:
        raise SystemExit('Ultimate Ninja timing fixture anchor missing')
    t = t.replace(anchor, fixture + anchor, 1)

if 'Frog charged Ultimate preserves ten 200ms per-hit pauses' not in t:
    anchor = "    const packets = h.trace.filter(x => x[0] === 'damageEnemy'); assert(packets.length > 0 && packets.every(x => x[4] > 0), 'Croak hit lifetime must surround damage calls'); assert.strictEqual(h.player._v25CroakHitsRemaining, 0);\n"
    addition = anchor + "    const frogDelays = h.trace.filter(x => x[0] === 'delay').map(x => x[1]); assert.deepStrictEqual(frogDelays, [...Array(10).fill(200),850], 'Frog charged Ultimate preserves ten 200ms per-hit pauses');\n"
    if anchor not in t:
        raise SystemExit('Ultimate Frog timing assertion anchor missing')
    t = t.replace(anchor, addition, 1)

test_path.write_text(t, encoding='utf-8', newline='\n')

# The existing effective-stats regression follows ownership into the extracted module while
# still asserting that the monolith composition root delegates to DB_EFFECTIVE_STATS.
e = effective_test_path.read_text(encoding='utf-8')
e_old = '''const monolith = fs.readFileSync(path.join(__dirname, "..", "runtime", "js", "dicebound.js"), "utf8");
assert.match(monolith, /DB_EFFECTIVE_STATS\\.ultimateBaseDamage\\("berserker"/);
assert.match(monolith, /DB_EFFECTIVE_STATS\\.scaleUltimateDamage/);
'''
e_new = '''const monolith = fs.readFileSync(path.join(__dirname, "..", "runtime", "js", "dicebound.js"), "utf8");
const ultimateOwner = fs.readFileSync(path.join(__dirname, "..", "runtime", "js", "combat", "ultimate-resolution.js"), "utf8");
assert.match(monolith, /ultimateBaseDamage:\\(classId,actor,bonus\\)=>DB_EFFECTIVE_STATS\\.ultimateBaseDamage/);
assert.match(monolith, /scaleUltimateDamage:\\(damage,actor,opts\\)=>DB_EFFECTIVE_STATS\\.scaleUltimateDamage/);
assert.match(ultimateOwner, /rt\\.ultimateBaseDamage\\("berserker", p, rt\\.rand\\(5, 10\\)\\)/);
assert.match(ultimateOwner, /rt\\.scaleUltimateDamage\\(damage, p,/);
'''
if e_new not in e:
    if e_old not in e:
        raise SystemExit('effective-stats Ultimate ownership fixture anchor missing')
    e = e.replace(e_old, e_new, 1)
effective_test_path.write_text(e, encoding='utf-8', newline='\n')

print('Patched 0.6.6.4 Ultimate boundaries, RNG/timing and authoritative effective-stat contracts')
