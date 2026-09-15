from __future__ import annotations

import argparse
import collections
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime" / "js"
MONOLITH = RUNTIME / "dicebound.js"

FUNCTION_DECL_RE = re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\(")
FUNCTION_ASSIGN_RE = re.compile(
    r"(?:(?:const|let|var)\s+)?(?<![.\w$])([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)"
)
READONLY_DECL_RE = re.compile(r"\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*db317Readonly\s*\(")
ID_RE = re.compile(r"(?:\bid\b|[\"']id[\"'])\s*:\s*[\"']([^\"']+)[\"']")
MUTATORS = ("push", "pop", "shift", "unshift", "splice", "sort", "reverse", "copyWithin", "fill")

OWNER_MAP = {
    "CLASSES": ("DiceboundClasses", "runtime/js/classes/registry.js"),
    "PETS": ("DiceboundPets", "runtime/js/pets/registry.js"),
    "upgrades": ("DiceboundPowerups", "runtime/js/powerups/registry.js"),
    "talents": ("DiceboundProgression", "runtime/js/progression/talents.js"),
    "enemyPool": ("DiceboundCombat", "runtime/js/combat/enemies.js"),
    "rarityInfo": ("DiceboundItems", "runtime/js/items/rarities.js"),
    "rarityValues": ("DiceboundItems", "runtime/js/items/rarities.js"),
    "CLASS_TAGS": ("DiceboundClasses", "runtime/js/classes/registry.js"),
    "CLASS_PASSIVES": ("DiceboundClasses", "runtime/js/classes/registry.js"),
    "BOARD_REGISTRY": ("DiceboundRun", "runtime/js/board/registry.js"),
    "ENEMY_REGISTRY": ("DiceboundCombat", "runtime/js/combat/enemies.js"),
    "EQUIPMENT_REGISTRY": ("DiceboundItems", "runtime/js/items/equipment.js"),
    "ACHIEVEMENT_REGISTRY": ("DiceboundProgression", "runtime/js/progression/achievements.js"),
    "CLASS_TAG_VOCABULARY": ("DiceboundClasses", "runtime/js/classes/registry.js"),
    "CLASS_UNLOCK_REGISTRY": ("DiceboundClasses", "runtime/js/classes/registry.js"),
    "CLASS_MECHANICS_REGISTRY": ("DiceboundClasses", "runtime/js/classes/registry.js"),
    "MECHANIC_TAG_VOCABULARY": ("DiceboundClasses", "runtime/js/classes/registry.js"),
    "POWERUP_MECHANICS_REGISTRY": ("DiceboundPowerups", "runtime/js/powerups/registry.js"),
}


def mask_non_code(text: str) -> str:
    chars = list(text)
    out = list(text)
    state = "code"
    quote = ""
    escaped = False
    i = 0
    while i < len(chars):
        ch = chars[i]
        nxt = chars[i + 1] if i + 1 < len(chars) else ""
        if state == "line":
            if ch == "\n":
                state = "code"
            else:
                out[i] = " "
            i += 1
            continue
        if state == "block":
            if ch == "*" and nxt == "/":
                out[i] = out[i + 1] = " "
                state = "code"
                i += 2
                continue
            if ch != "\n":
                out[i] = " "
            i += 1
            continue
        if state == "string":
            if ch != "\n":
                out[i] = " "
            if escaped:
                escaped = False
                i += 1
                continue
            if ch == "\\":
                escaped = True
                i += 1
                continue
            if ch == quote:
                state = "code"
                quote = ""
            i += 1
            continue
        if ch == "/" and nxt == "/":
            out[i] = out[i + 1] = " "
            state = "line"
            i += 2
            continue
        if ch == "/" and nxt == "*":
            out[i] = out[i + 1] = " "
            state = "block"
            i += 2
            continue
        if ch in ('"', "'", "`"):
            out[i] = " "
            state = "string"
            quote = ch
            i += 1
            continue
        i += 1
    return "".join(out)


def brace_depths(code: str) -> list[int]:
    depths = [0] * (len(code) + 1)
    depth = 0
    for index, ch in enumerate(code):
        depths[index] = depth
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)
    depths[len(code)] = depth
    return depths


