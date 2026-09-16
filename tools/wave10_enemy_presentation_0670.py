from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PRESENTATION=ROOT/'runtime/js/combat/presentation.js'
MONOLITH=ROOT/'runtime/js/dicebound.js'
BOARD_GENERATION=ROOT/'runtime/js/board/generation.js'


def write(path:Path,text:str)->None:
    path.write_text(text,encoding='utf-8',newline='\n')


def update_presentation()->None:
    text=PRESENTATION.read_text(encoding='utf-8')
    marker='  function renderEnemyParty() {'
    block=r'''  const PROCEDURAL_ENEMY_SHAPES=Object.freeze({
    goblin:`<path d="M10 30l13-8 3-13 10 10 13-10 1 14 13 7-12 4q4 21-15 24Q17 56 21 34z" fill="#758b42" stroke="#aec76c" stroke-width="2"/><circle cx="29" cy="34" r="3" fill="#ffe26c"/><circle cx="44" cy="33" r="3" fill="#ffe26c"/><path d="M31 47l10-3" stroke="#2c311c" stroke-width="3"/>`,
    skeleton:`<circle cx="36" cy="30" r="18" fill="#d4cfbd" stroke="#f2eddc" stroke-width="2"/><circle cx="29" cy="28" r="5" fill="#19191c"/><circle cx="44" cy="28" r="5" fill="#19191c"/><path d="M36 34l-3 6h6z" fill="#19191c"/><path d="M25 47h22M28 51h16" stroke="#6a665e" stroke-width="3"/>`,
    orc:`<path d="M13 58q0-25 12-35L21 8l13 10 12-9 4 15q12 9 8 34z" fill="#587644" stroke="#9ab977" stroke-width="2"/><circle cx="29" cy="32" r="3" fill="#ffd56a"/><circle cx="45" cy="32" r="3" fill="#ffd56a"/><path d="M26 46l6-6 4 8 5-8 7 6" fill="#e9dfbe"/>`,
    cultist:`<path d="M10 60q4-34 26-50 22 16 26 50z" fill="#39213f" stroke="#815589" stroke-width="2"/><path d="M19 28Q24 11 36 11t17 17l-8-4H27z" fill="#211329"/><circle cx="29" cy="33" r="2.5" fill="#ed65db"/><circle cx="44" cy="33" r="2.5" fill="#ed65db"/><path d="M36 42l5 8-5 5-5-5z" fill="#a9489d"/>`,
    lich:`<path d="M11 59q3-30 25-42 22 12 25 42z" fill="#2b2848" stroke="#716fa0" stroke-width="2"/><path d="M20 21l5-11 11 7 9-9 7 13-5 7H24z" fill="#7c6aac"/><circle cx="29" cy="33" r="3" fill="#8cf5ff"/><circle cx="44" cy="33" r="3" fill="#8cf5ff"/><path d="M53 14v39M48 18l5-8 5 8" stroke="#b8dfff" stroke-width="3"/>`
  });
  const REQUIRED_ENEMY_ART_IDS=new Set(["slime","wolf","wraith","devil","bandit","troll"]);
  function portraitHash(value){let h=2166136261;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return Math.abs(h>>>0);}
  function escapePortraitLabel(value){return String(value||"Enemy").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function proceduralEnemyPortrait(enemy,board){
    const id=String(enemy?.id||""),shape=PROCEDURAL_ENEMY_SHAPES[id];
    if(!shape)return "";
    const palettes=[null,["#15271c","#4a724b","#9bc26c"],["#15172e","#51448b","#8eb5ff"],["#1b0d25","#6d275f","#dd6dad"],["#160f21","#755b31","#e3c36c"],["#0b1720","#356c78","#80e1dd"],["#0b1720","#356c78","#80e1dd"]];
    const [bg1,bg2]=palettes[Math.min(6,Math.max(1,Math.floor(Number(board)||1)))],gid=`enemy_${portraitHash(enemy?.name||id)}`,label=escapePortraitLabel(enemy?.name||id);
    return `<svg class="enemy-art-frame" viewBox="0 0 72 72" role="img" aria-label="${label}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect x="2" y="2" width="68" height="68" rx="17" fill="#060a10"/><rect x="4" y="4" width="64" height="64" rx="15" fill="url(#${gid})"/><g transform="translate(0 2)">${shape}</g></svg>`;
  }
  function enemyPortraitHTML(enemy){
    const rt=requireRuntime(),state=rt.getState(),id=String(enemy?.id||""),board=Math.min(6,Math.max(1,Math.floor(Number(state.boardLevel)||1))),mode=state.hellMode?"hell":state.nightmareMode?"nightmare":"normal",label=escapePortraitLabel(enemy?.name||id||"Enemy");
    if(id){
      const tiered=rt.enemyBattleArtById(id,board);
      if(tiered){const aura=rt.enemyModeAura(mode);return `<span class="db0636-tiered-enemy-art ${aura.className}" data-enemy-battle-art="${tiered.key}" data-enemy-battle-board="${tiered.board}" data-enemy-battle-mode="${aura.id}"><img class="enemy-art-frame enemy-art-image db0636-tiered-enemy-image" src="${tiered.src}" alt="${escapePortraitLabel(tiered.alt)} · Board ${tiered.board}" draggable="false"></span>`;}
      const guardianSrc=rt.guardianBattleArt(id);
      if(guardianSrc)return `<img class="enemy-art-frame enemy-art-image db060-guardian-art" src="${guardianSrc}" alt="${label}" draggable="false">`;
      const portrait=rt.enemyPortraitById(id);
      if(portrait)return `<img class="enemy-art-frame enemy-art-image" src="${portrait.src}" alt="${escapePortraitLabel(portrait.alt||enemy?.name||id)}" draggable="false">`;
      const procedural=proceduralEnemyPortrait(enemy,board);if(procedural)return procedural;
      if(REQUIRED_ENEMY_ART_IDS.has(id)||enemy?.guardian||enemy?.boss)throw new Error(`Missing required combat art for enemy ${id}`);
    }
    return `<span class="enemy-art-fallback" role="img" aria-label="${label}">${enemy?.icon||"👹"}</span>`;
  }

'''
    if 'function enemyPortraitHTML(enemy)' not in text:
        if marker not in text:raise RuntimeError('Combat Presentation renderEnemyParty anchor changed unexpectedly')
        text=text.replace(marker,block+marker,1)
    text=text.replace('${rt.enemyPortraitHTML(e)}','${enemyPortraitHTML(e)}')
    if 'rt.enemyPortraitHTML' in text:raise RuntimeError('Runtime enemy portrait callback survived Combat Presentation ownership move')
    required='      "getPlayer","getEncounterLead","livingEnemies","isClassActive","random","rand","pick","clamp","rollTieredProc",'
    # no-op anchor: keep this script resilient when run against unrelated modules.
    if '"enemyBattleArtById"' not in text:
        config_anchor='      "getState","find","getClasses","getElements","getPets","getOccultSpells","getGagInfo",\n'
        replacement='      "getState","find","getClasses","getElements","getPets","getOccultSpells","getGagInfo","enemyBattleArtById","enemyPortraitById","enemyModeAura","guardianBattleArt",\n'
        if config_anchor not in text:raise RuntimeError('Combat Presentation required dependency list changed unexpectedly')
        text=text.replace(config_anchor,replacement,1)
    write(PRESENTATION,text)


