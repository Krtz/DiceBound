from __future__ import annotations

import re
from pathlib import Path

import tmp_materialize_0670_chainsaw as base

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / 'runtime/js/dicebound.js'
ITEMS_ORACLE = ROOT / 'tools/test_items_oracle.js'
ENEMIES = ROOT / 'runtime/js/combat/enemies.js'
ASSETS = ROOT / 'runtime/js/assets.js'
BOARD_PRESENTATION = ROOT / 'runtime/js/board/presentation.js'
ENEMY_SCALING = ROOT / 'runtime/js/combat/enemy-scaling-resolution.js'
COMBAT_PRESENTATION = ROOT / 'runtime/js/combat/presentation.js'
STRIKE = ROOT / 'runtime/js/combat/strike-resolution.js'

REJECT_LOOP = "      for(const rarity of ['artifact','mythical','omega','bogus']){const before=restore('reject-'+rarity,{classId:'ranger',board:4,position:40});let error=null;try{gen.generateEquipment(rarity,null);}catch(reason){error=String(reason?.message||reason);}finish({name:'reject-'+rarity,kind:'reject',requestedRarity:rarity,error},before);}"
GEN_LOOP = "      for(const [name,rarity,slot,classId,board,position] of genCases){const before=restore(name,{classId,board,position});const item=gen.generateEquipment(rarity,slot);finish({name,kind:'generate',requestedRarity:rarity,forcedSlot:slot,classId,board,position,item:compactItem(item)},before);}"


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding='utf-8', newline='\n')


def statement_end(source: bytes, node) -> int:
    end = node.end_byte
    while end < len(source) and source[end:end+1] in {b' ', b'\t', b';'}:
        end += 1
    if source[end:end+2] == b'\r\n':
        return end + 2
    if source[end:end+1] == b'\n':
        return end + 1
    return end


def remove_functions(text: str, names: set[str]) -> tuple[str, int]:
    source = text.encode('utf-8')
    tree = base.parse(source)
    spans = []
    found = set()
    for node in base.walk(tree.root_node):
        if node.type != 'function_declaration':
            continue
        ident = node.child_by_field_name('name')
        if not ident:
            continue
        name = base.node_text(source, ident)
        if name not in names:
            continue
        if node.end_byte - node.start_byte > 50000:
            raise RuntimeError(f'Refusing oversized function removal for {name}')
        spans.append((node.start_byte, statement_end(source, node)))
        found.add(name)
    missing = names - found
    # Idempotent after the wave has landed.
    for name in list(missing):
        if not re.search(rf'\bfunction\s+{re.escape(name)}\b', text):
            missing.remove(name)
    if missing:
        raise RuntimeError(f'Expected Wave 10 function(s) changed unexpectedly: {sorted(missing)}')
    for start, end in sorted(spans, reverse=True):
        source = source[:start] + source[end:]
    return source.decode('utf-8'), len(spans)


def dedupe_items_oracle() -> int:
    text = ITEMS_ORACLE.read_text(encoding='utf-8')
    count = text.count(REJECT_LOOP)
    if count < 1:
        raise RuntimeError('Strict Items rejection loop missing before Wave 10 dedupe')
    text = text.replace(REJECT_LOOP + '\n', '').replace(REJECT_LOOP, '')
    if GEN_LOOP not in text:
        raise RuntimeError('Items generation loop changed unexpectedly')
    text = text.replace(GEN_LOOP, GEN_LOOP + '\n' + REJECT_LOOP, 1)
    if text.count(REJECT_LOOP) != 1:
        raise RuntimeError('Items strict rejection loop did not collapse to exactly one copy')
    write(ITEMS_ORACLE, text)
    return count - 1


def add_enemy_ids() -> int:
    text = ENEMIES.read_text(encoding='utf-8')
    identities = [
        ('slime', 'Slime'), ('goblin', 'Goblin'), ('skeleton', 'Skeleton'), ('wolf', 'Wolf'),
        ('bandit', 'Bandit'), ('orc', 'Orc'), ('cultist', 'Cultist'), ('wraith', 'Wraith'),
        ('troll', 'Troll'), ('devil', 'Devil'), ('lich', 'Lich'),
    ]
    changed = 0
    for enemy_id, name in identities:
        with_id = f'      "id": "{enemy_id}",\n      "name": "{name}",'
        if with_id in text:
            continue
        needle = f'      "name": "{name}",'
        if needle not in text:
            raise RuntimeError(f'Normal enemy definition changed unexpectedly for {name}')
        text = text.replace(needle, with_id, 1)
        changed += 1
    write(ENEMIES, text)
    return changed