def line_no(text: str, position: int) -> int:
    return text.count("\n", 0, position) + 1


def line_span(text: str, position: int) -> tuple[int, int]:
    start = text.rfind("\n", 0, position) + 1
    end = text.find("\n", position)
    if end < 0:
        end = len(text)
    return start, end


def extract_call(text: str, code: str, opening_paren: int) -> tuple[int, str]:
    depth = 0
    for index in range(opening_paren, len(code)):
        ch = code[index]
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                end = index + 1
                while end < len(code) and code[end].isspace() and code[end] != "\n":
                    end += 1
                if end < len(code) and code[end] == ";":
                    end += 1
                return end, text[opening_paren:end]
    raise RuntimeError(f"Unbalanced call starting at offset {opening_paren}")


def merge_spans(spans: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not spans:
        return []
    spans = sorted(spans)
    merged = [spans[0]]
    for start, end in spans[1:]:
        prev_start, prev_end = merged[-1]
        if start <= prev_end:
            merged[-1] = (prev_start, max(prev_end, end))
        else:
            merged.append((start, end))
    return merged


def top_level_function_names(path: pathlib.Path) -> set[str]:
    text = path.read_text(encoding="utf-8")
    code = mask_non_code(text)
    depths = brace_depths(code)
    names: set[str] = set()
    for regex in (FUNCTION_DECL_RE, FUNCTION_ASSIGN_RE):
        for match in regex.finditer(code):
            # Runtime files are IIFEs; depth 1 is module-level implementation.
            if depths[match.start()] == 1:
                names.add(match.group(1))
    return names


def readonly_mutations(text: str, code: str) -> tuple[list[str], list[dict[str, object]]]:
    declarations = {m.group(1): m.end() for m in READONLY_DECL_RE.finditer(code)}
    findings: list[dict[str, object]] = []
    seen: set[tuple[str, int, str]] = set()

    def add(var: str, start: int, end: int, operation: str, snippet: str) -> None:
        key = (var, start, operation)
        if key in seen:
            return
        seen.add(key)
        findings.append({
            "var": var,
            "start": start,
            "end": end,
            "line": line_no(text, start),
            "operation": operation,
            "ids": sorted(set(ID_RE.findall(snippet))),
        })

    for var, declared_at in declarations.items():
        escaped = re.escape(var)
        # Root/nested Object.assign writes are swallowed by the proxy set trap.
        for match in re.finditer(rf"\bObject\.assign\s*\(\s*{escaped}(?=[.\[])|\bObject\.assign\s*\(\s*{escaped}\s*,", code[declared_at:]):
            start = declared_at + match.start()
            opening = code.find("(", start)
            end, snippet = extract_call(text, code, opening)
            add(var, start, end, "Object.assign", snippet)

        # Array mutators are explicitly replaced with no-op implementations by db317Readonly.
        mutator_alt = "|".join(map(re.escape, MUTATORS))
        for match in re.finditer(rf"\b{escaped}(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*\.({mutator_alt})\s*\(", code[declared_at:]):
            start = declared_at + match.start()
            opening = code.find("(", start)
            end, snippet = extract_call(text, code, opening)
            add(var, start, end, f".{match.group(1)}()", snippet)

        # Direct nested property assignment/deletion is swallowed by proxy traps.
        direct_re = re.compile(rf"\b{escaped}(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+\s*=(?!=)")
        for match in direct_re.finditer(code, declared_at):
            start, end = line_span(text, match.start())
            add(var, start, end, "property assignment", text[start:end])
        delete_re = re.compile(rf"\bdelete\s+{escaped}(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+")
        for match in delete_re.finditer(code, declared_at):
            start, end = line_span(text, match.start())
            add(var, start, end, "delete", text[start:end])

    findings.sort(key=lambda row: int(row["start"]))
    return sorted(declarations), findings


def canonical_id_presence(var: str, ids: list[str]) -> tuple[int, int]:
    owner = OWNER_MAP.get(var)
    if not owner or not ids:
        return 0, len(ids)
    canonical_path = ROOT / owner[1]
    if not canonical_path.exists():
        return 0, len(ids)
    canonical = canonical_path.read_text(encoding="utf-8")
    found = 0
    for ident in ids:
        if re.search(rf"(?:\bid\b|[\"']id[\"'])\s*:\s*[\"']{re.escape(ident)}[\"']", canonical):
            found += 1
    return found, len(ids)


def element_audit(monolith_text: str) -> dict[str, object]:
    js_files = sorted(RUNTIME.rglob("*.js"))
    declarations = []
    signature_files = []
    consumers = []
    for path in js_files:
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT).as_posix()
        if re.search(r"\b(?:const|let|var)\s+ELEMENTS\s*=", text):
            declarations.append(rel)
        if all(token in text for token in ("Healing Rain of Donuts", "Caffeinated Haste", "Hard Rock Metal Music")):
            signature_files.append(rel)
        if path != MONOLITH and "getElements" in text:
            consumers.append(rel)
    refs = [index + 1 for index, line in enumerate(monolith_text.splitlines()) if re.search(r"\bELEMENTS\b", line)]
    return {
        "declarations": declarations,
        "signature_files": signature_files,
        "consumers": consumers,
        "monolith_refs": refs,
    }


