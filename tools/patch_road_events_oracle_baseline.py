#!/usr/bin/env python3
from pathlib import Path

p=Path('tools/test_road_events_oracle.js')
text=p.read_text(encoding='utf-8')
old='''    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.deepEqual(actual,fixture);
    console.log(`Road Events oracle PASS: ${actual.cases.length} exact released-output/state/RNG cases match ${fixture.version}.`);
'''
new='''    const fixture=JSON.parse(fs.readFileSync(FIXTURE_PATH,"utf8"));
    assert.equal(fixture.version,"0.6.6.25","Road Events fixture must remain the released 0.6.6.25 baseline");
    assert.ok(actual.version,"runtime version must be exposed while executing the baseline oracle");
    assert.deepEqual(actual.cases,fixture.cases);
    console.log(`Road Events oracle PASS: ${actual.cases.length} exact released-output/state/RNG cases match ${fixture.version} baseline on runtime ${actual.version}.`);
'''
if text.count(old)!=1:
    raise SystemExit(f'oracle comparison marker count {text.count(old)}')
p.write_text(text.replace(old,new,1),encoding='utf-8')
print('Road Events oracle now treats 0.6.6.25 as the immutable behavior baseline, not the executing runtime version.')
