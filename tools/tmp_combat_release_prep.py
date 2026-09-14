from pathlib import Path

root=Path('.')

changelog=root/'CHANGELOG.md'
text=changelog.read_text(encoding='utf-8')
anchor='''This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n## Beta 0.6.6.30\n'''
section='''This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n## Beta 0.6.6.31\n\n### Combat Engine subsystem facade and ownership (#341)\n- Added `runtime/js/combat/facade.js` as the ordinary public `DiceboundCombat` engine boundary while retaining the focused Attack, Mana, Guard, Ultimate, Strike, Element, Healing, Pet-turn, Encounter, Turn, Victory, D20 and enemy-scaling owners as specialist internals. Combat Presentation and VFX remain explicitly outside this facade for the later Combat View wave.\n- Routed ordinary Combat compatibility seams through `DiceboundCombat` instead of exposing those focused engine owners as peer public APIs; the central runtime architecture validator and focused anti-shadow tests now fail closed if direct peer-public seams return.\n- Added a permanent 14-case exact released-0.6.6.30 Combat output/state/event/RNG oracle, plus a focused facade forwarding/ownership contract, while retaining all existing deterministic Combat suites and browser regressions.\n- Architecture-only: no damage/healing formulas, Crit/Echo/Poison/Barrier/Dodge/Haste/element behavior, class actions, Pet combat, enemy ordering, target selection, reward ordering, RNG, save/checkpoint behavior or Combat presentation/VFX redesign is intended. Runtime graph is 81 modules (80 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 678,722 bytes / 7,060 physical lines versus 675,407 bytes / 6,996 lines in released 0.6.6.30. This wave optimizes public subsystem cohesion rather than raw monolith line count.\n\n## Beta 0.6.6.30\n'''
if text.count(anchor)!=1:
    raise SystemExit(f'CHANGELOG anchor mismatch: {text.count(anchor)}')
changelog.write_text(text.replace(anchor,section,1),encoding='utf-8',newline='\n')

notes=root/'runtime/PATCH_NOTES.md'
text=notes.read_text(encoding='utf-8')
section='''# Unreleased — Beta 0.6.6.31\n\n## Beta 0.6.6.31 Combat Engine subsystem ownership (#341)\n- `DiceboundCombat` is now the ordinary public Combat Engine boundary over focused deterministic engine internals; ordinary runtime callers no longer coordinate Attack, Mana, Guard, Ultimate, Strike, Element, Healing, Pet-turn, Encounter, Turn, Victory, D20 and enemy-scaling owners as peer subsystem APIs.\n- Combat Presentation/VFX remain separate boundaries. The engine facade only composes engine capabilities and preserves existing explicit presentation/VFX collaboration where shipped behavior requires it.\n- A permanent 14-case exact released-0.6.6.30 output/state/event/RNG oracle plus facade, focused-owner, anti-shadow and central architecture guards freeze the new boundary while the existing Combat deterministic and browser suites remain authoritative.\n- No combat balance, damage/healing math, Crit/Echo/Poison/Barrier/Dodge/Haste/element semantics, class/Pet action behavior, enemy/special ordering, target selection, reward ordering, RNG order/state, save/checkpoint behavior or Combat UI/VFX redesign is intended. Runtime graph is 81 modules (80 extracted/internal + one compatibility monolith); normalized `dicebound.js` is 678,722 bytes / 7,060 lines.\n\n'''
if text.startswith('# Unreleased — Beta 0.6.6.31'):
    raise SystemExit('PATCH_NOTES already contains 0.6.6.31 section')
notes.write_text(section+text,encoding='utf-8',newline='\n')

index=root/'runtime/index.html'
text=index.read_text(encoding='utf-8')
old='<p>Beta v0.6.6.31 · Class Unlock Resolution ownership extraction.</p>'
new='<p>Beta v0.6.6.31 · Combat Engine subsystem facade.</p>'
if text.count(old)!=1:
    raise SystemExit(f'runtime subtitle anchor mismatch after version stamp: {text.count(old)}')
index.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')

print('Combat facade Beta 0.6.6.31 release metadata staged')
