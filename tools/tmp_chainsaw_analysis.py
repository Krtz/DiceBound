from __future__ import annotations

# Temporary same-name collision probe for the 0.6.7.0 chainsaw pass.  Keep this
# file until the materialized checkpoint survives the full runtime/oracle gate.
import collections
import re

from audit_monolith_shadow_ownership import ROOT, RUNTIME, MONOLITH, mask_non_code, brace_depths, top_level_function_names

FUNC_RE = re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{")


def line_no(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def safe(text: str) -> str:
    return text.encode("unicode_escape").decode("ascii")


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
        refs = len(re.findall(rf"\b{re.escape(name)}\b", code))
        defs = monolith_defs[name]
        snippets=[]
        for _,line in defs[:3]:
            snippets.append(safe(source_lines[line-1].strip())[:280])
        print(f"{name}|refs={refs}|defs={','.join(str(line) for _,line in defs)}|modules={';'.join(module_sources[name])}|snippets={' || '.join(snippets)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
