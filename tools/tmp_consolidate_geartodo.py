from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
GEAR = ROOT / "geartodo"

SLOT_PATHS = {
    "weapon": GEAR / "weapon.md",
    "offhand": GEAR / "offhand.md",
    "chest": GEAR / "chest.md",
    "boots": GEAR / "boots.md",
    "legs": GEAR / "legs.md",
    "hat": GEAR / "hat.md",
    "ring": GEAR / "ring.md",
    "amulet": GEAR / "amulet.md",
}
FIELDS = ("family", "material", "weight", "tags", "eligibility", "intrinsic")


def key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def parse_slot(path: Path):
    text = path.read_text(encoding="utf-8")
    match = re.search(r"^##\s+.+$", text, re.M)
    if not match:
        return text.rstrip(), []
    header = text[: match.start()].rstrip()
    entries = []
    pattern = re.compile(r"^##\s+(.+?)\s*$\n(.*?)(?=^---\s*$|^##\s+|\Z)", re.M | re.S)
    for m in pattern.finditer(text):
        name = m.group(1).strip()
        body = m.group(2).strip()
        fields = {}
        for line in body.splitlines():
            if ":" not in line:
                continue
            field, value = line.split(":", 1)
            field = field.strip()
            if field in FIELDS:
                fields[field] = value.strip()
        if fields:
            entries.append({"name": name, **{f: fields.get(f, "") for f in FIELDS}})
    return header, entries


def created_names():
    text = (GEAR / "created-gear.md").read_text(encoding="utf-8")
    return {key(n.strip()) for n in re.findall(r"^###\s+(.+?)\s*$", text, re.M)}


def render_slot(header: str, entries):
    out = [header.rstrip(), ""]
    for i, e in enumerate(sorted(entries, key=lambda x: x["name"].casefold())):
        out.append(f"## {e['name']}")
        for field in FIELDS:
            out.append(f"{field}: {e.get(field, '')}")
        if i != len(entries) - 1:
            out.append("---")
    return "\n".join(out).rstrip() + "\n"


headers = {}
entries_by_slot = {}
used_global = created_names()

for slot, path in SLOT_PATHS.items():
    header, entries = parse_slot(path)
    headers[slot] = header
    entries_by_slot[slot] = entries
    for e in entries:
        used_global.add(key(e["name"]))


def add(slot, name, family, material="", weight="", tags="", eligibility="common+", intrinsic=""):
    name = re.sub(r"\s+", " ", name).strip(" -")
    if not name:
        return False
    k = key(name)
    if not k or k in used_global:
        return False
    if not intrinsic:
        intrinsic = "+1 Attack" if slot == "weapon" else "+1 Defense"
    entry = {
        "name": name,
        "family": family or "improvised",
        "material": material,
        "weight": weight,
        "tags": tags,
        "eligibility": eligibility,
        "intrinsic": intrinsic,
    }
    entries_by_slot.setdefault(slot, []).append(entry)
    used_global.add(k)
    return True


def table_rows(text: str, heading: str):
    start = text.find(heading)
    if start < 0:
        raise RuntimeError(f"missing heading {heading!r}")
    after = text[start + len(heading) :]
    m = re.search(r"^##\s+|^#\s+", after, re.M)
    segment = after[: m.start()] if m else after
    lines = [line.strip() for line in segment.splitlines() if line.strip().startswith("|")]
    if len(lines) < 2:
        return []
    headers = [c.strip() for c in lines[0].strip("|").split("|")]
    rows = []
    for line in lines[2:]:
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) != len(headers):
            continue
        rows.append(dict(zip(headers, cells)))
    return rows


def infer_weight(family: str, rough: str = "", name: str = ""):
    text = f"{family} {rough} {name}".lower()
    if "very-heavy" in text or any(w in text for w in ("pavise", "great axe", "greatsword", "two-handed", "2h ", "maul", "anchor", "giant boulder", "crate of")):
        return "very-heavy"
    if "heavy" in text or any(w in text for w in ("battleaxe", "warhammer", "halberd", "tower", "plate", "great helm", "war boots")):
        return "heavy"
    if any(w in text for w in ("dagger", "wand", "dart", "throwing", "bow", "whip", "flower", "balloon", "flag", "banner", "toy", "carrot", "knife", "sceptre", "scepter", "orb")):
        return "light"
    return "medium"


def infer_material(name: str):
    n = name.lower()
    mapping = [
        ("elder rune", "elder-rune"),
        ("trimmed masterwork", "trimmed-masterwork"),
        ("masterwork", "masterwork-alloy"),
        ("necronium", "necronium"),
        ("orikalkum", "orikalkum"),
        ("mithril", "mithril"),
        ("adamant", "adamant"),
        ("primal", "primal-metal"),
        ("dragon", "dragon-metal"),
        ("bronze", "bronze"),
        ("iron", "iron"),
        ("steel", "steel"),
        ("black", "black-metal"),
        ("rune", "rune-metal"),
        ("bane", "bane-metal"),
        ("crystal", "crystal"),
        ("bone", "bone"),
        ("wood", "wood"),
        ("rubber", "rubber"),
        ("gold", "gold"),
        ("silver", "silver"),
        ("paper", "paper"),
    ]
    for token, material in mapping:
        if token in n:
            return material
    return ""


def tags_from(family: str, rough: str = "", source="source-inspired"):
    f = family.lower()
    r = rough.lower()
    tags = [source]
    if any(x in f for x in ("bow", "crossbow", "javelin", "dart", "throwing")):
        tags += ["ranged"]
    elif any(x in f for x in ("wand", "staff", "scepter", "sceptre", "orb", "book", "tome", "siphon", "conduit")):
        tags += ["caster"]
    elif any(x in f for x in ("shield", "plate", "helm", "boots", "mail", "armour", "armor", "cuirass", "hauberk")):
        tags += ["martial", "guardian"]
    else:
        tags += ["martial"]
    if any(x in r for x in ("weird", "chaos", "odd", "fun", "toy")):
        tags.append("weird")
    if "void" in r or "death" in r:
        tags.append("void")
    if "nature" in r or "poison" in r:
        tags.append("nature")
    if "fire" in r:
        tags.append("fire")
    if "light" in r:
        tags.append("light")
    return ", ".join(dict.fromkeys(tags))


