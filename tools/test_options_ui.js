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

ui.configure({getSettings:()=>({muted:true,masterVolume:1.5,soundPack:"custom"}),nativeSaveSupported:()=>true});
const model=ui.sync();
assert.deepEqual(JSON.parse(JSON.stringify(model)),{owner:"ui/options",muted:true,volume:1,soundPack:"custom",nativeSaveSupported:true},"Options settings view must normalize a read-only runtime snapshot");
assert.match(source,/data-options-done/,"Options requires persistent dismissal chrome");
assert.match(source,/options-chrome\{position:sticky/,"Options Done chrome must stay persistent while content scrolls");
assert.match(source,/function ensureTopAction\(/,"Options must own the semantic top-action trigger");

const monolith=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8").replace(/\r\n/g,"\n");
for(const adapter of [
  "const dbOptionsUi=window.DiceboundOptionsUi?.configure({",
  "dbOptionsUi?.ensureTopAction?.();",
  "dbOptionsUi?.sync?.();",
  "function beta042EnsureCampOptions(){return window.DiceboundCamp?.ensureOptionsButton();}"
])assert.ok(monolith.includes(adapter),`missing justified Options lifecycle adapter: ${adapter}`);
for(const retired of ["function beta042EnsureOptionsOverlay(","function beta042SyncOptionsMenu(","function beta042OpenOptions(","function beta042CloseOptions(","function beta042EnsureTopOptions(",".options-grid{display:grid",".options-actions{display:flex"])assert.ok(!monolith.includes(retired),`retired Options presentation chain remains: ${retired}`);

console.log("Options UI owner PASS: settings model, persistent dismissal chrome and monolith drain guards");
