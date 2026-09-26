(() => {
  "use strict";

  const OWNER = "combat/allied-entities";
  const SYSTEM_MAX_ACTIVE_ALLIES = 2;
  const CONTROL_MODES = new Set(["automatic", "player"]);
  const PERSISTENCE_MODES = new Set(["encounter", "run"]);

  const number = (value, fallback = 0) => {
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  };
  const integer = (value, fallback = 0) => Math.trunc(number(value, fallback));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, number(value)));
  const clone = value => JSON.parse(JSON.stringify(value));

  function normalizedCapacity(value = SYSTEM_MAX_ACTIVE_ALLIES) {
    return Math.max(0, Math.min(SYSTEM_MAX_ACTIVE_ALLIES, integer(value, SYSTEM_MAX_ACTIVE_ALLIES)));
  }

  function createRoster({ capacity = SYSTEM_MAX_ACTIVE_ALLIES, nextInstance = 1 } = {}) {
    return {
      capacity: normalizedCapacity(capacity),
      nextInstance: Math.max(1, integer(nextInstance, 1)),
      allies: []
    };
  }

  function normalizeResources(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const resources = {};
    for (const [key, value] of Object.entries(raw)) {
      if (Number.isFinite(Number(value))) resources[String(key)] = Number(value);
    }
    return resources;
  }

  function normalizeEntity(raw = {}) {
    const maxHp = Math.max(1, Math.round(number(raw.maxHp, raw.hp || 1)));
    const hp = clamp(Math.round(number(raw.hp, maxHp)), 0, maxHp);
    const instanceId = String(raw.instanceId || "").trim();
    const archetypeId = String(raw.archetypeId || "").trim();
    if (!instanceId) throw new Error("Allied entity instanceId is required.");
    if (!archetypeId) throw new Error("Allied entity archetypeId is required.");

    return {
      instanceId,
      archetypeId,
      name: String(raw.name || archetypeId),
      sourceId: raw.sourceId == null ? null : String(raw.sourceId),
      ownerClassId: raw.ownerClassId == null ? null : String(raw.ownerClassId),
      controlMode: CONTROL_MODES.has(raw.controlMode) ? raw.controlMode : "automatic",
      persistence: PERSISTENCE_MODES.has(raw.persistence) ? raw.persistence : "encounter",
      actsOnSummonTurn: raw.actsOnSummonTurn !== false,
      summonedTurn: Math.max(0, integer(raw.summonedTurn)),
      targetable: raw.targetable !== false,
      healable: raw.healable !== false,
      threatWeight: Math.max(0, number(raw.threatWeight, 1)),
      countsAsSummon: raw.countsAsSummon !== false,
      hp,
      maxHp,
      attack: Math.max(0, number(raw.attack)),
      defense: Math.max(0, number(raw.defense)),
      crit: Math.max(0, number(raw.crit)),
      dodge: Math.max(0, number(raw.dodge)),
      echo: Math.max(0, number(raw.echo)),
      lifeSteal: Math.max(0, number(raw.lifeSteal)),
      elementProcChance: Math.max(0, number(raw.elementProcChance)),
      flatReduction: Math.max(0, number(raw.flatReduction)),
      barriers: Math.max(0, integer(raw.barriers)),
      automaticActionId: String(raw.automaticActionId || "basic-attack"),
      onDeathId: raw.onDeathId == null ? null : String(raw.onDeathId),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      resources: normalizeResources(raw.resources),
      statuses: raw.statuses && typeof raw.statuses === "object" && !Array.isArray(raw.statuses) ? clone(raw.statuses) : {},
      effects: Array.isArray(raw.effects) ? raw.effects.map(String) : [],
      artId: raw.artId == null ? archetypeId : String(raw.artId),
      deathResolved: !!raw.deathResolved
    };
  }

  function normalizeRoster(raw = {}) {
    const roster = createRoster({
      capacity: raw.capacity,
      nextInstance: raw.nextInstance
    });
    const seen = new Set();
    for (const entry of Array.isArray(raw.allies) ? raw.allies : []) {
      const entity = normalizeEntity(entry);
      if (seen.has(entity.instanceId)) throw new Error(`Duplicate allied entity instanceId ${entity.instanceId}`);
      seen.add(entity.instanceId);
      roster.allies.push(entity);
    }
    const highestGenerated = roster.allies.reduce((highest, entity) => {
      const match = /^ally-(\d+)$/.exec(entity.instanceId);
      return match ? Math.max(highest, Number(match[1]) + 1) : highest;
    }, 1);
    roster.nextInstance = Math.max(roster.nextInstance, highestGenerated);
    return roster;
  }

  function living(roster) {
    return normalizeRoster(roster).allies.filter(entity => entity.hp > 0);
  }

  function livingTargetable(roster) {
    return living(roster).filter(entity => entity.targetable && entity.threatWeight > 0);
  }

  function livingHealable(roster) {
    return living(roster).filter(entity => entity.healable);
  }

  function find(roster, instanceId) {
    const id = String(instanceId || "");
    return normalizeRoster(roster).allies.find(entity => entity.instanceId === id) || null;
  }

  function createInstance(roster, spec = {}, { turn = 0 } = {}) {
    const state = normalizeRoster(roster);
    const instanceId = spec.instanceId || `ally-${state.nextInstance++}`;
    const entity = normalizeEntity({
      ...spec,
      instanceId,
      summonedTurn: turn
    });
    return { state, entity };
  }

  function spawn(roster, spec = {}, { turn = 0, replacement = "fifo" } = {}) {
    const { state, entity } = createInstance(roster, spec, { turn });
    let replaced = null;

    if (state.capacity <= 0) {
      return Object.freeze({ roster: state, entity: null, replaced: null, reason: "capacity-zero" });
    }

    const alive = state.allies.filter(candidate => candidate.hp > 0);
    if (alive.length >= state.capacity) {
      if (replacement !== "fifo") {
        return Object.freeze({ roster: state, entity: null, replaced: null, reason: "capacity-full" });
      }
      replaced = alive[0];
      const index = state.allies.findIndex(candidate => candidate.instanceId === replaced.instanceId);
      if (index >= 0) state.allies.splice(index, 1);
    }

    state.allies.push(entity);
    return Object.freeze({
      roster: state,
      entity: clone(entity),
      replaced: replaced ? clone(replaced) : null,
      reason: replaced ? "replaced-oldest" : "spawned"
    });
  }

  function remove(roster, instanceId, { reason = "dismissed" } = {}) {
    const state = normalizeRoster(roster);
    const index = state.allies.findIndex(entity => entity.instanceId === String(instanceId || ""));
    if (index < 0) return Object.freeze({ roster: state, removed: null, reason: "missing" });
    const [removed] = state.allies.splice(index, 1);
    return Object.freeze({ roster: state, removed: clone(removed), reason: String(reason || "dismissed") });
  }

  function canActThisPhase(entity, currentTurn) {
    const unit = normalizeEntity(entity);
    if (unit.hp <= 0) return false;
    if (unit.actsOnSummonTurn) return true;
    return integer(currentTurn) > unit.summonedTurn;
  }

  function serializeRunPersistent(roster) {
    const state = normalizeRoster(roster);
    return state.allies
      .filter(entity => entity.persistence === "run" && entity.hp > 0)
      .map(entity => {
        const persisted=clone(entity),statuses=persisted.statuses||{};
        // Encounter-only stat reductions mutate the live resolved entity for
        // battle convenience. Undo those mutations before carrying a run ally
        // forward so "statuses are discarded" is actually true semantically.
        persisted.attack=Math.max(0,number(persisted.attack)+(Math.max(0,number(statuses.attackLost))));
        persisted.defense=Math.max(0,number(persisted.defense)+(Math.max(0,number(statuses.defenseLost))));
        persisted.statuses={};
        persisted.deathResolved=false;
        return persisted;
      });
  }

  function rehydrateRunPersistent(entries = [], { capacity = SYSTEM_MAX_ACTIVE_ALLIES } = {}) {
    const roster = createRoster({ capacity });
    for (const raw of Array.isArray(entries) ? entries : []) {
      const entity = normalizeEntity({
        ...raw,
        persistence: "run",
        statuses: {},
        deathResolved: false
      });
      roster.allies.push(entity);
    }
    const normalized = normalizeRoster(roster);
    if (normalized.allies.length > normalized.capacity) {
      normalized.allies = normalized.allies.slice(-normalized.capacity);
    }
    return normalized;
  }

  function reviveTargetMatches(scope, targetKind) {
    const resolved = String(scope || "hero").toLowerCase();
    const kind = String(targetKind || "").toLowerCase();
    if (resolved === "both" || resolved === "ally") return kind === "hero" || kind === "summon";
    return resolved === kind;
  }

  function weightedThreat(allies) {
    return (allies || [])
      .filter(entity => entity && entity.hp > 0 && entity.targetable !== false && number(entity.threatWeight, 1) > 0)
      .map(entity => ({ entity, weight: Math.max(0, number(entity.threatWeight, 1)) }));
  }

  const api = Object.freeze({
    owner: OWNER,
    apiVersion: 1,
    systemMaxActiveAllies: SYSTEM_MAX_ACTIVE_ALLIES,
    createRoster,
    normalizeRoster,
    normalizeEntity,
    living,
    livingTargetable,
    livingHealable,
    find,
    spawn,
    remove,
    canActThisPhase,
    serializeRunPersistent,
    rehydrateRunPersistent,
    reviveTargetMatches,
    weightedThreat
  });

  window.DiceboundCombatAllies = api;
})();
