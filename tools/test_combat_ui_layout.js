"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "runtime", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "runtime", "css", "dicebound.css"), "utf8");
const runtime = fs.readFileSync(path.join(root, "runtime", "js", "dicebound.js"), "utf8");

const actions = html.indexOf('class="combat-actions"');
const log = html.indexOf('id="combatHistoryWrap"');
assert.ok(actions >= 0 && log > actions, "battle log must follow combat actions in DOM order");
assert.match(html, /id="combatHistoryToggle"[^>]*aria-controls="combatHistory"/);
assert.match(css, /combat-history-wrap\.is-collapsed \.combat-history\{display:none\}/);
assert.match(runtime, /db064SetBattleLogCollapsed/);
assert.match(html, /id="appTooltipLayer" role="tooltip"/);
assert.match(css, /\.app-tooltip-layer\{position:fixed;z-index:3000/);
assert.match(runtime, /document\.addEventListener\('pointerover'/);
assert.match(runtime, /db064PositionTooltip/);
assert.doesNotMatch(css, /content:attr\(data-tip\)/, "tooltips must not remain clipped pseudo-elements");

console.log("Combat log bottom/collapse and root tooltip portal layout contracts pass");