def update_monolith()->None:
    text=MONOLITH.read_text(encoding='utf-8')
    old='    getState:()=>({player,currentEnemy,currentEnemies,currentEnemyIndex,currentEncounterLead,currentEncounterTurn,combatBusy}),\n'
    new='    getState:()=>({player,currentEnemy,currentEnemies,currentEnemyIndex,currentEncounterLead,currentEncounterTurn,combatBusy,boardLevel,nightmareMode,hellMode}),\n'
    if new not in text:
        if old not in text:raise RuntimeError('Combat Presentation state bridge changed unexpectedly')
        text=text.replace(old,new,1)
    anchor='    applyClassPortrait:(...args)=>applyClassPortrait(...args),\n'
    injected='''    applyClassPortrait:(...args)=>applyClassPortrait(...args),
    enemyBattleArtById:(id,level)=>window.DiceboundAssets.resolveEnemyBattleArtById(id,level),
    enemyPortraitById:id=>window.DiceboundAssets.resolveEnemyPortraitById(id),
    enemyModeAura:mode=>window.DiceboundAssets.resolveEnemyModeAura(mode),
    guardianBattleArt:id=>DB317_GUARDIANS.resolveById(id)?.art?.battle||window.DiceboundAssets.resolveGuardianArt(id)?.battle||null,
'''
    if 'enemyBattleArtById:(id,level)' not in text:
        if anchor not in text:raise RuntimeError('Combat Presentation class portrait bridge changed unexpectedly')
        text=text.replace(anchor,injected,1)
    write(MONOLITH,text)


def update_pale_devil_id()->None:
    text=BOARD_GENERATION.read_text(encoding='utf-8')
    old="tiles[index]={type:'devilboss',cleared:false,packSize:1,enemyBase:{name:'The Pale Devil',icon:'👿🌙'"
    new="tiles[index]={type:'devilboss',cleared:false,packSize:1,enemyBase:{id:'pale-devil',name:'The Pale Devil',icon:'👿🌙'"
    if new not in text:
        if old not in text:raise RuntimeError('Pale Devil board placement changed unexpectedly')
        text=text.replace(old,new,1)
    write(BOARD_GENERATION,text)


if __name__=='__main__':
    update_presentation();update_monolith();update_pale_devil_id();print('WAVE10_ENEMY_PRESENTATION Combat Presentation now owns ID-driven enemy rendering')
