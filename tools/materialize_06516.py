#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path:str)->str:
    return (ROOT/path).read_text(encoding='utf-8')

def write(path:str,text:str)->None:
    (ROOT/path).write_text(text,encoding='utf-8',newline='\n')

def replace_exact(path:str,old:str,new:str,count:int=1)->None:
    text=read(path);actual=text.count(old)
    if actual!=count: raise SystemExit(f'{path}: expected {count} occurrence(s), found {actual}: {old[:120]!r}')
    write(path,text.replace(old,new))

# 1) Fix the actual 0.6.5.15 startup crash: v24StorageUnlocked is hoisted and
# is called by early equipment UI state before the late v2.4 block executes.
# Keep the semantic IDs initialized near the other runtime constants so no TDZ
# can ever be exposed by an early Camp/equipment render.
replace_exact(
    'runtime/js/dicebound.js',
    '  const GUARDIAN_SPECIAL_INTERVAL=5;\n',
    "  const GUARDIAN_SPECIAL_INTERVAL=5;\n  const DB_HEIRLOOM_STORAGE_NODE='heirloom-storage';\n  const DB_HEIRLOOM_SLOT_I_NODE='heirloom-slot-i';\n  const DB_HEIRLOOM_SLOT_II_NODE='heirloom-slot-ii';\n"
)
replace_exact(
    'runtime/js/dicebound.js',
    "  const DB_HEIRLOOM_STORAGE_NODE='heirloom-storage',DB_HEIRLOOM_SLOT_I_NODE='heirloom-slot-i',DB_HEIRLOOM_SLOT_II_NODE='heirloom-slot-ii';\n",
    ''
)

# 2) Delete the obsolete visible Alpha-v1 start/setup screen. The Camp owner
# still needs a startOverlay host plus a few hidden compatibility targets while
# historical adapters are drained, but no old screen/copy/button is visible.
index=read('runtime/index.html')
start=index.index('<div class="overlay" id="startOverlay">')
end=index.index('<div class="overlay hidden" id="combatOverlay">',start)
minimal='''<div class="overlay" id="startOverlay">
  <div class="modal wide start-modal">
    <!-- Compatibility-only state targets for historical runtime adapters.
         ui/camp.js owns every visible between-runs control and destination. -->
    <div id="startCompatibilityState" hidden aria-hidden="true">
      <span id="startLegacyLevel"></span>
      <span id="startLegacyXp"></span>
      <div id="startHeirloom"></div>
      <div id="nightmareBox"><span id="nightmareText"></span><button id="nightmareToggle" type="button"></button></div>
      <button id="startTalentBtn" type="button"></button>
    </div>
    <button id="startBtn" type="button" hidden aria-hidden="true"></button>
  </div>
</div>

'''
index=index[:start]+minimal+index[end:]
write('runtime/index.html',index)

# Camp now creates the Class chooser host itself instead of moving it out of
# the deleted legacy screen.
replace_exact(
    'runtime/js/ui/camp.js',
    '<div id="campClassHost"></div>',
    '<div id="campClassHost"><div class="class-grid" id="classGrid"></div></div>'
)

# Class chooser no longer knows about the dead Begin/Nightmare setup UI.
chooser=read('runtime/js/ui/class-chooser.js')
legacy_start=chooser.index('  function updateLegacyControls(current){')
legacy_end=chooser.index('  function selectClass(id){',legacy_start)
chooser=chooser[:legacy_start]+chooser[legacy_end:]
if chooser.count('    updateLegacyControls(refreshed);')!=1:
    raise SystemExit('class-chooser: expected one updateLegacyControls call')
chooser=chooser.replace('    updateLegacyControls(refreshed);\n','')
write('runtime/js/ui/class-chooser.js',chooser)

