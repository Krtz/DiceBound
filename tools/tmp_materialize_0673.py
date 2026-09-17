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
