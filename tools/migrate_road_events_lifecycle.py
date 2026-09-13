#!/usr/bin/env python3
"""Temporary branch-only migrator for the Road Events lifecycle extraction."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def cut(text: str, start: str, end: str, label: str) -> str:
    a = text.find(start)
    if a < 0:
        raise SystemExit(f"{label}: start marker missing")
    b = text.find(end, a + len(start))
    if b < 0:
        raise SystemExit(f"{label}: end marker missing")
    return text[:a] + text[b:]


def subline(text: str, pattern: str, replacement: str, label: str, count: int = 1) -> str:
    out, found = re.subn(pattern, replacement, text, count=count, flags=re.M)
    if found != count:
        raise SystemExit(f"{label}: expected {count}, got {found}")
    return out


monolith_path = ROOT / "runtime/js/dicebound.js"
text = monolith_path.read_bytes().decode("utf-8").replace("\r\n", "\n")

start = text.find("  dbRoadEvents.configure({\n")
end = text.find("  const MERCHANT_SPACING = 12;", start)
if start < 0 or end < 0:
    raise SystemExit("Road Events composition block markers missing")
composition = """  dbRoadEvents.configure({
    treasure:{
      getPlayer:()=>player,
      getBoardLevel:()=>boardLevel,
      getTiles:()=>tiles,
      currentTileCount:()=>currentTileCount(),
      isHell:()=>hellMode,
      isNightmare:()=>nightmareMode,
      random:()=>random(),
      rand:(a,b)=>rand(a,b),
      modifiedGold:value=>modifiedGold(value),
      clamp:(value,min,max)=>clamp(value,min,max),
      refreshTile:index=>refreshTile(index),
      coin:()=>sfx.coin(),
      addLog:text=>addLog(text),
      showToast:(...args)=>showToast(...args),
      updateHUD:()=>updateHUD(),
      returnToRoad:()=>returnToRoad(),
      rollGearRarity:bonus=>rollGearRarity(bonus),
      generateEquipment:rarity=>generateEquipment(rarity),
      openLoot:(item,done)=>openLoot(item,done),
      generateLegendary:(slot,preferUndiscovered)=>db060GenerateLegendary(slot,preferUndiscovered)
    },
    lifecycle:{
      $:id=>$(id),
      getPlayer:()=>player,
      getMeta:()=>meta,
      getTiles:()=>tiles,
      getBoardLevel:()=>boardLevel,
      currentTileCount:()=>currentTileCount(),
      random:()=>random(),
      rand:(a,b)=>rand(a,b),
      pick:values=>pick(values),
      delay:ms=>delay(ms),
      tone:(...args)=>tone(...args),
      sfxRoll:()=>sfx.roll(),
      sfxLevel:()=>sfx.level(),
      sfxCoin:()=>sfx.coin(),
      sfxHoly:()=>sfx.holy(),
      modifiedGold:value=>modifiedGold(value),
      gameplayTalentRank:id=>gameplayTalentRank(id),
      saveMeta:()=>saveMeta(),
      updateMetaUI:()=>updateMetaUI(),
      refreshTile:index=>refreshTile(index),
      addLog:text=>addLog(text),
      showToast:(...args)=>showToast(...args),
      updateHUD:()=>updateHUD(),
      returnToRoad:()=>returnToRoad(),
      activePetName:()=>activePetDef().name,
      eligibleUpgrades:filter=>eligibleUpgrades(filter),
      applyRandomHighRarity:(...args)=>applyRandomHighRarity(...args),
      applyUpgrade:(...args)=>applyUpgrade(...args),
      rarityLabel:rarity=>rarityInfo[rarity]?.label||rarity,
      forceLevels:n=>forceLevels(n),
      recordRunBuff:(...args)=>recordRunBuff(...args),
      effectiveDodgeChance:()=>effectiveDodgeChance(),
      fallbackRarityPool:wanted=>v27FallbackRarityPool(wanted),
      startCombat:kind=>startCombat(kind),
      art:(...args)=>beta043Art(...args)
    }
  });
