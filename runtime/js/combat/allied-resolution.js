(() => {
  "use strict";

  const OWNER = "combat/allied-resolution";
  let runtime = null;

  function configure(next = {}) {
    const required = [
      "getRoster","setRoster","getPlayer","getEncounterTurn","getCurrentEnemy","getCurrentEnemies","livingEnemies","selectEnemy",
      "random","rollTieredProc","defenseDamageReduction","damageEnemy","damageHero","setCombatText","addCombatHistory","updateCombatUI","delay"
    ];
    for (const name of required) if (typeof next[name] !== "function") throw new Error(`Allied combat resolution missing ${name}().`);
    runtime = next;
    return api;
  }

  function rt() {
    if (!runtime) throw new Error("DiceboundCombatAllyResolution must be configured before use.");
    return runtime;
  }

  function owner() {
    const value = window.DiceboundCombatAllies;
    if (!value) throw new Error("Allied entity lifecycle owner is unavailable.");
    return value;
  }

  function roster() {
    return owner().normalizeRoster(rt().getRoster());
  }

  function commit(state) {
    rt().setRoster(state);
    rt().updateCombatUI();
    return state;
  }

  function callback(name, ...args) {
    const fn = rt()[name];
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function spawn(spec = {}, options = {}) {
    const out = owner().spawn(roster(), spec, {
      turn: options.turn ?? rt().getEncounterTurn(),
      replacement: options.replacement || "fifo"
    });
    commit(out.roster);
    if (out.replaced) callback("onReplace", out.replaced, out.entity);
    if (out.entity) callback("onSpawn", out.entity, out.replaced);
    return out;
  }

  function entityById(state, instanceId) {
    return state.allies.find(entity => entity.instanceId === String(instanceId || "")) || null;
  }

  function resolveDeath(state, entity, context = {}) {
    if (!entity || entity.hp > 0 || entity.deathResolved) return false;
    entity.deathResolved = true;
    commit(state);
    callback("onDeath", entity, context);
    return true;
  }

  function damage(instanceId, raw, options = {}) {
    const state = roster(), entity = entityById(state, instanceId);
    if (!entity || entity.hp <= 0) return Object.freeze({ total: 0, hp: 0, blocked: false, defeated: false });

    const attempted = Math.max(0, Math.round(Number(raw) || 0));
    if (attempted <= 0) return Object.freeze({ total: 0, hp: 0, blocked: false, defeated: false });

    if (!options.ignoreBarrier && entity.barriers > 0) {
      entity.barriers -= 1;
      commit(state);
      callback("onDamageTaken", entity, 0, { ...options, blocked: true, attempted });
      return Object.freeze({ total: 0, hp: 0, blocked: true, defeated: false });
    }

    const pierce=Math.max(0,Math.min(1,Number(options.defensePierce)||0));
    const effectiveDefense=Math.max(0,Number(entity.defense)||0)*(1-pierce);
    const reduction = options.ignoreDefense ? 0 : rt().defenseDamageReduction(effectiveDefense);
    const mitigated = Math.max(options.minimum === 0 ? 0 : 1, Math.round(attempted * (1 - reduction) - Math.max(0, entity.flatReduction || 0)));
    const hp = Math.min(entity.hp, Math.max(0, mitigated));
    entity.hp = Math.max(0, entity.hp - hp);
    commit(state);
    callback("onDamageTaken", entity, hp, { ...options, attempted });
    const defeated = entity.hp <= 0;
    if (defeated) resolveDeath(state, entity, options);
    return Object.freeze({ total: hp, hp, blocked: false, defeated });
  }

  function heal(instanceId, raw, options = {}) {
    const state = roster(), entity = entityById(state, instanceId);
    if (!entity || entity.hp <= 0 || entity.healable === false) return 0;
    const requested = Math.max(0, Math.round(Number(raw) || 0));
    const restored = Math.min(requested, Math.max(0, entity.maxHp - entity.hp));
    if (!restored) return 0;
    entity.hp += restored;
    commit(state);
    callback("onHealingReceived", entity, restored, options);
    return restored;
  }

  function applyStatus(instanceId, kind, payload = {}) {
    const state = roster(), entity = entityById(state, instanceId);
    if (!entity || entity.hp <= 0) return null;
    const key = String(kind || "");
    const statuses = entity.statuses || (entity.statuses = {});

    if (key === "burn") {
      const add = Math.max(1, Math.round(Number(payload.stacks) || 1));
      statuses.burnStacks = Math.min(10, Math.max(0, Number(statuses.burnStacks) || 0) + add);
    } else if (key === "poison") {
      const add = Math.max(1, Math.round(Number(payload.stacks) || 1));
      statuses.poisonStacks = Math.max(0, Number(statuses.poisonStacks) || 0) + add;
      statuses.poisonPower = Math.max(Number(statuses.poisonPower) || 0, Number(payload.power) || .12);
    } else if (key === "skip") {
      statuses.skipActions = Math.max(0, Math.round(Number(statuses.skipActions) || 0)) + Math.max(1, Math.round(Number(payload.actions) || 1));
    } else if (key === "confusion") {
      statuses.confusionActions = Math.max(1, Math.round(Number(payload.actions) || 1));
    } else if (key === "attack-reduction") {
      const before = Math.max(0, Number(entity.attack) || 0);
      const requested = Math.max(0, Number(payload.amount) || 0);
      const loss = Math.min(Math.max(0, before - 1), requested);
      entity.attack = Math.max(1, before - loss);
      statuses.attackLost = (Number(statuses.attackLost) || 0) + loss;
      statuses.lastStatLoss = loss;
    } else if (key === "defense-reduction") {
      const before = Math.max(0, Number(entity.defense) || 0);
      const loss = Math.min(before, Math.max(0, Number(payload.amount) || 0));
      entity.defense = Math.max(0, before - loss);
      statuses.defenseLost = (Number(statuses.defenseLost) || 0) + loss;
      statuses.lastStatLoss = loss;
    } else {
      statuses[key] = payload.value ?? true;
    }

    commit(state);
    callback("onStatusApplied", entity, key, payload);
    return Object.freeze({
      instanceId: entity.instanceId,
      kind: key,
      statLoss: Number(entity.statuses?.lastStatLoss) || 0,
      entity: Object.freeze({ ...entity, resources: { ...entity.resources }, statuses: { ...entity.statuses }, effects: [...entity.effects], tags: [...entity.tags] }),
      statuses: Object.freeze({ ...entity.statuses })
    });
  }

  function statusSnapshot(instanceId) {
    const state = roster(), entity = entityById(state, instanceId);
    return entity ? Object.freeze({ ...entity.statuses }) : null;
  }

  function healLivingByFraction(fraction, options = {}) {
    const state=roster(), ids=state.allies.filter(entity=>entity.hp>0&&entity.healable!==false).map(entity=>entity.instanceId);
    let total=0;
    const scale=Math.max(0,Number(fraction)||0);
    for(const id of ids){
      const fresh=entityById(roster(),id);
      if(!fresh)continue;
      total+=heal(id,Math.ceil(fresh.maxHp*scale),options);
    }
    return total;
  }

  function living() {
    return owner().living(roster());
  }

  function selectedEnemy() {
    const selected = rt().getCurrentEnemy();
    if (selected?.hp > 0) return selected;
    return rt().livingEnemies()[0] || null;
  }

  function reconcileEnemyTarget(target) {
    if (target?.hp > 0) return;
    const enemies = rt().getCurrentEnemies();
    const next = rt().livingEnemies()[0];
    if (next) rt().selectEnemy(enemies.indexOf(next));
  }

  async function basicAttack(entity, { multiplier = 1, label = null, spectral = false } = {}) {
    let target = selectedEnemy();
    if (!entity || entity.hp <= 0 || !target) return Object.freeze({ total: 0, hits: 0, kills: 0 });

    const echoExtra = Math.max(0, rt().rollTieredProc(Math.max(0, Number(entity.echo) || 0)));
    const hits = 1 + echoExtra;
    let total = 0, kills = 0;

    for (let hitIndex = 0; hitIndex < hits; hitIndex += 1) {
      target = selectedEnemy();
      if (!target) break;
      const critTiers = Math.max(0, rt().rollTieredProc(Math.max(0, Number(entity.crit) || 0)));
      const raw = Math.max(1, Math.round(Math.max(0, Number(entity.attack) || 0) * Math.max(0, Number(multiplier) || 0) * (1 + critTiers)));
      const before = Math.max(0, Number(target.hp) || 0);
      const dealt = Math.max(0, Number(rt().damageEnemy(target, raw)) || 0);
      total += dealt;
      callback("onDamageDealt", entity, dealt, { target, critTiers, hitIndex, spectral });
      if (before > 0 && target.hp <= 0) {
        kills += 1;
        callback("onKill", entity, target, { critTiers, hitIndex, spectral });
      }
      if (entity.lifeSteal > 0 && dealt > 0 && !spectral) {
        heal(entity.instanceId, Math.max(1, Math.floor(dealt * entity.lifeSteal)), { source: "lifesteal" });
      }
      if (typeof rt().triggerAllyEffects === "function") {
        await rt().triggerAllyEffects(entity, target, { critTiers, hitIndex, spectral });
      }
      reconcileEnemyTarget(target);
      if (!rt().livingEnemies().length) break;
    }

    const name = label || entity.name || "Ally";
    rt().addCombatHistory(`${name} attacks for ${total} damage${hits > 1 ? ` across ${hits} hits` : ""}.`);
    rt().setCombatText(`${name} attacks for ${total} damage.`);
    rt().updateCombatUI();
    return Object.freeze({ total, hits, kills });
  }

  async function resolveAutomaticAction(entity) {
    const custom = rt().resolveAutomaticAction;
    if (typeof custom === "function") {
      const result = await custom(entity, { basicAttack });
      if (result !== undefined) return result;
    }
    return basicAttack(entity);
  }

  function friendlyTargetName(target) {
    if (!target) return "an ally";
    return target.kind === "hero" ? "the hero" : (target.name || target.entity?.name || "an ally");
  }

  function chooseFriendlyTarget(candidates = []) {
    const list = candidates.filter(target => target?.entity && Number(target.entity.hp) > 0);
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const roll = Math.max(0, Math.min(.999999999, Number(rt().random()) || 0));
    return list[Math.floor(roll * list.length)] || list[list.length - 1];
  }

  function consumeControlStatus(instanceId, key) {
    const state = roster(), entity = entityById(state, instanceId);
    if (!entity || entity.hp <= 0) return null;
    const statuses = entity.statuses || (entity.statuses = {});
    const count = Math.max(0, Math.round(Number(statuses[key]) || 0));
    if (!count) return null;
    statuses[key] = Math.max(0, count - 1);
    commit(state);
    return entity;
  }

  function tickDamageStatuses(instanceId) {
    let current = findFresh(instanceId);
    if (!current || current.hp <= 0) return Object.freeze({ notes: [], defeated: false, total: 0 });
    const notes = [];
    let total = 0;
    const burn = Math.min(10, Math.max(0, Number(current.statuses?.burnStacks) || 0));
    if (burn > 0) {
      const raw = Math.max(1, Math.ceil(current.maxHp * .01 * burn));
      const hit = damage(instanceId, raw, { source: "burn", ignoreDefense: true, ignoreBarrier: true });
      total += Math.max(0, Number(hit.total) || 0);
      notes.push(`🔥 Burn ${burn}/10 scorches ${current.name} for ${hit.total} (${burn}% max HP).`);
      current = findFresh(instanceId);
      if (!current || current.hp <= 0) {
        for (const note of notes) rt().addCombatHistory(note);
        rt().updateCombatUI();
        return Object.freeze({ notes, defeated: true, total });
      }
    }
    const poison = Math.max(0, Number(current.statuses?.poisonStacks) || 0);
    if (poison > 0) {
      const power = Math.max(0, Number(current.statuses?.poisonPower) || .12);
      const raw = Math.max(1, Math.round(Math.max(1, current.maxHp * .025) * power * poison));
      const hit = damage(instanceId, raw, { source: "poison", ignoreDefense: true, ignoreBarrier: true });
      total += Math.max(0, Number(hit.total) || 0);
      notes.push(`☠️ Poison ${poison} deals ${hit.total} damage to ${current.name}.`);
      current = findFresh(instanceId);
      if (!current || current.hp <= 0) {
        for (const note of notes) rt().addCombatHistory(note);
        rt().updateCombatUI();
        return Object.freeze({ notes, defeated: true, total });
      }
    }
    for (const note of notes) rt().addCombatHistory(note);
    if (notes.length) rt().updateCombatUI();
    return Object.freeze({ notes, defeated: false, total });
  }

  function findFresh(instanceId) {
    return entityById(roster(), instanceId);
  }

  async function resolveConfusedAction(entity) {
    const consumed = consumeControlStatus(entity.instanceId, "confusionActions");
    if (!consumed) return null;
    const source = findFresh(entity.instanceId);
    if (!source || source.hp <= 0) return Object.freeze({ kind: "confusion", skipped: true, defeated: true });
    const target = chooseFriendlyTarget(playerSideTargets());
    if (!target) return Object.freeze({ kind: "confusion", skipped: true, target: null, damage: 0 });
    const raw = Math.max(1, Math.round(Number(source.attack) || 1));
    const hit = target.kind === "hero"
      ? rt().damageHero(raw, { source: "summon-confusion", sourceEntityId: source.instanceId })
      : damage(target.id, raw, { source: "summon-confusion", sourceEntityId: source.instanceId });
    const dealt = Math.max(0, Number(hit?.total ?? hit) || 0);
    const message = `🧮 Confusion! ${source.name}'s attack misfires into ${friendlyTargetName(target)} for ${dealt}.`;
    rt().addCombatHistory(message);
    rt().setCombatText(message);
    rt().updateCombatUI();
    return Object.freeze({ kind: "confusion", skipped: true, target: target.id, targetKind: target.kind, damage: dealt });
  }

  async function resolveEntityTurnStatus(entity) {
    const dots = tickDamageStatuses(entity.instanceId);
    let current = findFresh(entity.instanceId);
    if (!current || current.hp <= 0 || dots.defeated) return Object.freeze({ skip: true, reason: "defeated", dots });

    if ((current.statuses?.skipActions || 0) > 0) {
      consumeControlStatus(current.instanceId, "skipActions");
      current = findFresh(current.instanceId);
      const message = `⏸️ ${current.name} is Frozen/Stunned and loses this action.`;
      rt().addCombatHistory(message);
      rt().setCombatText(message);
      rt().updateCombatUI();
      return Object.freeze({ skip: true, reason: "control", dots });
    }

    if ((current.statuses?.confusionActions || 0) > 0) {
      const confusion = await resolveConfusedAction(current);
      return Object.freeze({ skip: true, reason: "confusion", dots, confusion });
    }

    return Object.freeze({ skip: false, reason: null, dots });
  }

  async function automaticPhase() {
    const turn = rt().getEncounterTurn();
    const phaseIds = living()
      .filter(entity => entity.controlMode === "automatic" && owner().canActThisPhase(entity, turn))
      .map(entity => entity.instanceId);

    const results = [];
    for (const instanceId of phaseIds) {
      const state = roster(), entity = entityById(state, instanceId);
      if (!entity || entity.hp <= 0 || !rt().livingEnemies().length) continue;
      const status = await resolveEntityTurnStatus(entity);
      if (status.skip) {
        results.push(Object.freeze({ instanceId, result: null, status }));
        if (rt().livingEnemies().length) await rt().delay(120);
        continue;
      }
      const fresh = findFresh(instanceId);
      if (!fresh || fresh.hp <= 0 || !rt().livingEnemies().length) continue;
      const result = await resolveAutomaticAction(fresh);
      results.push(Object.freeze({ instanceId, result, status }));
      if (rt().livingEnemies().length) await rt().delay(120);
    }
    return Object.freeze(results);
  }

  function playerSideTargets() {
    const hero = rt().getPlayer();
    return window.DiceboundCombatTargeting.playerSideCandidates(hero, living());
  }

  function clearEncounter({ preserveRunPersistent = false } = {}) {
    const current = roster();
    if (!preserveRunPersistent) return commit(owner().createRoster({ capacity: current.capacity }));
    const saved = owner().serializeRunPersistent(current);
    return commit(owner().rehydrateRunPersistent(saved, { capacity: current.capacity }));
  }

  const api = Object.freeze({
    owner: OWNER,
    apiVersion: 1,
    configure,
    spawn,
    damage,
    heal,
    applyStatus,
    statusSnapshot,
    healLivingByFraction,
    living,
    basicAttack,
    resolveEntityTurnStatus,
    automaticPhase,
    playerSideTargets,
    clearEncounter
  });

  window.DiceboundCombatAllyResolution = api;
})();
