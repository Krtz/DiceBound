from __future__ import annotations

import json
from pathlib import Path

import tmp_materialize_0670_chainsaw as base

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
SCALING=ROOT/'runtime/js/combat/enemy-scaling-resolution.js'
INDEX=ROOT/'runtime/index.html'
MANIFEST=ROOT/'runtime/js/module-manifest.json'
ANTI_RETURN=ROOT/'tools/test_monolith_chainsaw.py'


def replace_once(text:str,old:str,new:str,label:str)->str:
    count=text.count(old)
    if count!=1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)


def statement_end(source:bytes,node)->int:
    end=node.end_byte
    while end<len(source) and source[end:end+1] in {b' ',b'\t',b';'}:
        end+=1
    if source[end:end+2]==b'\r\n':return end+2
    if source[end:end+1]==b'\n':return end+1
    return end


def remove_named_functions(text:str,names:set[str])->tuple[str,list[str]]:
    source=text.encode('utf-8')
    tree=base.parse(source)
    spans=[]
    found=[]
    for node in base.walk(tree.root_node):
        if node.type!='function_declaration':continue
        ident=node.child_by_field_name('name')
        if not ident:continue
        name=base.node_text(source,ident)
        if name in names:
            spans.append((node.start_byte,statement_end(source,node)))
            found.append(name)
    missing=sorted(names-set(found))
    if missing:raise RuntimeError(f'board presentation functions not found for removal: {missing}')
    for start,end in sorted(spans,reverse=True):
        source=source[:start]+source[end:]
    return source.decode('utf-8'),sorted(found)


def update_manifest()->None:
    data=json.loads(MANIFEST.read_text(encoding='utf-8'))
    module_id='board-presentation'
    if module_id not in data['loadOrder']:
        guardian_index=data['loadOrder'].index('combat-guardians')
        data['loadOrder'].insert(guardian_index+1,module_id)
    existing=[m for m in data['modules'] if m.get('id')==module_id]
    module={
        'id':module_id,
        'path':'js/board/presentation.js',
        'domain':'board/tile-and-road-presentation',
        'status':'extracted',
        'requires':['assets','combat-guardians'],
        'provides':['DiceboundBoardPresentation'],
    }
    if existing:
        if existing!=[module]:raise RuntimeError('board-presentation manifest entry drifted')
    else:
        guardian_index=next(i for i,m in enumerate(data['modules']) if m.get('id')=='combat-guardians')
        data['modules'].insert(guardian_index+1,module)
    MANIFEST.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')


def update_index()->None:
    text=INDEX.read_text(encoding='utf-8').replace('\r\n','\n')
    script='<script src="js/board/presentation.js"></script>'
    if script not in text:
        text=replace_once(text,'  <script src="js/combat/guardians.js"></script>','  <script src="js/combat/guardians.js"></script>\n  '+script,'load board presentation owner')
    INDEX.write_text(text,encoding='utf-8',newline='\n')


