from __future__ import annotations

import argparse
import collections
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime" / "js"

# This is intentionally a lexical archaeology metric, not a JavaScript parser.
# It is designed to rank files for human review and remain deterministic across CI.
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


def strip_comments(text: str) -> str:
    # Keep newlines so diagnostic line counts remain stable. The census only needs
    # enough lexical fidelity to rank archaeology candidates; exact ownership is
    # still established by source review + behavior characterization.
    text = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    return re.sub(r"//[^\n]*", "", text)


def definitions(code: str) -> list[str]:
    return FUNCTION_DECL_RE.findall(code) + FUNCTION_ASSIGN_RE.findall(code)


def capture_edges(code: str) -> list[tuple[str, str]]:
    return CAPTURE_RE.findall(code)


def max_alias_depth(edges: list[tuple[str, str]]) -> int:
    # alias -> predecessor. A wrapper generation usually captures the previous
    # implementation before replacing the public symbol. Cycles are capped.
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


def analyze(path: pathlib.Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8")
    code = strip_comments(text)
    defs = definitions(code)
    counts = collections.Counter(defs)
    repeated = sum(count - 1 for count in counts.values() if count > 1)
    repeated_symbols = sum(1 for count in counts.values() if count > 1)
    edges = capture_edges(code)
    captures = len(edges)
    versioned = sum(1 for name in defs if VERSIONED_NAME_RE.match(name))
    history_named = sum(1 for name in defs if HISTORY_NAME_RE.search(name))
    depth = max_alias_depth(edges)

    # Weight true replacement/capture evidence much more heavily than naming.
    # A legitimate facade with one definition and ordinary delegation therefore
    # scores near zero, while patch ladders rise rapidly to the top.
    score = (
        repeated * 20
        + repeated_symbols * 8
        + captures * 14
        + depth * 12
        + versioned * 5
        + history_named * 3
    )
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "score": score,
        "repeated": repeated,
        "repeated_symbols": repeated_symbols,
        "captures": captures,
        "versioned": versioned,
        "history_named": history_named,
        "depth": depth,
        "lines": text.count("\n") + 1,
        "worst_symbols": ", ".join(
            f"{name}×{count}" for name, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])) if count > 1
        ) or "-",
    }


def census_rows() -> list[dict[str, object]]:
    rows = [analyze(path) for path in sorted(RUNTIME.rglob("*.js"))]
    rows.sort(key=lambda row: (-int(row["score"]), -int(row["captures"]), -int(row["repeated"]), str(row["path"])))
    return rows


def render_markdown(rows: list[dict[str, object]]) -> str:
    lines = [
        "# Runtime historical-layer census",
        "",
        "Generated deterministically by `tools/test_historical_layer_census.py`. This is an archaeology ranking, not an ownership verdict: legitimate current facades/composition adapters are reviewed separately before any rewrite.",
        "",
        "Score weights true replacement/capture evidence most heavily: repeated definitions, predecessor captures and resolvable alias depth outweigh naming-only hints.",
        "",
        "| Rank | Score | Runtime file | Replacements | Repeated symbols | Predecessor captures | Versioned defs | History-named defs | Max alias depth | Lines | Repeated symbols |",
        "| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for rank, row in enumerate(rows, 1):
        worst = str(row["worst_symbols"]).replace("|", "\\|")
        lines.append(
            f"| {rank} | {row['score']} | `{row['path']}` | {row['repeated']} | {row['repeated_symbols']} | "
            f"{row['captures']} | {row['versioned']} | {row['history_named']} | {row['depth']} | {row['lines']} | {worst} |"
        )
    lines.extend([
        "",
        "## Interpretation",
        "",
        "A high rank means **inspect first**. Before changing a row, verify which hits are real historical composition debt versus intentional current facade/dependency wiring, characterize released behavior when needed, then collapse only the proven historical chain into the current authoritative owner.",
        "",
    ])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Rank runtime JavaScript files by surviving historical layering.")
    parser.add_argument("--markdown", type=pathlib.Path, help="Optionally write the deterministic ranked census as Markdown.")
    args = parser.parse_args()

    rows = census_rows()
    print("HISTORICAL_LAYER_CENSUS_BEGIN")
    print("rank | score | file | repeats | repeated-symbols | predecessor-captures | versioned-defs | history-named-defs | max-alias-depth | lines | repeated symbols")
    for rank, row in enumerate(rows, 1):
        print(
            f"{rank} | {row['score']} | {row['path']} | {row['repeated']} | "
            f"{row['repeated_symbols']} | {row['captures']} | {row['versioned']} | "
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
