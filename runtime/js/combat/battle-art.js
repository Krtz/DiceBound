(() => {
  "use strict";

  // #40: Board environment and authored ordinary-enemy battle art are one
  // visual domain. The monolith supplies only the live Board/mode accessors.
  function assets() { return window.DiceboundAssets || null; }
  function ensureStyle(id, text) {
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id; style.textContent = text; document.head.appendChild(style);
    }
  }
  function create({ getBoard = () => 1, getMode = () => "normal" } = {}) {
    const mode = () => { const value = String(getMode() || "normal").toLowerCase(); return value === "hell" || value === "nightmare" ? value : "normal"; };
    function prepareBackground() { ensureStyle("dicebound-normal-combat-background-style", `
      #combatOverlay[data-combat-background]{isolation:isolate;overflow:hidden;background:#07101c!important}
      #combatOverlay[data-combat-background]::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background-image:var(--db0635-combat-background-image);background-size:cover;background-position:center;transform:scale(1.01)}
      #combatOverlay[data-combat-background]::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(4,9,19,.34),rgba(4,9,19,.64))}
      #combatOverlay[data-combat-background]>.modal{position:relative;z-index:2;background:linear-gradient(180deg,rgba(19,31,54,.72),rgba(7,14,28,.86))!important}
    `); }
    function resolveBackground(board = getBoard(), activeMode = mode()) { return assets()?.resolveCombatBackground?.(board, activeMode) || null; }
    function applyBackground() {
      const overlay = document.getElementById("combatOverlay"), entry = resolveBackground(); if (!overlay) return entry;
      if (entry?.image) { overlay.dataset.combatBackground = `board-${getBoard()}-normal`; overlay.style.setProperty("--db0635-combat-background-image", `url("${entry.image}")`); }
      else { delete overlay.dataset.combatBackground; overlay.style.removeProperty("--db0635-combat-background-image"); }
      return entry;
    }
    function prepareTieredArt() { ensureStyle("dicebound-0636-slime-battle-art-style", `
      #enemyIcon.enemy-stage-icons.db0636-tiered-enemy-stage{min-height:clamp(224px,35vh,430px)!important;align-items:flex-end!important;gap:clamp(8px,2vw,28px)!important;padding-top:24px!important;overflow:visible!important}
      #enemyIcon.db0636-tiered-enemy-stage .stage-enemy{min-width:clamp(100px,18vw,250px)!important;min-height:clamp(205px,32vh,400px)!important;justify-content:flex-end!important;overflow:visible!important}
      #enemyIcon.db0636-tiered-enemy-stage .stage-sprite{display:block!important;width:min(22vw,260px)!important;height:clamp(200px,31vh,390px)!important;line-height:0!important;overflow:visible!important}
      #enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"]),#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="wolf"]){min-width:clamp(92px,16vw,225px)!important;min-height:clamp(180px,28vh,350px)!important}
      #enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"]) .stage-sprite,#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="wolf"]) .stage-sprite{width:min(19vw,225px)!important;height:clamp(176px,27vh,342px)!important}
      .db0636-tiered-enemy-art{position:relative;display:block;width:100%;height:100%;isolation:isolate;overflow:visible}.db0636-tiered-enemy-image{position:relative;z-index:1;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center bottom!important;overflow:visible!important;border-radius:0!important;filter:drop-shadow(0 14px 13px rgba(0,0,0,.56))}.db0636-tiered-enemy-art::before{content:"";position:absolute;z-index:0;inset:13% 12% 8%;border-radius:50%;opacity:0;filter:blur(18px);pointer-events:none}.db0636-tiered-enemy-art.db-enemy-mode-nightmare::before{opacity:.52;background:radial-gradient(ellipse,rgba(129,69,179,.64),rgba(41,17,71,.38) 48%,transparent 74%)}.db0636-tiered-enemy-art.db-enemy-mode-hell::before{opacity:.56;background:radial-gradient(ellipse,rgba(230,84,43,.68),rgba(135,25,24,.42) 50%,transparent 75%)}#enemyIcon.db0636-tiered-enemy-stage .stage-enemy.selected .db0636-tiered-enemy-image{filter:drop-shadow(0 0 15px rgba(245,200,91,.34)) drop-shadow(0 14px 13px rgba(0,0,0,.56))}
      @media(max-width:760px){#enemyIcon.enemy-stage-icons.db0636-tiered-enemy-stage{min-height:clamp(172px,32vh,270px)!important;gap:4px!important;padding-top:18px!important}#enemyIcon.db0636-tiered-enemy-stage .stage-enemy{min-width:calc((100vw - 48px)/3)!important;min-height:clamp(150px,28vh,235px)!important}#enemyIcon.db0636-tiered-enemy-stage .stage-sprite{width:calc((100vw - 48px)/3)!important;height:clamp(146px,27vh,225px)!important}#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"]),#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="wolf"]){min-width:calc((100vw - 68px)/3)!important;min-height:clamp(132px,25vh,210px)!important}#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"]) .stage-sprite,#enemyIcon.db0636-tiered-enemy-stage .stage-enemy:has(.db0636-tiered-enemy-art[data-enemy-battle-art="wolf"]) .stage-sprite{width:calc((100vw - 68px)/3)!important;height:clamp(128px,24vh,202px)!important}.db0636-tiered-enemy-art::before{filter:blur(12px)}}
    `); }
    function tieredMarkup(enemy) { const art = assets()?.resolveEnemyBattleArt?.(enemy?.name || "", getBoard()); if (!art) return null; const aura = assets()?.resolveEnemyModeAura?.(mode()); if (!aura) return null; return `<span class="db0636-tiered-enemy-art ${aura.className}" data-enemy-battle-art="${art.key}" data-enemy-battle-board="${art.board}" data-enemy-battle-mode="${aura.id}"><img class="enemy-art-frame enemy-art-image db0636-tiered-enemy-image" src="${art.src}" alt="${art.alt} · Board ${art.board}" draggable="false"></span>`; }
    function syncTieredStage() { const stage = document.getElementById("enemyIcon"); stage?.classList.toggle("db0636-tiered-enemy-stage", !!stage.querySelector(".db0636-tiered-enemy-art")); }
    function activeTieredArt() { return [...document.querySelectorAll(".db0636-tiered-enemy-art")].map(node => ({ key: node.dataset.enemyBattleArt, board: Number(node.dataset.enemyBattleBoard), mode: node.dataset.enemyBattleMode })); }
    return Object.freeze({ mode, prepareBackground, resolveBackground, applyBackground, prepareTieredArt, tieredMarkup, syncTieredStage, activeTieredArt });
  }
  window.DiceboundCombatBattleArt = Object.freeze({ create });
})();
