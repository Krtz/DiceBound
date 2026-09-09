from pathlib import Path
import json,re

root=Path(__file__).resolve().parents[1]
mono=root/'runtime/js/dicebound.js'
text=mono.read_text(encoding='utf-8')
before_bytes=len(text.encode('utf-8'));before_lines=len(text.splitlines())

def close_brace(src,open_pos):
    depth=0;state='code';quote='';escaped=False;i=open_pos
    while i<len(src):
        ch=src[i];nxt=src[i+1] if i+1<len(src) else ''
        if state=='line':
            if ch=='\n': state='code'
            i+=1;continue
        if state=='block':
            if ch=='*' and nxt=='/': state='code';i+=2;continue
            i+=1;continue
        if state=='string':
            if escaped: escaped=False;i+=1;continue
            if ch=='\\': escaped=True;i+=1;continue
            if ch==quote: state='code';quote=''
            i+=1;continue
        if ch=='/' and nxt=='/': state='line';i+=2;continue
        if ch=='/' and nxt=='*': state='block';i+=2;continue
        if ch in ('"',"'",'`'): state='string';quote=ch;i+=1;continue
        if ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0:return i
        i+=1
    raise RuntimeError(f'unclosed brace at {open_pos}')

base=re.search(r'function\s+resetPlayer\s*\(classId=selectedClassId\)\s*\{',text)
if not base: raise RuntimeError('canonical resetPlayer not found')
op=text.index('{',base.start());end=close_brace(text,op)+1
adapter="function resetPlayer(classId=selectedClassId){if(!dbPlayerInitialization)throw new Error('Player initialization owner is not configured.');return dbPlayerInitialization.initialize(classId);}"
text=text[:base.start()]+adapter+text[end:]

captures=['resetPlayerV15','resetPlayerV12','resetPlayerV13','resetPlayerV15Patch','resetPlayerV16Base','resetPlayerV17Base','resetPlayerV18Base','resetPlayerV19Base','resetPlayerV21Base','resetPlayerV23TalentBase','resetPlayerV24Base','resetPlayerV26TalentBase','resetPlayerV27Base','resetPlayerV28Base','db060ResetPlayerBase','db06421ResetPlayerBase','dbFriendResetPlayerBase']
for name in captures:
    marker=f'const {name}=resetPlayer;'
    start=text.find(marker)
    if start<0: raise RuntimeError(f'missing reset capture {name}')
    assign=text.find('resetPlayer=function',start+len(marker))
    if assign<0: raise RuntimeError(f'missing reset assignment after {name}')
    op=text.find('{',assign);finish=close_brace(text,op)+1
    while finish<len(text) and text[finish].isspace() and text[finish]!='\n': finish+=1
    if finish<len(text) and text[finish]==';': finish+=1
    text=text[:start]+text[finish:]

