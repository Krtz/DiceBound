/* DiceBound Prestige currency and Moon-purchase domain owner.
 *
 * Owns lifetime Prestige currency, permanent/refundable Moon purchases,
 * ranked structural upgrades, held-currency bonuses and Prestige-derived
 * career acceleration. It remains pure: composition supplies persistence,
 * RNG and presentation.
 */
(() => {
  'use strict';

  const OWNER = 'progression/prestige';
  const STAT_KEYS = Object.freeze(['maxHp', 'attack', 'defense', 'crit', 'dodge', 'luck', 'lifeSteal']);
  const EMPTY_STATS = Object.freeze(Object.fromEntries(STAT_KEYS.map(key => [key, 0])));
  const LEGACY_NODE_ALIASES = Object.freeze({
    'heirloom-slot-i': 'heirloom-vault-expansion',
    'heirloom-slot-ii': 'heirloom-vault-expansion'
  });
  const NODES = Object.freeze([
    Object.freeze({
      id: 'five-random-stats',
      label: 'Buy Stats',
      detail: 'Spend 1 Prestige Point to gain 5 permanent random stat points.',
      cost: 1,
      repeatable: true,
      refundable: true,
      kind: 'random-stat-bundle',
      placement: 'top'
    }),
    Object.freeze({
      id: 'heirloom-storage',
      label: 'Unlock Heirloom Vault',
      detail: 'Permanently unlock the Heirloom Vault with 8 storage slots.',
      cost: 1,
      refundable: false,
      kind: 'heirloom-storage',
      placement: 'right-upper'
    }),
    Object.freeze({
      id: 'heirloom-vault-expansion',
      label: 'Vault Expansion',
      detail: 'Permanently add 4 Heirloom Vault slots per rank.',
      costs: Object.freeze([2, 3, 4, 5, 6, 7, 8]),
      maxRank: 7,
      refundable: false,
      requires: 'heirloom-storage',
      kind: 'heirloom-vault-expansion',
      placement: 'right-middle'
    }),
    Object.freeze({
      id: 'heirloom-loadout',
      label: 'Heirloom Loadout',
      detail: 'Permanently add one next-run Heirloom slot per rank, up to all 8 gear slots.',
      costs: Object.freeze([1, 3, 5]),
      maxRank: 3,
      refundable: false,
      requires: 'heirloom-storage',
      kind: 'heirloom-loadout',
      placement: 'right-lower'
    }),
    Object.freeze({
      id: 'echo-crucible',
      label: 'Build Echo Crucible',
      detail: 'Permanently unlock Legendary Effect extraction, one active Echo and Moon Metal.',
      cost: 20,
      refundable: false,
      kind: 'structure',
      placement: 'left-upper'
    }),
    Object.freeze({
      id: 'moon-forge',
      label: 'Build Moon Forge',
      detail: 'A persistent lunar smithy will craft learned Echoes into gear in a later release.',
      cost: null,
      refundable: false,
      requires: 'echo-crucible',
      kind: 'structure',
      placement: 'left-lower',
      unavailableReason: 'Moon Forge crafting is not available yet.'
    })
  ]);

  const finite = value => Math.max(0, Math.floor(Number(value) || 0));
  const clone = value => JSON.parse(JSON.stringify(value));
  const blankStats = () => ({...EMPTY_STATS});
  const addStats = (target, source = {}) => {
    for (const key of STAT_KEYS) target[key] += finite(source[key]);
    return target;
  };
  const nodeFor = id => NODES.find(node => node.id === id) || null;
  const maxRankFor = node => node?.repeatable ? Infinity : Math.max(1, finite(node?.maxRank) || 1);
  const nextCostFor = (node, rank) => {
    if (!node) return null;
    if (!node.repeatable && rank >= maxRankFor(node)) return null;
    if (Array.isArray(node.costs)) return node.costs[rank] ?? null;
    return node.cost;
  };

  function normalize(raw = {}) {
    const legacy = blankStats();
    addStats(legacy, raw);
    const count = finite(raw.count);
    const suppliedMoon = raw.moon && typeof raw.moon === 'object' ? raw.moon : {};
    const legacySpent = Math.min(count, finite(suppliedMoon.legacySpent ?? count));
    const purchases = [], ranks = Object.create(null);
    for (const entry of Array.isArray(suppliedMoon.purchases) ? suppliedMoon.purchases : []) {
      if (!entry || typeof entry !== 'object') continue;
      const nodeId = LEGACY_NODE_ALIASES[entry.nodeId] || entry.nodeId;
      const node = nodeFor(nodeId);
      if (!node) continue;
      const current = ranks[nodeId] || 0;
      if (!node.repeatable && current >= maxRankFor(node)) continue;
      ranks[nodeId] = current + 1;
      const stats = blankStats();
      addStats(stats, entry.stats);
      purchases.push({nodeId, cost: finite(entry.cost), stats});
    }
    return {count, ...legacy, moon: {legacySpent, purchases}};
  }

  function spent(prestige) {
    const state = normalize(prestige);
    return state.moon.legacySpent + state.moon.purchases.reduce((total, purchase) => total + finite(purchase.cost), 0);
  }

  function unspent(prestige) {
    const state = normalize(prestige);
    return Math.max(0, state.count - spent(state));
  }

  function rank(prestige, id) {
    const state = normalize(prestige);
    return state.moon.purchases.reduce((total, purchase) => total + (purchase.nodeId === id ? 1 : 0), 0);
  }

  function hasPurchase(prestige, id) { return rank(prestige, id) > 0; }

  function refundableSpent(prestige) {
    const state = normalize(prestige);
    return state.moon.purchases.reduce((total, purchase) => {
      const node = nodeFor(purchase.nodeId);
      return total + (node?.refundable === false ? 0 : finite(purchase.cost));
    }, 0);
  }

  function heldStats(prestige) {
    const stats = blankStats();
    for (let index = 0; index < unspent(prestige); index += 1) stats[STAT_KEYS[index % STAT_KEYS.length]] += 1;
    return stats;
  }

  function purchasedStats(prestige) {
    const state = normalize(prestige), stats = blankStats();
    for (const purchase of state.moon.purchases) addStats(stats, purchase.stats);
    return stats;
  }

  function permanentStats(prestige) {
    const state = normalize(prestige), stats = blankStats();
    addStats(stats, state);
    addStats(stats, purchasedStats(state));
    return stats;
  }

  function statTotals(prestige) {
    const state = normalize(prestige), totals = permanentStats(state);
    addStats(totals, heldStats(state));
    return totals;
  }

  function legacyXpMultiplier(prestige) { return 1 + normalize(prestige).count * .05; }
  function legacyXpBonusPercent(prestige) { return normalize(prestige).count * 5; }
  function vaultExpansionSlots(prestige) { return rank(prestige, 'heirloom-vault-expansion') * 4; }
  function loadoutSlots(prestige) { return rank(prestige, 'heirloom-loadout'); }

  function formatStats(stats) {
    const labels = {
      maxHp: value => `+${value * 3} Max HP`, attack: value => `+${value} Attack`, defense: value => `+${value} Defense`,
      crit: value => `+${value}% Crit`, dodge: value => `+${value}% Dodge`, luck: value => `+${value * 2} Luck`, lifeSteal: value => `+${value}% Lifesteal`
    };
    return STAT_KEYS.filter(key => finite(stats[key]) > 0).map(key => labels[key](finite(stats[key]))).join(' · ');
  }

  function inspect(prestige) {
    const state = normalize(prestige), held = heldStats(state), purchased = purchasedStats(state), permanent = permanentStats(state), totals = statTotals(state);
    const purchasedNodes = [...new Set(state.moon.purchases.map(purchase => purchase.nodeId))];
    return Object.freeze({
      owner: OWNER,
      count: state.count,
      spent: spent(state),
      refundableSpent: refundableSpent(state),
      unspent: unspent(state),
      legacyXpMultiplier: legacyXpMultiplier(state),
      legacyXpBonusPercent: legacyXpBonusPercent(state),
      held: Object.freeze(held),
      purchased: Object.freeze(purchased),
      totals: Object.freeze(totals),
      heldSummary: formatStats(held) || 'No held Prestige Point bonus yet.',
      permanent: Object.freeze(permanent),
      permanentSummary: formatStats(permanent) || 'No permanent Prestige stats yet.',
      purchasedNodes: Object.freeze(purchasedNodes),
      nodes: Object.freeze(NODES.map(node => {
        const currentRank = rank(state, node.id), maxRank = node.repeatable ? null : maxRankFor(node);
        const maxed = maxRank !== null && currentRank >= maxRank;
        const nextCost = nextCostFor(node, currentRank);
        const available = !node.requires || hasPurchase(state, node.requires);
        return {
          ...node,
          rank: currentRank,
          maxRank,
          maxed,
          purchased: currentRank > 0,
          cost: nextCost,
          nextCost,
          available,
          affordable: available && nextCost !== null && unspent(state) >= nextCost,
          unavailableReason: available ? node.unavailableReason : `Requires ${nodeFor(node.requires)?.label || node.requires}.`
        };
      }))
    });
  }

  function award(prestige, amount) {
    const state = normalize(prestige);
    state.count += finite(amount);
    return state;
  }

  function rollBundle(random) {
    if (typeof random !== 'function') throw new TypeError('DiceboundPrestige purchase requires a random source.');
    const stats = blankStats();
    for (let index = 0; index < 5; index += 1) {
      const rolled = Math.max(0, Math.min(STAT_KEYS.length - 1, Math.floor(Number(random()) * STAT_KEYS.length)));
      stats[STAT_KEYS[rolled]] += 1;
    }
    return stats;
  }

  function purchase(prestige, id, random) {
    const state = normalize(prestige), node = nodeFor(id);
    if (!node) return Object.freeze({ok: false, reason: 'Unknown Prestige Moon node.', prestige: state});
    if (node.requires && !hasPurchase(state, node.requires)) return Object.freeze({ok: false, reason: `Requires ${nodeFor(node.requires)?.label || node.requires}.`, prestige: state});
    const currentRank = rank(state, id), maxRank = node.repeatable ? null : maxRankFor(node);
    if (maxRank !== null && currentRank >= maxRank) return Object.freeze({ok: false, reason: 'Maximum rank reached.', prestige: state});
    const cost = nextCostFor(node, currentRank);
    if (cost === null) return Object.freeze({ok: false, reason: node.unavailableReason || 'This node is not available yet.', prestige: state});
    if (unspent(state) < cost) return Object.freeze({ok: false, reason: 'Not enough unspent Prestige Points.', prestige: state});
    const stats = node.kind === 'random-stat-bundle' ? rollBundle(random) : blankStats();
    state.moon.purchases.push({nodeId: node.id, cost, stats});
    return Object.freeze({ok: true, node, rank: currentRank + 1, cost, prestige: state, stats: Object.freeze(stats)});
  }

  function grantLegacyPurchase(prestige, id) {
    const state = normalize(prestige), node = nodeFor(id);
    if (!node) return state;
    const currentRank = rank(state, id), maxRank = node.repeatable ? null : maxRankFor(node);
    if (maxRank !== null && currentRank >= maxRank) return state;
    state.moon.purchases.push({nodeId: id, cost: 0, stats: blankStats()});
    return state;
  }

  function refundAll(prestige) {
    const state = normalize(prestige);
    let refunded = 0;
    state.moon.purchases = state.moon.purchases.filter(purchase => {
      const node = nodeFor(purchase.nodeId);
      if (node?.refundable === false) return true;
      refunded += finite(purchase.cost);
      return false;
    });
    return Object.freeze({prestige: state, refunded});
  }

  window.DiceboundPrestige = Object.freeze({
    apiVersion: 3,
    owner: OWNER,
    statKeys: STAT_KEYS,
    nodes: NODES,
    normalize,
    inspect,
    unspent,
    rank,
    hasPurchase,
    refundableSpent,
    statTotals,
    heldStats,
    purchasedStats,
    permanentStats,
    legacyXpMultiplier,
    legacyXpBonusPercent,
    vaultExpansionSlots,
    loadoutSlots,
    formatStats,
    award,
    purchase,
    grantLegacyPurchase,
    refundAll,
    clone
  });
})();
