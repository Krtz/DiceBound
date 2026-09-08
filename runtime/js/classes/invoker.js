(() => {
  "use strict";

  const OWNER = "classes/invoker";
  const ORB = Object.freeze({ BLUE: "blue", GREEN: "green", RED: "red" });
  const RECIPE = Object.freeze({
    bbb: { name: "Cold Snap", tip: "110% single-target damage; the next 3 player strikes add 30% Attack and the last freezes." },
    bbg: { name: "Ghost Walk", tip: "2 Barriers and +35% Dodge until your next action." },
    bbr: { name: "Ice Wall", tip: "90% AoE; enemies deal 20% less damage for 2 responses." },
    ggg: { name: "EMP", tip: "135% AoE; remove 1 Barrier and delay a Guardian special." },
    bgg: { name: "Tornado", tip: "150% AoE and skip this enemy response." },
    ggr: { name: "Alacrity", tip: "For 3 actions: +30% damage, Echo and Mana generation." },
    rrr: { name: "Sun Strike", tip: "425% single-target damage that ignores Defense." },
    brr: { name: "Forge Spirit", tip: "A 4-action Spirit attacks after your actions and shreds Defense." },
    grr: { name: "Chaos Meteor", tip: "180% fire AoE and 3 authoritative Burn stacks." },
    bgr: { name: "Deafening Blast", tip: "165% AoE; next response deals 35% less damage and delays a special." }
  });
  let runtime = null;

  function requireRuntime() { if (!runtime) throw new Error("DiceboundInvoker must be configured before use."); return runtime; }
  function configure(next) {
    const required = ["getPlayer", "getMeta", "isClassActive", "getCurrentEnemy", "getCurrentEnemies", "livingEnemies", "getCombatBusy", "setCombatBusy", "damageEnemy", "damageAll", "healPlayer", "addEnemyBurn", "updateCombatUI", "setCombatText", "addCombatHistory", "identityFlash", "delay", "winCombat", "resolveEnemyResponse", "selectEnemy", "animateUltimate", "animateClassAttack", "clamp", "getEncounterLead", "getSetDamageBonus", "getEncounterTurn", "setEncounterTurn", "recordManaSpenderCast", "saveMeta", "checkDynamicClassUnlocks", "document"];
    for (const key of required) if (typeof next?.[key] !== "function") throw new Error(`Invoker runtime missing ${key}().`);
    runtime = next; return api;
  }
  const active = () => !!requireRuntime().isClassActive("invoker");
  const player = () => requireRuntime().getPlayer();
  function state(create = true) {
    const p = player();
    if (!p._invoker && create) p._invoker = { orbs: [], alacrity: 0, ghostDodge: 0, spirit: 0, spiritShred: {}, firstTrinity: false, previousRecipe: "", doubleInvoke: false };
    return p._invoker || null;
  }
  function powerScale() { const p = player(); return 1 + (p.invokerOrbTheory ? .20 : 0) + (p.invokerPerfected ? .25 : 0); }
  function orbBonuses() {
    const s = state(false), orbs = s?.orbs || [], scale = powerScale(), p = player();
    const count = color => orbs.filter(orb => orb === color).length;
    return Object.freeze({ blue: count(ORB.BLUE), green: count(ORB.GREEN), red: count(ORB.RED), defense: count(ORB.BLUE), guardPower: count(ORB.BLUE) * .04 * scale, echo: count(ORB.GREEN) * (.05 * scale + (p.invokerWexMastery || 0)), manaGeneration: count(ORB.GREEN) * .10 * scale, damage: count(ORB.RED) * (.07 * scale + (p.invokerExortMastery || 0)) });
  }
  function recipeFor(orbs = state(false)?.orbs || []) { return [...orbs].map(x => x[0]).sort().join(""); }
  function recipeInfo() { return RECIPE[recipeFor()] || null; }
  function addOrb(orb) {
    if (!active()) return false;
    const s = state(), before = s.orbs.length;
    s.orbs.push(orb); if (s.orbs.length > 3) s.orbs.shift();
    const after = recipeFor(s.orbs);
    if (orb === ORB.BLUE && player().invokerQuasMastery) requireRuntime().healPlayer(Math.max(1, Math.ceil(player().maxHp * .03)));
    if (after === "bgr" && !s.firstTrinity && player().invokerPerfectFormula) { s.firstTrinity = true; player().combatShield = (player().combatShield || 0) + 1; const mana = Math.min(player().maxMana || 0, (player().mana || 0) + 15) - (player().mana || 0); player().mana += mana; requireRuntime().addCombatHistory("✨ Perfect Formula: one Barrier and +15 Mana."); }
    requireRuntime().identityFlash(`${orb === ORB.BLUE ? "🔵" : orb === ORB.GREEN ? "🟢" : "🔴"} Orb ${before === 3 ? "rotates" : "forms"}`); render(); return true;
  }
  function afterPlayerAction(kind) {
    if (!active()) return;
    const s = state(), p = player();
    // Invoke can create Ghost Walk. Its newly granted Dodge must survive the
    // casting action, while an older Ghost Walk is cleared just before the
    // next Invoke below.
    if (s.ghostDodge && kind !== "invoke") { p.dodge = Math.max(0, p.dodge - s.ghostDodge); s.ghostDodge = 0; }
    if (kind === "generator") addOrb(ORB.GREEN);
    if (kind === "spender") addOrb(ORB.RED);
    if (kind === "guard") addOrb(ORB.BLUE);
    if (s.alacrity > 0) s.alacrity--;
    if (s.spirit > 0) spiritStrike();
    render();
  }
  function actionBonuses() { const s = state(false); return Object.freeze({ damage: orbBonuses().damage + (s?.alacrity > 0 ? .30 : 0), echo: orbBonuses().echo + (s?.alacrity > 0 ? .30 : 0), mana: orbBonuses().manaGeneration + (s?.alacrity > 0 ? .25 : 0), guard: orbBonuses().guardPower }); }
  function outgoingMultiplier() { return 1 + actionBonuses().damage; }
  function generatorManaMultiplier() { return 1 + actionBonuses().mana; }
  function spiritStrike() {
    const rt = requireRuntime(), s = state(), p = player(), target = rt.livingEnemies()[0];
    s.spirit--; if (!target) return;
    const dealt = rt.damageEnemy(target, Math.max(1, Math.round(p.attack * .45 * outgoingMultiplier())));
    const key = target.name || "target", used = s.spiritShred[key] || 0;
    if (used < 4) { target.defense = (target.defense || 0) - 1; s.spiritShred[key] = used + 1; }
    rt.addCombatHistory(`🔥 Forge Spirit strikes ${target.name} for ${dealt}${used < 4 ? " and lowers Defense." : "."}`);
  }
  function afterPlayerHit(target, { echo = false } = {}) {
    if (!active() || !target?.hp) return;
    const snap = target._invokerColdSnap;
    if (!snap?.triggers) return;
    snap.triggers--; const rt = requireRuntime(), dealt = rt.damageEnemy(target, Math.max(1, Math.round(player().attack * .30 * outgoingMultiplier())));
    rt.addCombatHistory(`❄️ Cold Snap triggers for ${dealt} (${snap.triggers} remain).`);
    if (!snap.triggers) { if (!target.guardian || (target.freezeCooldown || 0) <= 0) { target.skipTurns = (target.skipTurns || 0) + 1; if (target.guardian) target.freezeCooldown = 1; } delete target._invokerColdSnap; }
  }
  function responseModifier() {
    if (!active()) return null;
    const s = state(), bonuses = orbBonuses(), out = { damageMultiplier: 1, suppressSpecial: false, defenseBonus: bonuses.defense, guardPowerBonus: bonuses.guardPower };
    if (s.iceWall > 0) { s.iceWall--; out.damageMultiplier *= .80; }
    if (s.deafening > 0) { s.deafening--; out.damageMultiplier *= .65; out.suppressSpecial = true; requireRuntime().setEncounterTurn(Math.max(0, requireRuntime().getEncounterTurn() - 1)); }
    return out;
  }
  function scale(raw, { ignoreDefense = false } = {}) { const p = player(), rt = requireRuntime(); let amount = Math.max(1, Math.round(raw * outgoingMultiplier() * (1 + (p.damageBonus || 0) + rt.getSetDamageBonus()))); if (rt.getEncounterLead()?.boss) amount = Math.round(amount * (1 + (p.bossDamage || 0))); return { amount, ignoreDefense }; }
  function markAchievement(id) { const meta = requireRuntime().getMeta(); meta.achievements = meta.achievements || {}; meta.achievements[id] = true; }
  async function elementalLance() {
    const rt = requireRuntime(), p = player(); if (!active() || rt.getCombatBusy() || !rt.getCurrentEnemy() || p.mana < 50) return false;
    rt.setCombatBusy(true); p.guardCooldown = 0; p.mana -= 50; p.combatActionCount = (p.combatActionCount || 0) + 1;
    await rt.animateClassAttack("crit"); const target = rt.getCurrentEnemy(), hit = scale(p.attack * 1.80), dealt = rt.damageEnemy(target, hit.amount, false);
    rt.recordManaSpenderCast(); rt.saveMeta(); rt.checkDynamicClassUnlocks(); afterPlayerAction("spender");
    rt.setCombatText(`🔴 Elemental Lance spends 50 Mana and deals ${dealt} damage.`); rt.updateCombatUI(); await rt.delay(720);
    if (!rt.livingEnemies().length) return rt.winCombat(); rt.selectEnemy(rt.getCurrentEnemies().indexOf(rt.livingEnemies()[0])); return rt.resolveEnemyResponse(false);
  }
  async function invokeUltimate() {
    const rt = requireRuntime(), p = player(), s = state(), key = recipeFor(), spell = RECIPE[key];
    if (!active()) return false;
    if (rt.getCombatBusy() || !rt.getCurrentEnemy() || p.ultimateCharge < 100) return false;
    if (!spell) { rt.setCombatText("Invoke requires a complete three-orb formula."); render(); return false; }
    if (s.ghostDodge) { p.dodge = Math.max(0, p.dodge - s.ghostDodge); s.ghostDodge = 0; }
    rt.setCombatBusy(true); p.guardCooldown = 0; p.ultimateCharge = 0; p.combatActionCount = (p.combatActionCount || 0) + 1; await rt.animateUltimate();
    const perfected = p.invokerPerfected && !s.perfectedUsed, doubled = p.invokerDoubleInvocation && !s.doubleInvoke;
    const potency = (perfected ? 1.25 : 1) * (doubled ? 1.55 : 1); if (perfected) s.perfectedUsed = true; if (doubled) s.doubleInvoke = true;
    const target = rt.getCurrentEnemy(), all = () => rt.livingEnemies(), aoe = mult => rt.damageAll(scale(p.attack * mult * potency).amount, 1);
    let text = "", skipResponse = false;
    if (key === "bbb") { const dealt = rt.damageEnemy(target, scale(p.attack * 1.10 * potency).amount); target._invokerColdSnap = { triggers: 3 }; text = `❄️ Cold Snap hits ${target.name} for ${dealt} and arms 3 reactions.`; }
    if (key === "bbg") { p.combatShield = (p.combatShield || 0) + 2; const dodge = .35 * potency; p.dodge += dodge; s.ghostDodge = dodge; text = "👻 Ghost Walk raises 2 Barriers and grants temporary Dodge."; }
    if (key === "bbr") { const dealt = aoe(.90); s.iceWall = Math.max(s.iceWall || 0, 2); text = `🧊 Ice Wall deals ${dealt} total damage and chills the next 2 responses.`; }
    if (key === "ggg") { const dealt = aoe(1.35); all().forEach(enemy => enemy.enemyBarrier = Math.max(0, (enemy.enemyBarrier || 0) - 1)); if (rt.getEncounterLead()?.guardian) rt.setEncounterTurn(Math.max(0, rt.getEncounterTurn() - 1)); text = `⚡ EMP deals ${dealt}, strips Barriers and disrupts the Guardian clock.`; }
    if (key === "bgg") { const dealt = aoe(1.50); skipResponse = true; text = `🌪️ Tornado deals ${dealt} and lifts the pack through this response.`; }
    if (key === "ggr") { s.alacrity = Math.max(s.alacrity || 0, 3); text = "⚡ Alacrity empowers your next 3 player actions."; }
    if (key === "rrr") { const hit = scale(p.attack * 4.25 * potency, { ignoreDefense: true }), dealt = rt.damageEnemy(target, hit.amount, true); let cataclysm = 0; if (p.invokerCataclysm) rt.livingEnemies().filter(enemy => enemy !== target).forEach(enemy => { cataclysm += rt.damageEnemy(enemy, Math.max(1, Math.round(hit.amount * .50)), true); }); if (target.guardian && target.hp <= 0) markAchievement("invoker-solar-citation"); text = `☀️ Sun Strike deals ${dealt} Defense-piercing damage${cataclysm ? ` and Cataclysm hits the pack for ${cataclysm}` : ""}.`; }
    if (key === "brr") { s.spirit = 4; s.spiritShred = {}; text = "🔥 Forge Spirit joins your companion for 4 player actions."; }
    if (key === "grr") { const dealt = aoe(1.80); all().forEach(enemy => { if (enemy.hp > 0) rt.addEnemyBurn(enemy, 3); }); text = `☄️ Chaos Meteor deals ${dealt} and applies 3 Burn stacks.`; }
    if (key === "bgr") { const dealt = aoe(1.65); s.deafening = 1; markAchievement("invoker-threefold-thesis"); text = `💥 Deafening Blast deals ${dealt} and disarms the next response.`; }
    // Damage spells already received their second 55%-potency pass through
    // `potency`. Non-damage formulae use explicit authored equivalents rather
    // than incorrectly scaling a duration or chance as though it were damage.
    if (doubled) {
      if (key === "bbg") { p.combatShield += 1; p.dodge -= .1925; s.ghostDodge -= .1925; }
      if (key === "bbr") s.iceWall = Math.max(s.iceWall || 0, 3);
      if (key === "ggr") s.alacrity = Math.max(s.alacrity || 0, 4);
      if (key === "brr") s.spirit = Math.max(s.spirit || 0, 5);
      if (key === "grr") all().forEach(enemy => { if (enemy.hp > 0) rt.addEnemyBurn(enemy, 2); });
      if (key === "bgr") s.deafening = Math.max(s.deafening || 0, 2);
      text += " Double Invocation repeats the formula at 55% potency.";
    }
    const meta = rt.getMeta(); meta.invokerRecipes = meta.invokerRecipes || {}; meta.invokerRecipes[key] = true; markAchievement("invoker-first-principles"); if (Object.keys(meta.invokerRecipes).length >= 10) markAchievement("invoker-tenfold-memory");
    if (s.previousRecipe && s.previousRecipe !== key && p.invokerMnemonic) p.ultimateCharge = rt.clamp(p.ultimateCharge + 20, 0, 100); s.previousRecipe = key; rt.saveMeta();
    rt.setCombatText(text); rt.addCombatHistory(`✨ Invoke: ${spell.name}.`); rt.identityFlash(`INVOKE · ${spell.name}`); afterPlayerAction("invoke"); rt.updateCombatUI(); render(); await rt.delay(780);
    if (!rt.livingEnemies().length) return rt.winCombat(); rt.selectEnemy(rt.getCurrentEnemies().indexOf(rt.livingEnemies()[0])); if (skipResponse) { rt.setCombatBusy(false); rt.updateCombatUI(); return true; } return rt.resolveEnemyResponse(false);
  }
  function resetCombat(renderEmpty = false) {
    const p = player(), s = state(false);
    if (s?.ghostDodge) p.dodge = Math.max(0, p.dodge - s.ghostDodge);
    delete p._invoker;
    if (renderEmpty) render();
    else runtime?.document?.().getElementById("invokerOrbDisplay")?.remove();
  }
  function beginCombat() { resetCombat(true); }
  function render() {
    const rt = runtime; if (!rt) return; const doc = rt.document(), wrap = doc.getElementById("ultimateFill")?.closest(".ultimate-wrap"), p = rt.getPlayer(); let node = doc.getElementById("invokerOrbDisplay");
    if (!active() || !wrap) { node?.remove(); return; }
    if (!node) { node = doc.createElement("div"); node.id = "invokerOrbDisplay"; node.className = "invoker-orbs"; wrap.after(node); }
    const s = state(), info = recipeInfo(), colors = s.orbs.map(orb => `<span class="invoker-orb ${orb}" title="${orb === ORB.BLUE ? "+1 DEF, +4% Guard" : orb === ORB.GREEN ? "+5% Echo, +10% Mana gain" : "+7% player damage"}">${orb[0].toUpperCase()}</span>`).join("");
    node.innerHTML = `<div class="invoker-orb-row">${colors}${Array.from({ length: Math.max(0, 3 - s.orbs.length) }, () => '<span class="invoker-orb empty">·</span>').join("")}</div><small>${info ? `${s.orbs.map(x => x[0].toUpperCase()).join(" + ")} → ${info.name}` : "Build a three-orb formula to Invoke."}</small>`;
    const name = doc.getElementById("ultimateName"), button = doc.getElementById("ultimateBtn"); if (name) name.textContent = info ? `INVOKE: ${info.name}` : "INVOKE · 3 ORBS REQUIRED"; if (button) button.dataset.tip = info?.tip || "Invoke requires exactly three active orbs.";
    if (!doc.getElementById("invoker-orb-style")) { const style = doc.createElement("style"); style.id = "invoker-orb-style"; style.textContent = ".invoker-orbs{margin:7px 0 4px;text-align:center}.invoker-orb-row{display:flex;justify-content:center;gap:6px}.invoker-orb{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:10px;font-weight:900;border:1px solid rgba(255,255,255,.65);box-shadow:0 0 12px currentColor}.invoker-orb.blue{background:#397eea}.invoker-orb.green{background:#32ad6e}.invoker-orb.red{background:#d24d45}.invoker-orb.empty{color:#8891a6;background:rgba(0,0,0,.2);box-shadow:none}.invoker-orbs small{font-size:9px;color:#d9dff3}"; doc.head.append(style); }
  }
  const api = Object.freeze({ owner: OWNER, apiVersion: 1, configure, active, ORB, RECIPE, recipeFor, recipeInfo, orbBonuses, actionBonuses, outgoingMultiplier, generatorManaMultiplier, afterPlayerAction, afterPlayerHit, responseModifier, elementalLance, invokeUltimate, beginCombat, resetCombat, render, _test: Object.freeze({ addOrb, state, scale }) });
  window.DiceboundInvoker = api;
})();
