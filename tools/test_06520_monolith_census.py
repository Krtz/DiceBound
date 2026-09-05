from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
mono=(root/'runtime/js/dicebound.js').read_text(encoding='utf-8')
names=re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(',mono)
unique=sorted(set(names))
refs={name:len(re.findall(rf'(?<![\w$]){re.escape(name)}(?![\w$])',mono)) for name in unique}
low2=sorted((refs[name],name) for name in unique if refs[name]<=2)
base_captures=re.findall(r'\bconst\s+([A-Za-z_$][\w$]*Base)\s*=\s*([A-Za-z_$][\w$]*)\s*;',mono)
for retired in ['DiceboundCareerTest','DiceboundCareerTestLegacy','buildCareerHarness','buildDiceboundHumanHarness235','DB235']:
    assert not re.search(rf'(?<![\w$]){re.escape(retired)}(?![\w$])',mono), retired
print(f'Monolith census PASS: {len(mono.encode("utf-8"))} bytes / {len(mono.splitlines())} lines / {len(names)} named declarations / {len(low2)} functions at <=2 refs / {len(base_captures)} base-capture assignments')
print('Lowest-reference sample:', low2[:40])
print('Base-capture sample:', base_captures[:40])
