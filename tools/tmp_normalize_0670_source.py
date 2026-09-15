from __future__ import annotations

import pathlib
import re

ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGETS=(
    ROOT/"runtime/js/dicebound.js",
    ROOT/"runtime/js/progression/lifecycle.js",
)


def main()->int:
    changed=[]
    for path in TARGETS:
        text=path.read_text(encoding="utf-8")
        normalized=re.sub(r"(?m)^[ \t]+$","",text)
        if normalized!=text:
            path.write_text(normalized,encoding="utf-8",newline="\n")
            changed.append(path.relative_to(ROOT).as_posix())
    print("0.6.7.0 blank-line normalization:",", ".join(changed) if changed else "already clean")
    return 0


if __name__=="__main__":
    raise SystemExit(main())
