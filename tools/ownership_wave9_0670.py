from __future__ import annotations

import re
from pathlib import Path

import tmp_materialize_0670_chainsaw as base

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / "runtime/js/dicebound.js"
CONSUMABLES = ROOT / "runtime/js/items/consumables.js"
MANA = ROOT / "runtime/js/combat/mana-action-resolution.js"
ANTI_RETURN = ROOT / "tools/test_monolith_chainsaw.py"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def cut_between(text: str, start: str, end: str, label: str) -> str:
    a = text.find(start)
    if a < 0:
        raise RuntimeError(f"{label}: start marker missing")
    b = text.find(end, a)
    if b < 0:
        raise RuntimeError(f"{label}: end marker missing")
    if b - a > 12000:
        raise RuntimeError(f"{label}: refusing oversized cut of {b-a} characters")
    return text[:a] + text[b:]


def strip_tombstone_comments(text: str) -> tuple[str, int]:
    phrases = (
        " is owned by ",
        " are owned by ",
        " ownership lives ",
        " ownership now lives ",
        " now owned by ",
        "thin composition adapter",
        "supplies runtime facts",
        "remains authoritative internals",
        " are internal to ",
        " is internal to ",
        "moved into the canonical",
        "moved to the canonical",
    )
    source = text.encode("utf-8")
    tree = base.parse(source)
    spans: list[tuple[int, int]] = []
    for node in base.walk(tree.root_node):
        if node.type != "comment":
            continue
        raw = base.node_text(source, node).lower()
        if any(phrase in raw for phrase in phrases):
            spans.append((node.start_byte, node.end_byte))
    for start, end in reversed(spans):
        source = source[:start] + source[end:]
    return source.decode("utf-8"), len(spans)


def canonicalize_consumables() -> None:
    text = CONSUMABLES.read_text(encoding="utf-8").replace("\r\n", "\n")

    if "function v24RoadAccountingLayer" in text:
        text = cut_between(
            text,
            "  function v24RoadAccountingLayer(...args) {\n",
            "  function tracedCombatPotion(args, thisArg) {\n",
            "obsolete road-Potion accounting repair",
        )
    text = text.replace(
        'return requireRuntime().traceCommand("usePotionOutsideCombat", () => v24RoadAccountingLayer(...args), "detailed", args, thisArg);',
        'return requireRuntime().traceCommand("usePotionOutsideCombat", () => roadPotionCore(...args), "detailed", args, thisArg);',
    )
    text = text.replace(
        "_test: Object.freeze({ combatPotionCore, roadPotionCore, v24RoadAccountingLayer, tracedCombatPotion, tracedRoadPotion })",
        "_test: Object.freeze({ combatPotionCore, roadPotionCore, tracedCombatPotion, tracedRoadPotion })",
    )

    comment_rewrites = {
        "  // V16 is the published Potion formula used by combat, road drinking and the\n  // Alchemist Volatile Flask compatibility seam.\n": "  // Shared Potion formula used by combat, road drinking and Alchemist Volatile Flask.\n",
        "  // Career tracking remains a consumable-side effect: one increment per Potion\n  // actually consumed. Unlock-rule implementation itself stays outside this owner.\n": "  // Career tracking increments exactly once for every Potion actually consumed.\n",
        "  // Mature V16 combat transaction, including Double Dose. D20 generation,\n  // elemental effects, generic healing, Victory and enemy response are injected.\n": "  // Combat Potion transaction, including Double Dose.\n",
        "  // Friends Patch Dragoon is the outermost combat-Potion layer. A pending\n  // Landing bypasses the Potion transaction and its command trace entirely.\n": "  // A pending Dragoon Landing bypasses the Potion transaction and its command trace.\n",
        "  // Final V16 identity dispatch: choosing Potion breaks Monk combo and Turtle\n  // guard-chain before the normal Potion/Dragoon transaction is attempted.\n": "  // Choosing Potion breaks Monk combo and Turtle guard-chain before the transaction.\n",
    }
    for old, new in comment_rewrites.items():
        text = text.replace(old, new)

    if "v24RoadAccountingLayer" in text:
        raise RuntimeError("Consumables v24 accounting repair survived Wave 9")
    if "usePotionOutsideCombat\", () => roadPotionCore" not in text:
        raise RuntimeError("road Potion command trace no longer routes directly to roadPotionCore")
    CONSUMABLES.write_text(text, encoding="utf-8", newline="\n")