def rough_intrinsic(slot: str, rough: str, family: str = ""):
    r = rough.lower()
    values = []

    def addv(v):
        if v not in values:
            values.append(v)

    if slot == "weapon":
        attack = 2
        if "tiny" in r or "low attack" in r or "lower flat" in r:
            attack = 1
        if "high attack" in r or "high flat attack" in r:
            attack = 4
        if "very-high attack" in r or "very high attack" in r or "burst attack" in r:
            attack = 6
        addv(f"+{attack} Attack")
    else:
        defense = 2
        if "high defense" in r:
            defense = 4
        if "very high defense" in r:
            defense = 6
        addv(f"+{defense} Defense")

    if "mana" in r:
        addv("+6 Mana" if "high mana" not in r else "+10 Mana")
    if "crit" in r:
        addv("+2% Crit")
    if "echo" in r:
        addv("+2% Echo")
    if "dodge" in r and "penalty" not in r and "less dodge" not in r:
        addv("+2% Dodge")
    if "dodge penalty" in r or "small dodge penalty" in r or "less dodge" in r:
        addv("-1% Dodge")
    if "thorns" in r:
        addv("+1 Thorns")
    if "hp" in r:
        addv("+5 HP")
    if "luck" in r:
        addv("+1 Luck")
    if "gold" in r:
        addv("+4% Gold Gain")
    if "lifesteal" in r:
        addv("+2% Lifesteal")
    if "boss damage" in r:
        addv("+5% Boss Damage")
    if "fire" in r:
        addv("+1% Fire proc chance")
    if "void" in r:
        addv("+1% Void proc chance")
    if "nature" in r or "poison" in r:
        addv("+1% Nature proc chance")
    if "ice" in r or "water" in r:
        addv("+1% Ice proc chance")
    if "light" in r:
        addv("+1% Light proc chance")
    return ", ".join(values)


def rough_eligibility(name: str, rough: str = ""):
    t = f"{name} {rough}".lower()
    if any(x in t for x in ("sacred", "hellforge", "archon", "chaos armor", "chaos armour", "diadem", "legendary", "godbow", "last guardian")):
        return "rare+"
    if any(x in t for x in ("demon", "grim", "wyrm", "kraken", "shadow", "ancient", "great ", "war ")):
        return "uncommon+"
    return "common+"


# ---------------------------------------------------------------------------
# 1. source-inspired-loot-expansion.md
# ---------------------------------------------------------------------------
source = (GEAR / "source-inspired-loot-expansion.md").read_text(encoding="utf-8")

for row in table_rows(source, "## Weapon candidates"):
    add("weapon", row["Item"], row["family"], row["material"], row["weight"], row["tags"],
        row["eligibility"], row["first-pass intrinsic"])

for heading, slot, family, base_tags in [
    ("## Full-helm candidates", "hat", "full-helm", "martial, plate, material-tier"),
    ("## Platebody candidates", "chest", "platebody", "martial, plate, material-tier"),
    ("## Platelegs candidates", "legs", "platelegs", "martial, plate, material-tier"),
    ("## Armoured-boot candidates", "boots", "armoured-boots", "martial, plate, material-tier"),
]:
    for row in table_rows(source, heading):
        add(slot, row["Item"], family, row["material"], row["weight"], base_tags,
            row["eligibility"], row["first-pass intrinsic"])

for row in table_rows(source, "## Shield candidates"):
    name = row["Item"]
    lname = name.lower()
    family = "kiteshield" if "kiteshield" in lname else "round-shield" if "round shield" in lname else "square-shield" if "square shield" in lname else "shield"
    add("offhand", name, family, row["material"], row["weight"], "martial, guardian, material-tier",
        row["eligibility"], row["first-pass intrinsic"])

for row in table_rows(source, "## Weapon-type pool"):
    name, family, rough = row["Candidate"], row["family"], row["rough identity"]
    add("weapon", name, family, infer_material(name), infer_weight(family, rough, name),
        tags_from(family, rough), rough_eligibility(name, rough), rough_intrinsic("weapon", rough, family))

for heading, slot in [
    ("## Chest/body-armour pool", "chest"),
    ("## Hat/head pool", "hat"),
    ("## Boots pool", "boots"),
    ("## Offhand/shield pool", "offhand"),
]:
    for row in table_rows(source, heading):
        name, family, rough = row["Candidate"], row["family"], row["rough identity"]
        add(slot, name, family, infer_material(name), row.get("weight") or infer_weight(family, rough, name),
            tags_from(family, rough), rough_eligibility(name, rough), rough_intrinsic(slot, rough, family))

future_gloves = [
    "Leather Gloves", "Heavy Gloves", "Chain Gloves", "Light Gauntlets", "Gauntlets",
    "Demonhide Gloves", "Sharkskin Gloves", "Heavy Bracers", "Battle Gauntlets",
    "War Gauntlets", "Bramble Mitts", "Vampirebone Gloves", "Vambraces",
    "Crusader Gauntlets", "Ogre Gauntlets",
]
future_belts = [
    "Sash", "Light Belt", "Belt", "Heavy Belt", "Plated Belt", "Demonhide Sash",
    "Sharkskin Belt", "Mesh Belt", "Battle Belt", "War Belt",
]
entries_by_slot["gloves"] = []
entries_by_slot["belt"] = []
headers["gloves"] = """# Gloves gear TODO

Future-slot/backburner design sheet for issue #83.

Gloves are **not currently a DiceBound runtime slot**. This file exists only so every gear reference has one slot-centric home. Adding a runtime Gloves slot still requires an explicit design/implementation decision."""
headers["belt"] = """# Belt gear TODO

Future-slot/backburner design sheet for issue #83.

Belts are **not currently a DiceBound runtime slot**. This file exists only so every gear reference has one slot-centric home. Adding a runtime Belt slot still requires an explicit design/implementation decision."""

