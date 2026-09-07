from pathlib import Path

path = Path('tools/test_combat_victory_resolution.js')
text = path.read_text(encoding='utf-8')
needle = "    assert(order.indexOf('restoreEnemyDebuffs') < order.indexOf('clearLegendaryTemps'));\n"
if text.count(needle) != 2:
    raise SystemExit(f'expected two cleanup-order assertions before materialization, found {text.count(needle)}')
second = text.find(needle, text.find(needle) + len(needle))
replacement = "    assert(order.indexOf('restoreEnemyDebuffs') < order.indexOf('clearLegendaryTemps'), 'outer cleanup order');\n"
text = text[:second] + replacement + text[second + len(needle):]
path.write_text(text, encoding='utf-8')
print('Victory materializer test target disambiguated')
