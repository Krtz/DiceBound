from pathlib import Path

p=Path('runtime/js/dicebound.js')
text=p.read_text(encoding='utf-8')

def once(old,new):
    global text
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'expected one match, found {count}: {old[:140]!r}')
    text=text.replace(old,new,1)

once('  const diceFaces = ["⚀","⚁","⚂","⚃","⚄","⚅"];\n','')
once('  let pendingDiceChoiceResolve = null;\n','')

start=text.find('  function chooseDieResult(){')
end=text.find('  let dbReturnToRoadTraceReady=',start)
if start<0 or end<0:
    raise SystemExit('chooseDieResult ownership block not found')
text=text[:start]+text[end:]

start=text.find('  async function rollDice(){')
end=text.find('  function startCombat(',start)
if start<0 or end<0:
    raise SystemExit('rollDice ownership block not found')
text=text[:start]+text[end:]

once('pendingLootCallback=null;pendingDiceChoiceResolve=null;dbRoadEvents.resetTransient();','pendingLootCallback=null;dbRoadEvents.resetTransient();')
once('$("rollBtn").disabled=rollLocked||!gameStarted;$("potionBtn").disabled=', 'window.DiceboundRunDice?.refreshControls?.();$("potionBtn").disabled=')
once('$("startBtn").addEventListener("click",startNewGame);$("nightmareToggle").addEventListener("click",()=>{if(!meta.nightmareUnlocked)return;nightmareMode=!nightmareMode;window.DiceboundClassChooser.render();});$("rollBtn").addEventListener("click",rollDice);$("outsidePotionBtn")', '$("startBtn").addEventListener("click",startNewGame);$("nightmareToggle").addEventListener("click",()=>{if(!meta.nightmareUnlocked)return;nightmareMode=!nightmareMode;window.DiceboundClassChooser.render();});$("outsidePotionBtn")')
once('  window.addEventListener("keydown",e=>{if((e.key===" "||e.key==="Enter")&&!rollLocked&&gameStarted&&!currentEnemy){e.preventDefault();rollDice();}});', '  window.addEventListener("keydown",e=>dbRunDice.handleRoadKeydown(e));')

old='''  const dbRunDice=window.DiceboundRunDice;
  if(!dbRunDice?.configure)throw new Error("DiceBound requires the run/dice owner before dicebound.js");
  dbRunDice.configure({
    getDocument:()=>document,find:selector=>$(selector),getMeta:()=>meta,getPlayer:()=>player,
    isRollLocked:()=>!!rollLocked,setRollLocked:value=>{rollLocked=!!value;},
    isGameStarted:()=>!!gameStarted,ensureAudio:()=>ensureAudio(),updateHud:()=>updateHUD(),
    diceFaces:()=>diceFaces,pick:list=>pick(list),rollSound:()=>sfx.roll(),delay:ms=>delay(ms),
    rand:(min,max)=>rand(min,max),random:()=>random(),chooseDieResult:()=>chooseDieResult(),
    clamp:(value,min,max)=>clamp(value,min,max),incrementRolls:()=>{rolls++;ensureAlphaMeta().rolls++;},
    hasMythicPiece:id=>hasMythicPiece(id),showToast:(...args)=>showToast(...args),addLog:html=>addLog(html),
    move:(...args)=>dbRun.move(...args)
  });
  dbRunDice.ensureButton();
  window.DiceboundCamp.configureShell({refreshDoubleDiceControls:()=>dbRunDice.refreshControls()});'''
new='''  const dbRunDice=window.DiceboundRunDice;
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
  window.DiceboundCamp.configureShell({refreshDoubleDiceControls:()=>dbRunDice.refreshControls()});'''
once(old,new)

old='''  function v25WrapCommand(name,level='detailed'){
  const fn=({rollDice,applyUpgrade:(...args)=>dbPowerups.apply(...args),equipItem:(...args)=>dbItems.equip(...args)})[name];if(typeof fn!=='function')return;
  const wrapped=function(...args){return v25TraceCommand(name,fn,level,args,this);};
  if(name==='rollDice')rollDice=wrapped;else if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;
}
['rollDice','applyUpgrade','equipItem'].forEach(n=>v25WrapCommand(n,n==='rollDice'?'events':'detailed'));'''
new='''  function v25WrapCommand(name,level='detailed'){
  const fn=({applyUpgrade:(...args)=>dbPowerups.apply(...args),equipItem:(...args)=>dbItems.equip(...args)})[name];if(typeof fn!=='function')return;
  const wrapped=function(...args){return v25TraceCommand(name,fn,level,args,this);};
  if(name==='applyUpgrade')applyUpgrade=wrapped;else if(name==='equipItem')equipItem=wrapped;
}
['applyUpgrade','equipItem'].forEach(n=>v25WrapCommand(n,'detailed'));'''
once(old,new)

p.write_text(text,encoding='utf-8')