for name in future_gloves:
    n = name.lower()
    family = "gauntlets" if "gauntlet" in n else "bracers" if "bracer" in n or "vambrace" in n else "gloves"
    weight = "heavy" if any(x in n for x in ("heavy", "battle", "war", "ogre", "crusader")) else "medium" if any(x in n for x in ("chain", "gauntlet", "bracer", "vambrace")) else "light"
    intrinsic = "+2 Defense"
    if "demonhide" in n:
        intrinsic = "+1 Defense, +1% Fire proc chance, +1% Dodge"
    elif "sharkskin" in n:
        intrinsic = "+1 Defense, +2% Dodge"
    elif "bramble" in n:
        intrinsic = "+1 Defense, +1 Thorns, +1% Nature proc chance"
    elif "vampirebone" in n:
        intrinsic = "+2 Defense, +1% Lifesteal"
    elif weight == "heavy":
        intrinsic = "+3 Defense, +1 Thorns"
    add("gloves", name, family, infer_material(name), weight, "future-slot, source-inspired, armour", "common+", intrinsic)

for name in future_belts:
    n = name.lower()
    weight = "heavy" if any(x in n for x in ("heavy", "battle", "war", "plated")) else "medium" if any(x in n for x in ("belt", "mesh")) else "light"
    intrinsic = "+5 HP"
    if "demonhide" in n:
        intrinsic = "+5 HP, +1% Fire proc chance"
    elif "sharkskin" in n:
        intrinsic = "+5 HP, +1% Dodge"
    elif "mesh" in n:
        intrinsic = "+1 Defense, +5 HP"
    elif "battle" in n or "war" in n:
        intrinsic = "+1 Attack, +1 Defense, +5 HP"
    add("belt", name, "belt", infer_material(name), weight, "future-slot, source-inspired, utility", "common+", intrinsic)

material_profiles = {
    "Bronze": ("bronze", "poor+", 0, []),
    "Iron": ("iron", "poor+", 0, []),
    "Steel": ("steel", "common+", 1, []),
    "Black": ("black-metal", "common+", 1, ["+1% Crit"]),
    "Mithril": ("mithril", "uncommon+", 2, ["+1% Dodge"]),
    "Adamant": ("adamant", "uncommon+", 3, ["+1 Defense"]),
    "Rune": ("rune-metal", "rare+", 4, ["+1 Luck"]),
    "Dragon": ("dragon-metal", "rare+", 5, ["+2% Crit"]),
    "Orikalkum": ("orikalkum", "rare+", 5, ["+2 Defense", "+1 Thorns"]),
    "Necronium": ("necronium", "epic+", 6, ["+2 Defense", "+1% Void proc chance"]),
    "Bane": ("bane-metal", "epic+", 7, ["+2 Thorns", "+5% Boss Damage"]),
    "Elder Rune": ("elder-rune", "legendary+", 8, ["+3 Defense", "+1 Luck"]),
    "Primal": ("primal-metal", "legendary+", 10, ["+5 HP", "-2% Dodge"]),
}
form_profiles = {
    "Dagger": ("dagger", "light", 1, ["+2% Crit", "+1% Dodge"]),
    "Shortsword": ("sword", "light", 2, ["+1% Crit"]),
    "Scimitar": ("scimitar", "light", 2, ["+2% Crit", "+1% Dodge"]),
    "Mace": ("mace", "medium", 2, ["+1 Thorns"]),
    "Longsword": ("sword", "medium", 2, []),
    "Battleaxe": ("battleaxe", "heavy", 3, ["-1% Dodge"]),
    "Warhammer": ("warhammer", "heavy", 3, ["+1 Thorns", "-1% Dodge"]),
    "Claws": ("claws", "light", 2, ["+2% Crit", "+1% Echo", "-1 Defense"]),
    "Two-Handed Sword": ("two-handed-sword", "very-heavy", 4, ["-1% Dodge"]),
    "Greatsword": ("greatsword", "very-heavy", 4, ["-2% Dodge"]),
    "Spear": ("spear", "medium", 2, ["+1% Crit"]),
    "Hasta": ("hasta", "light", 2, ["+2% Crit", "+1% Dodge"]),
    "Halberd": ("halberd", "heavy", 3, ["+1% Crit", "-1% Dodge"]),
    "Maul": ("maul", "very-heavy", 5, ["+1 Thorns", "-2% Dodge"]),
}


def material_weapon(material_name, form):
    material, eligibility, bonus, mat_extra = material_profiles[material_name]
    family, weight, base_attack, form_extra = form_profiles[form]
    name_form = "2H Sword" if form == "Two-Handed Sword" else form
    name = f"{material_name} {name_form}"
    values = [f"+{base_attack + bonus} Attack"] + form_extra + mat_extra
    add("weapon", name, family, material, weight, f"martial, material-tier, {family}", eligibility, ", ".join(dict.fromkeys(values)))


for mat in ["Bronze", "Iron", "Steel", "Black", "Mithril", "Adamant", "Rune", "Dragon"]:
    for form in ["Dagger", "Shortsword", "Scimitar", "Mace", "Longsword", "Battleaxe", "Warhammer", "Claws", "Two-Handed Sword", "Spear", "Hasta", "Halberd"]:
        material_weapon(mat, form)

for mat in ["Orikalkum", "Necronium", "Bane", "Elder Rune", "Primal"]:
    for form in ["Longsword", "Battleaxe", "Warhammer", "Greatsword", "Spear", "Halberd", "Maul"]:
        material_weapon(mat, form)

