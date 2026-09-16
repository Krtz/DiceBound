from __future__ import annotations

from pathlib import Path

import tmp_materialize_0670_chainsaw as base

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / "runtime/js/dicebound.js"

FACTORY_NAMES = {
    "generateMythicalWeapon": "weapon",
    "generateMythicalOffhand": "offhand",
    "generateMythicalBoots": "boots",
    "generateMythicalPants": "legs",
    "generateMythicalAmulet": "amulet",
    "generateMythicalHat": "hat",
    "generateMythicalRing": "ring",
}
CONFIG_MARKER = "const dbArtifacts=window.DiceboundArtifacts;"


def statement_end(source: bytes, node) -> int:
    end = node.end_byte
    while end < len(source) and source[end:end + 1] in {b" ", b"\t", b";"}:
        end += 1
    if source[end:end + 2] == b"\r\n":
        return end + 2
    if source[end:end + 1] == b"\n":
        return end + 1
    return end


def remove_legacy_factories(text: str) -> tuple[str, int]:
    source = text.encode("utf-8")
    tree = base.parse(source)
    spans: list[tuple[int, int]] = []

    for node in base.walk(tree.root_node):
        if node.type == "function_declaration":
            ident = node.child_by_field_name("name")
            if not ident:
                continue
            name = base.node_text(source, ident)
            if name in FACTORY_NAMES or name == "v24Artifactize":
                spans.append((node.start_byte, statement_end(source, node)))
                continue
        if node.type in {"lexical_declaration", "variable_declaration"}:
            names: list[str] = []
            for child in node.named_children:
                if child.type != "variable_declarator":
                    continue
                ident = child.child_by_field_name("name")
                if ident and ident.type == "identifier":
                    names.append(base.node_text(source, ident))
            if names and any(name.startswith("v24Myth") for name in names):
                spans.append((node.start_byte, statement_end(source, node)))
                continue
        if node.type == "expression_statement":
            snippet = base.node_text(source, node)
            if "v24Artifactize" in snippet and any(name in snippet for name in FACTORY_NAMES):
                spans.append((node.start_byte, statement_end(source, node)))

    merged: list[tuple[int, int]] = []
    for start, end in sorted(set(spans)):
        if merged and start < merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    for start, end in reversed(merged):
        source = source[:start] + source[end:]
    return source.decode("utf-8"), len(merged)


def insert_owner_configuration(text: str) -> str:
    if CONFIG_MARKER in text:
        return text
    start = text.find("  const player = {")
    if start < 0:
        raise RuntimeError("Could not locate canonical player declaration for Artifact owner configuration")
    end = text.find("\n  };", start)
    if end < 0:
        raise RuntimeError("Could not locate end of canonical player declaration")
    end += len("\n  };")
    config = (
        "\n\n  const dbArtifacts=window.DiceboundArtifacts;\n"
        "  if(!dbArtifacts?.configure||!dbArtifacts?.create)throw new Error('DiceboundArtifacts final factory owner must load before dicebound.js');\n"
        "  dbArtifacts.configure({getPlayer:()=>player,random:()=>random(),pick:values=>pick(values),getElementKeys:()=>ELEMENT_KEYS});"
    )
    return text[:end] + config + text[end:]