if 'let dbInfoGuide=null;' not in text: raise RuntimeError('bootstrap variable anchor missing')
text=text.replace('let dbInfoGuide=null;','let dbInfoGuide=null,dbPlayerInitialization=null;',1)
anchor='  dbCombatD20ChaosResolution.initializePlayerState();\n})();'
if anchor not in text: raise RuntimeError('final D20 configuration anchor missing')
config="""  dbCombatD20ChaosResolution.initializePlayerState();

  /* SEMANTIC OWNER — Player / per-run initialization (#311). */
  const dbPlayerInitializationOwner=window.DiceboundPlayerInitialization;
  if(!dbPlayerInitializationOwner)throw new Error('DiceBound requires the player initialization owner before dicebound.js');
  dbPlayerInitialization=dbPlayerInitializationOwner.configure({
    getPlayer:()=>player,getMeta:()=>meta,getClasses:()=>CLASSES,getClassPassives:()=>CLASS_PASSIVES,getElementKeys:()=>ELEMENT_KEYS,
    setRunTalentSnapshot:value=>{runTalentSnapshot=value;},applyTalentBonuses:()=>applyTalentBonuses(),getHeirloomSlots:()=>getHeirloomSlots(),
    equipItem:(item,silent=false)=>equipItem(item,silent),gameplayTalentRank:id=>gameplayTalentRank(id),generateEquipment:(rarity,slot)=>generateEquipment(rarity,slot),
    pick:values=>pick(values),rand:(min,max)=>rand(min,max),recordRunBuff:(...args)=>recordRunBuff(...args),elementSummary:item=>elementSummary(item),
    classIdentityActive:id=>classIdentityActive(id),classHasMechanic:id=>classHasMechanic(id),shuffledPetIds:()=>shuffledPetIds(),setCombatKind:value=>{v16CombatKind=value;},
    syncActivePetBonus:force=>syncActivePetBonusV16(force),syncBloodmageHpPassive:initial=>v18SyncBloodmageHpPassive(initial),syncOuroborosAttack:()=>v18SyncOuroborosAttack(),syncOuroborosEconomy:()=>v27SyncOuroborosEconomy(),
    slimeRougeDonorPool:()=>v318SlimeRougeDonorPool(),getSlimeRougeRuntime:()=>SlimeRougeRuntime,initIdentitySupport:id=>v32InitIdentitySupport(id),initUltimateSupport:id=>v318InitUltimateSupport(id),
    classMechanicsFor:id=>classMechanicsFor(id),getUltimateSupportMechanics:id=>window.DiceboundContent?.ultimateSupportMechanics?.[id]||[],addLog:text=>addLog(text),
    applyGearTransform:()=>db060ApplyGearTransform(),syncMana:args=>db06421SyncMana(args),resetDragoonState:()=>dbFriendResetDragoonState(),
    setStatsLast:({hp,gold})=>{statsLastHp=hp;statsLastGold=gold;},
    setRunGlobals:next=>{boardLevel=next.boardLevel;rolls=next.rolls;tilesMovedThisRun=next.tilesMovedThisRun;pendingLevelUps=next.pendingLevelUps;currentEnemy=next.currentEnemy;currentEnemies=next.currentEnemies;currentEncounterLead=next.currentEncounterLead;currentEnemyTile=next.currentEnemyTile;currentMerchantItems=next.currentMerchantItems;runFinalized=next.runFinalized;lastLegacyAward=next.lastLegacyAward;lastGoldLegacyAward=next.lastGoldLegacyAward;merchantBossBattle=next.merchantBossBattle;},
    initializeD20State:()=>dbCombatD20ChaosResolution.initializePlayerState()
  });
})();"""
text=text.replace(anchor,config,1)
if text.count('resetPlayer=function')!=0: raise RuntimeError(f'resetPlayer reassignment survived: {text.count("resetPlayer=function")}')
if text.count('function resetPlayer(')!=1: raise RuntimeError(f'expected one resetPlayer adapter, got {text.count("function resetPlayer(")}')
mono.write_text(text,encoding='utf-8',newline='\n')
after_bytes=len(text.encode('utf-8'));after_lines=len(text.splitlines())

index=root/'runtime/index.html';html=index.read_text(encoding='utf-8')
marker='  <script src="js/run/lifecycle.js"></script>'
if marker not in html: raise RuntimeError('run lifecycle script anchor missing')
html=html.replace(marker,'  <script src="js/run/player-initialization.js"></script>\n'+marker,1)
index.write_text(html,encoding='utf-8',newline='\n')

mp=root/'runtime/js/module-manifest.json';manifest=json.loads(mp.read_text(encoding='utf-8'))
order=manifest['loadOrder'];idx=order.index('run-lifecycle');order.insert(idx,'run-player-initialization')
mods=manifest['modules'];ridx=next(i for i,m in enumerate(mods) if m['id']=='run-lifecycle')
mods.insert(ridx,{'id':'run-player-initialization','path':'js/run/player-initialization.js','domain':'run/player-and-per-run-state-initialization','status':'extracted','requires':[],'provides':['DiceboundPlayerInitialization']})
runmod=next(m for m in mods if m['id']=='run-lifecycle');req=runmod.setdefault('requires',[])
if 'run-player-initialization' not in req:req.append('run-player-initialization')
mp.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')