def render() -> str:
    monolith_text = MONOLITH.read_text(encoding="utf-8")
    monolith_code = mask_non_code(monolith_text)
    readonly_vars, findings = readonly_mutations(monolith_text, monolith_code)

    spans = merge_spans([(int(row["start"]), int(row["end"])) for row in findings])
    dead_bytes = sum(end - start for start, end in spans)
    dead_lines: set[int] = set()
    for start, end in spans:
        first = line_no(monolith_text, start)
        last = line_no(monolith_text, end)
        dead_lines.update(range(first, last + 1))

    module_name_sources: dict[str, list[str]] = collections.defaultdict(list)
    for path in sorted(RUNTIME.rglob("*.js")):
        if path == MONOLITH:
            continue
        for name in top_level_function_names(path):
            module_name_sources[name].append(path.relative_to(ROOT).as_posix())
    monolith_names = top_level_function_names(MONOLITH)
    collisions = sorted((name, module_name_sources[name]) for name in monolith_names if name in module_name_sources)

    by_var: dict[str, list[dict[str, object]]] = collections.defaultdict(list)
    for row in findings:
        by_var[str(row["var"])].append(row)

    element = element_audit(monolith_text)

    lines = [
        "# Monolith shadow-ownership and runtime-dead-content audit",
        "",
        "Generated deterministically by `tools/audit_monolith_shadow_ownership.py` from the current runtime source. This is an **audit checkpoint**, not permission to delete every hit mechanically.",
        "",
        "## Executive result",
        "",
        f"- `runtime/js/dicebound.js`: **{monolith_text.count(chr(10)) + 1:,} lines / {len(monolith_text.encode('utf-8')):,} UTF-8 bytes**.",
        f"- DB317 read-only proxy views discovered: **{len(readonly_vars)}**.",
        f"- Guaranteed no-op mutation statements/calls against those proxy views: **{len(findings)}**.",
        f"- Approximate source footprint covered by those guaranteed no-op writes: **{len(dead_lines):,} physical lines / {dead_bytes:,} characters** (merged statement spans; comments between statements are not counted).",
        f"- Exact-name module-level function collisions between the monolith and extracted modules: **{len(collisions)}**. These are **manual-review shadow candidates**, not automatic proof of duplicate behavior.",
        "",
        "The DB317 result is stronger than a naming heuristic: `db317Readonly()` explicitly replaces array mutators with no-ops and swallows `set`, `defineProperty` and `deleteProperty`. Therefore later historical writes against these views cannot change the canonical registries used by the shipped game.",
        "",
        "## Guaranteed runtime no-ops against extracted registries",
        "",
        "| Proxy view | Current owner | Canonical module | No-op writes | IDs visible in writes | IDs also present in canonical module |",
        "| --- | --- | --- | ---: | ---: | ---: |",
    ]
    for var in readonly_vars:
        rows = by_var.get(var, [])
        if not rows:
            continue
        ids = sorted({ident for row in rows for ident in row["ids"]})
        found, total = canonical_id_presence(var, ids)
        owner, module = OWNER_MAP.get(var, ("manual review", "manual review"))
        lines.append(f"| `{var}` | {owner} | `{module}` | {len(rows)} | {len(ids)} | {found}/{total} |")

    lines.extend([
        "",
        "### No-op mutation locations",
        "",
        "| Line | Proxy | Operation | Canonical owner | IDs sampled from statement/block |",
        "| ---: | --- | --- | --- | --- |",
    ])
    for row in findings:
        var = str(row["var"])
        owner = OWNER_MAP.get(var, ("manual review", ""))[0]
        ids = list(row["ids"])
        sample = ", ".join(f"`{value}`" for value in ids[:8])
        if len(ids) > 8:
            sample += f", … +{len(ids) - 8}"
        lines.append(f"| {row['line']} | `{var}` | {row['operation']} | {owner} | {sample or '-'} |")

    lines.extend([
        "",
        "## The two reported examples",
        "",
        "### `ELEMENTS`",
        "",
        f"- Declaration files: {', '.join(f'`{value}`' for value in element['declarations']) or 'none'}.",
        f"- Files containing the distinctive full-table spell signature: {', '.join(f'`{value}`' for value in element['signature_files']) or 'none'}.",
        f"- Extracted modules that explicitly consume an injected `getElements` dependency: {', '.join(f'`{value}`' for value in element['consumers']) or 'none'}.",
        f"- Monolith references to `ELEMENTS`: {', '.join(map(str, element['monolith_refs']))}.",
        "",
        "**Classification:** live but misowned content, not a DB317 no-op. The element metadata table is still declared only in the Composition / Bootstrap / Tooling root and is injected into extracted mechanics. It should move to a focused element-content module under an existing owner (most naturally Combat) in a later cleanup, without creating a thirteenth public facade.",
        "",
        "### Historical class/powerup expansion blocks",
        "",
        "**Classification:** guaranteed runtime-dead compatibility content when the writes target `CLASSES`, `upgrades`, or another DB317 read-only proxy. The canonical registries are created first from extracted modules; later patch-era `Object.assign(...)`, `.push(...)`, and property assignments are swallowed by the proxy. Their presence in source can therefore be misleading even when the text contains obsolete stats/descriptions.",
        "",
        "This explains why old definitions can visibly disagree with the shipped values: the extracted registry is authoritative and the later monolith write never lands.",
        "",
        "## Exact-name shadow candidates",
        "",
        "These require manual semantic comparison. A matching function name is useful evidence, but unlike DB317 no-op writes it is not enough by itself to delete code.",
        "",
        "| Function | Extracted module(s) with same module-level name |",
        "| --- | --- |",
    ])
    for name, sources in collisions:
        lines.append(f"| `{name}` | {', '.join(f'`{source}`' for source in sources)} |")
    if not collisions:
        lines.append("| - | - |")

    lines.extend([
        "",
        "## Cleanup order for a future implementation checkpoint",
        "",
        "1. Remove only the **guaranteed DB317 no-op blocks** after anti-return/registry tests prove the extracted registries remain exact.",
        "2. Move **live-but-misowned content** such as `ELEMENTS` into a focused module under an existing subsystem owner, then route composition through it.",
        "3. Audit exact-name function collisions one responsibility at a time; compare final call routing and behavior before deleting any monolith implementation.",
        "4. Keep legitimate configure/bootstrap adapters in `dicebound.js`; composition glue is allowed when it does not duplicate domain implementation.",
        "",
        "No cleanup is performed by this audit.",
        "",
    ])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit DiceBound monolith shadow ownership and guaranteed runtime-dead registry writes.")
    parser.add_argument("--markdown", type=pathlib.Path, default=ROOT / "docs" / "MONOLITH_SHADOW_AUDIT.md")
    args = parser.parse_args()
    report = render()
    path = args.markdown if args.markdown.is_absolute() else ROOT / args.markdown
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(report, encoding="utf-8", newline="\n")
    print(report)
    print(f"\nMonolith shadow audit written to {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