def update_assets() -> int:
    text = ASSETS.read_text(encoding='utf-8')
    anchor = '  const normalizeEnemyMode=mode=>String(mode||"normal").toLowerCase()==="hell"?"hell":String(mode||"normal").toLowerCase()==="nightmare"?"nightmare":"normal";\n'
    block = '''  const normalEnemyEntry=id=>manifest.enemies[String(id)]||null;
  const resolveEnemyPortraitById=id=>{const e=normalEnemyEntry(id);return e?.portrait?Object.freeze({key:String(id),src:e.portrait,alt:e.alt||String(id)}):null};
  const resolveEnemyBattleArtById=(id,level=1)=>{const e=normalEnemyEntry(id);if(!e)return null;const board=normalizeBattleBoard(level),src=e.battleByBoard?.[String(board)]||null;return src?Object.freeze({key:String(id),src,alt:e.alt||String(id),board}):null};
  const resolveEnemyMarkerById=id=>{const e=normalEnemyEntry(id);return e?.boardMarker?Object.freeze({key:String(id),src:e.boardMarker,alt:e.alt||String(id)}):null};
'''
    if block not in text:
        if anchor not in text:
            raise RuntimeError('Assets enemy resolver anchor changed unexpectedly')
        text = text.replace(anchor, anchor + block, 1)
    export_old = 'resolveEnemyPortrait,resolveEnemyBattleArt,resolveEnemyMarker,resolveEnemyModeAura,resolveMarkerByName'
    export_new = 'resolveEnemyPortrait,resolveEnemyBattleArt,resolveEnemyMarker,resolveEnemyPortraitById,resolveEnemyBattleArtById,resolveEnemyMarkerById,resolveEnemyModeAura,resolveMarkerByName'
    if export_new not in text:
        if export_old not in text:
            raise RuntimeError('Assets export surface changed unexpectedly')
        text = text.replace(export_old, export_new, 1)
    write(ASSETS, text)
    return 1


def update_board_presentation() -> int:
    text = BOARD_PRESENTATION.read_text(encoding='utf-8')
    text = text.replace(
        'if(!assets?.resolveUiIcon||!assets?.resolveGuardianArt)throw new Error("DiceboundBoardPresentation requires DiceboundAssets before loading.");',
        'if(!assets?.resolveUiIcon||!assets?.resolveGuardianArt||!assets?.resolveEnemyPortraitById)throw new Error("DiceboundBoardPresentation requires DiceboundAssets before loading.");'
    )
    old = '''  function enemyArtForName(name){
    if(/bandit/i.test(String(name||"")))return uiArt("bandit",name,"db-art-portrait");
    if(/troll/i.test(String(name||"")))return uiArt("troll",name,"db-art-portrait");
    return "";
  }
'''
    new = '''  function enemyArtForId(id,label=""){
    const entry=assets.resolveEnemyPortraitById(id);
    if(!entry)return "";
    const alt=(label||entry.alt||id||"Enemy").replace(/"/g,"&quot;");
    return `<img class="db-art-icon db-art-portrait" src="${entry.src}" alt="${alt}">`;
  }
'''
    if old in text:
        text = text.replace(old, new, 1)
    elif 'function enemyArtForId' not in text:
        raise RuntimeError('Board enemy presentation helper changed unexpectedly')
    text = text.replace('const art=enemyArtForName(tile?.enemyBase?.name);', 'const art=enemyArtForId(tile?.enemyBase?.id,tile?.enemyBase?.name);')
    text = text.replace('if(tile?.type==="enemy"&&tile?.enemyBase&&(/bandit|troll/i.test(tile.enemyBase.name||""))){', 'if(tile?.type==="enemy"&&tile?.enemyBase&&["bandit","troll"].includes(tile.enemyBase.id)){')
    text = text.replace('configure,tileMeta,enemyArtForName,inspect:', 'configure,tileMeta,enemyArtForId,inspect:')
    if 'enemyArtForName' in text:
        raise RuntimeError('Name-driven Board enemy art survived Wave 10')
    write(BOARD_PRESENTATION, text)
    return 1