bow_rows = [
    ("Oak Shortbow", "poor+", "+2 Attack, +1% Crit"),
    ("Willow Shortbow", "common+", "+2 Attack, +2% Crit"),
    ("Maple Shortbow", "common+", "+3 Attack, +2% Crit"),
    ("Yew Shortbow", "uncommon+", "+4 Attack, +2% Crit, +1% Dodge"),
    ("Magic Shortbow", "rare+", "+5 Attack, +3% Crit, +1% Echo"),
    ("Elder Shortbow", "epic+", "+6 Attack, +4% Crit, +2% Echo"),
    ("Eternal Magic Shortbow", "legendary+", "+7 Attack, +4% Crit, +3% Echo, +1 Luck"),
    ("Masterwork Bow", "Mythical", "+9 Attack, +5% Crit, +3% Echo, +2 Luck"),
]
for name, elig, intrinsic in bow_rows:
    add("weapon", name, "shortbow", "wood", "light", "ranged, bow, source-inspired", elig, intrinsic)

shieldbows = [
    ("Shieldbow", "poor+", "+1 Attack, +1 Defense"),
    ("Oak Shieldbow", "poor+", "+1 Attack, +1 Defense"),
    ("Willow Shieldbow", "common+", "+2 Attack, +1 Defense, +3 HP"),
    ("Maple Shieldbow", "common+", "+2 Attack, +2 Defense"),
    ("Yew Shieldbow", "uncommon+", "+3 Attack, +2 Defense, +5 HP"),
    ("Magic Shieldbow", "rare+", "+4 Attack, +3 Defense, +1% Echo"),
    ("Elder Shieldbow", "epic+", "+5 Attack, +4 Defense, +8 HP, +1% Echo"),
]
for name, elig, intrinsic in shieldbows:
    add("weapon", name, "shieldbow", "wood", "medium", "ranged, bow, guardian, source-inspired", elig, intrinsic)

special_bows = [
    ("Willow Composite Bow", "composite-bow", "wood", "common+", "+3 Attack, +2% Crit, +1 Defense"),
    ("Yew Composite Bow", "composite-bow", "yew", "uncommon+", "+4 Attack, +3% Crit, +1 Defense"),
    ("Magic Composite Bow", "composite-bow", "magic-wood", "rare+", "+5 Attack, +3% Crit, +1% Echo, +1 Defense"),
    ("Ogre Composite Bow", "composite-bow", "wood, sinew", "uncommon+", "+5 Attack, +2% Crit, -1% Dodge"),
    ("Chargebow", "chargebow", "arcane", "rare+", "+5 Attack, +3% Echo"),
    ("Crystal Bow", "crystal-bow", "crystal", "rare+", "+6 Attack, +3% Crit, +2% Echo, +1% Light proc chance"),
    ("Dark Bow", "longbow", "darkwood", "epic+", "+8 Attack, +3% Crit, -2% Dodge"),
    ("Noxious Longbow", "longbow", "organic", "epic+", "+7 Attack, +3% Crit, +2% Nature proc chance"),
    ("Seren Godbow", "godbow", "divine-metal", "legendary+", "+9 Attack, +4% Crit, +2% Light proc chance, +2 Luck"),
    ("Bow of the Last Guardian", "godbow", "unknown", "Mythical", "+10 Attack, +5% Crit, +4% Echo, +2 Luck"),
]
for name, family, material, elig, intrinsic in special_bows:
    add("weapon", name, family, material, infer_weight(family, "", name), "ranged, source-inspired, prototype-reference", elig, intrinsic)

crossbow_materials = {
    "Crossbow": ("wood, steel", "poor+", 2),
    "Bronze Crossbow": ("bronze, wood", "poor+", 2),
    "Iron Crossbow": ("iron, wood", "poor+", 3),
    "Blurite Crossbow": ("blurite, wood", "common+", 3),
    "Steel Crossbow": ("steel, wood", "common+", 4),
    "Black Crossbow": ("black-metal, wood", "common+", 4),
    "Mithril Crossbow": ("mithril, wood", "uncommon+", 5),
    "Adamant Crossbow": ("adamant, wood", "uncommon+", 6),
    "Rune Crossbow": ("rune-metal, wood", "rare+", 7),
    "Dragon Crossbow": ("dragon-metal, wood", "rare+", 8),
    "Primal Crossbow": ("primal-metal, wood", "legendary+", 10),
}
for name, (material, elig, attack) in crossbow_materials.items():
    extras = "+2% Crit"
    if "Rune" in name:
        extras += ", +1 Luck"
    if "Dragon" in name:
        extras += ", +1% Echo"
    if "Primal" in name:
        extras += ", -2% Dodge"
    add("weapon", name, "crossbow", material, "medium", "ranged, crossbow, source-inspired", elig, f"+{attack} Attack, {extras}")

for material_name in ["Bronze", "Iron", "Blurite", "Steel", "Black", "Mithril", "Adamant", "Rune", "Dragon"]:
    base_name = f"{material_name} 2H Crossbow"
    material = infer_material(base_name) or material_name.lower()
    elig = {"Bronze":"poor+","Iron":"poor+","Blurite":"common+","Steel":"common+","Black":"common+","Mithril":"uncommon+","Adamant":"uncommon+","Rune":"rare+","Dragon":"rare+"}[material_name]
    attack = {"Bronze":4,"Iron":4,"Blurite":5,"Steel":5,"Black":5,"Mithril":6,"Adamant":7,"Rune":8,"Dragon":9}[material_name]
    add("weapon", base_name, "two-handed-crossbow", material, "very-heavy", "ranged, crossbow, source-inspired", elig, f"+{attack} Attack, +2% Crit, -1% Dodge")

