from __future__ import annotations

import argparse
import collections
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime" / "js"

# This remains a lexical archaeology metric rather than a full JavaScript parser,
# but it deliberately distinguishes patch-era predecessor chains from temporary
# save/override/restore test hooks. That distinction matters in dicebound.js,
# where regression helpers intentionally monkey-patch a live function for one
# scoped assertion and then put it back.
FUNCTION_DECL_RE = re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\(")
FUNCTION_ASSIGN_RE = re.compile(
    r"(?<![.\w$])([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)"
)
CAPTURE_RE = re.compile(
    r"(?<![.\w$])([A-Za-z_$][\w$]*(?:Base|Orig|Original|Previous|Prev|Legacy|Old)[A-Za-z0-9_$]*)\s*=\s*([A-Za-z_$][\w$]*)\b",
    re.IGNORECASE,
)
VERSIONED_NAME_RE = re.compile(
    r"^(?:v\d+|db\d{3,}|db0\d+|patch\d+|beta\d+)[A-Za-z0-9_$]*$",
    re.IGNORECASE,
)
HISTORY_NAME_RE = re.compile(
    r"(?:Base$|Orig(?:inal)?|Previous|Prev|Legacy|Old|Compat|Wrapper|Override|Historical|Superseded)",
    re.IGNORECASE,
)


def mask_non_code(text: str) -> str:
    """Mask comments and quoted strings without changing offsets/newlines.

    Template expressions are intentionally masked with the surrounding template:
    source-like words inside UI/debug text must never become census evidence.
    """
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
    """Return lexical brace depth immediately before each character."""
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


def scope_end(code: str, depths: list[int], start: int) -> int:
    """Approximate the end of the brace scope containing start."""
    depth = depths[start]
    if depth <= 0:
        return len(code)
    for index in range(start, len(code)):
        if code[index] == "}" and depths[index] == depth:
            return index
    return len(code)


def is_function_assignment(fragment: str, symbol: str) -> bool:
    return bool(
        re.search(
            rf"(?<![.\w$]){re.escape(symbol)}\s*=\s*(?:async\s*)?(?:function\b|(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)",
            fragment,
        )
    )


def analyze(path: pathlib.Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8")
    code = mask_non_code(text)
    depths = brace_depths(code)

    raw_captures = list(CAPTURE_RE.finditer(code))
    historical_captures: list[tuple[str, str]] = []
    historical_capture_count = 0
    replacement_pairs = 0
    temporary_overrides = 0
    ignored_assignment_positions: set[int] = set()

    for match in raw_captures:
        alias, source = match.group(1), match.group(2)
        end = scope_end(code, depths, match.start())
        segment = code[match.end() : end]
        restore = re.search(
            rf"(?<![.\w$]){re.escape(source)}\s*=\s*{re.escape(alias)}\b",
            segment,
        )
        assignment_matches = [
            candidate
            for candidate in FUNCTION_ASSIGN_RE.finditer(code, match.end(), end)
            if candidate.group(1) == source and depths[candidate.start()] == depths[match.start()]
        ]

        if restore is not None:
            # save -> temporary replacement(s) -> restore inside the same lexical
            # scope is regression/test instrumentation, not historical layering.
            temporary_overrides += 1
            restore_abs = match.end() + restore.start()
            for candidate in assignment_matches:
                if candidate.start() < restore_abs:
                    ignored_assignment_positions.add(candidate.start())
            continue

        historical_capture_count += 1
        historical_captures.append((alias, source))
        if assignment_matches:
            replacement_pairs += 1

    definition_entries: list[tuple[str, int]] = []
    for match in FUNCTION_DECL_RE.finditer(code):
        definition_entries.append((match.group(1), match.start()))
    for match in FUNCTION_ASSIGN_RE.finditer(code):
        if match.start() in ignored_assignment_positions:
            continue
        definition_entries.append((match.group(1), match.start()))

    # Repeated definitions only count when they occur at the same lexical brace
    # depth. This suppresses common callback/local-helper names living in unrelated
    # nested scopes while retaining genuine same-scope shadow generations.
    depth_counts: collections.Counter[tuple[int, str]] = collections.Counter(
        (depths[position], name) for name, position in definition_entries
    )
    repeated = sum(count - 1 for count in depth_counts.values() if count > 1)
    repeated_symbols_set = {name for (_, name), count in depth_counts.items() if count > 1}
    repeated_symbols = len(repeated_symbols_set)

    defs = [name for name, _ in definition_entries]
    versioned = sum(1 for name in defs if VERSIONED_NAME_RE.match(name))
    history_named = sum(1 for name in defs if HISTORY_NAME_RE.search(name))
    alias_depth = max_alias_depth(historical_captures)

    # Captured predecessor+replacement pairs are the strongest evidence. Bare
    # same-depth shadows still matter, while version/history naming is only a hint.
    score = (
        replacement_pairs * 24
        + historical_capture_count * 14
        + repeated * 12
        + repeated_symbols * 5
        + alias_depth * 12
        + versioned * 3
        + history_named * 2
    )

    worst_by_name: collections.Counter[str] = collections.Counter()
    for (depth, name), count in depth_counts.items():
        worst_by_name[name] = max(worst_by_name[name], count)

    return {
        "path": path.relative_to(ROOT).as_posix(),
        "score": score,
        "repeated": repeated,
        "repeated_symbols": repeated_symbols,
        "captures": historical_capture_count,
        "replacement_pairs": replacement_pairs,
        "temporary_overrides": temporary_overrides,
        "versioned": versioned,
        "history_named": history_named,
        "depth": alias_depth,
        "lines": text.count("\n") + 1,
        "worst_symbols": ", ".join(
            f"{name}×{count}"
            for name, count in sorted(worst_by_name.items(), key=lambda item: (-item[1], item[0]))
            if count > 1
        ) or "-",
    }


def max_alias_depth(edges: list[tuple[str, str]]) -> int:
    predecessor = {alias: source for alias, source in edges if alias != source}
    best = 0
    for start in predecessor:
        seen: set[str] = set()
        cur = start
        depth = 0
        while cur in predecessor and cur not in seen:
            seen.add(cur)
            cur = predecessor[cur]
            depth += 1
        best = max(best, depth)
    return best


def census_rows() -> list[dict[str, object]]:
    rows = [analyze(path) for path in sorted(RUNTIME.rglob("*.js"))]
    rows.sort(
        key=lambda row: (
            -int(row["score"]),
            -int(row["replacement_pairs"]),
            -int(row["captures"]),
            -int(row["repeated"]),
            str(row["path"]),
        )
    )
    return rows


def render_markdown(rows: list[dict[str, object]]) -> str:
    lines = [
        "# Runtime historical-layer census",
        "",
        "Generated deterministically by `tools/test_historical_layer_census.py`. This is an archaeology ranking, not an ownership verdict: legitimate current facades/composition adapters are reviewed separately before any rewrite.",
        "",
        "The census now distinguishes **historical predecessor chains** from scoped save/override/restore regression hooks. Same-name definitions only count as repeat evidence at the same lexical brace depth. This prevents test monkey-patches from masquerading as patch-era architecture debt.",
        "",
        "Score weights predecessor+replacement pairs most heavily, then surviving predecessor captures and same-scope shadows. Version/history naming is only supporting evidence.",
        "",
        "| Rank | Score | Runtime file | Replacement pairs | Same-scope repeats | Repeated symbols | Predecessor captures | Temp overrides ignored | Versioned defs | History-named defs | Max alias depth | Lines | Repeated symbols |",
        "| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for rank, row in enumerate(rows, 1):
        worst = str(row["worst_symbols"]).replace("|", "\\|")
        lines.append(
            f"| {rank} | {row['score']} | `{row['path']}` | {row['replacement_pairs']} | {row['repeated']} | "
            f"{row['repeated_symbols']} | {row['captures']} | {row['temporary_overrides']} | {row['versioned']} | "
            f"{row['history_named']} | {row['depth']} | {row['lines']} | {worst} |"
        )
    lines.extend([
        "",
        "## Interpretation",
        "",
        "A high rank means **inspect first**. A temporary override count is informational and is not debt by itself. Before changing a row, verify which remaining hits are real historical composition debt versus intentional current facade/dependency wiring, characterize released behavior when needed, then collapse only the proven historical chain into the current authoritative owner.",
        "",
    ])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Rank runtime JavaScript files by surviving historical layering.")
    parser.add_argument("--markdown", type=pathlib.Path, help="Optionally write the deterministic ranked census as Markdown.")
    args = parser.parse_args()

    rows = census_rows()
    print("HISTORICAL_LAYER_CENSUS_BEGIN")
    print("rank | score | file | replacement-pairs | same-scope-repeats | repeated-symbols | predecessor-captures | temp-overrides-ignored | versioned-defs | history-named-defs | max-alias-depth | lines | repeated symbols")
    for rank, row in enumerate(rows, 1):
        print(
            f"{rank} | {row['score']} | {row['path']} | {row['replacement_pairs']} | {row['repeated']} | "
            f"{row['repeated_symbols']} | {row['captures']} | {row['temporary_overrides']} | {row['versioned']} | "
            f"{row['history_named']} | {row['depth']} | {row['lines']} | {row['worst_symbols']}"
        )
    print("HISTORICAL_LAYER_CENSUS_END")

    if not rows:
        raise SystemExit("Historical-layer census found no runtime JavaScript files.")
    if args.markdown:
        path = args.markdown
        if not path.is_absolute():
            path = ROOT / path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(render_markdown(rows), encoding="utf-8", newline="\n")
        print(f"Historical-layer census Markdown written to {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
