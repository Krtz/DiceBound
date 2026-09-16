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


def cut_between(text:str,start:str,end:str,label:str)->str:
    a=text.find(start)
    if a<0:raise RuntimeError(f'{label}: start marker missing')
    b=text.find(end,a)
    if b<0:raise RuntimeError(f'{label}: end marker missing')
    return text[:a]+text[b:]


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8').replace('\r\n','\n')
    before=text.count('\n')+1

    # Responsive HUD: fold the later sidebar synchronization into the one owner.
    old='''  function beta04SyncHud(){
    beta04HudFrame=0;const mode=beta04HudMode();beta04HudLast=mode;document.body?.setAttribute('data-hud-flow',mode);
    window.DiceboundResponsive?.schedule?.();return mode;
  }
'''
    new='''  function beta04SyncHud(){
    beta04HudFrame=0;const mode=beta04HudMode();beta04HudLast=mode;document.body?.setAttribute('data-hud-flow',mode);
    window.DiceboundResponsive?.schedule?.();beta042SyncSidebarLayout();return mode;
  }
'''
    if old in text:text=replace_once(text,old,new,'canonical responsive HUD sync')
    elif new not in text:raise RuntimeError('responsive HUD sync drifted')
    text=text.replace('  const beta04SyncHudBeta042Base=beta04SyncHud;\n  beta04SyncHud=function(){const mode=beta04SyncHudBeta042Base();beta042SyncSidebarLayout();return mode;};\n','',1)

    # Enemy portrait priority is one function: tiered enemy art -> guardian art -> ordinary portrait/procedural art.
    old='''  function enemyPortraitSVG(enemy){
    // External artwork is authoritative when present in js/assets.js.
'''
    new='''  function enemyPortraitSVG(enemy){
    const tieredArt=db0636TieredEnemyMarkup(enemy);if(tieredArt)return tieredArt;
    const guardianSrc=DB317_GUARDIANS.resolveById(enemy?.id)?.art?.battle||window.DiceboundAssets.resolveGuardianArt(enemy?.id)?.battle;
    if(guardianSrc)return `<img class="enemy-art-frame enemy-art-image db060-guardian-art" src="${guardianSrc}" alt="${enemy?.name||'Guardian'}" draggable="false">`;
    // External artwork is authoritative when present in js/assets.js.
'''
    if old in text:text=replace_once(text,old,new,'canonical enemy portrait priority')
    elif new not in text:raise RuntimeError('canonical enemy portrait priority drifted')

    guardian_wrapper='''  const db060GuardianArt=id=>DB317_GUARDIANS.resolveById(id)?.art||window.DiceboundAssets.resolveGuardianArt(id)||null;
  const db060EnemyPortraitBase=enemyPortraitSVG;
  enemyPortraitSVG=function(enemy){
    const src=DB317_GUARDIANS.resolveById(enemy?.id)?.art?.battle||window.DiceboundAssets.resolveGuardianArt(enemy?.id)?.battle;
    if(src)return `<img class="enemy-art-frame enemy-art-image db060-guardian-art" src="${src}" alt="${enemy?.name||'Guardian'}" draggable="false">`;
    return db060EnemyPortraitBase(enemy);
  };
'''
    if guardian_wrapper in text:text=text.replace(guardian_wrapper,'',1)
    elif 'db060EnemyPortraitBase' in text:raise RuntimeError('guardian portrait wrapper drifted')
    tiered_wrapper='  const db0636EnemyPortraitBase=enemyPortraitSVG;\n  enemyPortraitSVG=function(enemy){return db0636TieredEnemyMarkup(enemy)||db0636EnemyPortraitBase(enemy);};\n'
    if tiered_wrapper in text:text=text.replace(tiered_wrapper,'',1)
    elif 'db0636EnemyPortraitBase' in text:raise RuntimeError('tiered portrait wrapper drifted')

    # Element animation has one current suppression policy before its generic fallback animation.
    old='''  function playElementAnimation(key,target=currentEnemy,enemySource=false){
    const head=document.querySelector("#combatOverlay .combat-head");if(!head||!ELEMENTS[key])return;
'''
    new='''  function playElementAnimation(key,target=currentEnemy,enemySource=false){
    if(key==='fire'||key==='gun'||key==='donut'||dbCombatView.suppressLegacyElementAnimation(key))return false;
    const head=document.querySelector("#combatOverlay .combat-head");if(!head||!ELEMENTS[key])return;
'''
    if old in text:text=replace_once(text,old,new,'canonical element animation suppression')
    elif new not in text:raise RuntimeError('canonical element animation drifted')
    if 'const dbNatureLegacyAnimationBase=playElementAnimation;' in text:
        text=cut_between(text,'  const dbNatureLegacyAnimationBase=playElementAnimation;\n','  // Browser/native smoke adapter for the authored Nature VFX.  This owns no\n','Nature animation predecessor')
    friend_wrapper="""  const dbFriendLegacyElementPresentation=playElementAnimation;
  playElementAnimation=function(key,target=currentEnemy,enemySource=false){
    if(key==='fire'||key==='gun'||key==='donut')return false;
    return dbFriendLegacyElementPresentation(key,target,enemySource);
  };
"""
    if friend_wrapper in text:text=text.replace(friend_wrapper,'',1)
    elif 'dbFriendLegacyElementPresentation' in text:raise RuntimeError('projectile animation predecessor drifted')

    # Named Mythicals are authoritative factories; there is no later Legendary->Mythical replacement generation.
    factory_changes={
      '''  function generateAxelsCoffeeMug(){return {id:`legend_mug_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'offhand',rarity:'legendary',specialLegendary:true,''':'''  function generateAxelsCoffeeMug(){return {id:`legend_mug_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'offhand',rarity:'mythical',specialMythical:true,specialLegendary:true,''',
      '''  function generateKratzHeadphones(){return {id:`legend_headphones_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'hat',rarity:'legendary',specialLegendary:true,''':'''  function generateKratzHeadphones(){return {id:`legend_headphones_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'hat',rarity:'mythical',specialMythical:true,specialLegendary:true,''',
      '''  function generateKellysJeanJacket(){return {id:`legend_jacket_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'chest',rarity:'legendary',specialLegendary:true,''':'''  function generateKellysJeanJacket(){return {id:`legend_jacket_${Date.now()}_${random().toString(36).slice(2,6)}`,slot:'chest',rarity:'mythical',specialMythical:true,specialLegendary:true,''',
    }
    for old_factory,new_factory in factory_changes.items():
        if old_factory in text:text=replace_once(text,old_factory,new_factory,'named Mythical factory')
        elif new_factory not in text:raise RuntimeError('named Mythical factory drifted')
    predecessor_block='''  function db060MythicalizeNamed(item){if(!item||!db060NamedMythicals.has(item.name))return item;item.rarity='mythical';item.specialMythical=true;item.specialLegendary=true;return item;}
  const db060MugBase=generateAxelsCoffeeMug,db060HeadphonesBase=generateKratzHeadphones,db060JacketBase=generateKellysJeanJacket;
  generateAxelsCoffeeMug=function(){return db060MythicalizeNamed(db060MugBase());};
  generateKratzHeadphones=function(){return db060MythicalizeNamed(db060HeadphonesBase());};
  generateKellysJeanJacket=function(){return db060MythicalizeNamed(db060JacketBase());};
  V24_LEGENDARY_RELICS.splice(0,V24_LEGENDARY_RELICS.length,generateAxelsCoffeeMug,generateKratzHeadphones,generateKellysJeanJacket);
'''
    if predecessor_block in text:text=text.replace(predecessor_block,'',1)
    elif any(marker in text for marker in ['db060MugBase','db060HeadphonesBase','db060JacketBase']):raise RuntimeError('named Mythical predecessor block drifted')
    # Old-save/load normalization for these named items is intentionally retired with the old factories.
    text=text.replace('    db060MythicalizeNamed?.(item);return true;','    return true;',1)

    stale=['beta04SyncHudBeta042Base','db060GuardianArt','db060EnemyPortraitBase','db0636EnemyPortraitBase','dbNatureLegacyAnimationBase','dbFriendLegacyElementPresentation','db060MythicalizeNamed','db060MugBase','db060HeadphonesBase','db060JacketBase']
    for marker in stale:
        if marker in text:raise RuntimeError(f'historical Wave 7 predecessor survived: {marker}')
    if text.count('function enemyPortraitSVG(')!=1:raise RuntimeError('enemy portrait must have one declaration')
    if text.count('function playElementAnimation(')!=1:raise RuntimeError('element animation must have one declaration')
    if text.count('function beta04SyncHud(')!=1:raise RuntimeError('responsive HUD sync must have one declaration')

    while '\n\n\n' in text:text=text.replace('\n\n\n','\n\n')
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')

    guard=ANTI_RETURN.read_text(encoding='utf-8').replace('\r\n','\n')
    marker="STALE_WAVE7_PREDECESSORS=['beta04SyncHudBeta042Base','db060GuardianArt','db060EnemyPortraitBase','db0636EnemyPortraitBase','dbNatureLegacyAnimationBase','dbFriendLegacyElementPresentation','db060MythicalizeNamed','db060MugBase','db060HeadphonesBase','db060JacketBase']"
    if marker not in guard:
        anchor="STALE_WAVE6_PREDECESSORS="
        pos=guard.find(anchor)
        if pos<0:raise RuntimeError('Wave 7 anti-return anchor missing')
        line_end=guard.find('\n',pos)
        guard=guard[:line_end+1]+marker+'\n'+guard[line_end+1:]
    assertion='    for marker in STALE_WAVE7_PREDECESSORS:\n        assert marker not in text, f"historical Wave 7 predecessor {marker} returned"\n'
    if assertion not in guard:
        anchor='    for marker in STALE_WAVE6_PREDECESSORS:\n        assert marker not in text, f"historical Wave 6 predecessor {marker} returned"\n'
        if anchor not in guard:raise RuntimeError('Wave 7 anti-return assertion anchor missing')
        guard=guard.replace(anchor,anchor+assertion,1)
    ANTI_RETURN.write_text(guard,encoding='utf-8',newline='\n')

    after=text.count('\n')+1
    print(f'HISTORICAL_SCORE_WAVE7 {before}->{after} monolith lines; HUD, portrait, VFX and named-Mythical predecessor chains collapsed')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