def update_scaling()->None:
    text=SCALING.read_text(encoding='utf-8').replace('\r\n','\n')
    text=replace_once(
        text,
        '    const beta045EnemyArtForName=deps.beta045EnemyArtForName||(()=>null);\n    const db046EnemyArtForName=deps.db046EnemyArtForName||(()=>null);\n    const db047UiArt=deps.db047UiArt||(()=>null);',
        '    const enemyArtForName=deps.enemyArtForName||(()=>null);',
        'collapse enemy art dependencies',
    )
    text=replace_once(
        text,
        "      {const tune={1:[1.00,1.00,0],2:[1.02,1.01,0],3:[1.05,1.04,1],4:[0.99,1.00,0],5:[1.20,1.14,2],6:[1.08,1.06,1]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*tune[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*tune[1]));enemy.defense=Math.max(0,(enemy.defense||0)+tune[2]);if(enemy.name==='Cultist')enemy.lifeSteal=hellMode?.20:nightmareMode?.10:.01;const art=beta045EnemyArtForName(enemy.name);if(art)enemy.icon=art;}",
        "      {const tune={1:[1.00,1.00,0],2:[1.02,1.01,0],3:[1.05,1.04,1],4:[0.99,1.00,0],5:[1.20,1.14,2],6:[1.08,1.06,1]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*tune[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*tune[1]));enemy.defense=Math.max(0,(enemy.defense||0)+tune[2]);if(enemy.name==='Cultist')enemy.lifeSteal=hellMode?.20:nightmareMode?.10:.01;}",
        'remove first historical enemy art rewrite',
    )
    text=replace_once(
        text,
        "      {const tune={1:[1.00,1.00,0],2:[1.03,1.02,0],3:[1.07,1.05,1],4:[1.10,1.08,2],5:[1.30,1.20,4],6:[1.12,1.10,2]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*tune[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*tune[1]));enemy.defense=Math.max(0,(enemy.defense||0)+tune[2]);const art=db046EnemyArtForName(enemy.name);if(art)enemy.icon=art;}",
        "      {const tune={1:[1.00,1.00,0],2:[1.03,1.02,0],3:[1.07,1.05,1],4:[1.10,1.08,2],5:[1.30,1.20,4],6:[1.12,1.10,2]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*tune[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*tune[1]));enemy.defense=Math.max(0,(enemy.defense||0)+tune[2]);}",
        'remove second historical enemy art rewrite',
    )
    text=replace_once(
        text,
        "      {const perBoard={1:[1.00,1.00,0],2:[1.03,1.02,0],3:[1.08,1.06,1],4:[1.15,1.10,2],5:[1.38,1.24,5],6:[1.55,1.33,7]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*perBoard[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*perBoard[1]));enemy.defense=Math.max(0,(enemy.defense||0)+perBoard[2]);const name=(enemy.name||'').toLowerCase();if(name.includes('bandit'))enemy.icon=db047UiArt('bandit',enemy.name,'db-art-portrait')||enemy.icon;if(name.includes('troll'))enemy.icon=db047UiArt('troll',enemy.name,'db-art-portrait')||enemy.icon;}",
        "      {const perBoard={1:[1.00,1.00,0],2:[1.03,1.02,0],3:[1.08,1.06,1],4:[1.15,1.10,2],5:[1.38,1.24,5],6:[1.55,1.33,7]}[boardLevel]||[1,1,0];enemy.hp=Math.max(1,Math.round(enemy.hp*perBoard[0]));enemy.maxHp=enemy.hp;enemy.attack=Math.max(1,Math.round(enemy.attack*perBoard[1]));enemy.defense=Math.max(0,(enemy.defense||0)+perBoard[2]);}",
        'remove third historical enemy art rewrite',
    )
    marker="      // Beta 0.6.4 ordinary Devil policy ---------------------------------\n"
    text=replace_once(text,marker,"      {const art=enemyArtForName(enemy.name);if(art)enemy.icon=art;}\n\n"+marker,'apply canonical enemy art once after scaling')
    for stale in ['beta045EnemyArtForName','db046EnemyArtForName','db047UiArt']:
        if stale in text:raise RuntimeError(f'historical scaling art dependency survived: {stale}')
    SCALING.write_text(text,encoding='utf-8',newline='\n')