iconic_crossbows = [
    ("Dorgeshuun Crossbow", "uncommon+", "+4 Attack, +3% Crit, +1% Dodge"),
    ("Zanik's Crossbow", "rare+", "+5 Attack, +3% Crit, +1% Echo"),
    ("Hunter's Crossbow", "uncommon+", "+4 Attack, +3% Crit, +1% Nature proc chance"),
    ("Demon Slayer Crossbow", "rare+", "+6 Attack, +3% Crit, +8% Boss Damage"),
    ("Karil's Pistol Crossbow", "rare+", "+5 Attack, +4% Crit, +2% Echo"),
    ("Armadyl Crossbow", "epic+", "+7 Attack, +4% Crit, +1% Light proc chance"),
    ("Chaotic Crossbow", "epic+", "+8 Attack, +3% Crit, +3% Echo, +1 Luck"),
    ("Royal Crossbow", "epic+", "+8 Attack, +4% Crit, +2 Defense"),
    ("Wyvern Crossbow", "epic+", "+7 Attack, +3% Crit, +1% Ice proc chance, +1% Nature proc chance"),
    ("Ascension Crossbow", "legendary+", "+9 Attack, +5% Crit, +4% Echo"),
    ("Blightbound Crossbow", "legendary+", "+9 Attack, +4% Crit, +2% Nature proc chance, +1% Void proc chance"),
    ("Eldritch Crossbow", "Mythical", "+11 Attack, +5% Crit, +3% Echo, +2% Void proc chance"),
]
for name, elig, intrinsic in iconic_crossbows:
    add("weapon", name, "crossbow", infer_material(name), "medium", "ranged, source-inspired, prototype-reference", elig, intrinsic)

for mat in ["Bronze", "Iron", "Steel", "Black", "Mithril", "Adamant", "Rune", "Dragon"]:
    material, elig, bonus, mat_extra = material_profiles[mat]
    forms = [
        ("Dart", "dart", "light", 1, ["+3% Crit", "+2% Echo"]),
        ("Throwing Knife", "throwing-knife", "light", 1, ["+3% Crit", "+1% Dodge"]),
        ("Throwing Axe", "throwing-axe", "light", 2, ["+2% Crit"]),
        ("Javelin", "javelin", "medium", 2, ["+2% Crit"]),
    ]
    for form, family, weight, base, extra in forms:
        values = [f"+{base + bonus} Attack"] + extra + mat_extra
        add("weapon", f"{mat} {form}", family, material, weight, "ranged, thrown, material-tier, source-inspired", elig, ", ".join(dict.fromkeys(values)))
add("weapon", "Explosive Chinchompa", "thrown-explosive", "organic", "light", "ranged, thrown, explosive, weird, source-inspired, prototype-reference", "rare+", "+5 Attack, +3% Echo, +1% Fire proc chance")
add("weapon", "Sagaie", "javelin", "wood, metal", "medium", "ranged, thrown, hunting, nature, source-inspired", "uncommon+", "+4 Attack, +3% Crit, +1% Nature proc chance")

basic_staves = [
    ("Staff", "", "poor+", "+5 Mana"),
    ("Magic Staff", "arcane-wood", "common+", "+7 Mana, +1% Echo"),
    ("Staff of Air", "arcane-wood", "common+", "+7 Mana, +1% Electric proc chance"),
    ("Staff of Water", "arcane-wood", "common+", "+7 Mana, +1% Ice proc chance"),
    ("Staff of Earth", "arcane-wood", "common+", "+7 Mana, +1 Defense, +1% Nature proc chance"),
    ("Staff of Fire", "arcane-wood", "common+", "+7 Mana, +1% Fire proc chance"),
]
for name, material, elig, intrinsic in basic_staves:
    add("weapon", name, "staff", material, "medium", "caster, staff, source-inspired", elig, intrinsic)

battle_elements = {
    "Air": "+1% Electric proc chance",
    "Water": "+1% Ice proc chance",
    "Earth": "+1% Nature proc chance",
    "Fire": "+1% Fire proc chance",
    "Mud": "+1% Nature proc chance, +1 Defense",
    "Lava": "+1% Fire proc chance, +1% Nature proc chance",
    "Steam": "+1% Fire proc chance, +1% Ice proc chance",
    "Smoke": "+1% Fire proc chance, +1% Void proc chance",
    "Mist": "+1% Ice proc chance, +1% Echo",
    "Dust": "+1% Nature proc chance, +1% Electric proc chance",
}
add("weapon", "Battlestaff", "battlestaff", "wood, metal", "medium", "caster, martial, staff, source-inspired", "common+", "+6 Mana, +2 Attack, +1 Defense")
for elem, proc in battle_elements.items():
    add("weapon", f"{elem} Battlestaff", "battlestaff", "wood, elemental-core", "medium", "caster, martial, elemental, staff, source-inspired", "uncommon+", f"+7 Mana, +2 Attack, {proc}")
    add("weapon", f"Mystic {elem} Staff", "mystic-staff", "mystic-wood", "medium", "caster, elemental, staff, source-inspired", "rare+", f"+10 Mana, +2% Echo, {proc}")
for elem in ["Air", "Water", "Earth", "Fire", "Mud", "Lava", "Steam"]:
    proc = battle_elements[elem]
    add("weapon", f"Staff of Limitless {elem}", "limitless-staff", "ancient-wood, elemental-core", "medium", "caster, elemental, staff, high-tier, source-inspired", "epic+", f"+14 Mana, +3% Echo, {proc}")

special_staves = [
    ("Ancient Staff", "rare+", "+10 Mana, +2% Echo, +1% Void proc chance"),
    ("Iban-style Staff", "rare+", "+10 Mana, +2% Crit, +1% Fire proc chance"),
    ("Armadyl Battlestaff", "epic+", "+12 Mana, +3 Attack, +2% Echo, +1% Light proc chance"),
    ("Camel Staff", "epic+", "+12 Mana, +1% Fire proc chance, +8% Potion Healing"),
    ("Polypore-style Staff", "epic+", "+12 Mana, +2% Nature proc chance, +2% Echo"),
    ("Chaotic Staff", "epic+", "+14 Mana, +4% Echo, +1 Luck"),
    ("Noxious Staff", "legendary+", "+15 Mana, +3% Crit, +2% Nature proc chance"),
    ("Staff of Sliske", "legendary+", "+16 Mana, +4% Echo, +2% Void proc chance"),
    ("Fractured Staff of Armadyl", "Mythical", "+20 Mana, +5% Echo, +2% Crit, +2% Light proc chance"),
]
for name, elig, intrinsic in special_staves:
    add("weapon", name, "staff", infer_material(name), "medium", "caster, staff, source-inspired, prototype-reference", elig, intrinsic)