# 3) Strengthen the permanent regression test: exact user workflow is opening
# runtime/index.html directly from disk, and the fossilized Alpha screen must
# not exist in source or become visible if boot completes.
test_path='tools/test_file_startup_browser.js'
test=read(test_path)
test=test.replace('const childProcess=require("node:child_process");\nconst os=require("node:os");', 'const childProcess=require("node:child_process");\nconst fs=require("node:fs");\nconst os=require("node:os");')
test=test.replace('const URL=pathToFileURL(path.join(ROOT,"runtime","index.html")).href;\n', '''const INDEX_PATH=path.join(ROOT,"runtime","index.html");
const URL=pathToFileURL(INDEX_PATH).href;
const indexSource=fs.readFileSync(INDEX_PATH,"utf8");
const chooserSource=fs.readFileSync(path.join(ROOT,"runtime","js","ui","class-chooser.js"),"utf8");
assert.doesNotMatch(indexSource,/Welcome to <b>Alpha v1<\\/b>/,"obsolete Alpha-v1 setup copy must be deleted from runtime/index.html");
assert.doesNotMatch(indexSource,/Begin as Ranger/,"obsolete Begin-as-Ranger CTA must be deleted from runtime/index.html");
assert.doesNotMatch(chooserSource,/updateLegacyControls|Begin as a random unlocked class|Begin as \\$/, "Class chooser must not write to the retired setup CTA");
''')
old_state="""state=await page.evaluate(`(()=>{const overlay=document.getElementById('startOverlay'),scene=document.getElementById('campScene'),legacy=document.querySelector('#startOverlay .start-art'),begin=document.getElementById('startBtn');return {ready:document.readyState,campApi:!!window.DiceboundCamp,scene:!!scene,campFullscreen:!!overlay?.classList.contains('camp-fullscreen'),overlayHidden:!!overlay?.classList.contains('hidden'),legacyVisible:!!legacy&&getComputedStyle(legacy).display!=='none'&&getComputedStyle(legacy).visibility!=='hidden',beginVisible:!!begin&&getComputedStyle(begin).display!=='none'&&getComputedStyle(begin).visibility!=='hidden',bodyText:(overlay?.innerText||'').slice(0,500)};})()`);"""
new_state="""state=await page.evaluate(`(()=>{const overlay=document.getElementById('startOverlay'),scene=document.getElementById('campScene'),legacy=document.querySelector('#startOverlay .start-art'),begin=document.getElementById('startBtn'),visible=node=>!!node&&node.getClientRects().length>0&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden';return {ready:document.readyState,campApi:!!window.DiceboundCamp,scene:!!scene,campFullscreen:!!overlay?.classList.contains('camp-fullscreen'),overlayHidden:!!overlay?.classList.contains('hidden'),legacyVisible:visible(legacy),beginVisible:visible(begin),bodyText:(overlay?.innerText||'').slice(0,500)};})()`);"""
if test.count(old_state)!=1: raise SystemExit('local-file test state probe changed unexpectedly')
test=test.replace(old_state,new_state)
test=test.replace('try{require("node:fs").rmSync(profile,{recursive:true,force:true});}catch(_){}','try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){}')
write(test_path,test)

# .15 expanded the data-driven Prestige Moon from two nodes to five. Keep the
# real Edge smoke aligned with the released progression contract.
replace_exact(
    'tools/smoke_run_resume_browser.js',
    "assert.equal(sample.nodeCount,2,`${label} Prestige Moon node registry drifted`);",
    "assert.equal(sample.nodeCount,5,`${label} Prestige Moon node registry drifted`);"
)

# 4) Release notes/version.
replace_exact(
    'CHANGELOG.md',
    '## Beta 0.6.5.15\n',
    '''## Beta 0.6.5.16\n\n### Local Camp startup hotfix\n- Fixed a startup TDZ crash introduced in 0.6.5.15 where early equipment/Camp state could call the new Heirloom Storage purchase ID before that constant had initialized.\n- Deleted the obsolete visible Alpha-v1 setup/start screen from `runtime/index.html`; `startOverlay` is now only a Camp host with hidden compatibility state targets.\n- Camp now creates the Class chooser host itself, and the Class chooser no longer writes labels/state into the retired Begin screen.\n- Added a Windows Edge regression test that opens `runtime/index.html` directly through `file://`, requires the full-screen Camp to appear, rejects the retired Alpha/Begin presentation, and fails on browser runtime exceptions.\n- Updated the existing browser smoke to the five-node Prestige Moon introduced in 0.6.5.15.\n\n## Beta 0.6.5.15\n'''
)
replace_exact(
    'runtime/PATCH_NOTES.md',
    '# Unreleased — Beta 0.6.5.15\n',
    '# Unreleased — Beta 0.6.5.16\n'
)
replace_exact(
    'runtime/PATCH_NOTES.md',
    '## Beta 0.6.5.15 Prestige Heirlooms and Camp layout\n',
    '''## Beta 0.6.5.16 Local Camp startup hotfix\n- Fixed the 0.6.5.15 local-file startup crash caused by Heirloom Storage purchase IDs being read before initialization.\n- Removed the obsolete visible Alpha-v1 setup/Begin screen. Camp owns the between-runs destination; only hidden compatibility state targets remain while older adapters are drained.\n- Added a real Windows Edge `file://` startup regression check so opening `runtime/index.html` directly must build Camp without browser exceptions.\n- Updated the normal browser smoke to expect the five-node Prestige Moon shipped in 0.6.5.15.\n\n## Beta 0.6.5.15 Prestige Heirlooms and Camp layout\n'''
)

subprocess.run(['python','tools/set_project_version.py','--version','0.6.5.16','--channel','Beta'],cwd=ROOT,check=True)
replace_exact('runtime/index.html','Beta v0.6.5.16 · Prestige Heirlooms & Camp layout.','Beta v0.6.5.16 · Camp startup hotfix.')
subprocess.run(['python','tools/refresh_runtime_manifest.py','--version','0.6.5.16','--channel','Beta','--development-state','Unreleased'],cwd=ROOT,check=True)

# Focused validation. The PR workflow will rerun every test plus native build.
for path in ['runtime/js/dicebound.js','runtime/js/ui/camp.js','runtime/js/ui/class-chooser.js']:
    subprocess.run(['node','--check',path],cwd=ROOT,check=True)
subprocess.run(['node','tools/test_file_startup_browser.js'],cwd=ROOT,check=True)
subprocess.run(['node','tools/test_camp_ui.js'],cwd=ROOT,check=True)
subprocess.run(['node','tools/test_class_chooser.js'],cwd=ROOT,check=True)
subprocess.run(['node','tools/smoke_run_resume_browser.js'],cwd=ROOT,check=True)

print('Beta 0.6.5.16 Camp startup hotfix materialized and browser-smoked successfully')
