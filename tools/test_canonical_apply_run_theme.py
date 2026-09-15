from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')

if len(re.findall(r'\bfunction\s+applyRunTheme\s*\(',SOURCE))!=1:
    raise SystemExit('applyRunTheme must have exactly one canonical declaration')
if re.search(r'\bapplyRunTheme\s*=\s*function\b',SOURCE):
    raise SystemExit('historical applyRunTheme replacement returned')
if re.search(r'\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*applyRunTheme\s*;',SOURCE):
    raise SystemExit('historical applyRunTheme predecessor capture returned')
for alias in ('applyRunThemeV19Base','applyRunThemeBeta01Base','applyRunThemeBeta04Base'):
    if re.search(rf'\b{alias}\b',SOURCE):
        raise SystemExit(f'retired run-theme alias returned: {alias}')

start=SOURCE.find('function applyRunTheme()')
end=SOURCE.find('function openInfo()',start)
if start<0 or end<0:
    raise SystemExit('could not isolate canonical applyRunTheme region')
body=SOURCE[start:end]

expected={
    1:("#071b0d","#031008","rgba(82,220,118,.24)","rgba(175,255,116,.11)","#173c20","#0a2111"),
    2:("#1c1708","#0c0b05","rgba(255,217,123,.23)","rgba(137,193,255,.14)","#43371a","#1d1910"),
    3:("#2a0709","#120305","rgba(255,67,76,.25)","rgba(255,130,57,.12)","#5c171b","#2b090c"),
    4:("#221109","#0d0604","rgba(255,118,62,.26)","rgba(164,47,36,.16)","#4f2416","#20100a"),
    5:("#140721","#06020d","rgba(189,98,255,.28)","rgba(87,130,255,.16)","#351048","#13061d"),
    6:("#03050d","#000104","rgba(71,92,255,.30)","rgba(210,55,255,.17)","#111947","#070a1d"),
}
for board,values in expected.items():
    anchor=f'{board}:{{bg1:"{values[0]}",bg2:"{values[1]}",glow1:"{values[2]}",glow2:"{values[3]}",board1:"{values[4]}",board2:"{values[5]}"}}'
    if anchor not in body:
        raise SystemExit(f'Board {board} released theme values changed')

anchors=[
    'rootStyle.setProperty(`--run-${key.replace',
    'rootStyle.setProperty("--run-scene-image",sceneUrl)',
    'rootStyle.setProperty("--run-scene-focus",scene?.focus||"50% 50%")',
    'const sceneEl=$("boardSceneBg")',
    "document.body?.setAttribute('data-board-level',String(boardLevel||1))",
    'dbBeta01SyncDifficultyAtmosphere();',
    'beta04SyncWorldScene();',
]
positions=[]
for anchor in anchors:
    pos=body.find(anchor)
    if pos<0: raise SystemExit('canonical applyRunTheme missing released behavior: '+anchor)
    positions.append(pos)
if positions!=sorted(positions):
    raise SystemExit('canonical applyRunTheme composition order changed')

for fragment in (
    "function dbBeta01SyncDifficultyAtmosphere()",
    "document.body?.setAttribute('data-run-mode',mode)",
    "function beta04SyncWorldScene()",
    "document.getElementById('worldSceneLayer')",
    "layer.style.backgroundImage=sceneUrl",
    "document.body?.setAttribute('data-world-board',String(level))",
    "setTimeout(beta04SyncWorldScene,0)",
):
    if fragment not in SOURCE:
        raise SystemExit('run-theme companion behavior missing: '+fragment)

print('Canonical applyRunTheme PASS: four generations collapsed to one; Boards 1-6, scene sync and difficulty/world atmosphere preserved')