wand_names = [
    "Wizard Wand", "Avernic Wand", "Imp Horn Wand", "Exquisite Wand", "Spider Wand",
    "Batwing Wand", "Splitbark Wand", "Mystic Wand", "Gravite Wand", "Grifolic Wand",
    "Crystal Wand", "Blisterwood Wand", "Abyssal Wand", "Virtus Wand",
    "Attuned Crystal Wand", "Seasinger Kiba", "Cywir-style Wand",
]
for idx, name in enumerate(wand_names):
    if idx < 5:
        elig, mana = "common+", 6 + idx
    elif idx < 11:
        elig, mana = "uncommon+", 9 + (idx - 5)
    elif idx < 15:
        elig, mana = "rare+", 12 + (idx - 11)
    else:
        elig, mana = "epic+", 15 + (idx - 15)
    extras = ["+2% Echo"]
    lname = name.lower()
    if "crystal" in lname:
        extras.append("+1% Light proc chance")
    if "abyssal" in lname:
        extras.append("+1% Void proc chance")
    if any(x in lname for x in ("spider", "blisterwood", "grifolic")):
        extras.append("+1% Nature proc chance")
    add("weapon", name, "wand", infer_material(name), "light", "caster, wand, source-inspired, prototype-reference", elig, f"+{mana} Mana, " + ", ".join(extras))

book_names = [
    "Wizard Book", "Avernic Book", "Imphide Book", "Batwing Book", "Tome of Frost",
    "Mages' Book", "Ahrim-style Book of Magic", "Virtus Book",
]
for idx, name in enumerate(book_names):
    elig = "common+" if idx < 3 else "uncommon+" if idx < 6 else "rare+"
    mana = 5 + idx
    extras = ["+1% Echo"]
    if "Frost" in name:
        extras.append("+1% Ice proc chance")
    add("offhand", name, "magic-book", "paper, leather", "light", "caster, book, source-inspired, prototype-reference", elig, f"+{mana} Mana, " + ", ".join(extras))

orb_names = [
    "Exquisite Orb", "Spider Orb", "Splitbark Orb", "Mystic Orb", "Gravite Orb",
    "Grifolic Orb", "Crystal Orb", "Blisterwood Orb", "Abyssal Orb",
    "Attuned Crystal Orb", "Seasinger Makigai",
]
for idx, name in enumerate(orb_names):
    elig = "common+" if idx < 3 else "uncommon+" if idx < 7 else "rare+"
    mana = 5 + idx
    extras = ["+2% Crit", "+1% Echo"]
    lname = name.lower()
    if "crystal" in lname:
        extras.append("+1% Light proc chance")
    if "abyssal" in lname:
        extras.append("+1% Void proc chance")
    if any(x in lname for x in ("spider", "blisterwood", "grifolic")):
        extras.append("+1% Nature proc chance")
    add("offhand", name, "orb", infer_material(name), "light", "caster, orb, source-inspired, prototype-reference", elig, f"+{mana} Mana, " + ", ".join(extras))

add("weapon", "Death Guard / Necrotic Siphon", "siphon", "bone, metal, necrotic", "medium", "necromancy, death, caster, prototype-reference", "rare+", "+10 Mana, +4 Attack, +1% Void proc chance")
add("offhand", "Skull Lantern / Necrotic Conduit", "conduit", "bone, metal, necrotic", "medium", "necromancy, death, summoning, prototype-reference", "rare+", "+10 Mana, +8% Pet Damage, +1% Echo, +1% Void proc chance")

iconic_melee = [
    ("Abyssal Whip", "whip", "epic+", "+7 Attack, +4% Echo, +2% Lifesteal"),
    ("Dragon Claws", "claws", "epic+", "+8 Attack, +5% Crit, +3% Echo"),
    ("Dragon Scimitar", "scimitar", "rare+", "+7 Attack, +4% Crit, +1% Dodge"),
    ("Dragon Dagger", "dagger", "rare+", "+6 Attack, +5% Crit, +1% Dodge"),
    ("Dragon Battleaxe", "battleaxe", "rare+", "+9 Attack, +2% Crit, -1% Dodge"),
    ("Dragon 2H Sword", "two-handed-sword", "epic+", "+10 Attack, +3% Crit, -2% Dodge"),
    ("Godsword Family", "godsword", "legendary+", "+12 Attack, +3 Defense, -2% Dodge"),
    ("Chaotic Rapier", "rapier", "epic+", "+8 Attack, +5% Crit, +2% Echo"),
    ("Chaotic Longsword", "sword", "epic+", "+9 Attack, +3% Crit, +2% Echo"),
    ("Chaotic Maul", "maul", "epic+", "+11 Attack, +3 Thorns, -2% Dodge"),
    ("Drygore Longsword", "sword", "legendary+", "+10 Attack, +4% Crit, +2% Echo"),
    ("Drygore Mace", "mace", "legendary+", "+10 Attack, +3% Crit, +2 Thorns"),
    ("Drygore Rapier", "rapier", "legendary+", "+10 Attack, +5% Crit, +2% Dodge"),
    ("Noxious Scythe", "scythe", "legendary+", "+11 Attack, +3% Lifesteal, +2% Nature proc chance"),
    ("Zaros Godsword", "godsword", "Mythical", "+13 Attack, +4 Defense, +2% Void proc chance"),
    ("Masterwork Spear", "spear", "Mythical", "+12 Attack, +5% Crit, +3 Defense"),
    ("Leng-style Swords", "paired-swords", "Mythical", "+11 Attack, +5% Crit, +4% Echo, +1% Ice proc chance"),
    ("Ek-ZekKil-style Colossal Sword", "colossal-sword", "Mythical", "+15 Attack, +3 Thorns, -3% Dodge"),
]
for name, family, elig, intrinsic in iconic_melee:
    add("weapon", name, family, infer_material(name), infer_weight(family, "", name), "martial, high-tier, source-inspired, prototype-reference", elig, intrinsic)

