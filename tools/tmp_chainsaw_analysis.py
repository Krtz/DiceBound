from __future__ import annotations

import collections
import pathlib
import re

from audit_monolith_shadow_ownership import ROOT, RUNTIME, MONOLITH, mask_non_code, brace_depths, top_level_function_names

IDENT_RE = re.compile(r"\b([A-Za-z_$][\w$]*)\b")
FUNC_RE = re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{")


def line_no(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def find_matching_brace(code: str, open_pos: int) -> int:
    depth = 0
    for i in range(open_pos, len(code)):
        ch = code[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
    raise RuntimeError(f"unbalanced brace at {open_pos}")


def function_spans(text: str) -> dict[str, list[tuple[int, int, int, int, str]]]:
    code = mask_non_code(text)
    depths = brace_depths(code)
    out: dict[str, list[tuple[int, int, int, int, str]]] = collections.defaultdict(list)
    for m in FUNC_RE.finditer(code):
        if depths[m.start()] != 1:
            continue
        open_pos = code.find("{", m.start(), m.end() + 1)
        end_brace = find_matching_brace(code, open_pos)
        end = end_brace + 1
        out[m.group(1)].append((m.start(), end, line_no(text, m.start()), line_no(text, end), text[m.start():end]))
    return out


def main() -> int:
    text = MONOLITH.read_text(encoding="utf-8")
    code = mask_non_code(text)
    spans = function_spans(text)

    module_sources: dict[str, list[str]] = collections.defaultdict(list)
    for path in sorted(RUNTIME.rglob("*.js")):
        if path == MONOLITH:
            continue
        for name in top_level_function_names(path):
            module_sources[name].append(path.relative_to(ROOT).as_posix())

    collisions = sorted(name for name in spans if name in module_sources)
    print(f"CHAINSAW_COLLISIONS {len(collisions)}")
    for name in collisions:
        occurrences = [m.start() for m in re.finditer(rf"\b{re.escape(name)}\b", code)]
        defs = spans[name]
        def_positions = {start for start, *_ in defs}
        # Approximate ordinary references: all identifier hits minus one name hit per declaration.
        refs = max(0, len(occurrences) - len(defs))
        for idx, (start, end, first, last, body) in enumerate(defs, 1):
            compact = re.sub(r"\s+", " ", body).strip()
            ownerish = sorted(set(re.findall(r"\b(db[A-Z][A-Za-z0-9_$]*|window\.Dicebound[A-Za-z0-9_$]+|Dicebound[A-Za-z0-9_$]+)\b", body)))
            thin = (last - first <= 3 or len(compact) <= 260) and bool(ownerish)
            preview = compact[:500]
            print(f"\n{name} | def {idx}/{len(defs)} | lines {first}-{last} | refs~{refs} | thin={thin}")
            print("modules: " + ", ".join(module_sources[name]))
            if ownerish:
                print("owner refs: " + ", ".join(ownerish))
            print("body: " + preview)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
