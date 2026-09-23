#!/usr/bin/env node
"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const js=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
const css=fs.readFileSync(path.join(root,"runtime/css/dicebound.css"),"utf8").replace(/\r\n/g,"\n");
const equipment=fs.readFileSync(path.join(root,"runtime/js/ui/equipment-heirlooms.js"),"utf8").replace(/\r\n/g,"\n");

assert.ok(js.includes("function dbBeta02PlayFlowName(width,height){return width>=1450&&height>=800?'side-controls':'below-controls';}"),"roomy desktop play-flow policy missing");
assert.ok(js.includes("controlsPlacement='below'")&&js.includes("controlsPlacement==='side'"),"Board size calculator must distinguish side vs below controls");
assert.ok(js.includes("body?.setAttribute('data-play-flow',playFlow)"),"responsive owner must publish play-flow semantics");
assert.ok(js.includes("body?.setAttribute('data-travel-density',travelDensity)"),"Travel presentation must publish compact/full density");
assert.ok(js.includes("rollButton.textContent=travelDensity==='compact'?'Roll':'Roll the dice'"),"Travel Roll label must adapt without multi-line wrapping");
assert.ok(js.includes("controlsPlacement:playFlow==='side-controls'?'side':'below'"),"live Board measurement must use play-flow placement");
assert.ok(css.includes('body[data-play-flow="side-controls"] .game-panel')&&css.includes("grid-template-columns:minmax(0,1fr) var(--db-road-side-width,170px)"),"side-control play cluster CSS missing");
assert.ok(css.includes('body[data-play-flow="side-controls"] .road-controls')&&css.includes("grid-template-columns:1fr;grid-template-rows:auto auto auto"),"side Travel control layout missing");
assert.ok(css.includes('[data-travel-density="compact"] #rollBtn')&&css.includes("white-space:nowrap"),"compact Travel control must keep Roll on one line");
assert.ok(js.includes("function beta042SidebarSnapshot()")&&js.includes("characterHeight>=petHeight+80?'masonry':'paired'"),"sidebar packing must be chosen from measured card geometry");
assert.ok(css.includes('[data-sidebar-flow="masonry"] .sidebar>.log-card')&&css.includes("grid-column:2!important;grid-row:2!important"),"masonry HUD must pack Adventure Log below Companion");
assert.match(equipment,/grid-template-columns:repeat\(5,minmax\(42px,1fr\)\).*grid-template-areas:"\. \. hat \. \." "\. amulet chest ring \." "weapon \. chest \. offhand" "\. \. legs \. \." "\. \. boots \. \."/s,"normal desktop spatial Character paper doll missing");
assert.ok(equipment.includes('body[data-hud-flow="landscape-2"] .character-gear-grid')&&equipment.includes('body[data-hud-flow="landscape-3"] .character-gear-grid'),"short-landscape compact paper-doll fallback missing");
console.log("Board space layout PASS: adaptive Travel density, measured HUD packing and spatial Character Gear contracts are locked");