oddity = (GEAR / "runescape-quest-fun-oddity-weapons.md").read_text(encoding="utf-8")
oddity_segment = oddity[oddity.index("# 1.") : oddity.index("# 7.")]


def oddity_fields(name: str, slot: str):
    n = name.lower()
    material = infer_material(name)
    family = "improvised"
    weight = "light"
    tags = ["weird", "source-inspired", "prototype-reference"]
    elig = "common+"
    intrinsic = "+1 Attack, +1 Luck" if slot == "weapon" else "+1 Defense, +1 Luck"

    if any(x in n for x in ("flower", "trollweiss")):
        family, material, weight = "flowers", "plant", "light"
        tags += ["nature"]
        intrinsic = "+1% Nature proc chance, +2% Dodge"
        elig = "poor+"
    elif "balloon" in n:
        family, material, weight = "balloon", "rubber", "light"
        tags += ["toy", "festival"]
        intrinsic = "+3% Dodge, +2% Echo, +1 Luck"
    elif "banner" in n or "flag" in n:
        family, material, weight = "banner", "cloth, wood", "light"
        tags += ["ceremonial"]
        intrinsic = "+1 Luck, +4% Gold Gain"
    elif "trophy" in n:
        family, material, weight = "trophy", infer_material(name) or "metal", "medium"
        tags += ["ceremonial", "achievement"]
        if "diamond" in n:
            elig, intrinsic = "epic+", "+4 Luck, +10% Gold Gain, +2% Echo"
        elif "platinum" in n:
            elig, intrinsic = "rare+", "+3 Luck, +8% Gold Gain, +1% Echo"
        elif "gold" in n:
            elig, intrinsic = "uncommon+", "+2 Luck, +6% Gold Gain"
        elif "silver" in n:
            elig, intrinsic = "common+", "+1 Luck, +4% Gold Gain"
        else:
            elig, intrinsic = "poor+", "+1 Luck, +2% Gold Gain"
    elif any(x in n for x in ("carrot", "banana", "egg", "cake", "dinner", "pretzel", "baguette")):
        family, weight = "food-weapon", "light"
        tags += ["food"]
        intrinsic = "+2 Attack, +5 HP, +1% Donut proc chance"
        if "carrot" in n or "banana" in n:
            intrinsic = "+1 Attack, +5 HP, +1% Nature proc chance, +1 Luck"
    elif any(x in n for x in ("chicken", "turkey")):
        family, material, weight = "improvised", material or "organic", "light"
        tags += ["bird"]
        intrinsic = "+2 Attack, +2% Echo"
    elif any(x in n for x in ("frying pan", "rolling pin", "meat tenderiser", "hammer", "anchor", "boulder")):
        family = "blunt"
        material = material or ("metal" if "pan" in n or "hammer" in n or "anchor" in n else "wood")
        weight = "very-heavy" if any(x in n for x in ("anchor", "boulder", "giant")) else "heavy"
        tags += ["blunt"]
        intrinsic = "+5 Attack, +2 Thorns, -1% Dodge"
        if "rolling pin" in n:
            intrinsic = "+3 Attack, +1 Thorns, +1% Donut proc chance"
    elif any(x in n for x in ("staff", "sceptre", "scepter", "rod")):
        family, weight = "staff", "medium"
        tags += ["caster"]
        intrinsic = "+8 Mana, +2% Echo"
        if "ancient" in n or "corrupted" in n:
            intrinsic += ", +1% Void proc chance"
        if "lunar" in n or "crystal" in n:
            intrinsic += ", +1% Light proc chance"
    elif "crossbow" in n:
        family, weight = "crossbow", "medium"
        tags += ["ranged"]
        intrinsic = "+5 Attack, +3% Crit"
    elif "bow" in n:
        family, weight = "bow", "light"
        tags += ["ranged"]
        intrinsic = "+4 Attack, +3% Crit"
    elif any(x in n for x in ("dagger", "knife", "sword", "rapier", "cutlass", "sabre", "blade", "excalibur", "darklight", "silverlight", "balmung", "keris", "khopesh")):
        family, material, weight = "blade", material or "steel", "light" if any(x in n for x in ("dagger", "knife", "rapier")) else "medium"
        tags += ["martial"]
        intrinsic = "+4 Attack, +3% Crit"
    elif any(x in n for x in ("mace", "flail", "club", "axe", "scythe", "nunchaku", "kzaj", "kyzaj")):
        family, material, weight = "martial-oddity", material or "metal", "heavy"
        tags += ["martial"]
        intrinsic = "+5 Attack, +1 Thorns, +1% Crit"
    elif any(x in n for x in ("secateurs", "cattleprod", "net", "spade", "magnifying glass", "crier bell", "rat pole")):
        family, weight = "tool", "medium"
        tags += ["tool"]
        intrinsic = "+2 Attack, +1 Luck"
        if "secateurs" in n:
            intrinsic = "+2 Attack, +1% Nature proc chance, +5% Potion Healing"
        elif "cattleprod" in n:
            intrinsic = "+3 Attack, +2% Electric proc chance"
        elif "net" in n:
            intrinsic = "+1 Attack, +2% Dodge, +1 Luck"
        elif "spade" in n:
            intrinsic = "+4 Attack, +1 Thorns"
        elif "rat pole" in n:
            intrinsic = "+3 Attack, +1% Nature proc chance, +5% Pet Damage"
    elif any(x in n for x in ("lantern", "pumpkin", "jack-o", "zombie head", "severed leg")):
        family, weight = "macabre-prop", "medium"
        tags += ["occult"]
        intrinsic = "+3 Attack, +5 HP, +1% Void proc chance"
    elif any(x in n for x in ("rubber", "mouse toy", "yo-yo", "marionette", "plush", "war ship", "skis")):
        family, weight = "toy", "light"
        tags += ["toy"]
        intrinsic = "+1 Attack, +2% Echo, +2% Dodge"
    elif "crate" in n:
        family, material, weight = "crate", "wood", "very-heavy"
        intrinsic = "+4 Attack, +3 Defense, -2% Dodge"
        if "books" in n:
            intrinsic += ", +6 Mana"

    if "quest" in n or any(x in n for x in ("silverlight", "darklight", "excalibur", "balmung", "ivandis", "sunspear", "vanquish")):
        tags.append("quest")
        elig = "rare+"
    if "holiday" in n or any(x in n for x in ("christmas", "easter", "birthday", "festiv", "oktober")):
        tags.append("holiday")
    if "legendary" in n:
        elig = "legendary+"
    return family, material, weight, ", ".join(dict.fromkeys(tags)), elig, intrinsic