def canonicalize_mana_owner() -> None:
    text = MANA.read_text(encoding="utf-8").replace("\r\n", "\n")

    if "const SPELLS =" not in text:
        anchor = "  let runtime = null;\n"
        spells = '''  const SPELLS = {
    sorcerer:{builder:"Channel Bolt",builderIcon:"🔮",spell:"Arcane Lance",spellIcon:"✦",cost:35,gain:28,desc:"Channel Bolt deals slightly reduced normal attack damage and builds Mana. Arcane Lance spends 35 Mana for a heavy spell, converts half of your Echo Strike chance into bonus Lance damage, applies Lifesteal, and guarantees a random core-element eruption."},
    vampire:{builder:"Night Siphon",builderIcon:"🦇",spell:"Grave Lance",spellIcon:"🌑",cost:35,gain:26,desc:"Night Siphon builds Mana while attacking. Grave Lance spends 35 Mana for heavy damage and drains 30% of the direct damage as HP."},
    rouge:{builder:"Crimson Stroke",builderIcon:"🖌️",spell:"Scarlet Hex",spellIcon:"🌹",cost:35,gain:27,desc:"Crimson Stroke paints Mana into existence. Scarlet Hex spends 35 Mana for a high-crit occult strike and splashes crimson damage into the pack."},
    merchant:{builder:"Ledger Tap",builderIcon:"📜",spell:"Foreclosure Hex",spellIcon:"⚖️",cost:40,gain:30,desc:"Ledger Tap builds Mana through deeply questionable accounting. Foreclosure Hex spends 40 Mana and converts part of your current gold into occult damage."},
    invoker:{builder:"Arcane Current",builderIcon:"🟢",spell:"Elemental Lance",spellIcon:"🔴",cost:50,gain:25,desc:"Arcane Current generates Mana and a Green orb. Elemental Lance spends 50 Mana for a Red orb. Guard forms Blue; three orbs unlock Invoke."},
    summoner:{builder:"Spirit Bolt",builderIcon:"📖",spell:"Conjure Familiar",spellIcon:"🐾",cost:40,gain:26,desc:"Spirit Bolt builds Mana. Spend 40 Mana to conjure a random unlocked companion spirit for this battle, up to three active spirits. Summoned spirits join pet attacks."}
  };

'''
        text = replace_once(text, anchor, anchor + spells, "Mana spell registry insertion")

    text = text.replace('      "spellFor", "classIdentityId",', '      "classIdentityId",')
    text = text.replace("rt.spellFor(", "spellFor(")

    helper_anchor = "  const livingEnemies = () => requireRuntime().livingEnemies();\n"
    helpers = '''  function spellFor(id) { return SPELLS[id] || null; }
  function isManaClass(id) { return !!SPELLS[id]; }
  function identityNote(id) {
    const spell = spellFor(id);
    return spell ? `Mana class — ${spell.builder} builds Mana; ${spell.spell} spends it.` : null;
  }
'''
    if "function spellFor(id)" not in text:
        text = replace_once(text, helper_anchor, helper_anchor + helpers, "Mana descriptor helpers")

    text = text.replace(
        "    manaGain,\n    occultChannelAttack,",
        "    manaGain,\n    spellFor,\n    isManaClass,\n    identityNote,\n    occultChannelAttack,",
    )

    comment_rewrites = {
        "  // The original generator transaction. Bonus wrappers below deliberately keep\n  // their historical nesting so temporary shared-config mutation is restored on\n  // every async exit, while Mana still lands before the underlying Basic Attack.\n": "  // Generator transaction: Mana lands before the underlying Basic Attack.\n",
        "  // V17 Mana Overflow historically wraps Summoner dispatch and the generic\n  // spender. Final Conjure also carries its own earlier compatibility grant;\n  // preserving both calls is intentional behavior preservation for this slice.\n": "  // Mana Overflow grants Ultimate after any qualifying Mana spend.\n",
        "  // Beta 1.10's direct Rouge replacement sits outside Mana Overflow. Preserve\n  // its direct classId test: borrowed Rouge identity continues through the older\n  // generic path, while the real Rouge gets doubled Lifesteal and no V17 wrapper.\n": "  // Real Rouge uses doubled Lifesteal; borrowed Rouge identity uses the generic spender.\n",
        "  // Career tracking is the historical outermost spender layer. The Invoker\n  // owner records its own delegated Elemental Lance, preventing double counting.\n": "  // Record one career spend after a successful non-Invoker Mana spender action.\n",
    }
    for old, new in comment_rewrites.items():
        text = text.replace(old, new)

    if "rt.spellFor(" in text or '"spellFor",' in text:
        raise RuntimeError("Mana owner still depends on monolith spellFor runtime injection")
    for marker in ["function spellFor(id)", "function isManaClass(id)", "function identityNote(id)"]:
        if marker not in text:
            raise RuntimeError(f"Mana owner missing {marker}")
    MANA.write_text(text, encoding="utf-8", newline="\n")


