/* DiceBound Prestige currency and Moon-purchase domain owner.
 *
 * This module owns semantic Prestige currency bookkeeping, purchased Moon
 * upgrades, held-currency bonuses and free-refund transactions. It is pure:
 * the compatibility runtime supplies persistence, confirmation, reset and
 * gameplay composition; ui/prestige-moon.js supplies presentation.
 */
(() => {
  'use strict';

  const OWNER = 'progression/prestige';
  const STAT_KEYS = Object.freeze(['maxHp', 'attack', 'defense', 'crit', 'dodge', 'luck', 'lifeSteal']);
  const EMPTY_STATS = Object.freeze(Object.fromEntries(STAT_KEYS.map(key => [key, 0])));
  const NODES = Object.freeze([
    Object.freeze({
      id: 'five-random-stats',
      label: 'Spend 1 Prestige Point',
      detail: 'Gain 5 permanent random stat points.',
      cost: 1,
      repeatable: true,
      kind: 'random-stat-bundle',
      placement: 'top'
    }),
    Object.freeze({
      id: 'moon-forge',
      label: 'Build Moon Forge',
      detail: 'A persistent lunar smithy will become the home of Prestige crafting.',
      cost: null,
      repeatable: false,
      kind: 'structure',
      placement: 'left',
      unavailableReason: 'Moon Forge cost is awaiting balance approval.'
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

  function normalize(raw = {}) {
    const legacy = blankStats();
    addStats(legacy, raw);
    const count = finite(raw.count);
    const suppliedMoon = raw.moon && typeof raw.moon === 'object' ? raw.moon : {};
    // Existing Beta careers already have permanent random stat rolls stored in
    // the legacy fields. Those earned points are intentionally treated as
    // already spent, so introducing the Moon cannot duplicate their bonuses.
    const legacySpent = Math.min(count, finite(suppliedMoon.legacySpent ?? count));
    const purchases = Array.isArray(suppliedMoon.purchases) ? suppliedMoon.purchases
      .filter(entry => entry && typeof entry === 'object' && nodeFor(entry.nodeId))
      .map(entry => ({
        nodeId: entry.nodeId,
        cost: finite(entry.cost),
        stats: (() => { const stats = blankStats(); addStats(stats, entry.stats); return stats; })()
      })) : [];
    return {
      count,
      ...legacy,
      moon: {legacySpent, purchases}
    };
  }

  function spent(prestige) {
    const state = normalize(prestige);
    return state.moon.legacySpent + state.moon.purchases.reduce((total, purchase) => total + finite(purchase.cost), 0);
  }

  function unspent(prestige) {
    const state = normalize(prestige);
    return Math.max(0, state.count - spent(state));
  }

  function heldStats(prestige) {
    const stats = blankStats();
    // Held Prestige Points are intentionally deterministic rather than rolled:
    // one point follows the canonical round-robin stat order, so reloads and
    // refunds can never reroll or double-apply this temporary bonus.
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

  function formatStats(stats) {
    const labels = {
      maxHp: value => `+${value * 3} Max HP`, attack: value => `+${value} Attack`, defense: value => `+${value} Defense`,
      crit: value => `+${value}% Crit`, dodge: value => `+${value}% Dodge`, luck: value => `+${value * 2} Luck`, lifeSteal: value => `+${value}% Lifesteal`
    };
    return STAT_KEYS.filter(key => finite(stats[key]) > 0).map(key => labels[key](finite(stats[key]))).join(' · ');
  }

  function inspect(prestige) {
    const state = normalize(prestige), held = heldStats(state), purchased = purchasedStats(state), permanent = permanentStats(state), totals = statTotals(state);
    const purchasedNodes = state.moon.purchases.map(purchase => purchase.nodeId);
    return Object.freeze({
      owner: OWNER,
      count: state.count,
      spent: spent(state),
      unspent: unspent(state),
      held: Object.freeze(held),
      purchased: Object.freeze(purchased),
      totals: Object.freeze(totals),
      heldSummary: formatStats(held) || 'No held Prestige Point bonus yet.',
      permanent: Object.freeze(permanent),
      permanentSummary: formatStats(permanent) || 'No permanent Prestige stats yet.',
      purchasedNodes: Object.freeze(purchasedNodes),
      nodes: Object.freeze(NODES.map(node => ({...node, purchased: purchasedNodes.includes(node.id), affordable: node.cost !== null && unspent(state) >= node.cost})))
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
    if (node.cost === null) return Object.freeze({ok: false, reason: node.unavailableReason || 'This node is not available yet.', prestige: state});
    if (!node.repeatable && state.moon.purchases.some(entry => entry.nodeId === id)) return Object.freeze({ok: false, reason: 'Already purchased.', prestige: state});
    if (unspent(state) < node.cost) return Object.freeze({ok: false, reason: 'Not enough unspent Prestige Points.', prestige: state});
    const stats = node.kind === 'random-stat-bundle' ? rollBundle(random) : blankStats();
    state.moon.purchases.push({nodeId: node.id, cost: node.cost, stats});
    return Object.freeze({ok: true, node, prestige: state, stats: Object.freeze(stats)});
  }

  function refundAll(prestige) {
    const state = normalize(prestige), refunded = state.moon.purchases.reduce((total, purchase) => total + finite(purchase.cost), 0);
    state.moon.purchases = [];
    return Object.freeze({prestige: state, refunded});
  }

  window.DiceboundPrestige = Object.freeze({
    apiVersion: 1,
    owner: OWNER,
    statKeys: STAT_KEYS,
    nodes: NODES,
    normalize,
    inspect,
    unspent,
    statTotals,
    heldStats,
    purchasedStats,
    permanentStats,
    formatStats,
    award,
    purchase,
    refundAll,
    clone
  });
})();