vp=root/'tools/validate_runtime_architecture.py';v=vp.read_text(encoding='utf-8')
v_anchor='    monolith_source = sources.get(str(monolith_id), "") if monolith_id else ""\n'
guard="""    player_init_module = by_id.get("run-player-initialization")
    player_init_source = sources.get("run-player-initialization", "")
    if not player_init_module:
        errors.append("Player initialization owner run-player-initialization is missing from the runtime manifest")
    else:
        if player_init_module.get("path") != "js/run/player-initialization.js" or "DiceboundPlayerInitialization" not in (player_init_module.get("provides") or []):
            errors.append("run-player-initialization must own js/run/player-initialization.js and provide DiceboundPlayerInitialization")
        if position.get("run-player-initialization", -1) >= position.get("run-lifecycle", -1):
            errors.append("run-player-initialization must load before run-lifecycle")
        if "run-player-initialization" not in (by_id.get("run-lifecycle", {}).get("requires") or []):
            errors.append("run-lifecycle must declare the player initialization owner dependency")
    for required_player_init in ["function initialize(classId)", "Slime Rouge", "setRunTalentSnapshot", "syncMana", "resetDragoonState"]:
        if required_player_init not in player_init_source:
            errors.append("player initialization owner is missing required ordered responsibility: " + required_player_init)
    if monolith_source:
        expected_reset_adapter = "function resetPlayer(classId=selectedClassId){if(!dbPlayerInitialization)throw new Error('Player initialization owner is not configured.');return dbPlayerInitialization.initialize(classId);}"
        if expected_reset_adapter not in monolith_source:
            errors.append("dicebound.js must retain only the thin resetPlayer player-initialization adapter")
        for retired_reset_layer in ["resetPlayer=function", "resetPlayerV15=", "resetPlayerV12=", "resetPlayerV13=", "resetPlayerV15Patch=", "resetPlayerV16Base=", "resetPlayerV17Base=", "resetPlayerV18Base=", "resetPlayerV19Base=", "resetPlayerV21Base=", "resetPlayerV23TalentBase=", "resetPlayerV24Base=", "resetPlayerV26TalentBase=", "resetPlayerV27Base=", "resetPlayerV28Base=", "db060ResetPlayerBase=", "db06421ResetPlayerBase=", "dbFriendResetPlayerBase="]:
            if retired_reset_layer in monolith_source:
                errors.append("retired player initialization wrapper remains in dicebound.js: " + retired_reset_layer)
"""
if v_anchor not in v: raise RuntimeError('validator monolith anchor missing')
v=v.replace(v_anchor,v_anchor+guard,1);vp.write_text(v,encoding='utf-8',newline='\n')

metrics=f'{before_bytes:,} -> {after_bytes:,} bytes; {before_lines:,} -> {after_lines:,} physical lines'
changelog=root/'CHANGELOG.md';c=changelog.read_text(encoding='utf-8');c_anchor='## Beta 0.6.6.20\n'
section=f"""## Beta 0.6.6.21

### Player / Run Initialization ownership (#311)
- `run/player-initialization.js` now owns the exact ordered player and per-run state construction previously spread across the canonical `resetPlayer()` plus 17 live replacement layers.
- Talent snapshots, heirloom/equipment ordering, class resources, Pet bonuses, Summoner/Trainer setup, Slime Rouge borrowing, Artifact transforms, Mana reconciliation and Dragoon transient state preserve the Beta 0.6.6.20 execution order.
- A frozen 24-case Beta 0.6.6.20 oracle pins complete scoped state, observable initialization side effects and exact RNG draw streams, including Prismatic Birthright, Pokémon Trainer and Slime Rouge.
- The monolith changes from {metrics}; `run/lifecycle.js` remains the fresh-run orchestration owner and calls initialization through one thin compatibility adapter.

"""
if c_anchor not in c: raise RuntimeError('changelog anchor missing')
changelog.write_text(c.replace(c_anchor,section+c_anchor,1),encoding='utf-8',newline='\n')

pp=root/'runtime/PATCH_NOTES.md';p=pp.read_text(encoding='utf-8')
p="""# Unreleased — Beta 0.6.6.21

## Beta 0.6.6.21 Player / Run Initialization ownership (#311)
- `run/player-initialization.js` is now the single owner for the ordered per-run player reset/initialization transaction.
- The canonical reset implementation and 17 historical `resetPlayer` replacement layers are retired from `dicebound.js`; callers retain one thin composition adapter.
- A frozen 24-case 0.6.6.20 oracle preserves state, side-effect and RNG ordering across class starts, Talents, heirlooms, Pets, Prismatic Birthright, Trainer, Slime Rouge, Artifact transforms, Mana reconciliation and Dragoon state.
- Architecture-only: no gameplay, balance, RNG, save/checkpoint or fresh-run orchestration redesign is intended.

"""+p
pp.write_text(p,encoding='utf-8',newline='\n')
print('player-init materialized:',metrics)