def route_consumers(text: str) -> str:
    old_debug = "const artifactFns={mythic_weapon:generateMythicalWeapon,mythic_offhand:generateMythicalOffhand,mythic_boots:generateMythicalBoots,mythic_legs:generateMythicalPants,mythic_amulet:generateMythicalAmulet,mythic_hat:generateMythicalHat,mythic_ring:generateMythicalRing};"
    new_debug = "const artifactSlots={mythic_weapon:'weapon',mythic_offhand:'offhand',mythic_boots:'boots',mythic_legs:'legs',mythic_amulet:'amulet',mythic_hat:'hat',mythic_ring:'ring'};"
    if old_debug in text:
        text = text.replace(old_debug, new_debug, 1)
        text = text.replace("if(artifactFns[action]){", "if(artifactSlots[action]){", 1)
        text = text.replace("const item=artifactFns[action]();", "const item=dbArtifacts.create(artifactSlots[action]);", 1)
    elif new_debug not in text:
        raise RuntimeError("Artifact debug factory map changed unexpectedly")

    old_full = "[generateMythicalWeapon,generateMythicalOffhand,generateMythicalBoots,generateMythicalPants,generateMythicalAmulet,generateMythicalHat,generateMythicalRing].forEach(fn=>dbItems.equip(fn(),true));"
    new_full = "['weapon','offhand','boots','legs','amulet','hat','ring'].forEach(slot=>dbItems.equip(dbArtifacts.create(slot),true));"
    if old_full in text:
        text = text.replace(old_full, new_full, 1)
    elif new_full not in text:
        raise RuntimeError("Full Artifact debug loadout changed unexpectedly")

    old_table = "const DB060_ARTIFACT_TABLE=window.DiceboundArtifacts?.entries;\n  if(!DB060_ARTIFACT_TABLE)throw new Error('DiceboundArtifacts must load before dicebound.js');"
    new_table = "const DB060_ARTIFACT_TABLE=dbArtifacts.entries;"
    if old_table in text:
        text = text.replace(old_table, new_table, 1)
    elif new_table not in text:
        raise RuntimeError("Artifact loot table binding changed unexpectedly")

    old_factories = """  const DB060_ARTIFACT_FACTORIES=Object.freeze({
    weapon:()=>generateMythicalWeapon(),
    boots:()=>generateMythicalBoots(),
    legs:()=>generateMythicalPants(),
    ring:()=>generateMythicalRing(),
    hat:()=>generateMythicalHat(),
    amulet:()=>generateMythicalAmulet(),
    offhand:()=>generateMythicalOffhand()
  });
  function db060RollArtifact(){const entry=window.DiceboundArtifacts.pick(random),make=DB060_ARTIFACT_FACTORIES[entry.slot];if(typeof make!=='function')throw new Error(`No Artifact item factory registered for ${entry.slot}`);const item=make();item.artifactTableSlot=entry.slot;return item;}
"""
    new_factories = "  function db060RollArtifact(){const entry=dbArtifacts.pick(random),item=dbArtifacts.create(entry.slot);item.artifactTableSlot=entry.slot;return item;}\n"
    if old_factories in text:
        text = text.replace(old_factories, new_factories, 1)
    elif new_factories.strip() not in text:
        raise RuntimeError("Artifact loot factory routing changed unexpectedly")

    text = text.replace("window.DiceboundArtifacts.pick(random)", "dbArtifacts.pick(random)")
    return text


def main() -> int:
    text = MONOLITH.read_text(encoding="utf-8").replace("\r\n", "\n")
    before_lines = text.count("\n") + 1

    already = CONFIG_MARKER in text and not any(name in text for name in FACTORY_NAMES) and "v24Artifactize" not in text
    if already:
        print(f"ARTIFACT_OWNER already canonical; monolith={before_lines} lines")
        return 0

    text, removed_spans = remove_legacy_factories(text)
    text = insert_owner_configuration(text)
    text = route_consumers(text)

    survivors = [name for name in FACTORY_NAMES if name in text]
    if survivors:
        raise RuntimeError(f"Legacy Artifact factory names survived in monolith: {survivors}")
    for marker in ["v24Artifactize", "v24MythWeapon", "DB060_ARTIFACT_FACTORIES"]:
        if marker in text:
            raise RuntimeError(f"Artifact predecessor marker survived: {marker}")
    if text.count(CONFIG_MARKER) != 1:
        raise RuntimeError("Artifact owner must be configured exactly once")

    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    MONOLITH.write_text(text, encoding="utf-8", newline="\n")
    after_lines = text.count("\n") + 1
    print(f"ARTIFACT_OWNER {before_lines}->{after_lines} monolith lines; removed legacy factory/predecessor spans={removed_spans}; final factories route through items/artifacts.js")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
