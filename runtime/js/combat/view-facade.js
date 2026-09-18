(() => {
  "use strict";

  const OWNER = "combat/view-facade";
  const presentationOwner = window.DiceboundCombatPresentation;
  const vfxOwner = window.DiceboundCombatVfx;
  if (!presentationOwner || typeof presentationOwner.configure !== "function") {
    throw new Error("DiceboundCombatView requires DiceboundCombatPresentation before loading.");
  }
  if (!vfxOwner || typeof vfxOwner.create !== "function") {
    throw new Error("DiceboundCombatView requires DiceboundCombatVfx before loading.");
  }

  let presentation = null;
  let vfx = null;

  function configurePresentation(runtime) {
    const presentationRuntime = {
      ...runtime,
      resolveCombatBackground: typeof runtime?.resolveCombatBackground === "function"
        ? runtime.resolveCombatBackground
        : (board, mode) => window.DiceboundAssets?.resolveCombatBackground?.(board, mode) || null
    };
    presentation = presentationOwner.configure(presentationRuntime);
    if (!presentation || typeof presentation.update !== "function" || typeof presentation.applyCombatBackground !== "function") {
      throw new Error("Combat View presentation owner did not return its configured API.");
    }
    return api;
  }

  function configureVfx(runtime) {
    vfx = vfxOwner.create(runtime);
    if (!vfx || typeof vfx.playDonutRain !== "function" || typeof vfx.playProjectileProc !== "function") {
      throw new Error("Combat View VFX owner did not return its configured API.");
    }
    return api;
  }

  function requirePresentation() {
    if (!presentation) throw new Error("DiceboundCombatView presentation must be configured before use.");
    return presentation;
  }

  function requireVfx() {
    if (!vfx) throw new Error("DiceboundCombatView VFX must be configured before use.");
    return vfx;
  }

  function optionalPresentation(method, args) {
    if (!presentation) return undefined;
    return presentation[method](...args);
  }

  const api = Object.freeze({
    owner: OWNER,
    apiVersion: 1,
    configurePresentation,
    configureVfx,
    isPresentationConfigured: () => !!presentation,
    isVfxConfigured: () => !!vfx,

    applyCombatBackground: (...args) => requirePresentation().applyCombatBackground(...args),
    update: (...args) => requirePresentation().update(...args),
    renderEnemyParty: (...args) => requirePresentation().renderEnemyParty(...args),
    renderBossSpecialIndicator: (...args) => requirePresentation().renderBossSpecialIndicator(...args),
    statusDotsHTML: (...args) => requirePresentation().statusDotsHTML(...args),
    syncEnergyShieldBars: (...args) => optionalPresentation("syncEnergyShieldBars", args),
    playerAttack: (...args) => requirePresentation().playerAttack(...args),
    enemyAttack: (...args) => requirePresentation().enemyAttack(...args),
    clearEnemyAttackPresentation: (...args) => optionalPresentation("clearEnemyAttackPresentation", args),
    dodge: (...args) => requirePresentation().dodge(...args),
    clearDodgePresentation: (...args) => optionalPresentation("clearDodgePresentation", args),
    syncDragoonPresentation: (...args) => optionalPresentation("syncDragoonPresentation", args),
    dragoonLandPresentation: (...args) => optionalPresentation("dragoonLandPresentation", args),
    ensureDragoonJumpButton: (...args) => optionalPresentation("ensureDragoonJumpButton", args),
    clearDragoonPresentation: (...args) => optionalPresentation("clearDragoonPresentation", args),

    prepareNature: (...args) => requireVfx().prepareNature(...args),
    natureEffect: (...args) => requireVfx().natureEffect(...args),
    donutEffect: (...args) => requireVfx().donutEffect(...args),
    livingNatureTargets: (...args) => requireVfx().livingNatureTargets(...args),
    natureEntries: (...args) => requireVfx().natureEntries(...args),
    playNatureOnEnemy: (...args) => requireVfx().playNatureOnEnemy(...args),
    playNatureOnPlayer: (...args) => requireVfx().playNatureOnPlayer(...args),
    withNatureLegacyPresentation: (...args) => requireVfx().withNatureLegacyPresentation(...args),
    suppressLegacyElementAnimation: (...args) => requireVfx().suppressLegacyElementAnimation(...args),
    donutEntries: (...args) => requireVfx().donutEntries(...args),
    playDonutRain: (...args) => requireVfx().playDonutRain(...args),
    prepareProjectileEffects: (...args) => requireVfx().prepareProjectileEffects(...args),
    playProjectileProc: (...args) => requireVfx().playProjectileProc(...args),
    clearTransient: (...args) => {
      const result = vfx ? vfx.clearTransient(...args) : undefined;
      if (presentation) { presentation.clearEnemyAttackPresentation(); presentation.clearDodgePresentation(); presentation.clearDragoonPresentation(); }
      return result;
    },
  });

  window.DiceboundCombatView = api;
})();