# Run Dice is now the complete road-dice owner, not a Double-Dice-only adapter.
manifest=Path('runtime/js/module-manifest.json')
manifest_text=manifest.read_text(encoding='utf-8')
old_domain='"domain": "run/double-dice-control-and-roll-sequencing"'
new_domain='"domain": "run/road-dice-control-choice-and-roll-sequencing"'
if manifest_text.count(old_domain)!=1:
    raise SystemExit('run-dice manifest domain anchor missing')
manifest.write_text(manifest_text.replace(old_domain,new_domain,1),encoding='utf-8')

# Update the architecture contract: board movement is now injected into the
# canonical dice owner rather than invoked directly by monolith rollDice().
validator=Path('tools/validate_runtime_architecture.py')
validator_text=validator.read_text(encoding='utf-8')
old_route='            "await dbRun.move(",\n'
new_route='            "move:(...args)=>dbRun.move(...args)",\n'
if validator_text.count(old_route)!=1:
    raise SystemExit('board-movement validator route anchor missing')
validator_text=validator_text.replace(old_route,new_route,1)
anchor='''    if monolith_source:
        expected_reset_adapter = "function resetPlayer(classId=selectedClassId){return dbRun.initializePlayer(classId);}"'''
insert='''    run_dice_module = by_id.get("run-dice")
    run_dice_source = sources.get("run-dice", "")
    if not run_dice_module:
        errors.append("Canonical road-dice owner run-dice is missing from the runtime manifest")
    else:
        if run_dice_module.get("path") != "js/run/dice.js" or "DiceboundRunDice" not in (run_dice_module.get("provides") or []):
            errors.append("run-dice must own js/run/dice.js and provide DiceboundRunDice")
        if "run-facade" not in (run_dice_module.get("requires") or []) or position.get("run-dice", -1) >= position.get(str(monolith_id), -1):
            errors.append("run-dice must require run-facade and load before the composition monolith")
    for required_run_dice_owner in ["function rollOneCore(", "function rollTwoCore(", "function chooseDieResult(", "function handleRoadKeydown("]:
        if required_run_dice_owner not in run_dice_source:
            errors.append("run-dice is missing canonical road-dice responsibility: " + required_run_dice_owner)
    if monolith_source:
        for retired_road_dice_layer in ["function rollDice(", "function chooseDieResult(", "pendingDiceChoiceResolve", "const diceFaces =", 'addEventListener("click",rollDice)', "{rollDice,applyUpgrade"]:
            if retired_road_dice_layer in monolith_source:
                errors.append("retired road-dice implementation remains in dicebound.js: " + retired_road_dice_layer)
        for required_run_dice_route in ["dbRunDice.bindPrimaryButton()", "dbRunDice.handleRoadKeydown(e)", "move:(...args)=>dbRun.move(...args)"]:
            if required_run_dice_route not in monolith_source:
                errors.append("dicebound.js is missing Run Dice composition route: " + required_run_dice_route)

    if monolith_source:
        expected_reset_adapter = "function resetPlayer(classId=selectedClassId){return dbRun.initializePlayer(classId);}"'''
if anchor not in validator_text:
    raise SystemExit('architecture insertion anchor missing')
validator.write_text(validator_text.replace(anchor,insert,1),encoding='utf-8')

# Permanent owner behavior + anti-return coverage.
t=Path('tools/test_run_dice.js')
src=t.read_text(encoding='utf-8')
needle='const SOURCE=fs.readFileSync(path.join(__dirname,"..","runtime","js","run","dice.js"),"utf8");'
if 'const MONOLITH=' not in src:
    src=src.replace(needle,needle+'\nconst MONOLITH=fs.readFileSync(path.join(__dirname,"..","runtime","js","dicebound.js"),"utf8");',1)
anchor='  assert.doesNotMatch(SOURCE,/call\\("random"\\)\\(\\)/,"injected RNG result must never be invoked as a function");'
anti='''  assert.doesNotMatch(SOURCE,/call\\("random"\\)\\(\\)/,"injected RNG result must never be invoked as a function");
  for(const pattern of [/function\\s+rollDice\\s*\\(/,/function\\s+chooseDieResult\\s*\\(/,/pendingDiceChoiceResolve/,/const\\s+diceFaces\\s*=/,/addEventListener\\(\\"click\\",rollDice\\)/,/\\{rollDice,applyUpgrade/])assert.doesNotMatch(MONOLITH,pattern,`road-dice implementation returned to dicebound.js: ${pattern}`);
  assert.match(MONOLITH,/dbRunDice\\.bindPrimaryButton\\(\\)/,"composition must bind the canonical primary dice owner");
  assert.match(MONOLITH,/dbRunDice\\.handleRoadKeydown\\(e\\)/,"keyboard road rolling must delegate to the canonical dice owner");'''
if anchor not in src:
    raise SystemExit('test anti-return anchor missing')
src=src.replace(anchor,anti,1)
t.write_text(src,encoding='utf-8')

print('0.6.7.3 road-dice ownership materialized')
