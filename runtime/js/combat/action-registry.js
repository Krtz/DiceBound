(() => {
  "use strict";

  const OWNER = "combat/action-registry";
  const TARGET_POLICIES = new Set([
    "none",
    "selectedEnemy",
    "allEnemies",
    "hero",
    "allAllies",
    "summon",
    "selectedAlly"
  ]);

  const number = (value, fallback = 0) => {
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  };

  function normalizeAction(raw = {}, provider = {}) {
    const id = String(raw.id || "").trim();
    if (!id) throw new Error("Combat action id is required.");
    const providerId = String(provider.id || raw.providerId || "anonymous");
    const targetPolicy = TARGET_POLICIES.has(raw.targetPolicy) ? raw.targetPolicy : "none";
    return Object.freeze({
      id,
      providerId,
      label: String(raw.label || id),
      icon: String(raw.icon || ""),
      description: String(raw.description || ""),
      category: String(raw.category || "class"),
      order: number(raw.order, 100),
      targetPolicy,
      visible: typeof raw.visible === "function" ? raw.visible : () => raw.visible !== false,
      enabled: typeof raw.enabled === "function" ? raw.enabled : () => raw.enabled !== false,
      cost: typeof raw.cost === "function" ? raw.cost : () => raw.cost == null ? null : raw.cost,
      execute: typeof raw.execute === "function" ? raw.execute : null,
      metadata: raw.metadata && typeof raw.metadata === "object" ? Object.freeze({ ...raw.metadata }) : Object.freeze({})
    });
  }

  function createRegistry() {
    const providers = new Map();

    function register(provider = {}) {
      const id = String(provider.id || "").trim();
      if (!id) throw new Error("Combat action provider id is required.");
      if (typeof provider.getActions !== "function") throw new Error(`Combat action provider ${id} requires getActions().`);
      const entry = Object.freeze({
        id,
        priority: number(provider.priority, 0),
        getActions: provider.getActions
      });
      providers.set(id, entry);
      return () => providers.delete(id);
    }

    function unregister(id) {
      return providers.delete(String(id || ""));
    }

    function list(context = {}) {
      const composed = new Map();
      const orderedProviders = [...providers.values()].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
      for (const provider of orderedProviders) {
        const actions = provider.getActions(context);
        for (const raw of Array.isArray(actions) ? actions : []) {
          const action = normalizeAction(raw, provider);
          // Higher-priority providers are processed later and intentionally
          // replace a stable action ID. Equal priority is deterministic by
          // provider ID because provider ordering is stable.
          composed.set(action.id, action);
        }
      }
      return Object.freeze(
        [...composed.values()]
          .filter(action => action.visible(context))
          .sort((a, b) => a.order - b.order || a.category.localeCompare(b.category) || a.id.localeCompare(b.id))
      );
    }

    function view(context = {}) {
      return Object.freeze(list(context).map(action => Object.freeze({
        id: action.id,
        providerId: action.providerId,
        label: action.label,
        icon: action.icon,
        description: action.description,
        category: action.category,
        order: action.order,
        targetPolicy: action.targetPolicy,
        enabled: !!action.enabled(context),
        cost: action.cost(context),
        metadata: action.metadata
      })));
    }

    async function execute(id, context = {}) {
      const action = list(context).find(candidate => candidate.id === String(id || ""));
      if (!action) return Object.freeze({ ok: false, reason: "missing-action" });
      if (!action.enabled(context)) return Object.freeze({ ok: false, reason: "disabled", actionId: action.id });
      if (!action.execute) return Object.freeze({ ok: false, reason: "no-resolver", actionId: action.id });
      const result = await action.execute(context);
      return Object.freeze({ ok: true, actionId: action.id, result });
    }

    function inspect() {
      return Object.freeze({
        owner: OWNER,
        providers: Object.freeze([...providers.values()].map(provider => Object.freeze({ id: provider.id, priority: provider.priority })))
      });
    }

    return Object.freeze({ register, unregister, list, view, execute, inspect });
  }

  window.DiceboundCombatActions = Object.freeze({
    owner: OWNER,
    apiVersion: 1,
    targetPolicies: Object.freeze([...TARGET_POLICIES]),
    normalizeAction,
    createRegistry
  });
})();