for line in oddity_segment.splitlines():
    line = line.strip()
    if not line.startswith("- "):
        continue
    raw = line[2:].strip().rstrip(".")
    slot = "offhand" if "off-hand" in raw.lower() or "offhand" in raw.lower() else "weapon"
    family, material, weight, tags, elig, intrinsic = oddity_fields(raw, slot)
    add(slot, raw, family, material, weight, tags, elig, intrinsic)

for slot, path in SLOT_PATHS.items():
    path.write_text(render_slot(headers[slot], entries_by_slot[slot]), encoding="utf-8")

for slot in ("gloves", "belt"):
    path = GEAR / f"{slot}.md"
    path.write_text(render_slot(headers[slot], entries_by_slot[slot]), encoding="utf-8")

readme = (GEAR / "README.md").read_text(encoding="utf-8")
start = readme.index("## Catalogue structure")
end = readme.index("## Fields")
catalogue = """## Catalogue structure

The slot files are now the **single pending-candidate source of truth**:

- `weapon.md` — every pending Weapon reference/candidate in one editable list;
- `offhand.md` — every pending Offhand reference/candidate;
- `chest.md`, `boots.md`, `legs.md`, `hat.md`, `ring.md`, `amulet.md` — the corresponding pending slot catalogues;
- `gloves.md` and `belt.md` — preserved future-slot/backburner candidates only; these files do **not** mean those runtime slots are approved;
- `created-gear.md` — gear whose first modular art asset already exists.

The former `source-inspired-loot-expansion.md`, `runescape-weapon-expansion.md`, and `runescape-quest-fun-oddity-weapons.md` pools were consolidated into the appropriate slot files. There should no longer be a second hidden reference catalogue to check before choosing art.

When art is created and accepted for a pending item, move that item **out of its slot file** and into `created-gear.md`, preserving/refining its metadata and recording the intended runtime asset path.

`runescape-reference-policy.md` still records the deliberately broad inspiration policy. Source-specific names remain prototype/reference language and should be renamed/originalized under #93 before a public/commercial release where appropriate.

"""
readme = readme[:start] + catalogue + readme[end:]
(GEAR / "README.md").write_text(readme, encoding="utf-8")

policy = """# RuneScape/source reference policy

DiceBound's slot TODO files intentionally keep a **broad, uncurated inspiration pool** alongside original candidate gear.

Keep candidates even when they are quest-only, joke/fun weapons, holiday/event rewards, discontinued, obsolete, mechanically useless, ceremonial, toys/props, tools that happen to be wieldable, banners/trophies, or strange one-off forms. Those are often excellent DiceBound ideas.

The important catalogue rule is now:

> **One pending slot = one file.**

A weapon reference belongs in `weapon.md`; an offhand belongs in `offhand.md`; armour goes in its corresponding slot file. There is no separate RuneScape/source expansion pool to remember to search.

Every pending candidate receives the same first-pass metadata fields as the rest of the catalogue (`family`, `material`, `weight`, `tags`, `eligibility`, `intrinsic`). Axel's later item-specific edits always override these first-pass suggestions.

Once art is created and accepted, move the item out of the pending slot file and into `created-gear.md`.

Source-specific names remain prototype/reference language and should be reviewed under #93 before any public/commercial release.
"""
(GEAR / "runescape-reference-policy.md").write_text(policy, encoding="utf-8")

for obsolete in (
    "source-inspired-loot-expansion.md",
    "runescape-weapon-expansion.md",
    "runescape-quest-fun-oddity-weapons.md",
):
    (GEAR / obsolete).unlink()

created = created_names()
total = 0
seen = set()
for slot in list(SLOT_PATHS) + ["gloves", "belt"]:
    path = GEAR / f"{slot}.md"
    _, parsed = parse_slot(path)
    if not parsed:
        raise SystemExit(f"{path} has no entries after consolidation")
    for e in parsed:
        total += 1
        if any(f not in e or e[f] is None for f in FIELDS):
            raise SystemExit(f"{path}: incomplete metadata for {e['name']}")
        k = key(e["name"])
        if k in created:
            raise SystemExit(f"{path}: created gear leaked back into pending list: {e['name']}")
        if k in seen:
            raise SystemExit(f"duplicate pending identity after consolidation: {e['name']}")
        seen.add(k)

for obsolete in (
    "source-inspired-loot-expansion.md",
    "runescape-weapon-expansion.md",
    "runescape-quest-fun-oddity-weapons.md",
):
    if (GEAR / obsolete).exists():
        raise SystemExit(f"obsolete source pool still exists: {obsolete}")

print(f"Consolidated geartodo: {total} pending identities across {len(SLOT_PATHS)+2} slot files.")
for slot in list(SLOT_PATHS) + ["gloves", "belt"]:
    _, parsed = parse_slot(GEAR / f"{slot}.md")
    print(f"  {slot}: {len(parsed)}")
