"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

global.window = {};
require("../runtime/js/events/merchant-transaction.js");
const transactions = window.DiceboundMerchantTransaction;
const source = fs.readFileSync(require.resolve("../runtime/js/events/merchant-transaction.js"), "utf8");
const monolith = fs.readFileSync("runtime/js/dicebound.js", "utf8");

// Merchant integration regression: renderMerchant() establishes the visit for
// currentMerchantItems before the outer openMerchant() wrapper returns. The
// wrapper must adopt that exact visit rather than replacing it with a second
// transaction whose state is disconnected from the visible buttons.
const renderedStock = [{ id: "heal" }, { id: "gear" }];
const renderedVisit = transactions.createVisit(renderedStock);
const renderedHealKey = transactions.offerKey(renderedStock[0], 0);
const renderedReservation = transactions.reservePurchase(renderedVisit, renderedHealKey);
assert.equal(renderedReservation.ok, true);
assert.equal(transactions.commitPurchase(renderedVisit, renderedReservation.token).ok, true);
const adoptedVisit = transactions.beginVisit(null, renderedStock);
assert.strictEqual(adoptedVisit, renderedVisit, "outer Merchant open must adopt the renderer-created visit for the exact stock array");
assert.deepEqual(transactions.snapshot(adoptedVisit).consumed, [renderedHealKey], "adopted Merchant visit must retain renderer-visible consumed state");

const replacementStock = [{ id: "heal" }, { id: "gear" }];
const replacementVisit = transactions.beginVisit(null, replacementStock);
assert.notStrictEqual(replacementVisit, renderedVisit, "a different Merchant stock array must create a fresh visit even when offer ids match");

const sovereign = { id: "relic" };
const potion = { id: "potion" };
const firstVisit = transactions.createVisit([sovereign, potion]);
const sovereignKey = transactions.offerKey(sovereign, 0);
const potionKey = transactions.offerKey(potion, 1);

const pending = transactions.reservePurchase(firstVisit, sovereignKey);
assert.equal(pending.ok, true);
const choice = transactions.beginChoice(firstVisit, pending.token);
assert.equal(choice.ok, true);
assert.equal(transactions.hasActiveChoice(firstVisit), true);
assert.equal(transactions.canPurchase(firstVisit, potionKey), false, "a modal choice owns Merchant input");
assert.equal(transactions.canPurchase(firstVisit, sovereignKey), false, "Sovereign is consumed before its delayed selection settles");

const delayedReopen = transactions.beginVisit(firstVisit, [{ id: "relic" }, { id: "potion" }]);
assert.strictEqual(delayedReopen, firstVisit, "a delayed merchant reopen cannot refresh active stock");
assert.deepEqual(transactions.snapshot(firstVisit).consumed, [sovereignKey]);

assert.equal(transactions.settleChoice(firstVisit, choice.token).ok, true);
assert.equal(transactions.hasActiveChoice(firstVisit), false);
assert.equal(transactions.canPurchase(firstVisit, sovereignKey), false, "a refunded/exhausted choice still consumes its visit offer");
assert.equal(transactions.canPurchase(firstVisit, potionKey), true, "ordinary Merchant offers remain usable after the choice settles");

const potionReservation = transactions.reservePurchase(firstVisit, potionKey);
assert.equal(potionReservation.ok, true);
assert.equal(transactions.cancelReservation(firstVisit, potionReservation.token), true, "cancelled weaker-gear confirmation releases only that offer reservation");
assert.equal(transactions.canPurchase(firstVisit, potionKey), true);

const secondVisit = transactions.beginVisit(firstVisit, [{ id: "relic" }, { id: "potion" }]);
assert.notStrictEqual(secondVisit, firstVisit, "a completed visit may create fresh stock on the next Merchant visit");
assert.equal(transactions.canPurchase(secondVisit, sovereignKey), true);
assert.match(source, /if \(hasActiveChoice\(previous\)\) return previous;/, "active choices must freeze Merchant visit state");
assert.match(source, /visitsByStock\.get\(offers\)/, "Merchant open must be able to adopt the renderer-created visit for exact stock identity");
assert.match(monolith, /DiceboundMerchantTransaction must load before dicebound\.js/, "Merchant renderer is not wired to the transaction owner");
assert.match(monolith, /db0646MerchantTransaction\.beginChoice/, "Sovereign choice is not transaction-guarded");
assert.match(monolith, /db0646MerchantTransaction\.beginVisit/, "Merchant re-entry is not transaction-guarded");

console.log("merchant transaction tests passed");
