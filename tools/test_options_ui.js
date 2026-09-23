#!/usr/bin/env node
"use strict";

/* Deterministic contract checks for the extracted Options/settings UI owner. */
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"runtime/js/ui/options.js"),"utf8");
const window={window:null};window.window=window;
vm.runInNewContext(source,{window,console},{filename:"runtime/js/ui/options.js"});
const ui=window.DiceboundOptionsUi;
assert.ok(ui,"Options UI owner is not public");
assert.equal(ui.owner,"ui/options");

ui.configure({getSettings:()=>({muted:true,masterVolume:1.5,soundPack:"custom",characterLayout:"classic",floatingCombatNumbers:false,fastWheelSlots:true,fastWheelSlotsUnlocked:true}),nativeSaveSupported:()=>true,debugBundleSupported:()=>true});
const model=ui.sync();
assert.deepEqual(JSON.parse(JSON.stringify(model)),{owner:"ui/options",muted:true,volume:1,soundPack:"custom",characterLayout:"classic",floatingCombatNumbers:false,fastWheelSlots:true,fastWheelSlotsUnlocked:true,nativeSaveSupported:true,debugBundleSupported:true,saveHealth:""},"Options settings view must normalize a read-only runtime snapshot");
assert.match(source,/data-options-done/,"Options requires persistent dismissal chrome");
assert.match(source,/options-chrome\{position:sticky/,"Options Done chrome must stay persistent while content scrolls");
assert.match(source,/function ensureTopAction\(/,"Options must own the semantic top-action trigger");
assert.match(source,/id="optionsFastEventsCard" hidden/,"Fast Wheel & Slots must stay hidden before its Board 6 unlock");
assert.match(source,/Fast Wheel &amp; Slots/,"Options must own the fast-event setting presentation");
assert.match(source,/runtime\.setFastWheelSlots/,"Options must delegate persistence instead of owning career state");
assert.match(source,/id="optionsCharacterLayoutBtn"/,"Options must own the Character layout control");
assert.match(source,/runtime\.setCharacterLayout/,"Options must delegate Character layout persistence");
assert.match(source,/source\.characterLayout===\'classic\'\?\'classic\':\'modern\'/,"Character layout must default to Modern for existing saves");
assert.match(source,/id="optionsFloatingNumbersBtn"/,"Options must own the Floating Combat Numbers control");
assert.match(source,/runtime\.setFloatingCombatNumbers/,"Options must delegate Floating Combat Numbers persistence");
assert.match(source,/source\.floatingCombatNumbers!==false/,"Floating Combat Numbers must default on for existing saves without the setting");
assert.match(source,/id="optionsExportDebugBtn"/,"Options must expose Debug Bundle export");
assert.match(source,/id="optionsIncludeSave"/,"Options must expose explicit save-inclusion consent");
assert.match(source,/type="checkbox" id="optionsIncludeSave"/,"save inclusion consent must be an unchecked-by-default checkbox");
assert.match(source,/if\(checkbox\)checkbox\.checked=false/,"successful export must reset save opt-in");
assert.match(source,/Without it, save contents are never placed in the ZIP/,"Options must explain default save exclusion");
assert.match(source,/saveHealthText\(\)/,"Options must render authoritative save health");


const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "const dbOptionsUi=window.DiceboundOptionsUi?.configure({",
  "dbOptionsUi?.ensureTopAction?.();",
  "dbOptionsUi?.sync?.();",
  "function beta042EnsureCampOptions(){return window.DiceboundCamp?.ensureOptionsButton();}"
])assert.ok(monolith.includes(adapter),`missing justified Options lifecycle adapter: ${adapter}`);
assert.match(monolith,/setCharacterLayout:value=>\{meta\.settings=meta\.settings\|\|defaultSettings\(\);meta\.settings\.characterLayout=value===\'classic\'\?\'classic\':\'modern\';saveMeta\(\);/,"Character layout must persist through canonical meta.settings");
assert.match(monolith,/setFloatingCombatNumbers:value=>\{meta\.settings=meta\.settings\|\|defaultSettings\(\);meta\.settings\.floatingCombatNumbers=!!value;saveMeta\(\);return meta\.settings\.floatingCombatNumbers;\}/,"floating-number preference must persist through canonical meta.settings");
assert.match(monolith,/debugBundleSupported:\(\)=>!!dbRuntime\.debugBundle\?\.supported\?\.\(\)/,"Options must obtain debug capability through Runtime facade");
assert.match(monolith,/getDebugReport:\(\)=>dbRuntime\.debugBundle\?\.report\?\.\(\)\|\|null/,"Options must obtain save-health/debug metadata through Runtime facade");
assert.match(monolith,/exportDebugBundle:options=>dbRuntime\.debugBundle\?\.exportBundle\?\.\(options\)/,"Options must delegate ZIP export through Runtime facade");
for(const retired of ["function beta042EnsureOptionsOverlay(","function beta042SyncOptionsMenu(","function beta042OpenOptions(","function beta042CloseOptions(","function beta042EnsureTopOptions(",".options-grid{display:grid",".options-actions{display:flex"])assert.ok(!monolith.includes(retired),`retired Options presentation chain remains: ${retired}`);

console.log("Options UI owner PASS: settings, save health, explicit debug-bundle consent, persistent dismissal chrome and monolith drain guards");