def canonicalize_monolith() -> tuple[int, int]:
    text = MONOLITH.read_text(encoding="utf-8").replace("\r\n", "\n")
    before = text.count("\n") + 1

    if "const MANA_OCCULT_CLASSES=" in text:
        pattern = re.compile(
            r'  const MANA_OCCULT_CLASSES=new Set\(\["sorcerer","vampire","rouge","merchant","invoker"\]\);\n'
            r'  const OCCULT_SPELLS=\{\n.*?\n  \};\n',
            re.S,
        )
        matches = list(pattern.finditer(text))
        if len(matches) != 1:
            raise RuntimeError(f"occult descriptor block: expected one match, found {len(matches)}")
        if matches[0].end() - matches[0].start() > 8000:
            raise RuntimeError("occult descriptor block unexpectedly large")
        text = text[:matches[0].start()] + text[matches[0].end():]

    text = text.replace(
        '  MANA_OCCULT_CLASSES.add("summoner");\n  OCCULT_SPELLS.summoner={builder:"Spirit Bolt",builderIcon:"📖",spell:"Conjure Familiar",spellIcon:"🐾",cost:40,gain:26,desc:"Spirit Bolt builds Mana. Spend 40 Mana to conjure a random unlocked companion spirit for this battle, up to three active spirits. Summoned spirits join pet attacks."};\n\n',
        '',
    )
    text = text.replace("    spellFor:id=>OCCULT_SPELLS[id],\n", "")
    text = text.replace(
        "      if(MANA_OCCULT_CLASSES.has(cls.id)){const spell=OCCULT_SPELLS[cls.id];return spell?`Mana class — ${spell.builder} builds Mana; ${spell.spell} spends it.`:'Mana class.';}\n",
        "      const manaNote=dbCombatManaActionResolution.identityNote(cls.id);if(manaNote)return manaNote;\n",
    )
    text = text.replace("      if(cls.id==='summoner')return 'Mana pet-caster — build a temporary spirit circle every battle.';\n", "")

    direct_potion_replacements = {
        "potionHealValue:mult=>v16PotionHealValue(mult)": "potionHealValue:mult=>dbConsumablesResolution.potionHealValue(mult)",
        "potionHealValue:fraction=>v16PotionHealValue(fraction)": "potionHealValue:fraction=>dbConsumablesResolution.potionHealValue(fraction)",
        "potionHealValue:()=>v16PotionHealValue()": "potionHealValue:()=>dbConsumablesResolution.potionHealValue()",
        "const heal=v16PotionHealValue();": "const heal=dbConsumablesResolution.potionHealValue();",
    }
    for old, new in direct_potion_replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"^  function v16PotionHealValue\([^\n]*\n", "", text, count=1, flags=re.M)

    if "const db0511OutsidePotionBtn=" in text:
        text = cut_between(
            text,
            "  const db0511OutsidePotionBtn=$('outsidePotionBtn');\n",
            "  // ENEMY ELEMENTAL PARITY",
            "outside-Potion listener interception",
        )

    if "function v27EnsureUpgrade(def)" in text:
        text = text.replace("  function v27EnsureUpgrade(def){return v27Upgrade(def.id);}\n", "", 1)
        text = text.replace("  ['legendary_worldheart','legendary_echo_crown','legendary_prismatic','legendary_blood_contract','true_legend_attack_v24','true_legend_echo_v24','true_legend_guard_v24','true_legend_element_v24'].forEach(id=>{const u=v27Upgrade(id);});\n", "", 1)
        text = text.replace("  const golden27=v27Upgrade('legendary_golden_law');if(golden27){}\n\n", "", 1)
        ensure_pattern = re.compile(r"^  v27EnsureUpgrade\(\{id:'(?:legendary_crimson_aegis_v27|legendary_star_eater_v27|legendary_adamant_v27|legendary_venom_throne_v27|legendary_kings_ransom_v27|legendary_prismatic_choir_v27|legendary_wanderer_v27)'.*?\}\);\n", re.M)
        text, count = ensure_pattern.subn("", text)
        if count != 7:
            raise RuntimeError(f"v2.7 dead Legendary ensure block: expected 7 definitions, removed {count}")

    no_op_blocks = [
        "  const vampEdge28=upgrades.find(u=>u.id==='vampire');\n  if(vampEdge28){}\n\n",
        "  const venomThrone28=upgrades.find(u=>u.id==='legendary_venom_throne_v27');\n  if(venomThrone28){\n\n  }\n\n",
        "  const resonantTalent=talents.find(t=>t.id===\"turtle_guard_element\");if(resonantTalent){}\n\n",
    ]
    for block in no_op_blocks:
        text = text.replace(block, "")

    text, tombstones = strip_tombstone_comments(text)
    text = re.sub(r"(?m)^[ \t]+$", "", text)
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")

    stale = [
        "db0511OutsidePotionBtn", "v16PotionHealValue", "MANA_OCCULT_CLASSES", "OCCULT_SPELLS",
        "v27EnsureUpgrade", "golden27", "vampEdge28", "venomThrone28", "resonantTalent",
    ]
    for marker in stale:
        if marker in text:
            raise RuntimeError(f"Wave 9 historical marker survived in monolith: {marker}")
    if "dbCombatManaActionResolution.identityNote(cls.id)" not in text:
        raise RuntimeError("class chooser no longer reads Mana identity description from its owner")
    if "dbConsumablesResolution.potionHealValue" not in text:
        raise RuntimeError("Potion formula no longer routes through Consumables owner")

    MONOLITH.write_text(text, encoding="utf-8", newline="\n")
    after = text.count("\n") + 1
    return before - after, tombstones


