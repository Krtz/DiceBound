"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const sourcePath=path.join(__dirname,"..","runtime","js","progression","talents.js");
const source=fs.readFileSync(sourcePath,"utf8");
const context=vm.createContext({window:{}});
vm.runInContext(source,context,{filename:sourcePath});

const talents=context.window.DiceboundTalents;
assert.ok(talents);assert.equal(talents.apiVersion,1);assert.ok(Object.isFrozen(talents));assert.ok(Object.isFrozen(talents.ids));

const expectedIds=[
  "roadborn","survival_vitality","survival_armor","survival_recovery",
  "survival_dodge","survival_prepared","survival_alchemy","survival_double_dose",
  "survival_revive","power_attack","power_boss","power_lifesteal","power_crit",
  "power_ultimate_start","power_ultimate_flow","power_echo","power_apex",
  "fortune_gold","fortune_discount","fortune_luck","fortune_cookie",
  "fortune_blessing","fortune_omens","fortune_impossible","legacy_heirloom",
  "legacy_xp","legacy_travel","legacy_scholar","companion_damage",
  "companion_double","companion_bond","companion_recovery","companion_ascendant",
  "element_attunement","element_power","element_weakness","element_echo",
  "element_conduit","element_prismatic","companion_element_proc",
  "fortune_powerup_rerolls","monk_flow_ceiling","turtle_guard_element",
  "fortune_extra_choice","dragoon_aerial_discipline"
];
assert.deepEqual(Array.from(talents.ids),expectedIds);

const registry=talents.createRegistry();
assert.equal(registry.length,45);
assert.deepEqual(Array.from(registry,t=>t.id),expectedIds);
const byId=new Map();
for(const talent of registry){
  assert.ok(talent.id&&!byId.has(talent.id),`duplicate or empty talent id: ${talent.id}`);
  assert.ok(Number.isInteger(talent.cost)&&talent.cost>0,`${talent.id} has invalid cost`);
  assert.ok(Number.isInteger(talent.maxRank)&&talent.maxRank>0,`${talent.id} has invalid maxRank`);
  assert.equal(typeof talent.branch,"string");assert.equal(typeof talent.desc,"string");assert.ok(Array.isArray(talent.requires));
  byId.set(talent.id,talent);
}
for(const talent of registry)for(const requirement of talent.requires){
  const prerequisite=byId.get(requirement.id);
  assert.ok(prerequisite,`${talent.id} requires missing talent ${requirement.id}`);
  assert.ok(Number.isInteger(requirement.rank)&&requirement.rank>0);
  assert.ok(requirement.rank<=prerequisite.maxRank);
}
const visiting=new Set(),visited=new Set();
function visit(id){if(visiting.has(id))throw new Error(`talent prerequisite cycle at ${id}`);if(visited.has(id))return;visiting.add(id);for(const r of byId.get(id).requires)visit(r.id);visiting.delete(id);visited.add(id);}
for(const id of expectedIds)visit(id);assert.equal(visited.size,expectedIds.length);

const loadout=byId.get("legacy_heirloom");
assert.equal(loadout.name,"Heirloom Loadout");
assert.equal(loadout.maxRank,4);
assert.match(loadout.desc,/five total before Prestige/i);
assert.equal(byId.has("legacy_storage"),false,"retired duplicate storage Talent returned");

const second=talents.createRegistry();
registry[0].name="mutated";registry[1].requires[0].rank=999;
assert.equal(second[0].name,"Roadborn");assert.equal(second[1].requires[0].rank,1);

const monolith=fs.readFileSync(path.join(__dirname,"..","runtime","js","dicebound.js"),"utf8");
assert.doesNotMatch(monolith,/const\s+DB317_TALENTS_RAW\s*=\s*\[/);
assert.match(monolith,/window\.DiceboundTalents\?\.createRegistry\(\)/);
assert.match(monolith,/const talents=DB317_TALENTS_RAW;/);
assert.match(monolith,/DiceboundTalents must load before dicebound\.js/);

console.log("Talent registry PASS: 45-node graph is valid; Heirloom Loadout stays and duplicate storage Talent is retired.");
