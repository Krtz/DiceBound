(() => {
  "use strict";

  let nextVisitId = 1;
  let nextReservationId = 1;

  const offerKey = (offer, index = 0) => `${String(offer?.id || "offer")}:${Math.max(0, Number(index) || 0)}`;
  const createVisit = (offers = []) => ({
    id: nextVisitId++,
    offers: new Set(offers),
    consumed: new Set(),
    reservations: new Map(),
    activeChoice: null
  });
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
    return hasActiveChoice(previous) ? previous : createVisit(offers);
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