def update_anti_return() -> None:
    guard = ANTI_RETURN.read_text(encoding="utf-8").replace("\r\n", "\n")
    marker = "STALE_WAVE9_MARKERS=['db0511OutsidePotionBtn','v16PotionHealValue','MANA_OCCULT_CLASSES','OCCULT_SPELLS','v27EnsureUpgrade','golden27','vampEdge28','venomThrone28','resonantTalent']"
    if marker not in guard:
        anchor = "STALE_DEBUG_LOG_PREDECESSORS="
        pos = guard.find(anchor)
        if pos < 0:
            raise RuntimeError("Wave 9 anti-return anchor missing")
        line_end = guard.find("\n", pos)
        guard = guard[:line_end + 1] + marker + "\n" + guard[line_end + 1:]
    assertion = '    for marker in STALE_WAVE9_MARKERS:\n        assert marker not in text, f"historical Wave 9 marker {marker} returned"\n'
    if assertion not in guard:
        anchor = '    for marker in STALE_DEBUG_LOG_PREDECESSORS:\n        assert marker not in text, f"debug-log predecessor {marker} returned"\n'
        if anchor not in guard:
            raise RuntimeError("Wave 9 anti-return assertion anchor missing")
        guard = guard.replace(anchor, anchor + assertion, 1)
    ANTI_RETURN.write_text(guard, encoding="utf-8", newline="\n")


def main() -> int:
    canonicalize_consumables()
    canonicalize_mana_owner()
    removed_lines, tombstones = canonicalize_monolith()
    update_anti_return()
    print(f"OWNERSHIP_WAVE9 removed={removed_lines} monolith lines; tombstone comments removed={tombstones}; Potion/Mana ownership canonical")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
