#!/usr/bin/env node
"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const js=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
const css=fs.readFileSync(path.join(root,"runtime/css/dicebound.css"),"utf8").replace(/\r\n/g,"\n");
const equipment=fs.readFileSync(path.join(root,"runtime/js/ui/equipment-heirlooms.js"),"utf8").replace(/\r\n/g,"\n");

assert.ok(js.includes("function dbBeta02CalculateBoardSize({panelWidth=0,panelHeight=0,controlsHeight=0"),"Board size calculator must account for Road controls below the Board");
assert.ok(js.includes("dbBeta02Number(panelHeight)-dbBeta02Number(paddingY)-dbBeta02Number(controlsHeight)-dbBeta02Number(gap)"),"Road-control height must always reduce available Board height");
for(const retired of ["dbBeta02PlayFlowName","dbBeta02SideControlsWidth","controlsPlacement","sideControlsWidth","travelDensity"])assert.equal(js.includes(retired),false,`rejected side-Travel policy remains in composition: ${retired}`);
assert.equal(js.includes("setAttribute('data-play-flow'"),false,"composition must not set retired play-flow state");
assert.equal(js.includes("setAttribute('data-travel-density'"),false,"composition must not set retired Travel-density state");
assert.ok(js.includes("removeAttribute('data-play-flow')")&&js.includes("removeAttribute('data-travel-density')"),"responsive owner should clear stale side-Travel attributes from live DOM");
assert.equal(css.includes('data-play-flow="side-controls"'),false,"rejected side-Travel CSS must be deleted");
assert.equal(css.includes("data-travel-density"),false,"rejected compact/full Travel density CSS must be deleted");
assert.ok(js.includes("rollButton.textContent='Roll the dice'"),"Roll control must keep the canonical full label");
assert.ok(js.includes("function beta042SidebarSnapshot()")&&js.includes("characterHeight>=petHeight+80?'masonry':'paired'"),"right-side HUD packing must still be chosen from measured card geometry");
assert.ok(css.includes('[data-sidebar-flow="masonry"] .sidebar>.log-card')&&css.includes("grid-column:2!important;grid-row:2!important"),"masonry HUD must keep Adventure Log below Companion");
assert.match(equipment,/grid-template-columns:repeat\(5,minmax\(42px,1fr\)\).*grid-template-areas:"\\. \\. hat \\. \\." "amulet \\. chest \\. ring" "weapon \\. chest \\. offhand" "\\. \\. legs \\. \\." "\\. \\. boots \\. \\."/s,"normal desktop spatial Character paper doll missing");
assert.ok(equipment.includes('body[data-hud-flow="landscape-2"] .character-gear-grid')&&equipment.includes('body[data-hud-flow="landscape-3"] .character-gear-grid'),"short-landscape compact paper-doll fallback missing");
console.log("Board space layout PASS: Road controls stay below, measured right-side HUD packing remains, spatial Gear stays intact");
