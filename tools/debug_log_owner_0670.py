from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
ANTI_RETURN=ROOT/'tools/test_monolith_chainsaw.py'


def replace_once(text:str,old:str,new:str,label:str)->str:
    count=text.count(old)
    if count!=1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8').replace('\r\n','\n')
    before=text.count('\n')+1

    # A stable sink exists from bootstrap onward but remains inactive until the
    # historical debug-log initialization point configures it.  This preserves
    # the released activation timing without monkey-patching four core functions.
    sink_decl='  let dbDebugLogSink=null;\n'
    if sink_decl not in text:
        anchor='  const APP_IDENTITY=dbRuntime.identity;\n'
        if anchor not in text:raise RuntimeError('debug-log sink declaration anchor missing')
        text=text.replace(anchor,anchor+sink_decl,1)

    old='  function saveMeta(){normalizePrestigeState();syncMutedFromSettings();return DB_CORE_META.save(meta);}'
    new="  function saveMeta(){dbDebugLogSink?.log('all','save','saveMeta()',dbDebugLogSink.state());normalizePrestigeState();syncMutedFromSettings();return DB_CORE_META.save(meta);}"
    if old in text:text=replace_once(text,old,new,'canonical save logging')
    elif new not in text:raise RuntimeError('saveMeta logging drifted')

    old='  function addLog(text){const p=document.createElement("p");p.innerHTML=text;$("log").prepend(p);}'
    new="  function addLog(text){dbDebugLogSink?.log('events','adventure',String(text).replace(/<[^>]*>/g,''),dbDebugLogSink.state());const p=document.createElement(\"p\");p.innerHTML=text;$(\"log\").prepend(p);}"
    if old in text:text=replace_once(text,old,new,'canonical adventure logging')
    elif new not in text:raise RuntimeError('addLog logging drifted')

    old='  function addCombatHistory(text){const box=$("combatHistory");if(!box)return;const p=document.createElement("p");p.textContent=text;box.appendChild(p);box.scrollTop=box.scrollHeight;}'
    new="  function addCombatHistory(text){dbDebugLogSink?.log('detailed','combat-history',text,dbDebugLogSink.state());const box=$(\"combatHistory\");if(!box)return;const p=document.createElement(\"p\");p.textContent=text;box.appendChild(p);box.scrollTop=box.scrollHeight;}"
    if old in text:text=replace_once(text,old,new,'canonical combat-history logging')
    elif new not in text:raise RuntimeError('addCombatHistory logging drifted')

    old='  function setCombatText(text,record=true){$("combatText").textContent=text;if(record)addCombatHistory(text);}'
    new="  function setCombatText(text,record=true){dbDebugLogSink?.log('detailed','combat-text',text,dbDebugLogSink.state());$(\"combatText\").textContent=text;if(record)addCombatHistory(text);}"
    if old in text:text=replace_once(text,old,new,'canonical combat-text logging')
    elif new not in text:raise RuntimeError('setCombatText logging drifted')

    activation="  dbDebugLogSink=Object.freeze({log:(...args)=>v25Log(...args),state:()=>v25State()});\n"
    if activation not in text:
        anchor="  window.addEventListener('error',e=>v25Log('errors','window',e.message,{file:e.filename,line:e.lineno,col:e.colno,state:v25State()}));"
        if anchor not in text:raise RuntimeError('debug-log activation anchor missing')
        text=text.replace(anchor,activation+anchor,1)

    wrappers=[
      "  const addLogV25Base=addLog;addLog=function(html){v25Log('events','adventure',String(html).replace(/<[^>]*>/g,''),v25State());return addLogV25Base(html);};\n",
      "  const addCombatHistoryV25Base=addCombatHistory;addCombatHistory=function(text){v25Log('detailed','combat-history',text,v25State());return addCombatHistoryV25Base(text);};\n",
      "  const setCombatTextV25Base=setCombatText;setCombatText=function(text,...args){v25Log('detailed','combat-text',text,v25State());return setCombatTextV25Base(text,...args);};\n",
      "  const saveMetaV25Base=saveMeta;saveMeta=function(){v25Log('all','save','saveMeta()',v25State());return saveMetaV25Base();};\n",
    ]
    for wrapper in wrappers:
        if wrapper in text:text=text.replace(wrapper,'',1)

    stale=['addLogV25Base','addCombatHistoryV25Base','setCombatTextV25Base','saveMetaV25Base']
    for marker in stale:
        if marker in text:raise RuntimeError(f'debug-log predecessor survived: {marker}')
    for name in ['addLog','addCombatHistory','setCombatText','saveMeta']:
        if text.count(f'function {name}(')!=1:raise RuntimeError(f'{name} must remain one canonical declaration')

    while '\n\n\n' in text:text=text.replace('\n\n\n','\n\n')
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')

    guard=ANTI_RETURN.read_text(encoding='utf-8').replace('\r\n','\n')
    marker="STALE_DEBUG_LOG_PREDECESSORS=['addLogV25Base','addCombatHistoryV25Base','setCombatTextV25Base','saveMetaV25Base']"
    if marker not in guard:
        anchor='STALE_WAVE7_PREDECESSORS='
        pos=guard.find(anchor)
        if pos<0:raise RuntimeError('debug-log anti-return anchor missing')
        end=guard.find('\n',pos)
        guard=guard[:end+1]+marker+'\n'+guard[end+1:]
    assertion='    for marker in STALE_DEBUG_LOG_PREDECESSORS:\n        assert marker not in text, f"debug-log predecessor {marker} returned"\n'
    if assertion not in guard:
        anchor='    for marker in STALE_WAVE7_PREDECESSORS:\n        assert marker not in text, f"historical Wave 7 predecessor {marker} returned"\n'
        if anchor not in guard:raise RuntimeError('debug-log assertion anchor missing')
        guard=guard.replace(anchor,anchor+assertion,1)
    ANTI_RETURN.write_text(guard,encoding='utf-8',newline='\n')

    after=text.count('\n')+1
    print(f'DEBUG_LOG_OWNER {before}->{after} monolith lines; four v2.5 function-replacement logging chains collapsed into one late-activated sink')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
