from pathlib import Path

p = Path(__file__).resolve().parents[1] / 'runtime/js/combat/ultimate-resolution.js'
s = p.read_text(encoding='utf-8')
old = '  Object.defineProperty(window, "DiceboundCombatUltimateResolution", { value: api, configurable: false, enumerable: true, writable: false });'
new = '  window.DiceboundCombatUltimateResolution = api;'
if new not in s:
    if old not in s:
        raise SystemExit('Ultimate owner export anchor missing')
    s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8', newline='\n')
print('Canonicalized DiceboundCombatUltimateResolution direct export')
