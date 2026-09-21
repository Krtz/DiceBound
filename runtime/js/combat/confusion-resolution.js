(() => {
  "use strict";

  const OWNER = "combat/confusion-resolution";
  let runtime = null;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatConfusionResolution must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat Confusion runtime is required.");
    const required = [
      "getPlayer","getCurrentEnemy","livingEnemies","playerSideTargets","random",
      "getCombatBusy","setCombatBusy","defenseDamageReduction","applyPlayerDamage","damageFriendlyTarget",
      "setCombatText","addCombatHistory","updateCombatUI","delay","resolveEnemyResponse","handlePlayerDeath"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat Confusion runtime missing ${name}().`);
    runtime = nextRuntime;
    return api;
  }

  function player() { return requireRuntime().getPlayer(); }

  function applyEnemy(enemy) {
    if (!enemy || enemy.hp <= 0) return 0;
    enemy.confusionActions = 1;
    return enemy.confusionActions;
  }

  function applyPlayer() {
    const p = player();
    if (!p || p.hp <= 0) return 0;
    p.confusionActions = 1;
    return p.confusionActions;
  }

  function choose(candidates) {
    const rt = requireRuntime(), list = (candidates || []).filter(Boolean);
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const roll = Math.max(0, Math.min(.999999999, Number(rt.random()) || 0));
    return list[Math.floor(roll * list.length)] || list[list.length - 1];
  }

  function consumeEnemyTarget(enemy) {
    if (!enemy || (enemy.confusionActions || 0) <= 0 || enemy.hp <= 0) return null;
    const candidates = requireRuntime().livingEnemies().filter(candidate => candidate?.hp > 0);
    if (!candidates.includes(enemy)) candidates.unshift(enemy);
    enemy.confusionActions = Math.max(0, (enemy.confusionActions || 0) - 1);
    return choose(candidates);
  }

  function consumePlayerTarget() {
    const rt = requireRuntime(), p = player();
    if (!p || (p.confusionActions || 0) <= 0 || p.hp <= 0) return null;
    const supplied = rt.playerSideTargets().filter(target => target?.entity && target.entity.hp > 0);
    const candidates = supplied.some(target => target.entity === p)
      ? supplied
      : [{ kind:"player", id:"player", name:"you", entity:p }, ...supplied];
    p.confusionActions = Math.max(0, (p.confusionActions || 0) - 1);
    return choose(candidates);
  }

  async function resolvePlayerOffense(label = "offensive action") {
    const rt = requireRuntime(), p = player();
    if (rt.getCombatBusy() || !rt.getCurrentEnemy() || p.hp <= 0) return null;
    const target = consumePlayerTarget();
    if (!target) return null;

    rt.setCombatBusy(true);
    const reduction = rt.defenseDamageReduction(Math.max(0, Number(target.entity.defense) || 0));
    const raw = Math.max(1, Math.round(Math.max(1, Number(p.attack) || 1) * (1 - reduction) - Math.max(0, Number(target.entity.flatReduction) || 0)));
    const hit = target.entity === p
      ? rt.applyPlayerDamage(raw)
      : rt.damageFriendlyTarget(target, raw);
    const dealt = Math.max(0, Number(hit?.total ?? hit) || 0);
    const targetName = target.entity === p ? "yourself" : (target.name || target.entity.name || "an ally");
    const message = `🧮 Confusion! ${label} misfires and hits ${targetName} for ${dealt}.`;
    rt.addCombatHistory(message);
    rt.setCombatText(message);
    rt.updateCombatUI();
    await rt.delay(520);
    if (p.hp <= 0) {
      await rt.handlePlayerDeath();
      return Object.freeze({ misfired:true, target:target.id || targetName, damage:dealt, defeated:true });
    }
    await rt.resolveEnemyResponse(false);
    return Object.freeze({ misfired:true, target:target.id || targetName, damage:dealt, defeated:false });
  }

  function clearPlayer() {
    const p = player();
    p.confusionActions = 0;
    return 0;
  }

  const api = Object.freeze({
    owner: OWNER,
    apiVersion: 1,
    configure,
    applyEnemy,
    applyPlayer,
    consumeEnemyTarget,
    consumePlayerTarget,
    resolvePlayerOffense,
    clearPlayer
  });

  window.DiceboundCombatConfusionResolution = api;
})();
