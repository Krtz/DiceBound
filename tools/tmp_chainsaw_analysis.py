from __future__ import annotations

import collections
import re

from audit_monolith_shadow_ownership import ROOT, RUNTIME, MONOLITH, mask_non_code, brace_depths, top_level_function_names

FUNC_RE = re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{")


def line_no(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def main() -> int:
    text = MONOLITH.read_text(encoding="utf-8")
    code = mask_non_code(text)
    depths = brace_depths(code)
    source_lines = text.splitlines()

    monolith_defs: dict[str, list[tuple[int, int]]] = collections.defaultdict(list)
    for match in FUNC_RE.finditer(code):
        # Runtime files are IIFEs; depth 1 is module-level implementation.
        if depths[match.start()] == 1:
            monolith_defs[match.group(1)].append((match.start(), line_no(text, match.start())))

    module_sources: dict[str, list[str]] = collections.defaultdict(list)
    for path in sorted(RUNTIME.rglob("*.js")):
        if path == MONOLITH:
            continue
        for name in top_level_function_names(path):
            module_sources[name].append(path.relative_to(ROOT).as_posix())

    collisions = sorted(name for name in monolith_defs if name in module_sources)
    print(f"CHAINSAW_COLLISIONS {len(collisions)}")
    for name in collisions:
        occurrences = list(re.finditer(rf"\b{re.escape(name)}\b", code))
        refs = max(0, len(occurrences) - len(monolith_defs[name]))
        print(f"\n{name} | defs={len(monolith_defs[name])} | refs~{refs}")
        print("modules: " + ", ".join(module_sources[name]))
        for _, line in monolith_defs[name]:
            first = max(1, line)
            last = min(len(source_lines), line + 7)
            preview = " ".join(part.strip() for part in source_lines[first - 1:last] if part.strip())
            ownerish = sorted(set(re.findall(r"\b(db[A-Z][A-Za-z0-9_$]*|window\.Dicebound[A-Za-z0-9_$]+|Dicebound[A-Za-z0-9_$]+)\b", preview)))
            print(f"line {line}: {preview[:1000]}")
            if ownerish:
                print("owner refs: " + ", ".join(ownerish))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