"""
text = text[:start] + composition + text[end:]

for declaration in (
    "  let currentMysticBuff = null;\n",
    "  let wheelRotation = 0;\n",
    "  let wheelBusy = false;\n",
):
    text = text.replace(declaration, "")

text = cut(text, "  function openEvent(){\n", "  function grantLegacyXp(amount){", "base Slot/Wheel/Blessing/Mystic cluster")
text = cut(text, "  function openBloodwell(){\n", "  function openInfo(){", "base Bloodwell/Gambler cluster")
text = cut(text, "  // ---- Wheel scales with road depth ---------------------------------------", "  // ---- Explicit late-road difficulty curve --------------------------------", "v17 wheel patch")
text = subline(text, r"^  const openBloodwellV11=.*?;$\n?", "", "v11 Bloodwell wrapper")
text = subline(text, r"^  const openBloodwellV17Base=.*?;$\n?", "", "v17 Bloodwell wrapper")
text = subline(text, r'^  openGambler=function\(\)\{const grid=\$\("gambleGrid"\).*?;$\n?', "", "pity Gambler override")
text = subline(text, r"^  const restoration=wheelRewards\.find\(.*?;$\n?", "", "old Restoration override")

beta_start = "  openGambler=function(){\n    const grid=$('gambleGrid');"
a = text.find(beta_start)
if a < 0:
    raise SystemExit("Beta043 Gambler override start missing")
b = text.find("\n  };", a)
if b < 0:
    raise SystemExit("Beta043 Gambler override end missing")
text = text[:a] + text[b + 5 :]

text = subline(text, r"^  function beta03RollMysticRarity\(\).*?$\n?", "", "Mystic rarity roll helper")
text = subline(text, r"^  openMystic=function\(\).*?$\n?", "", "final Mystic override")
text = cut(text, "  function db064EventGold(source,multiplier=1){", "  const db064PurseTalent=", "db064 Slot/Wheel patch")

for old in (
    '$("spinBtn").addEventListener("click",spinEvent);',
    '$("wheelSpinBtn").addEventListener("click",spinFortuneWheel);',
    '$("eventContinueBtn").addEventListener("click",()=>{$("eventOverlay").classList.add("hidden");returnToRoad();});',
    '$("wheelContinueBtn").addEventListener("click",()=>{$("wheelOverlay").classList.add("hidden");returnToRoad();});',
):
    if text.count(old) != 1:
        raise SystemExit(f"event listener marker count {text.count(old)}: {old}")
    text = text.replace(old, "", 1)
text = cut(text, '  $("acceptMysticBtn").addEventListener("click",()=>{\n', '  $("merchantContinueBtn")', "Mystic listeners")

# Resume no longer owns event-local transients.
text = text.replace("currentMysticBuff=null;", "")
text = text.replace("wheelBusy=false;", "")
resume_old = "pendingDiceChoiceResolve=null;combatBusy=false;runFinalized=false;"
if text.count(resume_old) != 1:
    raise SystemExit(f"resume transient marker count {text.count(resume_old)}")
text = text.replace(resume_old, "pendingDiceChoiceResolve=null;dbRoadEvents.resetTransient();combatBusy=false;runFinalized=false;", 1)

mystic_pattern = r"^    mysticFallback:\(\)=>\{.*?\},$"
mystic_replacement = "    mysticFallback:()=>{const states=upgrades.filter(u=>u.rarity==='legendary').map(u=>[u,u.unique]);const oldCounts=player.upgradeCounts||{};player.upgradeCounts={...oldCounts};states.forEach(([u])=>{u.unique=true;player.upgradeCounts[u.id]=1;});dbRoadEvents.openMystic();const r=window.DiceboundRoadEventLifecycle.inspect().mysticRarity;$('mysticOverlay')?.classList.add('hidden');states.forEach(([u,x])=>u.unique=x);player.upgradeCounts=oldCounts;dbRoadEvents.resetTransient();return r;},"
text, found = re.subn(mystic_pattern, mystic_replacement, text, count=1, flags=re.M)
if found != 1:
    raise SystemExit(f"mysticFallback debug hook count {found}")

monolith_path.write_bytes(text.encode("utf-8"))

lifecycle_path = ROOT / "runtime/js/events/lifecycle.js"
lifecycle = lifecycle_path.read_bytes().decode("utf-8").replace("\r\n", "\n")
old_inspect = "function inspect(){return Object.freeze({owner:OWNER,bound,wheelBusy,hasMysticOffer:!!currentMysticBuff});}"
new_inspect = "function inspect(){return Object.freeze({owner:OWNER,bound,wheelBusy,hasMysticOffer:!!currentMysticBuff,mysticRarity:currentMysticBuff?.rarity||null});}"
if lifecycle.count(old_inspect) != 1:
    raise SystemExit(f"lifecycle inspect marker count {lifecycle.count(old_inspect)}")
lifecycle_path.write_bytes(lifecycle.replace(old_inspect, new_inspect, 1).encode("utf-8"))

manifest_path = ROOT / "runtime/js/module-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
if not any(module.get("id") == "road-event-lifecycle" for module in manifest["modules"]):
    facade_index = next(i for i, module in enumerate(manifest["modules"]) if module.get("id") == "road-events-facade")
    manifest["modules"].insert(
        facade_index,
        {
            "id": "road-event-lifecycle",
            "path": "js/events/lifecycle.js",
            "domain": "events/interactive-road-event-lifecycle",
            "status": "extracted",
            "requires": ["event-rewards"],
            "provides": ["DiceboundRoadEventLifecycle"],
        },
    )
facade = next(module for module in manifest["modules"] if module.get("id") == "road-events-facade")
if "road-event-lifecycle" not in facade["requires"]:
    facade["requires"].append("road-event-lifecycle")
load_order = manifest["loadOrder"]
if "road-event-lifecycle" not in load_order:
    load_order.insert(load_order.index("road-events-facade"), "road-event-lifecycle")
manifest_path.write_bytes((json.dumps(manifest, indent=2) + "\n").encode("utf-8"))

index_path = ROOT / "runtime/index.html"
index = index_path.read_bytes().decode("utf-8").replace("\r\n", "\n")
if "js/events/lifecycle.js" not in index:
    marker = '<script src="js/events/facade.js"></script>'
    if index.count(marker) != 1:
        raise SystemExit("facade script marker not unique")
    index = index.replace(marker, '<script src="js/events/lifecycle.js"></script>\n' + marker, 1)
index_path.write_bytes(index.encode("utf-8"))

print("Road Events lifecycle migration staged.")
