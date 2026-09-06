from pathlib import Path

p = Path(__file__).resolve().with_name('test_combat_guard_resolution.js')
s = p.read_text(encoding='utf-8')
old = "    assert.strictEqual(seenPower, .3);"
new = "    assert(Math.abs(seenPower - .3) < 1e-12, `temporary Guard Power drifted: ${seenPower}`);"
count = s.count(old)
if count != 2:
    raise SystemExit(f'expected 2 temporary Guard Power assertions, found {count}')
p.write_text(s.replace(old, new), encoding='utf-8')
print('Guard float assertions patched')
