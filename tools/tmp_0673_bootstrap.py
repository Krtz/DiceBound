from pathlib import Path

p=Path('runtime/js/dicebound.js')
text=p.read_text(encoding='utf-8')
old='''  // ---- Double Dice: authoritative run/dice owner ---------------------------
  const dbRunDice=window.DiceboundRunDice;
  if(!dbRunDice?.configure)throw new Error("DiceBound requires the run/dice owner before dicebound.js");
  dbRunDice.configure({
    getDocument:()=>document,find:selector=>$(selector),getMeta:()=>meta,getPlayer:()=>player,
    isRollLocked:()=>!!rollLocked,setRollLocked:value=>{rollLocked=!!value;},isGameStarted:()=>!!gameStarted,hasCurrentEnemy:()=>!!currentEnemy,
    ensureAudio:()=>ensureAudio(),resumeAudio:()=>{if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();},updateHud:()=>updateHUD(),
    pick:list=>pick(list),rollSound:()=>sfx.roll(),delay:ms=>delay(ms),rand:(min,max)=>rand(min,max),random:()=>random(),
    clamp:(value,min,max)=>clamp(value,min,max),incrementRolls:()=>{rolls++;ensureAlphaMeta().rolls++;},
    hasMythicPiece:id=>hasMythicPiece(id),showToast:(...args)=>showToast(...args),addLog:html=>addLog(html),
    traceCommand:(name,fn)=>v25TraceCommand(name,fn,name==="rollDice"||name==="rollTwoDice"?"events":"detailed"),move:(...args)=>dbRun.move(...args)
  });
  dbRunDice.bindPrimaryButton();dbRunDice.ensureButton();
  window.DiceboundCamp.configureShell({refreshDoubleDiceControls:()=>dbRunDice.refreshControls()});

'''
if text.count(old)!=1:
    raise SystemExit(f'expected one late Run Dice composition block, found {text.count(old)}')
text=text.replace(old,'',1)
anchor='''  function startCombat(kind="normal"){return dbCombat.startEncounter(kind);}'''
if text.count(anchor)!=1:
    raise SystemExit(f'expected one post-HUD composition anchor, found {text.count(anchor)}')
block='''  // ---- Road Dice composition ------------------------------------------------
  // Configure the canonical owner before any bootstrap HUD refresh or input
  // binding can ask it for live state. Road-dice gameplay stays in run/dice.js.
  const dbRunDice=window.DiceboundRunDice;
  if(!dbRunDice?.configure)throw new Error("DiceBound requires the run/dice owner before dicebound.js");
  dbRunDice.configure({
    getDocument:()=>document,find:selector=>$(selector),getMeta:()=>meta,getPlayer:()=>player,
    isRollLocked:()=>!!rollLocked,setRollLocked:value=>{rollLocked=!!value;},isGameStarted:()=>!!gameStarted,hasCurrentEnemy:()=>!!currentEnemy,
    ensureAudio:()=>ensureAudio(),resumeAudio:()=>{if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();},updateHud:()=>updateHUD(),
    pick:list=>pick(list),rollSound:()=>sfx.roll(),delay:ms=>delay(ms),rand:(min,max)=>rand(min,max),random:()=>random(),
    clamp:(value,min,max)=>clamp(value,min,max),incrementRolls:()=>{rolls++;ensureAlphaMeta().rolls++;},
    hasMythicPiece:id=>hasMythicPiece(id),showToast:(...args)=>showToast(...args),addLog:html=>addLog(html),
    traceCommand:(name,fn)=>v25TraceCommand(name,fn,name==="rollDice"||name==="rollTwoDice"?"events":"detailed"),move:(...args)=>dbRun.move(...args)
  });
  dbRunDice.bindPrimaryButton();dbRunDice.ensureButton();
  window.DiceboundCamp.configureShell({refreshDoubleDiceControls:()=>dbRunDice.refreshControls()});

'''
text=text.replace(anchor,block+anchor,1)
p.write_text(text,encoding='utf-8')

t=Path('tools/test_run_dice.js')
src=t.read_text(encoding='utf-8')
anchor_test='''  assert.match(MONOLITH,/dbRunDice\\.handleRoadKeydown\\(e\\)/,"keyboard road rolling must delegate to the canonical dice owner");'''
extra='''  assert.match(MONOLITH,/dbRunDice\\.handleRoadKeydown\\(e\\)/,"keyboard road rolling must delegate to the canonical dice owner");
  const configuredAt=MONOLITH.indexOf("dbRunDice.configure({"),firstBootstrapHud=MONOLITH.indexOf('dbRun.generateBoard();buildBoard();window.DiceboundClassChooser.render();renderEquipment();updateHUD();updateMetaUI();');
  assert.ok(configuredAt>=0&&firstBootstrapHud>=0&&configuredAt<firstBootstrapHud,"Run Dice must be configured before the first bootstrap HUD refresh");
  assert.equal((MONOLITH.match(/dbRunDice\\.configure\\(\\{/g)||[]).length,1,"Run Dice must have exactly one composition/configuration boundary");'''
if src.count(anchor_test)!=1:
    raise SystemExit(f'expected one Run Dice test anchor, found {src.count(anchor_test)}')
t.write_text(src.replace(anchor_test,extra,1),encoding='utf-8')
print('Run Dice bootstrap ownership materialized')