def update_monolith()->tuple[int,int,list[str]]:
    text=MONOLITH.read_text(encoding='utf-8').replace('\r\n','\n')
    before=text.count('\n')+1
    text=replace_once(
        text,
        '  const dbRun=window.DiceboundRun;\n  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");',
        '  const dbRun=window.DiceboundRun;\n  if(!dbRun)throw new Error("dicebound.js requires DiceboundRun before loading.");\n  const dbBoardPresentation=window.DiceboundBoardPresentation;\n  if(!dbBoardPresentation?.configure||!dbBoardPresentation?.tileMeta)throw new Error("dicebound.js requires DiceboundBoardPresentation before loading.");\n  dbBoardPresentation.configure({getBoardLevel:()=>boardLevel});',
        'configure board presentation owner',
    )
    text=replace_once(text,'[icon,label]=tileMeta(tile),el=document.createElement("div")','[icon,label]=dbBoardPresentation.tileMeta(tile,{ready:dbTileMetaFinalReady}),el=document.createElement("div")','route buildBoard tile metadata')
    text=replace_once(
        text,
        '    beta045EnemyArtForName,db046EnemyArtForName,db047UiArt\n  });',
        '    enemyArtForName:name=>dbBoardPresentation.enemyArtForName(name)\n  });',
        'route enemy scaling presentation through Board owner',
    )
    text,removed=remove_named_functions(text,{'tileMeta','guardianTileArt','db049EnemyTileIcon'})
    for stale in ['function tileMeta(','function guardianTileArt(','function db049EnemyTileIcon(']:
        if stale in text:raise RuntimeError(f'board presentation predecessor survived: {stale}')
    if text.count('dbBoardPresentation.configure({')!=1:raise RuntimeError('Board presentation owner must be configured exactly once')
    if text.count('dbBoardPresentation.tileMeta(')!=1:raise RuntimeError('Board renderer must route exactly once through Board presentation owner')
    while '\n\n\n' in text:text=text.replace('\n\n\n','\n\n')
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    return before,text.count('\n')+1,removed


def update_anti_return()->None:
    text=ANTI_RETURN.read_text(encoding='utf-8').replace('\r\n','\n')
    if "BOARD_PRESENTATION=ROOT/\"runtime/js/board/presentation.js\"" not in text:
        text=replace_once(text,'DICE=ROOT/"runtime/js/run/dice.js"','DICE=ROOT/"runtime/js/run/dice.js"\nBOARD_PRESENTATION=ROOT/"runtime/js/board/presentation.js"','add Board presentation path')
    if 'STALE_BOARD_PRESENTATION_NAMES=' not in text:
        text=replace_once(text,"STALE_SCHEMA_MARKERS=['v13NormalizeMeta','normalizeV15','importOldSaveIfNeeded','v24MigrateItemRarity','raritySchemaV24','v24Rarity','db060MigratedNamed','ACHIEVEMENT_POWER_GATES','fighter_counter_reserve']", "STALE_SCHEMA_MARKERS=['v13NormalizeMeta','normalizeV15','importOldSaveIfNeeded','v24MigrateItemRarity','raritySchemaV24','v24Rarity','db060MigratedNamed','ACHIEVEMENT_POWER_GATES','fighter_counter_reserve']\nSTALE_BOARD_PRESENTATION_NAMES=['tileMeta','guardianTileArt','db049EnemyTileIcon']",'add Board presentation anti-return list')
    needle='    assert "function normalizeCareerMeta(raw={}){" in code, "canonical career normalizer is missing"\n\n'
    addition=(
        '    assert "function normalizeCareerMeta(raw={}){" in code, "canonical career normalizer is missing"\n'
        '    board_text=BOARD_PRESENTATION.read_text(encoding="utf-8")\n'
        '    for name in STALE_BOARD_PRESENTATION_NAMES:\n'
        '        assert not re.search(rf"\\bfunction\\s+{re.escape(name)}\\s*\\(",code), f"Board presentation predecessor {name} returned to monolith"\n'
        '    assert "dbBoardPresentation.tileMeta(tile,{ready:dbTileMetaFinalReady})" in text, "board rendering no longer routes through board/presentation"\n'
        '    for marker in [\'const OWNER="board/presentation"\',\'function tileMeta(\',\'function enemyArtForName(\',\'window.DiceboundBoardPresentation=api\']:\n'
        '        assert marker in board_text, f"board/presentation owner missing {marker}"\n\n'
    )
    if needle in text:text=text.replace(needle,addition,1)
    elif 'board_text=BOARD_PRESENTATION.read_text' not in text:raise RuntimeError('anti-return insertion point drifted')
    text=text.replace('retired schema migrations absent")','retired schema migrations absent, Board presentation canonical")')
    ANTI_RETURN.write_text(text,encoding='utf-8',newline='\n')


def main()->int:
    update_manifest()
    update_index()
    update_scaling()
    before,after,removed=update_monolith()
    update_anti_return()
    print(f'CANONICAL_0670_WAVE5 {before}->{after} monolith lines; Board tile presentation owner routed; removed={removed}; enemy scaling art rewrites 3->1')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
