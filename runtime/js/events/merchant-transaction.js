(() => {
  "use strict";

  let nextVisitId = 1;
  let nextReservationId = 1;
  const visitsByStock = new WeakMap();

  // The compatibility monolith still owns the final equipment text renderer,
  // but the tiny #128 formatting helpers it calls were accidentally deleted
  // during later ownership cleanup. They are unresolved identifiers inside the
  // classic-script IIFE, so a property on the browser global environment is a
  // valid late binding. Restore only those two historical formatting helpers
  // until equipment presentation itself is extracted; the authoritative item
  // identity/stat data remains in DiceboundEquipment.
  function installEquipmentIdentityFormattingBridge() {
    const equipment = window.DiceboundEquipment;
    if (!equipment?.identityForItem || !equipment?.intrinsicBonusesForItem) return;

    if (typeof window.db06314BonusLabel !== "function") {
      window.db06314BonusLabel = (key, value) => {
        const names = {
          attack: "Attack", defense: "Defense", maxHp: "Max HP", maxMana: "Mana", crit: "Crit", dodge: "Dodge",
          lifeSteal: "Lifesteal", luck: "Luck", goldBonus: "Gold", potionPower: "Potion healing", bossDamage: "Boss Damage",
          flatReduction: "Damage reduction", doubleStrike: "Echo Strike", classBurst: "Signature Burst",
          extraStepChance: "Extra-step chance", damageBonus: "All damage"
        };
        if (key === "luck") return `+${Math.round(value * 100)} Luck`;
        const percent = ["crit", "dodge", "lifeSteal", "goldBonus", "potionPower", "bossDamage", "doubleStrike", "classBurst", "extraStepChance", "damageBonus"].includes(key);
        return `+${percent ? Math.round(value * 100) + "%" : value} ${names[key] || key}`;
      };
    }

    if (typeof window.db06314IntrinsicParts !== "function") {
      window.db06314IntrinsicParts = item => {
        const identity = equipment.identityForItem(item), bonuses = equipment.intrinsicBonusesForItem(item);
        const values = Object.entries(bonuses || {}).map(([key, value]) => window.db06314BonusLabel(key, value));
        return identity && values.length ? { identity, values } : null;
      };
    }
  }
  installEquipmentIdentityFormattingBridge();

  const offerKey = (offer, index = 0) => `${String(offer?.id || "offer")}:${Math.max(0, Number(index) || 0)}`;
  const createVisit = (offers = []) => {
    const visit = {
      id: nextVisitId++,
      offers: new Set(offers),
      consumed: new Set(),
      reservations: new Map(),
      activeChoice: null
    };
    if (Array.isArray(offers)) visitsByStock.set(offers, visit);
    return visit;
  };
  const ownsOffers = (visit, offers = []) => !!visit && offers.length === visit.offers.size && offers.every(offer => visit.offers.has(offer));
  const hasActiveChoice = visit => !!visit?.activeChoice;
  const canPurchase = (visit, key) => !!visit && !visit.activeChoice && !visit.consumed.has(key) && ![...visit.reservations.values()].some(reservation => reservation.key === key);

  function reservePurchase(visit, key) {
    if (!visit) return { ok: false, reason: "missing-visit" };
    if (visit.activeChoice) return { ok: false, reason: "choice-active" };
    if (visit.consumed.has(key)) return { ok: false, reason: "consumed" };
    if ([...visit.reservations.values()].some(reservation => reservation.key === key)) return { ok: false, reason: "reserved" };
    const token = `${visit.id}:${nextReservationId++}`;
    visit.reservations.set(token, { key });
    return { ok: true, token };
  }

  function cancelReservation(visit, token) {
    if (!visit?.reservations.has(token)) return false;
    visit.reservations.delete(token);
    return true;
  }

  function commitPurchase(visit, token) {
    const reservation = visit?.reservations.get(token);
    if (!reservation || visit.activeChoice || visit.consumed.has(reservation.key)) return { ok: false, reason: "invalid-reservation" };
    visit.reservations.delete(token);
    visit.consumed.add(reservation.key);
    return { ok: true, key: reservation.key };
  }

  function beginChoice(visit, token) {
    const purchase = commitPurchase(visit, token);
    if (!purchase.ok) return purchase;
    visit.activeChoice = { token, key: purchase.key };
    return { ok: true, token, key: purchase.key };
  }

  function settleChoice(visit, token) {
    if (!visit?.activeChoice || visit.activeChoice.token !== token) return { ok: false, reason: "inactive-choice" };
    const choice = visit.activeChoice;
    visit.activeChoice = null;
    return { ok: true, key: choice.key };
  }

  function beginVisit(previous, offers = []) {
    // A reward modal owns input. A delayed/re-entrant merchant open must keep
    // the same stock and consumed-offer state rather than rebuilding a shop.
    if (hasActiveChoice(previous)) return previous;

    // renderMerchant() establishes the visit before the compatibility
    // openMerchant() wrapper returns. Reuse that exact visit for that exact
    // stock-array identity instead of replacing it with a second transaction
    // whose state is invisible to the already-rendered buttons.
    const renderedVisit = Array.isArray(offers) ? visitsByStock.get(offers) : null;
    if (!previous && ownsOffers(renderedVisit, offers)) return renderedVisit;

    return createVisit(offers);
  }

  const snapshot = visit => !visit ? null : Object.freeze({
    id: visit.id,
    offerCount: visit.offers.size,
    consumed: [...visit.consumed].sort(),
    reserved: [...visit.reservations.values()].map(reservation => reservation.key).sort(),
    activeChoice: visit.activeChoice ? { ...visit.activeChoice } : null
  });

  window.DiceboundMerchantTransaction = Object.freeze({
    apiVersion: 1,
    offerKey,
    createVisit,
    beginVisit,
    ownsOffers,
    hasActiveChoice,
    canPurchase,
    reservePurchase,
    cancelReservation,
    commitPurchase,
    beginChoice,
    settleChoice,
    snapshot
  });
})();