def update_enemy_scaling() -> int:
    text = ENEMY_SCALING.read_text(encoding='utf-8')
    text = text.replace('    const enemyArtForName=deps.enemyArtForName||(()=>null);\n', '')
    text = text.replace('      {const art=enemyArtForName(enemy.name);if(art)enemy.icon=art;}\n\n', '')
    if 'enemyArtForName' in text:
        raise RuntimeError('Presentation art callback survived enemy scaling cleanup')
    write(ENEMY_SCALING, text)
    return 1


def update_combat_presentation() -> int:
    text = COMBAT_PRESENTATION.read_text(encoding='utf-8')
    text = text.replace('"isClassActive","hasClassMechanic","classIdentityId","applyClassPortrait","enemyPortraitHTML",', '"isClassActive","hasClassMechanic","classIdentityId","applyClassPortrait",')
    if 'enemyPortraitHTML' in text:
        raise RuntimeError('Dead enemyPortraitHTML dependency survived Combat Presentation cleanup')
    write(COMBAT_PRESENTATION, text)
    return 1


def update_strike_resolution() -> int:
    text = STRIKE.read_text(encoding='utf-8')
    text = text.replace(',"getFastEchoCap","setFastEchoCap","getV26FastEcho","setV26FastEcho","getElementKeys"', ',"getFastEchoCap","setFastEchoCap","getElementKeys"')
    old = '''  async function v26FastEchoStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), turbo = rt.isClassActive("ouroboros") && (p.doubleStrike || 0) > 10;
    if (turbo) rt.setV26FastEcho(true);
    try { return await v25PoisonStrike(target, opts); }
    finally { if (turbo) rt.setV26FastEcho(false); }
  }

  async function v27DodgeAndSpeedStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), oldCap = rt.getFastEchoCap() || 0, echo = p.doubleStrike || 0;
    if (rt.isClassActive("ouroboros")) {
      rt.setFastEchoCap(echo >= 50 ? 10 : echo >= 10 ? 32 : 0);
      rt.syncOuroborosEconomy();
    }
    try {
      if (target?.hp > 0 && (target.dodge || 0) > 0 && rt.random() < target.dodge) {
        await rt.animateClassAttack(opts.echo ? "echo" : "normal");
        p.combatAttackCount++;
        rt.setCombatText(`${target.name} dodges ${opts.echo ? `Echo ${opts.index || ""}` : "the attack"}.`);
        rt.addCombatHistory(`🌫️ ${target.name} dodges (${Math.round(target.dodge * 100)}% enemy Dodge).`);
        rt.updateCombatUI();
        await rt.delay(rt.isClassActive("ouroboros") ? 35 : 220);
        return { dealt: 0, crit: 0, elementDamage: 0, dodged: true };
      }
      return await v26FastEchoStrike(target, opts);
    } finally { rt.setFastEchoCap(oldCap); }
  }
'''
    new = '''  function echoDelayCap(echoChance) {
    const echo=Math.max(0,Number(echoChance)||0);
    return echo>=50?8:echo>=10?20:echo>=5?34:echo>=2?58:echo>=1?85:0;
  }

  async function speedAdjustedStrike(target, opts = {}) {
    const rt = requireRuntime(), p = player(), oldCap = rt.getFastEchoCap() || 0;
    rt.setFastEchoCap(echoDelayCap(p.doubleStrike));
    if (rt.isClassActive("ouroboros")) rt.syncOuroborosEconomy();
    try {
      if (target?.hp > 0 && (target.dodge || 0) > 0 && rt.random() < target.dodge) {
        await rt.animateClassAttack(opts.echo ? "echo" : "normal");
        p.combatAttackCount++;
        rt.setCombatText(`${target.name} dodges ${opts.echo ? `Echo ${opts.index || ""}` : "the attack"}.`);
        rt.addCombatHistory(`🌫️ ${target.name} dodges (${Math.round(target.dodge * 100)}% enemy Dodge).`);
        rt.updateCombatUI();
        await rt.delay(220);
        return { dealt: 0, crit: 0, elementDamage: 0, dodged: true };
      }
      return await v25PoisonStrike(target, opts);
    } finally { rt.setFastEchoCap(oldCap); }
  }
'''
    if old in text:
        text = text.replace(old, new, 1)
    elif 'function speedAdjustedStrike' not in text:
        raise RuntimeError('Echo-speed strike layer changed unexpectedly')
    text = text.replace('const result = await v27DodgeAndSpeedStrike(target, opts);', 'const result = await speedAdjustedStrike(target, opts);')
    text = text.replace('    strikeBaseDamage,\n    performStrike\n', '    strikeBaseDamage,\n    performStrike,\n    echoDelayCap\n')
    survivors = ['v26FastEchoStrike', 'v27DodgeAndSpeedStrike', 'getV26FastEcho', 'setV26FastEcho']
    if any(name in text for name in survivors):
        raise RuntimeError(f'Historical Echo-speed layer survived: {[name for name in survivors if name in text]}')
    write(STRIKE, text)
    return 1


