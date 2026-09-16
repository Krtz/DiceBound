from __future__ import annotations

import re
from pathlib import Path

import tmp_materialize_0670_chainsaw as base

ROOT = Path(__file__).resolve().parents[1]
MONOLITH = ROOT / "runtime/js/dicebound.js"

VERSION_HISTORY = re.compile(
    r"\b(?:alpha|beta)\s*v?\s*\d|\bv(?:1[0-9]|2[0-9]|3[0-9])(?:\.\d+)*\b",
    re.I,
)
HISTORY_PHRASES = (
    "compatibility",
    "historical",
    "patch-era",
    "patch era",
    "predecessor",
    "superseded",
    "migration",
    "legacy bootstrap",
    "old wrapper",
    "outer wrapper",
    "former wrapper",
    "formerly",
    "temporary adapter",
    "temporarily as",
    "before ownership moves",
    "before ownership move",
    "before dicebound",
)


def is_historical_comment(raw: str) -> bool:
    body = raw.lower()
    if VERSION_HISTORY.search(raw):
        return True
    if any(phrase in body for phrase in HISTORY_PHRASES):
        return True
    if "module:" in body:
        return True
    if "regression snapshot" in body or "characterization surface" in body:
        return True
    if "released 0.6." in body and ("freeze" in body or "freezes" in body or "before" in body):
        return True
    return False


def main() -> int:
    text = MONOLITH.read_text(encoding="utf-8").replace("\r\n", "\n")
    before_lines = text.count("\n") + 1
    source = text.encode("utf-8")
    tree = base.parse(source)
    spans: list[tuple[int, int]] = []
    removed_comment_lines = 0

    for node in base.walk(tree.root_node):
        if node.type != "comment":
            continue
        raw = base.node_text(source, node)
        if not is_historical_comment(raw):
            continue
        spans.append((node.start_byte, node.end_byte))
        removed_comment_lines += raw.count("\n") + 1

    if not spans:
        print(f"COMMENT_CLEAN already canonical; monolith={before_lines} lines")
        return 0

    for start, end in reversed(spans):
        source = source[:start] + source[end:]
    text = source.decode("utf-8")
    text = re.sub(r"(?m)^[ \t]+$", "", text)
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")

    MONOLITH.write_text(text, encoding="utf-8", newline="\n")
    after_lines = text.count("\n") + 1
    print(
        f"COMMENT_CLEAN {before_lines}->{after_lines} monolith lines; "
        f"historical comments removed={len(spans)}; comment source lines removed={removed_comment_lines}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