def update_monolith() -> tuple[int, int]:
    text = MONOLITH.read_text(encoding='utf-8')
    before = text.count('\n') + 1
    text, removed = remove_functions(text, {'artHash', 'enemyPortraitSVG', 'db0636TieredEnemyMarkup', 'v28FrogEchoCap'})
    text = text.replace('    enemyPortraitHTML:enemy=>enemyPortraitSVG(enemy),\n', '')
    text = text.replace('    getBoard:level=>db317Board(level),enemyPolicy:db064EnemyPolicy,elementKeys:ELEMENT_KEYS,\n    enemyArtForName:name=>dbBoardPresentation.enemyArtForName(name)\n', '    getBoard:level=>db317Board(level),enemyPolicy:db064EnemyPolicy,elementKeys:ELEMENT_KEYS\n')
    text = text.replace('    frogEchoCap:echo=>v28FrogEchoCap(echo),\n', '')
    text = text.replace('    setFastEchoCap:value=>{window.__DB_FAST_ECHO_CAP__=value;},getV26FastEcho:()=>!!window.__DB_V26_FAST_ECHO__,\n    setV26FastEcho:value=>{window.__DB_V26_FAST_ECHO__=!!value;},getElementKeys:()=>ELEMENT_KEYS,', '    setFastEchoCap:value=>{window.__DB_FAST_ECHO_CAP__=value;},getElementKeys:()=>ELEMENT_KEYS,')
    text = text.replace('  const delay = (ms) => new Promise(resolve => { const cap=Number(window.__DB_FAST_ECHO_CAP__||0); setTimeout(resolve, cap>0 ? Math.min(ms,cap) : (window.__DB_V26_FAST_ECHO__ ? Math.min(ms,55) : ms)); });', '  const delay = (ms) => new Promise(resolve => { const cap=Number(window.__DB_FAST_ECHO_CAP__||0); setTimeout(resolve,cap>0?Math.min(ms,cap):ms); });')
    forbidden = ['enemyPortraitSVG', 'artHash(', 'db0636TieredEnemyMarkup', 'v28FrogEchoCap', '__DB_V26_FAST_ECHO__', 'enemyArtForName:name']
    alive = [token for token in forbidden if token in text]
    if alive:
        raise RuntimeError(f'Wave 10 monolith archaeology survived: {alive}')
    text = '\n'.join(line.rstrip() for line in text.split('\n'))
    text = re.sub(r'\n(?:[ \t]*\n){2,}', '\n\n', text)
    after = text.count('\n') + 1
    if after > before or before - after < 20:
        raise RuntimeError(f'Enemy portrait cleanup removed implausibly little source: {before}->{after}')
    write(MONOLITH, text)
    return before, after


def main() -> int:
    duplicates = dedupe_items_oracle()
    enemy_ids = add_enemy_ids()
    update_assets()
    update_board_presentation()
    update_enemy_scaling()
    update_combat_presentation()
    update_strike_resolution()
    before, after = update_monolith()
    print(f'OWNERSHIP_WAVE10_0670 {before}->{after} monolith lines; removed_items_oracle_duplicates={duplicates}; enemy_ids_added={enemy_ids}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
